import supabase from './supabase';
export async function api<T>(url: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in to continue.');
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const response = await fetch(url, { ...options, headers });
  let data;
  try { data = await response.json(); } catch { throw new Error('The service is temporarily unavailable. Please try again.'); }
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}
export const indiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const formatDate = (date: string) => new Date(date.includes('T') ? date : `${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
