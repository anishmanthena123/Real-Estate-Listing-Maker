import { Prisma } from '@prisma/client';
import type { Property } from '@prisma/client';
import { buildContext } from '../src/server/ai/grounding';
export const input = {
  address: '123 Oak Street',
  city: 'Austin',
  state: 'TX',
  zipCode: '78701',
  price: 450000,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1800,
  propertyType: 'House' as const,
  yearBuilt: 2005,
  lotSize: 5000,
  notes: 'Private note: do not send this to AI.',
  status: 'DRAFT' as const,
};
export const fixture: Property = {
  ...input,
  price: new Prisma.Decimal(input.price),
  bathrooms: new Prisma.Decimal(input.bathrooms),
  lotSize: new Prisma.Decimal(input.lotSize),
  id: 'da9cfbbb-22dd-4429-8c11-0c6e52b662a5',
  userId: '96d1cf9e-72d4-4c90-b24e-edfa2037d1ad',
  evidenceVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};
export const context = buildContext(fixture, [
  { label: 'kitchen island', status: 'VERIFIED' },
]);
export const options = {
  contentType: 'MLS' as const,
  style: 'Professional' as const,
  length: 'Medium' as const,
};
