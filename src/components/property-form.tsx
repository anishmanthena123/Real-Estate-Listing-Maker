'use client';
import { useState, type FormEvent } from 'react';
import { api, type Property } from './types';
const numeric = [
  'price',
  'bedrooms',
  'bathrooms',
  'squareFeet',
  'yearBuilt',
  'lotSize',
];
export function PropertyForm({
  property,
  onSaved,
  onCancel,
}: {
  property?: Property;
  onSaved: (id: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const data: Record<string, unknown> = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    for (const key of numeric)
      data[key] = data[key] === '' ? null : Number(data[key]);
    try {
      const saved = await api<Property>(
        property ? `properties/${property.id}` : 'properties',
        { method: property ? 'PATCH' : 'POST', body: JSON.stringify(data) },
      );
      await onSaved(saved.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const fields = [
    ['address', 'Street address'],
    ['city', 'City'],
    ['state', 'State / region'],
    ['zipCode', 'ZIP / postal code'],
    ['price', 'Price (USD)'],
    ['bedrooms', 'Bedrooms'],
    ['bathrooms', 'Bathrooms'],
    ['squareFeet', 'Interior square feet'],
    ['yearBuilt', 'Year built'],
    ['lotSize', 'Lot size (sq ft, optional)'],
  ];
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PROPERTY FACTS</p>
          <h2>{property ? 'Edit property' : 'Add a property'}</h2>
        </div>
        <button onClick={onCancel}>Cancel</button>
      </div>
      <p className="muted">
        Enter facts you can substantiate. Changing evidence sends existing
        content back to review.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          {fields.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                type={numeric.includes(key) ? 'number' : 'text'}
                min={key === 'yearBuilt' ? 1600 : 0}
                max={
                  key === 'yearBuilt' ? new Date().getFullYear() + 5 : undefined
                }
                step={
                  ['price', 'lotSize'].includes(key)
                    ? '0.01'
                    : key === 'bathrooms'
                      ? '0.1'
                      : '1'
                }
                defaultValue={String(property?.[key as keyof Property] ?? '')}
                required={key !== 'lotSize'}
                maxLength={200}
              />
            </label>
          ))}
          <label>
            Property type
            <select
              name="propertyType"
              defaultValue={property?.propertyType ?? 'House'}
            >
              {[
                'House',
                'Condo',
                'Townhouse',
                'Multi-family',
                'Land',
                'Other',
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={property?.status ?? 'DRAFT'}>
              {['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Private notes
          <textarea
            name="notes"
            defaultValue={property?.notes ?? ''}
            maxLength={5000}
            rows={3}
          />
        </label>
        <p className="hint">
          Notes are saved for your reference and excluded from AI generation
          context.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save property'}
        </button>
      </form>
    </section>
  );
}
