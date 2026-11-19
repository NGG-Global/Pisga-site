import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { DemoStrip } from '../components/Shell';
import { delay, Loading } from '../components/ui';
import { strings } from '../content/strings';
import { api } from '../data';
import { UserFacingError } from '../data/api';
import { DEMO_ROLE_KEY, demoRole, resetDemo } from '../data/demoApi';
import type { Role } from '../data/types';
import { DEMO_MODE } from '../lib/env';
import { DEMO_TODAY_KEY, today } from '../lib/today';
import { brand } from '../theme/brand';

const MIN_PASSWORD = 10;

/** The first-impression surface: gradient ground, the summit range, the stacked logo. */
function EntryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <DemoStrip />
      <div className="login">
        <img className="login__range plane" src={brand.graphics.rangeOnLight} alt="" />
        <div className="login__top rise" style={delay(900)}>
          <img src={brand.logos.client} alt={brand.clientName} />
        </div>
        <div className="login__body">
          <img className="login__logo rise" style={delay(780)} src={brand.logos.programmeStacked} alt={`${brand.programmeName}, ${brand.tagline}`} />
          {children}
        </div>
      </div>
    </div>
  );
}

function DemoControls() {
  const [role, setRole] = useState<Role>(demoRole);
  const [date, setDate] = useState(today);
  return (
    <div className="demo-box rise" style={delay(1140)}>
      <span className="muted">{strings.demo.loginHint}</span>
      <div className="field">
        <label htmlFor="demo-role">{strings.demo.role}</label>
        <select
          id="demo-role"
          className="select"
          value={role}
          onChange={(e) => {
            const next = e.target.value as Role;
            setRole(next);
            localStorage.setItem(DEMO_ROLE_KEY, next);
          }}
        >
          {(Object.keys(strings.roles) as Role[]).map((r) => (
            <option key={r} value={r}>
              {strings.roles[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="demo-date">{strings.demo.date}</label>
        <input
          id="demo-date"
          className="input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (e.target.value) localStorage.setItem(DEMO_TODAY_KEY, e.target.value);
            else localStorage.removeItem(DEMO_TODAY_KEY);
          }}
        />
      </div>
      <button
        type="button"
        className="link"
        onClick={() => {
          resetDemo();
          localStorage.removeItem(DEMO_TODAY_KEY);
          window.location.reload();
        }}
      >
        {strings.demo.reset}
      </button>
    </div>
  );
}

export function Login() {
  const { state } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api().signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : strings.login.unavailable);
      setBusy(false);
    }
  }

  return (
    <EntryFrame>
      <form className="card login__card rise" style={delay(1020)} onSubmit={submit} noValidate>
        <h1>{strings.login.title}</h1>
        <div className="field">
          <label htmlFor="email">{strings.login.email}</label>
          <input id="email" className="input" type="email" dir="ltr" autoComplete="username" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">{strings.login.password}</label>
          <input id="password" className="input" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && (
          <p className="note note--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary" style={{ marginTop: 4 }} disabled={busy || state.status === 'loading'}>
          {busy ? strings.login.submitting : strings.login.submit}
        </button>
        <Link className="link" to="/forgot-password">
          {strings.login.forgot}
        </Link>
      </form>
      {DEMO_MODE && <DemoControls />}
    </EntryFrame>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api().requestPasswordReset(email.trim());
    } catch {
      /* The same confirmation is shown whether or not the address is registered. */
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <EntryFrame>
      <form className="card login__card rise" style={delay(1020)} onSubmit={submit} noValidate>
        <h1>{strings.password.forgotTitle}</h1>
        {sent ? (
          <p className="note note--ok" role="status">
            {strings.password.sent}
          </p>
        ) : (
          <>
            <p className="meta">{strings.password.forgotText}</p>
            <div className="field">
              <label htmlFor="email">{strings.login.email}</label>
              <input id="email" className="input" type="email" dir="ltr" autoComplete="username" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {strings.password.sendLink}
            </button>
          </>
        )}
        <Link className="link" to="/login">
          {strings.password.backToLogin}
        </Link>
      </form>
    </EntryFrame>
  );
}

/** Reached from the link in the password e-mail, for first-time set-up and for resets. */
export function ResetPassword() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(strings.password.tooShort);
    if (password !== confirm) return setError(strings.password.mismatch);
    setBusy(true);
    setError(null);
    try {
      await api().updatePassword(password);
      navigate('/', { replace: true });
    } catch {
      setError(strings.password.failed);
      setBusy(false);
    }
  }

  return (
    <EntryFrame>
      <form className="card login__card rise" style={delay(1020)} onSubmit={submit} noValidate>
        <h1>{strings.password.resetTitle}</h1>
        {state.status === 'loading' && <Loading />}
        {(state.status === 'signedOut' || state.status === 'error') && (
          <>
            <p className="note note--error" role="alert">
              {strings.password.invalidLink}
            </p>
            <Link className="link" to="/forgot-password">
              {strings.password.forgotTitle}
            </Link>
          </>
        )}
        {state.status === 'signedIn' && (
          <>
            <div className="field">
              <label htmlFor="new-password">{strings.password.newPassword}</label>
              <input id="new-password" className="input" type="password" dir="ltr" autoComplete="new-password" aria-describedby="password-rule" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <span id="password-rule" className="field__hint">
                {strings.password.rule}
              </span>
            </div>
            <div className="field">
              <label htmlFor="confirm-password">{strings.password.confirmPassword}</label>
              <input id="confirm-password" className="input" type="password" dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && (
              <p className="note note--error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {strings.password.savePassword}
            </button>
          </>
        )}
      </form>
    </EntryFrame>
  );
}

/** A signed-in user of another NGG app who is not a member of this programme. */
export function NoAccess() {
  const { signOut } = useAuth();
  return (
    <EntryFrame>
      <div className="card login__card rise" style={delay(1020)}>
        <h1>{strings.login.noAccessTitle}</h1>
        <p className="meta">{strings.login.noAccessText}</p>
        <button type="button" className="btn btn--outline" onClick={() => void signOut()}>
          {strings.login.signOut}
        </button>
      </div>
    </EntryFrame>
  );
}
