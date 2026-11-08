import { buildContext, type GroundingProperty } from '../server/ai/grounding';
import { factSentences, validateClaims } from '../server/ai/claims';
export type Feature = {
  label: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
};
export type SampleProperty = GroundingProperty & {
  id: string;
  name: string;
  features: Feature[];
  tag: string;
};
export type Draft = {
  id: number;
  propertyId: string;
  text: string;
  type: string;
  style: string;
  length: string;
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'READY';
  feedback?: number;
};
export const samples: SampleProperty[] = [
  {
    id: 'willow',
    name: 'The Willow House',
    address: '128 Willow Lane',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    price: '685000',
    bedrooms: 3,
    bathrooms: '2',
    squareFeet: 2140,
    propertyType: 'House',
    yearBuilt: 2017,
    lotSize: '6400',
    tag: 'Contemporary living',
    features: [
      { label: 'kitchen island', status: 'PENDING' },
      { label: 'large windows', status: 'PENDING' },
      { label: 'pool', status: 'PENDING' },
    ],
  },
  {
    id: 'maple',
    name: 'Maple Row Townhome',
    address: '42 Maple Row',
    city: 'Portland',
    state: 'OR',
    zipCode: '97214',
    price: '529000',
    bedrooms: 2,
    bathrooms: '2.5',
    squareFeet: 1680,
    propertyType: 'Townhouse',
    yearBuilt: 2020,
    lotSize: '1800',
    tag: 'A considered footprint',
    features: [
      { label: 'garage', status: 'PENDING' },
      { label: 'patio', status: 'PENDING' },
    ],
  },
  {
    id: 'cedar',
    name: 'Cedar Park Residence',
    address: '9 Cedar Way',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    price: '472000',
    bedrooms: 4,
    bathrooms: '3',
    squareFeet: 2450,
    propertyType: 'House',
    yearBuilt: 2009,
    lotSize: '8200',
    tag: 'Room to make it yours',
    features: [
      { label: 'fireplace', status: 'PENDING' },
      { label: 'hardwood-style flooring', status: 'PENDING' },
    ],
  },
];
export const freshProperties = () => structuredClone(samples);
export function demoContext(property: SampleProperty) {
  return buildContext(property, property.features);
}
export function generateDemo(
  property: SampleProperty,
  length: string,
  type: string,
) {
  const facts = factSentences(demoContext(property));
  const selected = facts.filter(
    (fact, index) =>
      index <
        (length === 'Short' ? 4 : length === 'Medium' ? 7 : facts.length) ||
      fact.evidence.startsWith('verified feature:'),
  );
  return selected
    .map((f) => `${f.text}.`)
    .join(type === 'MLS description' ? ' ' : '\n');
}
export function reviewDemo(property: SampleProperty, text: string) {
  return validateClaims(text, demoContext(property));
}
export function canMarkReady(
  property: SampleProperty,
  text: string,
  acknowledged: boolean,
) {
  const claims = reviewDemo(property, text);
  return (
    acknowledged &&
    claims.length > 0 &&
    claims.every((c) => c.status === 'SUPPORTED')
  );
}
