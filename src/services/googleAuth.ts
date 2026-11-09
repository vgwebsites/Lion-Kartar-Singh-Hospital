import supabase, { supabaseUrl, supabaseKey } from './supabase';
export function signInWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_AUTH_PROXY;
  if (!clientId || !redirectUri) throw new Error('Google sign-in is not configured. Please use your staff email and password.');
  const state = btoa(JSON.stringify({ origin: window.location.origin, appName: 'Lion Kartar Singh Hospital', supabaseUrl, supabaseAnonKey: supabaseKey }));
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(state)}`;
  const popup = window.open(url, 'google-auth', /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? '' : 'width=500,height=600');
  if (!popup) throw new Error('Please allow pop-ups to sign in with Google.');
  const handler = async (event: MessageEvent) => {
    if (event.source !== popup) return;
    if (event.data?.type === 'google-auth-denied') { window.removeEventListener('message', handler); return; }
    if (event.data?.type !== 'google-auth-success') return;
    window.removeEventListener('message', handler);
    await supabase.auth.setSession({ access_token: event.data.access_token, refresh_token: event.data.refresh_token });
  };
  window.addEventListener('message', handler);
}
export async function handleGoogleRedirect() {
  if (!new URLSearchParams(window.location.hash.slice(1)).has('google_auth_popup')) return;
  const { data } = await supabase.auth.getSession();
  if (data.session) window.close();
}
