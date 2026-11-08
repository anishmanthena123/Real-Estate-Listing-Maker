import { useState } from 'react';
import type { LocalPhoto } from './local-photos';
export function PhotoImport({
  photos,
  importFiles,
  remove,
}: {
  photos: LocalPhoto[];
  importFiles: (files: File[]) => Promise<void>;
  remove: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <section className="photo-import">
      <label htmlFor="import-pictures">
        Import property pictures <span>OPTIONAL</span>
      </label>
      <input
        id="import-pictures"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy}
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          setError('');
          setBusy(true);
          try {
            await importFiles(files);
          } catch (error) {
            setError((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <p className="hint">
        Up to 10 JPEG, PNG, or WebP pictures · 8 MB each. Previewed only in this
        tab; nothing is uploaded or analyzed by AI. Importing a picture does not
        verify a feature.
      </p>
      {busy && (
        <p role="status" className="hint">
          Checking pictures…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="imported-gallery">
        {photos.map((photo) => (
          <article key={photo.id}>
            <img
              src={photo.url}
              alt={`Imported picture: ${photo.name}`}
              loading="lazy"
            />
            <div>
              <span>{photo.name}</span>
              <button
                aria-label={`Remove ${photo.name}`}
                onClick={() => remove(photo.id)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
