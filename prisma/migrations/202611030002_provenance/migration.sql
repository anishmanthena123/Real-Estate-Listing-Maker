-- Keep the generation-time evidence immutable when edited text is revalidated.
ALTER TABLE "Generation" ADD COLUMN "originalContextSnapshot" JSONB;
UPDATE "Generation" SET "originalContextSnapshot" = "contextSnapshot";
ALTER TABLE "Generation" ALTER COLUMN "originalContextSnapshot" SET NOT NULL;
-- Prevent a detection from linking a photo belonging to a different property.
CREATE UNIQUE INDEX "PropertyPhoto_id_propertyId_key" ON "PropertyPhoto" (id, "propertyId");
ALTER TABLE "DetectedFeature" DROP CONSTRAINT "DetectedFeature_photoId_fkey";
ALTER TABLE "DetectedFeature" ADD CONSTRAINT "DetectedFeature_photoId_propertyId_fkey" FOREIGN KEY ("photoId", "propertyId") REFERENCES "PropertyPhoto"(id, "propertyId") ON DELETE CASCADE ON UPDATE CASCADE;
