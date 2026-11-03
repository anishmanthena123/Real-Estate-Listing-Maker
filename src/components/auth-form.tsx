'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { api } from './types';
export function AuthForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api(`auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form)),
      });
      await onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link className="brand" href="/">
          listly<span>AI</span>
        </Link>
        <p className="eyebrow">EVIDENCE BEFORE ELOQUENCE</p>
        <h1>
          Property stories.
          <br />
          Grounded in facts.
        </h1>
        <p className="lede">
          Turn property details and agent-verified photos into marketing drafts
          you can confidently review.
        </p>
        <div className="pipeline-card">
          <span>01 &nbsp; Add property facts</span>
          <span>02 &nbsp; Review photo suggestions</span>
          <span>03 &nbsp; Generate with verified evidence</span>
          <span>04 &nbsp; Check claims. Make it yours.</span>
        </div>
        <p className="muted">AI assists. Your professional judgment leads.</p>
      </section>
      <section className="auth-panel">
        <div className="card">
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">
            Keep your properties, evidence, and drafts together.
          </p>
          <form onSubmit={submit}>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <p className="hint">
              Use at least 12 characters. Never reuse an important password.
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            </button>
          </form>
          <button
            className="link full"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register
              ? 'Already have an account? Sign in'
              : 'New to Listly? Create an account'}
          </button>
        </div>
        <p className="disclaimer">
          Review every draft before publishing. Listly AI does not guarantee
          factual accuracy or compliance with housing and advertising
          requirements.
        </p>
      </section>
    </main>
  );
}
