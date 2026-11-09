import { createHmac } from 'node:crypto';
import supabase from '../../api/db-client.js';
import { readPrivate, writePrivate } from '../services/privateStore.js';
export function headers(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
export function hash(value) { return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY).update(value).digest('hex'); }
export async function requireStaff(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw Object.assign(new Error('Please sign in with an authorized staff account.'), { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error('Your session has expired. Please sign in again.'), { status: 401 });
  const metadata = user.app_metadata || {};
  if (!['receptionist', 'administrator'].includes(metadata.lks_role)) throw Object.assign(new Error('This account is not authorized to access patient records. Contact your portal administrator.'), { status: 403 });
  return { user_id: user.id, display_name: String(metadata.lks_display_name || 'Reception'), role: metadata.lks_role };
}
export async function rateLimit(req, action) {
  const raw = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const key = hash(`${action}:${raw}`);
  const previous = await readPrivate('limits', key);
  const current = previous && previous.reset_at > Date.now() ? previous : { count: 0, reset_at: Date.now() + 15 * 60 * 1000 };
  if (current.count >= 8) throw Object.assign(new Error('Too many requests. Please wait 15 minutes before trying again.'), { status: 429 });
  await writePrivate('limits', key, { ...current, count: current.count + 1 }, true);
}
export const badRequest = message => Object.assign(new Error(message), { status: 400 });
export function fail(res, err) {
  if (!err.status) console.error('Hospital API failed:', err.code || err.name || 'Persistence error');
  const message = err.status
    ? err.message
    : err.code === 'PGRST205'
      ? 'The configured Supabase project is missing the hospital directory tables. Run supabase/migrations/001_initial_schema.sql in that project.'
      : err.code === 'PGRST116'
        ? 'The configured Supabase project has no hospital directory record yet.'
        : 'We could not complete this request. Please try again shortly.';
  return res.status(err.status || 500).json({ error: message });
}
export function body(req) { if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw badRequest('A valid request body is required.'); if (JSON.stringify(req.body).length > 15000) throw badRequest('The request is too large.'); if (req.body.website) throw badRequest('Unable to accept this request.'); return req.body; }
export function text(value, min, max, label) { const clean = typeof value === 'string' ? value.trim() : ''; if (clean.length < min || clean.length > max) throw badRequest(`${label} must contain ${min}–${max} characters.`); return clean; }
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
