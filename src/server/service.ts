import { Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { db } from './db';
import { AppError, notFound } from './errors';
import { validId, parse, propertySchema, generationSchema } from './validation';
import { buildContext } from './ai/grounding';
import { getProvider, type AIProvider } from './ai/provider';
import { validateClaims } from './ai/claims';
import { LocalPhotoStorage, validatePhoto, type PhotoStorage } from './storage';
import { rateLimit } from './auth';
type Tx = Prisma.TransactionClient;
export class PropertyService {
  constructor(
    private database: PrismaClient = db,
    private providerFactory: () => AIProvider = getProvider,
    private storageFactory: () => PhotoStorage = () => new LocalPhotoStorage(),
  ) {}
  private async lock(tx: Tx, userId: string, id: string) {
    validId(id);
    const found = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Property" WHERE id = ${id}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`;
    if (!found.length) throw notFound();
    return tx.property.findUniqueOrThrow({ where: { id } });
  }
  private async invalidate(tx: Tx, propertyId: string) {
    await tx.property.update({
      where: { id: propertyId },
      data: { evidenceVersion: { increment: 1 } },
    });
    await tx.generation.updateMany({
      where: { propertyId },
      data: { status: 'NEEDS_REVIEW', reviewedAt: null },
    });
  }
  async list(userId: string) {
    return this.database.property.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: { _count: { select: { photos: true, generations: true } } },
    });
  }
  async dashboard(userId: string) {
    const where = { property: { userId } };
    const [properties, generations, needsReview, ready, recent] =
      await Promise.all([
        this.database.property.count({ where: { userId } }),
        this.database.generation.count({ where }),
        this.database.generation.count({
          where: { ...where, status: 'NEEDS_REVIEW' },
        }),
        this.database.generation.count({
          where: { ...where, status: 'READY' },
        }),
        this.database.generation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { property: { select: { address: true } } },
        }),
      ]);
    return { properties, generations, needsReview, ready, recent };
  }
  async get(userId: string, id: string) {
    validId(id);
    const property = await this.database.property.findFirst({
      where: { id, userId },
      include: {
        photos: { orderBy: { createdAt: 'asc' } },
        features: { orderBy: { createdAt: 'asc' } },
        generations: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { claims: true, feedback: true },
        },
      },
    });
    if (!property) throw notFound();
    return property;
  }
  async create(userId: string, input: unknown) {
    const data = parse(propertySchema, input);
    return this.database.property.create({ data: { ...data, userId } });
  }
  async update(userId: string, id: string, input: unknown) {
    const data = parse(propertySchema, input);
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, userId, id);
      await this.invalidate(tx, id);
      return tx.property.update({ where: { id }, data });
    });
  }
  async remove(userId: string, id: string) {
    const keys = await this.database.$transaction(async (tx) => {
      await this.lock(tx, userId, id);
      const photos = await tx.propertyPhoto.findMany({
        where: { propertyId: id },
        select: { storageKey: true },
      });
      await tx.property.delete({ where: { id } });
      return photos.map((p) => p.storageKey);
    });
    await this.cleanup(keys);
  }
  private async cleanup(keys: string[]) {
    const storage = this.storageFactory();
    for (const key of keys) {
      try {
        await storage.remove(key);
      } catch {
        console.error(
          'Private photo cleanup failed; operator should reconcile orphaned storage objects.',
        );
      }
    }
  }
  async upload(userId: string, id: string, file: File) {
    // Ownership precedes image processing and any file writes.
    await this.get(userId, id);
    const image = await validatePhoto(file);
    const storage = this.storageFactory();
    const key = await storage.put(image);
    try {
      return await this.database.$transaction(async (tx) => {
        await this.lock(tx, userId, id);
        if ((await tx.propertyPhoto.count({ where: { propertyId: id } })) >= 30)
          throw new AppError(400, 'A property may contain up to 30 photos.');
        return tx.propertyPhoto.create({
          data: {
            propertyId: id,
            storageKey: key,
            size: image.length,
            mimeType: 'image/jpeg',
            originalName: file.name.slice(0, 200),
          },
        });
      });
    } catch (e) {
      await this.cleanup([key]);
      throw e;
    }
  }
  async photo(userId: string, photoId: string) {
    validId(photoId);
    const photo = await this.database.propertyPhoto.findFirst({
      where: { id: photoId, property: { userId } },
    });
    if (!photo) throw notFound();
    try {
      return {
        photo,
        data: await this.storageFactory().read(photo.storageKey),
      };
    } catch {
      throw new AppError(
        503,
        'Photo storage is unavailable. Please try again or contact support.',
      );
    }
  }
  async removePhoto(userId: string, id: string, photoId: string) {
    validId(photoId);
    const key = await this.database.$transaction(async (tx) => {
      await this.lock(tx, userId, id);
      const photo = await tx.propertyPhoto.findFirst({
        where: { id: photoId, propertyId: id },
      });
      if (!photo) throw notFound();
      await tx.propertyPhoto.delete({ where: { id: photoId } });
      await this.invalidate(tx, id);
      return photo.storageKey;
    });
    await this.cleanup([key]);
  }
  async analyze(userId: string, id: string, photoId: string) {
    validId(photoId);
    await this.get(userId, id);
    const { photo, data } = await this.photo(userId, photoId);
    if (photo.propertyId !== id) throw notFound();
    if (photo.analyzedAt)
      throw new AppError(
        409,
        'This photo has already been analyzed. Review its suggestions.',
      );
    await rateLimit(`analyze:${userId}`, 30, 3600000);
    const provider = this.providerFactory();
    const labels = [...new Set(await provider.analyze(data, photo.mimeType))];
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, userId, id);
      const current = await tx.propertyPhoto.findFirst({
        where: { id: photoId, propertyId: id },
      });
      if (!current) throw notFound();
      if (current.analyzedAt)
        throw new AppError(409, 'This photo has already been analyzed.');
      const allowed = parse(
        z
          .array(
            z.enum([
              'kitchen island',
              'stainless steel appliances',
              'hardwood-style flooring',
              'fireplace',
              'pool',
              'patio',
              'garage',
              'large windows',
              'updated cabinetry',
            ]),
          )
          .max(9),
        labels,
      );
      await tx.detectedFeature.createMany({
        data: allowed.map((label) => ({
          label,
          propertyId: id,
          photoId,
          status: 'PENDING' as const,
        })),
      });
      await tx.propertyPhoto.update({
        where: { id: photoId },
        data: { analyzedAt: new Date() },
      });
      return {
        suggestions: allowed.length,
        provider: provider.name,
        mock: provider.name === 'mock',
      };
    });
  }
  async reviewFeature(
    userId: string,
    id: string,
    featureId: string,
    input: unknown,
  ) {
    validId(featureId);
    const { status } = parse(
      z.object({ status: z.enum(['VERIFIED', 'REJECTED']) }),
      input,
    );
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, userId, id);
      const feature = await tx.detectedFeature.findFirst({
        where: { id: featureId, propertyId: id },
      });
      if (!feature) throw notFound();
      await this.invalidate(tx, id);
      return tx.detectedFeature.update({
        where: { id: featureId },
        data: { status, reviewedAt: new Date() },
      });
    });
  }
  async generate(userId: string, id: string, input: unknown) {
    const options = parse(generationSchema, input);
    const property = await this.get(userId, id);
    await rateLimit(`generate:${userId}`, 30, 3600000);
    const context = buildContext(property, property.features);
    const provider = this.providerFactory();
    const text = parse(
      z.string().trim().min(1).max(12000),
      await provider.generate(context, options),
    );
    const claims = validateClaims(text, context);
    return this.database.$transaction(async (tx) => {
      const current = await this.lock(tx, userId, id);
      if (current.evidenceVersion !== property.evidenceVersion)
        throw new AppError(
          409,
          'Property evidence changed during generation. Please generate again.',
        );
      return tx.generation.create({
        data: {
          ...options,
          propertyId: id,
          originalText: text,
          text,
          provider: provider.name,
          model: provider.model,
          contextSnapshot: context,
          originalContextSnapshot: context,
          evidenceVersion: current.evidenceVersion,
          status: 'NEEDS_REVIEW',
          claims: { create: claims },
        },
        include: { claims: true },
      });
    });
  }
  async saveGeneration(
    userId: string,
    id: string,
    generationId: string,
    input: unknown,
  ) {
    validId(generationId);
    const { text, status, acknowledgeReview, revision } = parse(
      z.object({
        text: z.string().trim().min(1).max(12000),
        status: z.enum(['DRAFT', 'NEEDS_REVIEW', 'READY']),
        acknowledgeReview: z.boolean().default(false),
        revision: z.number().int().positive(),
      }),
      input,
    );
    return this.database.$transaction(async (tx) => {
      const property = await this.lock(tx, userId, id);
      const generation = await tx.generation.findFirst({
        where: { id: generationId, propertyId: id },
      });
      if (!generation) throw notFound();
      if (generation.revision !== revision)
        throw new AppError(
          409,
          'This draft changed in another session. Reload before saving.',
        );
      const features = await tx.detectedFeature.findMany({
        where: { propertyId: id, status: 'VERIFIED' },
      });
      const context = buildContext(property, features);
      const claims = validateClaims(text, context);
      const flagged = claims.some((c) => c.status !== 'SUPPORTED');
      if (
        status === 'READY' &&
        (!acknowledgeReview || flagged || !claims.length)
      )
        throw new AppError(
          400,
          'Resolve all flagged claims and explicitly confirm your review before marking READY.',
        );
      await tx.claim.deleteMany({ where: { generationId } });
      return tx.generation.update({
        where: { id: generationId },
        data: {
          text,
          status: flagged && status !== 'DRAFT' ? 'NEEDS_REVIEW' : status,
          contextSnapshot: context,
          evidenceVersion: property.evidenceVersion,
          revision: { increment: 1 },
          reviewedAt: status === 'READY' ? new Date() : null,
          claims: { create: claims },
        },
        include: { claims: true },
      });
    });
  }
  async feedback(
    userId: string,
    id: string,
    generationId: string,
    input: unknown,
  ) {
    validId(generationId);
    const data = parse(
      z.object({
        rating: z.union([z.literal(1), z.literal(-1)]),
        comment: z.string().trim().max(2000).default(''),
      }),
      input,
    );
    return this.database.$transaction(async (tx) => {
      await this.lock(tx, userId, id);
      const gen = await tx.generation.findFirst({
        where: { id: generationId, propertyId: id },
      });
      if (!gen) throw notFound();
      return tx.feedback.create({
        data: { ...data, generationId, generationRevision: gen.revision },
      });
    });
  }
}
export const properties = new PropertyService();
