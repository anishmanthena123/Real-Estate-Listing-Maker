export type PropertyInput = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: string | null;
  yearBuilt: number | null;
  lotSize: number | null;
  notes: string;
  status: string;
};
export type Photo = {
  id: string;
  originalName: string;
  analyzedAt: string | null;
};
export type Feature = {
  id: string;
  photoId: string;
  label: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
};
export type Claim = {
  id: string;
  text: string;
  sentence: string;
  status: string;
  reason: string;
  evidence: string | null;
};
export type Generation = {
  id: string;
  propertyId: string;
  contentType: string;
  style: string;
  length: string;
  originalText: string;
  text: string;
  status: string;
  provider: string;
  model: string;
  revision: number;
  evidenceVersion: number;
  createdAt: string;
  claims: Claim[];
  feedback: { id: string; rating: number; comment: string }[];
};
export type Property = Omit<
  PropertyInput,
  'price' | 'bathrooms' | 'lotSize'
> & {
  id: string;
  price: string | null;
  bathrooms: string | null;
  lotSize: string | null;
  evidenceVersion: number;
  createdAt: string;
  photos?: Photo[];
  features?: Feature[];
  generations?: Generation[];
  _count?: { photos: number; generations: number };
};
export type Dashboard = {
  properties: number;
  generations: number;
  needsReview: number;
  ready: number;
  recent: (Generation & { property: { address: string } })[];
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? 'Request failed. Please try again.');
  return result as T;
}
export const money = (value: string | number | null) =>
  value === null
    ? 'Price not supplied'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value));
export const date = (value: string) => new Date(value).toLocaleString();
export const contentLabels: Record<string, string> = {
  MLS: 'MLS description',
  LISTING: 'Long-form listing',
  INSTAGRAM: 'Instagram caption',
  FACEBOOK: 'Facebook post',
  EMAIL: 'Email announcement',
  BLURB: 'Marketing blurb',
};
