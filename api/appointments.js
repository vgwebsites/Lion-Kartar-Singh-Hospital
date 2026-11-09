import supabase from './db-client.js';
import { headers, fail, requireStaff, rateLimit, body, text, badRequest, today, validDate, hash } from '../backend/middleware/security.js';
import { readPrivate, writePrivate, listPrivate, deletePrivate, getVerifiedContent } from '../backend/services/privateStore.js';
const statuses = ['Pending', 'Confirmed', 'Rescheduled', 'Cancelled'];
const windows = ['09:00–11:00', '11:00–13:00', '14:00–16:00', '16:00–18:00'];
export default async function handler(req, res) {
  if (headers(req, res)) return;
  try {
    if (req.method === 'POST') {
      const input = body(req); await rateLimit(req, 'appointment');
      const full_name = text(input.full_name, 2, 100, 'Patient name');
      const age = input.age; if (typeof age !== 'number' || !Number.isInteger(age) || age < 0 || age > 120) throw badRequest('Enter an age between 0 and 120.');
      if (!['Female', 'Male', 'Other', 'Prefer not to say'].includes(input.gender)) throw badRequest('Select a valid gender option.');
      const mobile = String(input.mobile || '').replace(/[\s()-]/g, '').replace(/^\+91/, '');
      if (!/^[6-9]\d{9}$/.test(mobile)) throw badRequest('Enter a valid 10-digit Indian mobile number.');
      const email = text(input.email || '', 0, 150, 'Email'); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Enter a valid email address.');
      if (!validDate(input.preferred_date) || input.preferred_date < today()) throw badRequest('Choose today or a future appointment date.');
      if (!windows.includes(input.preferred_time)) throw badRequest('Select a valid preferred time window.');
      if (input.consent !== true) throw badRequest('Privacy consent is required.');
      const reason = text(input.reason, 5, 1000, 'Reason for appointment'); const message = text(input.message || '', 0, 1500, 'Additional message');
      const department_id = Number(input.department_id); const doctor_id = input.doctor_id ? Number(input.doctor_id) : null;
      const content = await getVerifiedContent();
      if (!content.departments.some(department => department.id === department_id)) throw badRequest('Please choose a listed department.');
      if (doctor_id && !content.doctors.some(doctor => doctor.id === doctor_id && doctor.department_id === department_id)) throw badRequest('This doctor is not listed for the selected department.');
      const id = hash(JSON.stringify([mobile, full_name.toLowerCase().replace(/\s+/g, ' '), department_id, input.preferred_date, input.preferred_time]));
      const reference = `LKS-${input.preferred_date.replace(/-/g, '')}-${id.slice(0, 10).toUpperCase()}`;
      const existing = await readPrivate('appointments', id);
      if (existing) return res.status(200).json({ reference: existing.reference, duplicate: true, notification_sent: false });
      const now = new Date().toISOString();
      const record = { id, reference, full_name, age, gender: input.gender, mobile, email, department_id, doctor_id, preferred_date: input.preferred_date, preferred_time: input.preferred_time, reason, message, status: 'Pending', consent_at: now, created_at: now, updated_at: now, scheduled_date: null, scheduled_time: null, status_history: [{ status: 'Pending', at: now }], staff_note: '' };
      try { await writePrivate('appointments', id, record); }
      catch (error) { if (String(error.statusCode) === '409' || /already exists|duplicate/i.test(error.message)) return res.status(200).json({ reference, duplicate: true, notification_sent: false }); throw error; }
      return res.status(201).json({ reference, duplicate: false, notification_sent: false });
    }
    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
    const staff = await requireStaff(req);
    if (req.method === 'GET') return res.status(200).json(await listPrivate('appointments'));
    const input = body(req); if (typeof input.id !== 'string' || !/^[a-f0-9]{64}$/.test(input.id)) throw badRequest('A valid appointment identifier is required.');
    if (req.method === 'DELETE') { await deletePrivate('appointments', input.id); return res.status(200).json({ ok: true }); }
    if (!statuses.includes(input.status)) throw badRequest('Choose a valid appointment status.');
    const scheduled_date = input.scheduled_date || null; const scheduled_time = input.scheduled_time || null;
    if (scheduled_date && (!validDate(scheduled_date) || scheduled_date < today())) throw badRequest('The agreed date cannot be in the past.');
    if (scheduled_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduled_time)) throw badRequest('Enter a valid appointment time.');
    if (['Confirmed', 'Rescheduled'].includes(input.status) && (!scheduled_date || !scheduled_time)) throw badRequest('Set an agreed date and time before confirming or rescheduling.');
    const staff_note = text(input.staff_note || '', 0, 2000, 'Internal note');
    const previous = await readPrivate('appointments', input.id); if (!previous) throw badRequest('This request no longer exists.');
    const now = new Date().toISOString(); const history = [...(previous.status_history || []), { status: input.status, at: now, staff_id: staff.user_id }].slice(-200);
    const record = await writePrivate('appointments', input.id, { ...previous, status: input.status, scheduled_date, scheduled_time, staff_note, updated_at: now, status_history: history }, true);
    return res.status(200).json(record);
  } catch (err) { return fail(res, err); }
}
