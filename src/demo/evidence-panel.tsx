import { demoContext, type SampleProperty, type Feature } from './model';
export function EvidencePanel({
  property,
  review,
}: {
  property: SampleProperty;
  review: (label: string, status: Feature['status']) => void;
}) {
  const verified = property.features.filter((f) => f.status === 'VERIFIED');
  return (
    <section className="workflow-panel">
      <div className="panel-heading">
        <span className="step-number">01</span>
        <div>
          <h4>Make the evidence yours.</h4>
          <p>
            Review the sample suggestions. Only verified features reach the
            draft.
          </p>
        </div>
        <span className="badge verified">{verified.length} verified</span>
      </div>
      <div className="verification-layout">
        <div className="photo-placeholder">
          <img
            src="./assets/home.svg"
            alt="Sample property illustration, not a photo used for actual AI analysis"
          />
          <span>Demo illustration · preloaded suggestions</span>
        </div>
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
                  disabled={feature.status === 'VERIFIED'}
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
