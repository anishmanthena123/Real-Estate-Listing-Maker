-- Unknown facts must remain unknown instead of requiring fabricated values.
ALTER TABLE "Property"
  ALTER COLUMN "price" DROP NOT NULL,
  ALTER COLUMN "bedrooms" DROP NOT NULL,
  ALTER COLUMN "bathrooms" DROP NOT NULL,
  ALTER COLUMN "squareFeet" DROP NOT NULL,
  ALTER COLUMN "propertyType" DROP NOT NULL,
  ALTER COLUMN "yearBuilt" DROP NOT NULL;
