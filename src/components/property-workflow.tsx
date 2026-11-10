'use client';
import { useState } from 'react';
import { JourneyNav } from './journey-nav';
import { PhotoWorkflow } from './photo-workflow';
import { ContentReview } from './content-review';
import { money, type Property } from './types';
export function PropertyWorkflow({
  property,
  initialGenerationId,
  refresh,
  mock,
  edit,
}: {
  property: Property;
  initialGenerationId?: string | null;
  refresh: () => Promise<void>;
  mock: boolean;
  edit: () => void;
}) {
  const [step, setStep] = useState(initialGenerationId ? 2 : 1);
  return (
    <>
      <JourneyNav
        labels={['Property facts', 'Photos & verification', 'Content & review']}
        step={step}
        onChange={setStep}
      />
      <section hidden={step !== 0} className="card">
        <h2>Review your property facts</h2>
        <p className="muted">
          Unknown facts stay out of generation. Public-record suggestions need
          your confirmation.
        </p>
        <dl className="fact-summary">
          <dt>Address</dt>
          <dd>
            {property.address}, {property.city}, {property.state}{' '}
            {property.zipCode}
          </dd>
          <dt>Price</dt>
          <dd>{money(property.price)}</dd>
          <dt>Bedrooms / bathrooms</dt>
          <dd>
            {property.bedrooms ?? 'Unknown'} / {property.bathrooms ?? 'Unknown'}
          </dd>
          <dt>Interior square feet</dt>
          <dd>{property.squareFeet ?? 'Unknown'}</dd>
        </dl>
        <div className="actions">
          <button onClick={edit}>Edit details</button>
          <button className="primary" onClick={() => setStep(1)}>
            Continue to photos
          </button>
        </div>
      </section>
      <div hidden={step !== 1}>
        <PhotoWorkflow property={property} refresh={refresh} mock={mock} />
        <div className="step-actions">
          <p className="hint">
            Photos are optional. Only explicitly verified features enter
            generation.
          </p>
          <button className="primary" onClick={() => setStep(2)}>
            Continue to content →
          </button>
        </div>
      </div>
      <div hidden={step !== 2}>
        <ContentReview
          initialGenerationId={initialGenerationId}
          property={property}
          refresh={refresh}
        />
        <button onClick={() => setStep(1)}>← Back to photos</button>
      </div>
    </>
  );
}
