'use client';
import { useState, type FormEvent } from 'react';
import {
  api,
  contentLabels,
  date,
  type Generation,
  type Property,
} from './types';
export function ContentReview({
  property,
  initialGenerationId,
  refresh,
}: {
  property: Property;
  initialGenerationId?: string | null;
  refresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(
    initialGenerationId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generations = property.generations ?? [];
  const current = generations.find((g) => g.id === selected) ?? generations[0];
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<Generation>(
        `properties/${property.id}/generations`,
        {
          method: 'POST',
          body: JSON.stringify(
            Object.fromEntries(new FormData(event.currentTarget)),
          ),
        },
      );
      setSelected(result.id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <p className="eyebrow">03 / GROUNDED GENERATION</p>
      <h2>From evidence to a first draft.</h2>
      <p className="muted">
        Uses property facts and{' '}
        {property.features?.filter((f) => f.status === 'VERIFIED').length ?? 0}{' '}
        verified photo features. Pending and rejected detections are excluded.
      </p>
      <form className="generation-controls" onSubmit={generate}>
        <label>
          Content type
          <select name="contentType">
            {Object.entries(contentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Style
          <select name="style">
            {['Professional', 'Luxury', 'Modern', 'Warm', 'Concise'].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Length
          <select name="length" defaultValue="Medium">
            {['Short', 'Medium', 'Long'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={busy}>
          {busy
            ? 'Generating…'
            : generations.length
              ? 'Generate another draft'
              : 'Generate draft'}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {current ? (
        <div className="review-layout">
          <aside className="history">
            <h3>Generation history</h3>
            {generations.map((g) => (
              <button
                key={g.id}
                className={
                  g.id === current.id ? 'history-item selected' : 'history-item'
                }
                onClick={() => setSelected(g.id)}
              >
                <strong>{contentLabels[g.contentType]}</strong>
                <span>
                  {g.style} · {g.length}
                </span>
                <small>{date(g.createdAt)}</small>
                <span className={`badge ${g.status.toLowerCase()}`}>
                  {g.status.replaceAll('_', ' ')}
                </span>
              </button>
            ))}
          </aside>
          <Editor
            key={`${current.id}:${current.revision}`}
            generation={current}
            evidenceVersion={property.evidenceVersion}
            propertyId={property.id}
            refresh={refresh}
          />
        </div>
      ) : (
        <div className="empty small">
          Your drafts will appear here. Every generation is saved with its
          evidence snapshot and validation results.
        </div>
      )}
    </section>
  );
}
function Editor({
  generation,
  evidenceVersion,
  propertyId,
  refresh,
}: {
  generation: Generation;
  evidenceVersion: number;
  propertyId: string;
  refresh: () => Promise<void>;
}) {
  const [text, setText] = useState(generation.text);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rating, setRating] = useState(1);
  const [comment, setComment] = useState('');
  const flagged = generation.claims.filter((c) => c.status !== 'SUPPORTED');
  const dirty = text !== generation.text;
  const staleEvidence = generation.evidenceVersion !== evidenceVersion;
  async function save(status: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`properties/${propertyId}/generations/${generation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          text,
          status,
          acknowledgeReview: ack,
          revision: generation.revision,
        }),
      });
      await refresh();
      setNotice('Saved and revalidated.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function feedback(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`properties/${propertyId}/feedback/${generation.id}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      setComment('');
      setNotice('Feedback saved. Thank you.');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="editor">
      <div className="section-heading">
        <h3>Review your draft</h3>
        <span className={`badge ${generation.status.toLowerCase()}`}>
          {generation.status.replaceAll('_', ' ')}
        </span>
      </div>
      <p className="hint">
        {generation.provider} / {generation.model} · Revision{' '}
        {generation.revision} · Evidence v{generation.evidenceVersion}
      </p>
      <label htmlFor="marketing-content">Marketing content</label>
      <textarea
        id="marketing-content"
        className="draft-text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setAck(false);
        }}
        maxLength={12000}
        rows={12}
      />
      {staleEvidence && (
        <p className="notice">
          Property evidence changed. Your edits are preserved; save and validate
          against the new facts before marking ready.
        </p>
      )}
      {dirty && (
        <p className="notice">
          Unsaved edits. Save to rerun validation; the claims below refer to the
          last saved text.
        </p>
      )}
      <div className="claim-heading">
        <h3>Claim check</h3>
        <span>
          {flagged.length} flagged · {generation.claims.length} total
        </span>
      </div>
      <p className="hint">
        Conservative checks can miss claims and flag valid paraphrases. Every
        draft still needs your review.
      </p>
      <div className="claim-list">
        {generation.claims.map((claim) => (
          <article
            className={`claim ${claim.status === 'SUPPORTED' ? 'supported' : 'flagged'}`}
            key={claim.id}
          >
            <span className={`badge ${claim.status.toLowerCase()}`}>
              {claim.status.replaceAll('_', ' ')}
            </span>
            <p>{claim.text}</p>
            <small>{claim.reason}</small>
            {claim.evidence && <small>Evidence: {claim.evidence}</small>}
            {claim.status !== 'SUPPORTED' && (
              <button
                disabled={busy}
                onClick={() => {
                  setText((t) =>
                    t
                      .replace(claim.sentence, '')
                      .replace(/\s{2,}/g, ' ')
                      .trim(),
                  );
                  setAck(false);
                }}
              >
                Remove containing sentence
              </button>
            )}
          </article>
        ))}
      </div>
      {flagged.length > 0 && (
        <p className="notice">
          To substantiate a claim, edit the property facts or verify its photo
          feature above, then save to revalidate. Claims cannot be marked
          supported without evidence.
        </p>
      )}
      <label className="checkbox">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        I reviewed this text, its supporting facts, and applicable housing and
        advertising requirements.
      </label>
      <div className="actions">
        <button
          disabled={busy || !text.trim()}
          onClick={() => void save('DRAFT')}
        >
          Save draft
        </button>
        <button
          disabled={busy || !text.trim()}
          onClick={() => void save('NEEDS_REVIEW')}
        >
          Save &amp; validate
        </button>
        <button
          className="primary"
          disabled={
            busy ||
            !ack ||
            staleEvidence ||
            !text.trim() ||
            (!dirty && flagged.length > 0)
          }
          onClick={() => void save('READY')}
        >
          Mark ready
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <details>
        <summary>Original generated text</summary>
        <p className="original-text">{generation.originalText}</p>
      </details>
      <form className="feedback" onSubmit={feedback}>
        <h3>How useful was this generation?</h3>
        <div className="actions">
          <button
            type="button"
            aria-pressed={rating === 1}
            onClick={() => setRating(1)}
          >
            👍 Useful
          </button>
          <button
            type="button"
            aria-pressed={rating === -1}
            onClick={() => setRating(-1)}
          >
            👎 Needs work
          </button>
        </div>
        <label>
          Optional feedback
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="What worked? What should improve?"
          />
        </label>
        <button disabled={busy}>Send feedback</button>
        <p className="hint">
          {generation.feedback?.length ?? 0} feedback submission(s) saved for
          this generation.
        </p>
      </form>
    </div>
  );
}
