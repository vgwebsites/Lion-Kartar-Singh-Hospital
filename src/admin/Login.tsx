import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import supabase from '../services/supabase';
import { signInWithGoogle } from '../services/googleAuth';
import { api } from '../services/api';
import { useAuth } from '../components/AuthContext';
export default function Login() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  const { session } = useAuth();
  useEffect(() => {
    if (!session) return;
    let active = true;
    api('/api/staff', {}, true).then(() => { if (active) navigate('/staff/dashboard'); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [session?.access_token, navigate]);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); setError(''); const form = new FormData(e.currentTarget); try { const { error: authError } = await supabase.auth.signInWithPassword({ email: String(form.get('email')), password: String(form.get('password')) }); if (authError) throw new Error('Unable to sign in. Check your email and password.'); await api('/api/staff', {}, true); navigate('/staff/dashboard'); } catch (err) { await supabase.auth.signOut(); setError(err instanceof Error ? err.message : 'Unable to sign in.'); } finally { setBusy(false); } }
  return <section className="staff-login-section"><div className="form-card staff-login"><span className="login-icon"><ShieldCheck size={31} /></span><span className="eyebrow">AUTHORIZED PERSONNEL ONLY</span><h1>Welcome back.</h1><p>Sign in to the reception workspace.</p><form onSubmit={submit}><div className="field"><label htmlFor="staff-email">Staff email</label><input id="staff-email" name="email" type="email" autoComplete="username" placeholder="Your authorized email address" required /></div><div className="field"><label htmlFor="staff-password">Password</label><input id="staff-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required minLength={6} /></div>{error && <div className="form-error" role="alert">{error}</div>}<button className="button primary full-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={17} />}{busy ? 'Signing in…' : 'Sign In Securely'}<ArrowRight size={17} /></button></form><div className="auth-divider">or</div><button className="button outline full-button" onClick={() => { try { signInWithGoogle(); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open Google sign-in.'); } }}>Continue with Google</button><button className="text-link continue-session" onClick={async () => { setError(''); try { await api('/api/staff', {}, true); navigate('/staff/dashboard'); } catch (err) { setError(err instanceof Error ? err.message : 'Please sign in first.'); } }}>Already signed in? Open workspace<ArrowRight size={15} /></button><small>Access is by invitation and staff authorization only. Creating a Google session does not grant access to patient records. Contact your administrator for account recovery.</small></div></section>;
}
