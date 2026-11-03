'use client';
import Image from 'next/image';
import { useState } from 'react';
import { api, type Property } from './types';
export function PhotoWorkflow({
  property,
  refresh,
  mock,
}: {
  property: Property;
  refresh: () => Promise<void>;
  mock: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      try {
        await refresh();
      } catch (e) {
        setError(
          (previous) =>
            `${previous ? `${previous} ` : ''}Gallery refresh failed: ${(e as Error).message}`,
        );
      }
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <p className="eyebrow">02 / PHOTO EVIDENCE</p>
      <h2>Look. Verify. Then write.</h2>
      <p className="muted">
        Suggestions begin as pending. Verify only features you can confirm;
        rejecting a suggestion keeps it out of generation.
      </p>
      {mock && (
        <p className="notice">
          Mock analysis returns sample suggestions without inspecting the image.
          They are demonstration data, never verified facts.
        </p>
      )}
      <label className="upload">
        {busy ? 'Processing…' : '+ Upload property photos'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            void run(async () => {
              let uploaded = 0;
              for (const file of files) {
                const form = new FormData();
                form.append('photo', file);
                await api(`properties/${property.id}/photos`, {
                  method: 'POST',
                  body: form,
                });
                uploaded++;
              }
              setNotice(`${uploaded} photo(s) uploaded.`);
            });
          }}
        />
      </label>
      <p className="hint">
        JPEG, PNG or WebP · 8 MB each · up to 30 photos · location metadata
        removed
      </p>
      {error && (
        <p role="alert" className="error">
          {error} Some uploads may have completed. Check the gallery before
          retrying.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="photo-grid">
        {property.photos?.map((photo) => (
          <article className="photo-card" key={photo.id}>
            {/* Authenticated private photo endpoint, not a public asset. */}
            <Image
              unoptimized
              width={600}
              height={400}
              src={`/api/photos/${photo.id}`}
              alt={photo.originalName || 'Property photo'}
            />
            <div className="photo-info">
              <span className="truncate">{photo.originalName}</span>
              <div className="actions">
                <button
                  disabled={busy || !!photo.analyzedAt}
                  onClick={() =>
                    void run(() =>
                      api(`properties/${property.id}/analyze/${photo.id}`, {
                        method: 'POST',
                      }),
                    )
                  }
                >
                  {photo.analyzedAt ? 'Analyzed' : 'Analyze photo'}
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        'Delete this photo and its detected features? Existing drafts will need review.',
                      )
                    )
                      void run(() =>
                        api(`properties/${property.id}/photos/${photo.id}`, {
                          method: 'DELETE',
                        }),
                      );
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!property.photos?.length && (
        <div className="empty small">
          No photos yet. Add photos to suggest visible features, or generate
          from property facts alone.
        </div>
      )}
      <div className="features">
        {property.features?.map((feature) => (
          <div className="feature-row" key={feature.id}>
            <div>
              <strong>{feature.label}</strong>
              <small>
                Photo{' '}
                {(property.photos?.findIndex((p) => p.id === feature.photoId) ??
                  -1) + 1}
              </small>
            </div>
            <span className={`badge ${feature.status.toLowerCase()}`}>
              {feature.status}
            </span>
            <div className="actions">
              <button
                disabled={busy || feature.status === 'VERIFIED'}
                onClick={() =>
                  void run(() =>
                    api(`properties/${property.id}/features/${feature.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'VERIFIED' }),
                    }),
                  )
                }
              >
                Verify
              </button>
              <button
                disabled={busy || feature.status === 'REJECTED'}
                onClick={() =>
                  void run(() =>
                    api(`properties/${property.id}/features/${feature.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ status: 'REJECTED' }),
                    }),
                  )
                }
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
