import { useState } from 'react';
import { PhotoImport } from './photo-import';
import type { LocalPhoto } from './local-photos';
import { FEATURE_LABELS } from '../server/ai/grounding';
import { demoContext, type SampleProperty, type Feature } from './model';
export function EvidencePanel({
  property,
  review,
  photos,
  importFiles,
  removePhoto,
  addFeature,
}: {
  property: SampleProperty;
  review: (label: string, status: Feature['status']) => void;
  photos: LocalPhoto[];
  importFiles: (files: File[]) => Promise<void>;
  removePhoto: (id: string) => void;
  addFeature: (label: string) => void;
}) {
  const [label, setLabel] = useState('');
  const needsPhoto = !property.isSample && photos.length === 0;
  const verified = property.features.filter((f) => f.status === 'VERIFIED');
  return (
    <section className="workflow-panel">
      <div className="panel-heading">
        <span className="step-number">02</span>
        <div>
          <h4>Make the evidence yours.</h4>
          <p>
            Import pictures and review visible features. Only verified features
            reach the draft.
          </p>
        </div>
        <span className="badge verified">{verified.length} verified</span>
      </div>
      <PhotoImport
        photos={photos}
        importFiles={importFiles}
        remove={removePhoto}
      />
      <div className="verification-layout">
        {property.isSample ? (
          <div className="photo-placeholder">
            <img
              src="./assets/home.svg"
              alt="Sample property illustration, not a photo used for actual AI analysis"
            />
            <span>Demo illustration · preloaded suggestions</span>
          </div>
        ) : (
          <div className="address-photo-note">
            <strong>Your address, your evidence.</strong>
            <p>
              Import your own pictures above. No sample image or automatic
              feature detection is attached to this address.
            </p>
          </div>
        )}
        <div className="feature-list">
          {property.features.map((feature) => (
            <div className="feature-row" key={feature.label}>
              <div>
                <strong>{feature.label}</strong>
                <span className={`badge ${feature.status.toLowerCase()}`}>
                  {feature.status}
                </span>
              </div>
              <div className="feature-actions">
                <button
                  className="verify"
                  disabled={feature.status === 'VERIFIED' || needsPhoto}
                  onClick={() => review(feature.label, 'VERIFIED')}
                >
                  ✓ Verify
                </button>
                <button
                  disabled={feature.status === 'REJECTED'}
                  onClick={() => review(feature.label, 'REJECTED')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          <div className="manual-feature">
            <label htmlFor="visible-feature">
              Add a visible feature to review
            </label>
            <select
              id="visible-feature"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              disabled={needsPhoto}
            >
              <option value="">Choose a feature</option>
              {FEATURE_LABELS.map((value) => (
                <option
                  key={value}
                  disabled={property.features.some((f) => f.label === value)}
                >
                  {value}
                </option>
              ))}
            </select>
            <button
              disabled={
                needsPhoto ||
                !label ||
                property.features.some((f) => f.label === label)
              }
              onClick={() => {
                addFeature(label);
                setLabel('');
              }}
            >
              Add pending feature
            </button>
          </div>
          {needsPhoto && (
            <p className="hint">
              Import a picture first to add and verify features for this
              address.
            </p>
          )}
          <p className="hint">
            A model suggestion isn’t a property fact. In the full app, photo
            analysis creates pending detections for agent review.
          </p>
        </div>
      </div>
      <details className="context-details">
        <summary>
          Inspect exactly what enters generation <span>JSON →</span>
        </summary>
        <pre data-testid="generation-context">
          {JSON.stringify(demoContext(property), null, 2)}
        </pre>
      </details>
    </section>
  );
}
