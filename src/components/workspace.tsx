'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AuthForm } from './auth-form';
import { PropertyForm } from './property-form';
import { PhotoWorkflow } from './photo-workflow';
import { ContentReview } from './content-review';
import {
  api,
  contentLabels,
  money,
  type Dashboard,
  type Property,
} from './types';
type Account = { user: { id: string; email: string }; mockAI: boolean };
export function Workspace() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState<Property[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [form, setForm] = useState<'new' | 'edit' | null>(null);
  const [view, setView] = useState<'dashboard' | 'properties'>('dashboard');
  const refresh = useCallback(async () => {
    const [items, counts] = await Promise.all([
      api<Property[]>('properties'),
      api<Dashboard>('dashboard'),
    ]);
    setList(items);
    setDashboard(counts);
  }, []);
  const login = useCallback(async () => {
    const me = await api<Account>('me');
    setAccount(me);
    await refresh();
  }, [refresh]);
  useEffect(() => {
    api<Account>('me')
      .then(async (me) => {
        setAccount(me);
        await refresh();
      })
      .catch((e) => {
        if ((e as Error).message !== 'Please sign in.')
          setError((e as Error).message);
      })
      .finally(() => setLoading(false));
  }, [refresh]);
  async function open(id: string) {
    setError('');
    try {
      setProperty(await api<Property>(`properties/${id}`));
      setForm(null);
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function refreshProperty() {
    if (property) {
      setProperty(await api<Property>(`properties/${property.id}`));
      await refresh();
    }
  }
  async function saved(id: string) {
    await refresh();
    await open(id);
  }
  async function logout() {
    try {
      await api('auth/logout', { method: 'POST' });
      setAccount(null);
      setProperty(null);
      setList([]);
      setDashboard(null);
      setForm(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    if (
      !property ||
      !confirm(
        `Permanently delete ${property.address}, its photos and all generation history?`,
      )
    )
      return;
    try {
      await api(`properties/${property.id}`, { method: 'DELETE' });
      setProperty(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (loading)
    return (
      <main className="loading" role="status">
        Opening your workspace…
      </main>
    );
  if (!account)
    return (
      <>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <AuthForm onSuccess={login} />
      </>
    );
  const header = property
    ? property.address
    : form === 'new'
      ? 'A new property story.'
      : view === 'dashboard'
        ? 'Your workspace, at a glance.'
        : 'Your property portfolio.';
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          listly<span>AI</span>
        </Link>
        <p className="workspace-label">AGENT WORKSPACE</p>
        <nav>
          <button
            className={
              !property && !form && view === 'dashboard' ? 'active' : ''
            }
            onClick={() => {
              setProperty(null);
              setForm(null);
              setView('dashboard');
            }}
          >
            ◫ &nbsp; Overview
          </button>
          <button
            className={view === 'properties' || !!property ? 'active' : ''}
            onClick={() => {
              setProperty(null);
              setForm(null);
              setView('properties');
            }}
          >
            ⌂ &nbsp; Properties <span>{dashboard?.properties ?? 0}</span>
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          <strong>Grounded by design</strong>
          <p>Only verified features become generation evidence.</p>
        </div>
        <div className="account">
          <span className="avatar">{account.user.email[0].toUpperCase()}</span>
          <span className="truncate">{account.user.email}</span>
          <button onClick={() => void logout()}>Sign out</button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span>
            Listly AI / {property ? 'Property workspace' : 'Overview'}
          </span>
          <span className={`badge ${account.mockAI ? 'pending' : 'verified'}`}>
            {account.mockAI ? 'Mock AI · demo mode' : 'Live AI'}
          </span>
        </header>
        <main className="workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {property ? 'PROPERTY WORKSPACE' : 'YOUR MARKETING, ORGANIZED'}
              </p>
              <h1>{header}</h1>
              <p className="muted">
                {property
                  ? `${property.city}, ${property.state} ${property.zipCode}`
                  : 'Create thoughtful marketing. Keep the facts in focus.'}
              </p>
            </div>
            {!property && !form && (
              <button className="primary" onClick={() => setForm('new')}>
                + Add property
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {form ? (
            <PropertyForm
              key={property?.id ?? 'new'}
              property={form === 'edit' ? (property ?? undefined) : undefined}
              onSaved={saved}
              onCancel={() => setForm(null)}
            />
          ) : property ? (
            <>
              <div className="property-summary">
                <div>
                  <span className="badge">{property.status}</span>
                  <h2>{money(property.price)}</h2>
                  <p>
                    {property.bedrooms} beds · {property.bathrooms} baths ·{' '}
                    {property.squareFeet.toLocaleString()} sq ft ·{' '}
                    {property.propertyType}
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => setProperty(null)}>← Back</button>
                  <button onClick={() => setForm('edit')}>Edit facts</button>
                  <button className="danger" onClick={() => void remove()}>
                    Delete property
                  </button>
                </div>
              </div>
              <div className="workflow-strip">
                <span>01 Property facts</span>
                <span>02 Verify photos</span>
                <span>03 Generate</span>
                <span>04 Review claims</span>
              </div>
              <PhotoWorkflow
                property={property}
                refresh={refreshProperty}
                mock={account.mockAI}
              />
              <ContentReview property={property} refresh={refreshProperty} />
            </>
          ) : (
            <>
              {view === 'dashboard' && (
                <>
                  <div className="metrics">
                    {[
                      ['Properties', dashboard?.properties],
                      ['Generations', dashboard?.generations],
                      ['Needs review', dashboard?.needsReview],
                      ['Ready content', dashboard?.ready],
                    ].map(([label, value]) => (
                      <div className="metric" key={label}>
                        <span>{label}</span>
                        <strong>{value ?? 0}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="principle-banner">
                    <div className="banner-icon">✓</div>
                    <div>
                      <h3>Better copy starts with better evidence.</h3>
                      <p>
                        Photo suggestions stay pending until you verify them.
                        Every draft passes through a separate claim check.
                      </p>
                    </div>
                  </div>
                </>
              )}
              <section>
                <div className="section-heading">
                  <h2>
                    {view === 'dashboard' ? 'Recent properties' : 'Properties'}
                  </h2>
                  <span className="muted">
                    {list.length} shown
                    {list.length === 200 ? ' (latest 200)' : ''}
                  </span>
                </div>
                {list.length ? (
                  <div className="property-grid">
                    {(view === 'dashboard' ? list.slice(0, 6) : list).map(
                      (item) => (
                        <button
                          className="property-card"
                          key={item.id}
                          onClick={() => void open(item.id)}
                        >
                          <div className="property-art">
                            <span>⌂</span>
                            <span className="badge">{item.status}</span>
                          </div>
                          <div className="property-card-body">
                            <h3>{item.address}</h3>
                            <p>
                              {item.city}, {item.state}
                            </p>
                            <strong>{money(item.price)}</strong>
                            <p>
                              {item.bedrooms} bd · {item.bathrooms} ba ·{' '}
                              {item.squareFeet.toLocaleString()} sq ft
                            </p>
                            <div className="property-card-footer">
                              <span>{item._count?.photos ?? 0} photos</span>
                              <span>
                                {item._count?.generations ?? 0} drafts →
                              </span>
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="card empty">
                    <div className="empty-icon">⌂</div>
                    <h3>Your next listing starts here.</h3>
                    <p>
                      Add a property to organize its facts, verify photo
                      features, and create your first grounded draft.
                    </p>
                    <button className="primary" onClick={() => setForm('new')}>
                      Add your first property
                    </button>
                  </div>
                )}
              </section>
              {view === 'dashboard' && (
                <section className="card recent">
                  <div className="section-heading">
                    <h2>Recent generations</h2>
                    <span className="muted">Latest 8 drafts</span>
                  </div>
                  {dashboard?.recent.length ? (
                    dashboard.recent.map((g) => (
                      <button
                        className="recent-row"
                        key={g.id}
                        onClick={() => void open(g.propertyId)}
                      >
                        <div>
                          <strong>{contentLabels[g.contentType]}</strong>
                          <span>{g.property.address}</span>
                        </div>
                        <span className={`badge ${g.status.toLowerCase()}`}>
                          {g.status.replaceAll('_', ' ')}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="muted">
                      No generations yet. Your saved drafts and review statuses
                      will appear here.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          <footer className="disclaimer">
            Listly AI produces drafts, not guarantees. You are responsible for
            verifying every claim and reviewing content for applicable
            fair-housing, MLS, and advertising requirements before use.
          </footer>
        </main>
      </div>
    </div>
  );
}
