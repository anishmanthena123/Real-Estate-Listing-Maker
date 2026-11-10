'use client';
import { useState, type FormEvent } from 'react';
import { api } from './types';
import { parseAddress, type AddressParts } from '../shared/address';
export type LookupSuggestions = {
  source: string;
  retrievedAt: string;
  requestedAddress: string;
  matchedAddress: string;
  requiresReview: boolean;
  notice: string;
  suggestedFacts: Record<string, string | number | null>;
};
export function AddressLookup({
  onResult,
  onAddress,
}: {
  onResult: (result: LookupSuggestions) => void;
  onAddress: (parts: AddressParts) => void;
}) {
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function lookup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onResult(
        await api<LookupSuggestions>('property-lookup', {
          method: 'POST',
          body: JSON.stringify({ address }),
        }),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="lookup-panel">
      <h3>Start with the property address</h3>
      <p className="muted">
        Look up public-record details, then confirm the facts below. You can
        also enter them manually.
      </p>
      <form onSubmit={lookup}>
        <label htmlFor="lookup-address">Full US property address</label>
        <div className="lookup-row">
          <input
            id="lookup-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={300}
            autoComplete="street-address"
            required
            placeholder="123 Oak Street, Austin, TX 78701"
          />
          <button className="primary" disabled={busy}>
            {busy ? 'Looking up…' : 'Look up property'}
          </button>
        </div>
      </form>
      <button
        className="link"
        disabled={busy}
        onClick={() => {
          setError('');
          try {
            onAddress(parseAddress(address));
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        Use address only — skip lookup
      </button>
      <p className="hint">
        Unknown details can stay empty. They will never be guessed in your
        listing.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
