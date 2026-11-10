import { useState, type FormEvent } from 'react';
import { resolveDemoAddress, type SampleProperty } from './model';
export function AddressIntake({
  properties,
  open,
}: {
  properties: SampleProperty[];
  open: (property: SampleProperty) => void;
}) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      open(resolveDemoAddress(address, properties));
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <section className="address-intake">
      <div>
        <p className="eyebrow">START WITH ONE FIELD</p>
        <h3>What’s the property address?</h3>
        <p>
          Enter the address, then optionally import photos and verify visible
          features.
        </p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="property-address">Property address</label>
        <div className="address-input-row">
          <input
            id="property-address"
            autoComplete="street-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={300}
            required
            placeholder="e.g. 128 Willow Lane, Austin, TX 78704"
          />
          <button className="primary">Start with this address →</button>
        </div>
        <p className="hint">
          Sample addresses load fictional demo records. Other addresses start
          with unknown property details—there is no live property-data lookup.
        </p>
        <button
          type="button"
          className="sample-address"
          onClick={() => {
            const sample = '128 Willow Lane, Austin, TX 78704';
            setAddress(sample);
            setError('');
            open(resolveDemoAddress(sample, properties));
          }}
        >
          Try a fictional sample address
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
