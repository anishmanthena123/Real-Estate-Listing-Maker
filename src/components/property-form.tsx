'use client';
import { useState, type FormEvent } from 'react';
import { api, type Property } from './types';
import { AddressLookup, type LookupSuggestions } from './address-lookup';
import type { AddressParts } from '../shared/address';
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
  const [lookup, setLookup] = useState<LookupSuggestions | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [addressOnly, setAddressOnly] = useState<AddressParts | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (lookup && !confirmed) {
      setError(
        'Confirm the returned address and property facts before saving.',
      );
      return;
    }
    setBusy(true);
    const data: Record<string, unknown> = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    for (const key of numeric)
      data[key] = data[key] === '' ? null : Number(data[key]);
    if (data.propertyType === '') data.propertyType = null;
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
      {!property && (
        <AddressLookup
          onAddress={(parts) => {
            setAddressOnly(parts);
            setLookup(null);
          }}
          onResult={(result) => {
            setAddressOnly(null);
            setLookup(result);
            setConfirmed(false);
          }}
        />
      )}
      {lookup && (
        <div className="notice">
          <strong>
            {lookup.source} suggestions for {lookup.matchedAddress}
          </strong>
          <p>{lookup.notice}</p>
          <small>
            Retrieved {new Date(lookup.retrievedAt).toLocaleString()}. No
            property has been saved yet.
          </small>
        </div>
      )}
      <form
        key={
          lookup?.retrievedAt ??
          (addressOnly ? JSON.stringify(addressOnly) : 'manual')
        }
        onSubmit={submit}
      >
        <details className="property-details" open={!addressOnly}>
          <summary>Review or edit property details (optional)</summary>
          <p className="hint">
            Only the address fields are required. Leave unknown values empty.
          </p>
          <div className="form-grid">
            {fields.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  name={key}
                  type={numeric.includes(key) ? 'number' : 'text'}
                  min={key === 'yearBuilt' ? 1600 : 0}
                  max={
                    key === 'yearBuilt'
                      ? new Date().getFullYear() + 5
                      : undefined
                  }
                  step={
                    ['price', 'lotSize'].includes(key)
                      ? '0.01'
                      : key === 'bathrooms'
                        ? '0.1'
                        : '1'
                  }
                  defaultValue={String(
                    lookup?.suggestedFacts[key] ??
                      addressOnly?.[key as keyof AddressParts] ??
                      property?.[key as keyof Property] ??
                      '',
                  )}
                  required={['address', 'city', 'state', 'zipCode'].includes(
                    key,
                  )}
                  maxLength={200}
                />
              </label>
            ))}
            <div>
              <label htmlFor="property-type">Property type</label>
              <select
                id="property-type"
                name="propertyType"
                defaultValue={String(
                  lookup?.suggestedFacts.propertyType ??
                    property?.propertyType ??
                    '',
                )}
              >
                <option value="">Choose property type</option>
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
            </div>
            <div>
              <label htmlFor="property-status">Status</label>
              <select
                id="property-status"
                name="status"
                defaultValue={property?.status ?? 'DRAFT'}
              >
                {['DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </details>
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
        {lookup && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I checked the returned address and reviewed these property facts,
            leaving unknown values empty.
          </label>
        )}
        <button
          className="primary"
          disabled={busy || Boolean(lookup && !confirmed)}
        >
          {busy ? 'Saving…' : 'Save property'}
        </button>
      </form>
    </section>
  );
}
