import { z } from 'zod';
import { AppError } from './errors';
export const idSchema = z.uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
export const propertySchema = z.object({
  address: text(200),
  city: text(100),
  state: text(100),
  zipCode: text(20),
  price: z.number().finite().min(0).max(999999999999),
  bedrooms: z.number().int().min(0).max(100),
  bathrooms: z.number().min(0).max(100).multipleOf(0.1),
  squareFeet: z.number().int().min(0).max(10000000),
  propertyType: z.enum([
    'House',
    'Condo',
    'Townhouse',
    'Multi-family',
    'Land',
    'Other',
  ]),
  yearBuilt: z
    .number()
    .int()
    .min(1600)
    .max(new Date().getUTCFullYear() + 5),
  lotSize: z.number().min(0).max(999999999999).nullable().optional(),
  notes: z.string().trim().max(5000).default(''),
  status: z.enum(['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED']).default('DRAFT'),
});
export const generationSchema = z.object({
  contentType: z.enum([
    'MLS',
    'LISTING',
    'INSTAGRAM',
    'FACEBOOK',
    'EMAIL',
    'BLURB',
  ]),
  style: z.enum(['Professional', 'Luxury', 'Modern', 'Warm', 'Concise']),
  length: z.enum(['Short', 'Medium', 'Long']),
});
export const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(12).max(128),
});
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(
      400,
      result.error.issues
        .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
        .join('; '),
    );
  return result.data;
}
export function validId(value: string) {
  return parse(idSchema, value);
}
