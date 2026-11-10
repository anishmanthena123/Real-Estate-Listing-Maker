import type { Dispatch, SetStateAction } from 'react';
import {
  reviewDemo,
  canMarkReady,
  type SampleProperty,
  type Draft,
} from './model';
type Props = {
  property: SampleProperty;
  active: Draft | undefined;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  ack: boolean;
  setAck: (ack: boolean) => void;
  setError: (error: string) => void;
  save: (status: Draft['status']) => void;
  feedback: (rating: number) => void;
  error: string;
  notice: string;
};
export function ReviewPanel({
  property,
  active,
  text,
  setText,
  ack,
  setAck,
  setError,
  save,
  feedback,
  error,
  notice,
}: Props) {
  const claims = reviewDemo(property, text);
  const flagged = claims.filter((c) => c.status !== 'SUPPORTED');
  const dirty = Boolean(active && text !== active.text);
  return (
    <section className="workflow-panel review-panel">
      <div className="panel-heading">
        <span className="step-number">04</span>
        <div>
          <h4>Review the claims. Own the story.</h4>
          <p>Edit freely, inspect support, and keep a human in the loop.</p>
        </div>
        {active && (
          <span
            className={`badge ${dirty ? 'pending' : active.status.toLowerCase()}`}
          >
            {dirty ? 'UNSAVED' : active.status.replaceAll('_', ' ')}
          </span>
        )}
      </div>
      {!active ? (
        <div className="editor-empty">
          <span>Aa</span>
          <h4>A thoughtful draft is one click away.</h4>
          <p>
            Verify a feature above and generate your first sample draft. You can
            also generate from property facts alone.
          </p>
        </div>
      ) : (
        <>
          <div className="editor-toolbar">
            <span>
              Draft #{active.id} · {active.type} · {active.style} ·{' '}
              {active.length}
            </span>
            <button
              onClick={() => {
                setText((t) => `${t}\nRenovated in 2025. Safe neighborhood.`);
                setAck(false);
              }}
            >
              + Try an unsupported claim
            </button>
          </div>
          <label htmlFor="demo-content">Your marketing draft</label>
          <textarea
            id="demo-content"
            value={text}
            maxLength={12000}
            rows={7}
            onChange={(e) => {
              setText(e.target.value);
              setAck(false);
              setError('');
            }}
          />
          <div className="claims-title">
            <h5>
              Claim check <span>{claims.length} detected</span>
            </h5>
            <span
              className={`badge ${flagged.length ? 'pending' : 'verified'}`}
            >
              {flagged.length
                ? `${flagged.length} need review`
                : 'All detected claims supported'}
            </span>
          </div>
          <p className="hint">
            Exact-match checks are conservative and imperfect. Valid paraphrases
            may be flagged; subtle unsupported or discriminatory language may be
            missed.
          </p>
          <div className="claims-list">
            {claims.map((claim, index) => (
              <article
                className={`claim ${claim.status === 'SUPPORTED' ? 'supported' : 'flagged'}`}
                key={`${claim.text}:${index}`}
              >
                <div>
                  <span className="claim-icon">
                    {claim.status === 'SUPPORTED' ? '✓' : '!'}
                  </span>
                  <div>
                    <strong>{claim.text}</strong>
                    <p>
                      {claim.status === 'SUPPORTED'
                        ? `Evidence: ${claim.evidence}`
                        : claim.reason}
                    </p>
                  </div>
                </div>
                <span className={`badge ${claim.status.toLowerCase()}`}>
                  {claim.status.replaceAll('_', ' ')}
                </span>
                {claim.status !== 'SUPPORTED' && (
                  <button
                    onClick={() => {
                      setText((t) => t.replace(claim.sentence, '').trim());
                      setAck(false);
                    }}
                  >
                    Remove sentence
                  </button>
                )}
              </article>
            ))}
          </div>
          <label className="acknowledgement">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I reviewed the text and supporting evidence. READY is a review
            state, not a guarantee of accuracy or legal compliance.
          </label>
          <div className="editor-buttons">
            <button onClick={() => save('DRAFT')}>Save draft</button>
            <button
              className="primary"
              disabled={!canMarkReady(property, text, ack)}
              onClick={() => save('READY')}
            >
              Mark ready ✓
            </button>
            <div className="feedback">
              <span>Useful?</span>
              <button
                aria-label="Helpful draft"
                aria-pressed={active.feedback === 1}
                onClick={() => feedback(1)}
              >
                👍
              </button>
              <button
                aria-label="Draft needs work"
                aria-pressed={active.feedback === -1}
                onClick={() => feedback(-1)}
              >
                👎
              </button>
            </div>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
