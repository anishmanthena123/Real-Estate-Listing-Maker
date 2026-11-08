import type { DetectedFeature } from '@prisma/client';
export const FEATURE_LABELS = [
  'kitchen island',
  'stainless steel appliances',
  'hardwood-style flooring',
  'fireplace',
  'pool',
  'patio',
  'garage',
  'large windows',
  'updated cabinetry',
] as const;
export type FeatureLabel = (typeof FEATURE_LABELS)[number];
export type GroundedContext = {
  property: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    price: string;
    bedrooms: number;
    bathrooms: string;
    squareFeet: number;
    propertyType: string;
    yearBuilt: number;
    lotSize: string | null;
  };
  verifiedFeatures: string[];
};
export type GroundingProperty = Omit<
  GroundedContext['property'],
  'price' | 'bathrooms' | 'lotSize'
> & {
  price: { toString(): string };
  bathrooms: { toString(): string };
  lotSize: { toString(): string } | null;
};
// Explicit projection: notes, pending detections, rejected detections, owner identity and storage metadata never cross this boundary.
export function buildContext(
  property: GroundingProperty,
  features: Pick<DetectedFeature, 'label' | 'status'>[],
): GroundedContext {
  return {
    property: {
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      price: property.price.toString(),
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms.toString(),
      squareFeet: property.squareFeet,
      propertyType: property.propertyType,
      yearBuilt: property.yearBuilt,
      lotSize: property.lotSize?.toString() ?? null,
    },
    verifiedFeatures: [
      ...new Set(
        features
          .filter(
            (f) =>
              f.status === 'VERIFIED' &&
              (FEATURE_LABELS as readonly string[]).includes(f.label),
          )
          .map((f) => f.label),
      ),
    ],
  };
}
