import { useState } from 'react';
import {
  freshProperties,
  generateDemo,
  canMarkReady,
  type Draft,
  type Feature,
  type SampleProperty,
} from './model';
import { EvidencePanel } from './evidence-panel';
import { ReviewPanel } from './review-panel';
import { AddressIntake } from './address-intake';
import { useLocalPhotos } from './use-local-photos';
import { FEATURE_LABELS } from '../server/ai/grounding';
const money = (value: { toString(): string } | null) =>
  value === null
    ? 'Not supplied'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value.toString()));
export function Workspace() {
  const [properties, setProperties] =
    useState<SampleProperty[]>(freshProperties);
  const { photos, importPhotos, removePhoto, resetPhotos } = useLocalPhotos();
  const [selectedId, setSelectedId] = useState('willow');
  const [resetVersion, setResetVersion] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [ack, setAck] = useState(false);
  const [type, setType] = useState('MLS description');
  const [style, setStyle] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const property = properties.find((p) => p.id === selectedId)!;
  const active = drafts.find((d) => d.id === activeId);
  const verified = property.features.filter((f) => f.status === 'VERIFIED');
  function select(id: string) {
    setSelectedId(id);
    const draft = drafts.find((d) => d.propertyId === id);
    setActiveId(draft?.id ?? null);
    setText(draft?.text ?? '');
    setAck(false);
    setError('');
    setNotice('');
  }
  function openAddress(found: SampleProperty) {
    setProperties((items) =>
      items.some((p) => p.id === found.id) ? items : [found, ...items],
    );
    select(found.id);
    setNotice(
      found.isSample
        ? 'Loaded a fictional sample record, not a live lookup.'
        : 'Address entered. Other facts are unknown and excluded from generation. You can optionally import pictures and verify visible features.',
    );
  }
  function addFeature(label: string) {
    if (!(FEATURE_LABELS as readonly string[]).includes(label)) return;
    if (!property.isSample && !photos[selectedId]?.length) return;
    setProperties((items) =>
      items.map((p) =>
        p.id === selectedId && !p.features.some((f) => f.label === label)
          ? { ...p, features: [...p.features, { label, status: 'PENDING' }] }
          : p,
      ),
    );
  }
  function removePicture(photoId: string) {
    removePhoto(selectedId, photoId);
    setProperties((items) =>
      items.map((p) =>
        p.id === selectedId
          ? {
              ...p,
              features: p.features.map((f) =>
                f.status === 'VERIFIED' ? { ...f, status: 'PENDING' } : f,
              ),
            }
          : p,
      ),
    );
    setDrafts((items) =>
      items.map((d) =>
        d.propertyId === selectedId ? { ...d, status: 'NEEDS_REVIEW' } : d,
      ),
    );
    setAck(false);
    setNotice(
      'Picture removed. Reverify visible features before using them in content.',
    );
  }
  function review(label: string, status: Feature['status']) {
    setProperties((items) =>
      items.map((p) =>
        p.id === selectedId
          ? {
              ...p,
              features: p.features.map((f) =>
                f.label === label ? { ...f, status } : f,
              ),
            }
          : p,
      ),
    );
    setDrafts((items) =>
      items.map((d) =>
        d.propertyId === selectedId ? { ...d, status: 'NEEDS_REVIEW' } : d,
      ),
    );
    setAck(false);
    setNotice(
      'Evidence updated. Existing drafts require review against the current facts.',
    );
  }
  function generate() {
    const generated = generateDemo(property, length, type);
    const id = drafts.reduce((max, d) => Math.max(max, d.id), 0) + 1;
    setDrafts((items) => [
      {
        id,
        propertyId: selectedId,
        text: generated,
        type,
        style,
        length,
        status: 'NEEDS_REVIEW',
      },
      ...items,
    ]);
    setActiveId(id);
    setText(generated);
    setAck(false);
    setError('');
    setNotice(
      'Draft created locally from fact templates. No AI service was called.',
    );
  }
  function save(status: Draft['status']) {
    setError('');
    if (!text.trim() || !activeId) {
      setError('Generate a draft first. Empty content cannot be saved.');
      return;
    }
    if (status === 'READY' && !canMarkReady(property, text, ack)) {
      setError(
        'Resolve flagged claims and confirm your review before marking ready.',
      );
      return;
    }
    setDrafts((items) =>
      items.map((d) => (d.id === activeId ? { ...d, text, status } : d)),
    );
    setNotice(
      status === 'READY'
        ? 'Marked ready in this demo. This is a review state, not a factual or legal guarantee.'
        : 'Draft saved in this tab and checked against current evidence.',
    );
  }
  function feedback(rating: number) {
    setDrafts((items) =>
      items.map((d) => (d.id === activeId ? { ...d, feedback: rating } : d)),
    );
    setNotice('Demo feedback recorded only in this tab.');
  }
  function reset() {
    resetPhotos();
    setResetVersion((version) => version + 1);
    setProperties(freshProperties());
    setSelectedId('willow');
    setDrafts([]);
    setActiveId(null);
    setText('');
    setAck(false);
    setError('');
    setNotice(
      'Demo reset. All data stays in this browser tab and disappears on reload.',
    );
  }
  return (
    <section className="workspace-section" id="workspace">
      <div className="section-heading">
        <div>
          <p className="eyebrow">TAKE THE WORKFLOW FOR A SPIN</p>
          <h2>Your next listing starts here.</h2>
          <p className="section-description">
            Enter an address, optionally import pictures, then review your
            draft.
          </p>
        </div>
        <button className="reset" onClick={reset}>
          Reset demo
        </button>
      </div>
      <AddressIntake
        key={resetVersion}
        properties={properties}
        open={openAddress}
      />
      <div className="demo-disclosure">
        <span className="demo-tag">DEMO MODE</span>
        <p>
          Fictional properties, preloaded feature suggestions, and simulated
          generation. No real photos are analyzed, no accounts are created, and
          nothing is sent to a server. Your entered addresses and imported
          pictures stay in this tab. Changes reset on reload.
        </p>
      </div>
      <div className="workspace-frame">
        <aside className="property-sidebar">
          <div className="sidebar-heading">
            <span>YOUR PROPERTIES & SAMPLES</span>
            <span>{properties.length}</span>
          </div>
          {properties.map((p) => (
            <button
              key={p.id}
              className={`property-tile ${p.id === selectedId ? 'selected' : ''}`}
              onClick={() => select(p.id)}
              aria-pressed={p.id === selectedId}
            >
              <div className={`tile-illustration ${p.id}`}>
                {p.isSample ? (
                  <img src="./assets/home.svg" alt="" />
                ) : (
                  <div className="address-tile-icon">⌂</div>
                )}
                <span>{p.isSample ? 'FICTIONAL SAMPLE' : 'ADDRESS ONLY'}</span>
              </div>
              <div className="tile-body">
                <strong>{p.name}</strong>
                <span>
                  {p.isSample
                    ? `${p.city}, ${p.state}`
                    : 'Address entered by you'}
                </span>
                <b>{money(p.price)}</b>
                <small>
                  {p.bedrooms ?? '—'} bd <i>·</i>{' '}
                  {p.bathrooms?.toString() ?? '—'} ba <i>·</i>{' '}
                  {p.squareFeet?.toLocaleString() ?? '—'} sq ft
                </small>
              </div>
            </button>
          ))}
          <div className="session-summary">
            <span>THIS DEMO SESSION</span>
            <div>
              <b>{drafts.length}</b> drafts generated
            </div>
            <div>
              <b>{drafts.filter((d) => d.status === 'READY').length}</b> marked
              ready
            </div>
            <p>These counts reflect only your interactions in this tab.</p>
          </div>
        </aside>
        <div className="property-workspace">
          <div className="property-title">
            <div>
              <p className="eyebrow">PROPERTY WORKSPACE</p>
              <h3>{property.name}</h3>
              <span>
                {[
                  property.address,
                  property.city,
                  [property.state, property.zipCode].filter(Boolean).join(' '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <span className="pill sample-pill">
              {property.isSample ? 'FICTIONAL PROPERTY' : 'ADDRESS ENTERED'}
            </span>
          </div>
          <div className="facts-bar">
            <div>
              <span>LIST PRICE</span>
              <strong>{money(property.price)}</strong>
            </div>
            <div>
              <span>BEDROOMS</span>
              <strong>{property.bedrooms ?? '—'}</strong>
            </div>
            <div>
              <span>BATHROOMS</span>
              <strong>{property.bathrooms?.toString() ?? '—'}</strong>
            </div>
            <div>
              <span>INTERIOR</span>
              <strong>
                {property.squareFeet?.toLocaleString() ?? '—'}{' '}
                <small>sq ft</small>
              </strong>
            </div>
            <div>
              <span>BUILT</span>
              <strong>{property.yearBuilt ?? '—'}</strong>
            </div>
          </div>
          {!property.isSample && (
            <p className="notice">
              Address-only workspace: price, bedrooms, bathrooms, area, and year
              built have not been looked up. Missing facts are excluded, not
              filled with guesses.
            </p>
          )}
          <EvidencePanel
            key={property.id}
            property={property}
            review={review}
            addFeature={addFeature}
            photos={photos[selectedId] ?? []}
            importFiles={(files) => importPhotos(selectedId, files)}
            removePhoto={removePicture}
          />
          <section className="workflow-panel">
            <div className="panel-heading">
              <span className="step-number">02</span>
              <div>
                <h4>Build a grounded first draft.</h4>
                <p>
                  Structured property details + {verified.length} verified
                  features. Nothing more.
                </p>
              </div>
            </div>
            <div className="generation-controls">
              <label>
                Content type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  {[
                    'MLS description',
                    'Long-form listing',
                    'Instagram caption',
                    'Facebook post',
                    'Email announcement',
                    'Marketing blurb',
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Style
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {['Professional', 'Luxury', 'Modern', 'Warm', 'Concise'].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Length
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                >
                  {['Short', 'Medium', 'Long'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <button className="primary" onClick={generate}>
                Generate sample draft →
              </button>
            </div>
            <p className="hint">
              This free demo uses deterministic fact templates, not a live AI
              model. Style is recorded as a preference; expressive style
              variations require the full app’s provider.
            </p>
          </section>
          <ReviewPanel
            property={property}
            active={active}
            text={text}
            setText={setText}
            ack={ack}
            setAck={setAck}
            setError={setError}
            save={save}
            feedback={feedback}
            error={error}
            notice={notice}
          />
          {drafts.some((d) => d.propertyId === selectedId) && (
            <section className="history-panel">
              <h4>
                Generation history <span>THIS TAB ONLY</span>
              </h4>
              {drafts
                .filter((d) => d.propertyId === selectedId)
                .map((d) => (
                  <button
                    key={d.id}
                    className={activeId === d.id ? 'active' : ''}
                    onClick={() => {
                      setActiveId(d.id);
                      setText(d.text);
                      setAck(false);
                      setError('');
                      setNotice('');
                    }}
                  >
                    <span>
                      #{d.id} <strong>{d.type}</strong>
                      <small>
                        {d.style} · {d.length}
                      </small>
                    </span>
                    <span className={`badge ${d.status.toLowerCase()}`}>
                      {d.status.replaceAll('_', ' ')}
                    </span>
                  </button>
                ))}
            </section>
          )}
        </div>
      </div>
      <p className="workspace-disclaimer">
        Always review generated marketing for factual accuracy and applicable
        housing, MLS, and advertising requirements. Listly does not
        automatically guarantee compliance.
      </p>
    </section>
  );
}
