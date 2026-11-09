import { randomUUID } from 'node:crypto';
import supabase from './db-client.js';
import { headers, fail, requireStaff, rateLimit, body, text, badRequest } from '../backend/middleware/security.js';
import { readPrivate, writePrivate, listPrivate, deletePrivate } from '../backend/services/privateStore.js';
export default async function handler(req, res) {
  if (headers(req, res)) return;
  try {
    if (req.method === 'POST') {
      const input = body(req); await rateLimit(req, 'inquiry');
      const name = text(input.name, 2, 100, 'Name'); const email = text(input.email, 5, 150, 'Email'); const message = text(input.message, 10, 2000, 'Message');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a valid email address.'); if (input.consent !== true) throw badRequest('Your consent is required.');
      const now = new Date().toISOString(); const id = randomUUID();
      await writePrivate('inquiries', id, { id, name, email, message, resolved: false, consent_at: now, created_at: now });
      return res.status(201).json({ ok: true, notification_sent: false });
    }
    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
    await requireStaff(req);
    if (req.method === 'GET') return res.status(200).json(await listPrivate('inquiries'));
    const input = body(req); if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/.test(input.id)) throw badRequest('A valid inquiry identifier is required.');
    if (req.method === 'DELETE') { await deletePrivate('inquiries', input.id); return res.status(200).json({ ok: true }); }
    if (typeof input.resolved !== 'boolean') throw badRequest('A valid review status is required.');
    const previous = await readPrivate('inquiries', input.id); if (!previous) throw badRequest('This inquiry no longer exists.');
    const record = await writePrivate('inquiries', input.id, { ...previous, resolved: input.resolved }, true);
    return res.status(200).json(record);
  } catch (err) { return fail(res, err); }
}
