import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
const base = process.env.TEST_BASE_URL;
if (!base || !process.env.TEST_STAFF_EMAIL || !process.env.TEST_STAFF_PASSWORD) throw new Error('Set TEST_BASE_URL, TEST_STAFF_EMAIL and TEST_STAFF_PASSWORD. Never commit test credentials.');
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const anonymous = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const signed = await client.auth.signInWithPassword({ email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD });
assert.ifError(signed.error);
let token = signed.data.session.access_token;
const request = async (path, method = 'GET', data, auth = false) => {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, data: await response.json() };
};
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = []; page.on('pageerror', error => errors.push(error.message));
const visit = path => page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
const runId = randomUUID().slice(0, 8);
const testName = `QA Appointment ${runId}`;
const inquiryName = `QA Inquiry ${runId}`;
const email = `qa-${runId}@example.com`;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const report = [];
try {
  await mkdir('test-results', { recursive: true });
  const content = await request('/api/content'); assert.equal(content.status, 200); assert.equal(content.data.departments.length, 6); assert.equal(content.data.doctors.length, 5);
  assert.equal((await request('/api/appointments')).status, 401); assert.equal((await request('/api/inquiries')).status, 401);
  report.push('Public content loads from Supabase; private API endpoints reject anonymous requests.');
  const payload = { full_name: testName, age: 35, gender: 'Prefer not to say', mobile: '9999999990', email, department_id: 2, doctor_id: 1, preferred_date: today, preferred_time: '09:00–11:00', reason: 'Automated QA test — not a real patient', message: '', consent: true };
  assert.equal((await request('/api/appointments', 'POST', { ...payload, mobile: '123' })).status, 400);
  assert.equal((await request('/api/appointments', 'POST', { ...payload, preferred_date: '2000-01-01' })).status, 400);
  assert.equal((await request('/api/appointments', 'POST', { ...payload, consent: false })).status, 400);
  report.push('Server rejects invalid mobile numbers, past dates and missing consent.');
  const routes = ['/', '/about', '/team', '/departments', '/contact', '/book-appointment'];
  for (const width of [320, 375, 425, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await visit(route); await page.locator('main h1').waitFor({ state: 'visible' });
      const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, offenders: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute').slice(0, 8).map(el => `${el.tagName}.${el.className}`) }));
      assert.ok(overflow.scroll <= width + 1, `${route} at ${width}px overflow: ${JSON.stringify(overflow)}`);
      if (route === '/' && (width === 1440 || width === 375)) { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: false }); }
    }
  }
  report.push('All six pages render without horizontal overflow at 320, 375, 425, 768, 1024, 1280 and 1440px.');
  await page.setViewportSize({ width: 375, height: 900 }); await visit('/');
  await page.getByRole('button', { name: 'Open navigation' }).click(); await page.locator('#primary-nav').getByRole('link', { name: 'Our Team' }).click(); await page.waitForURL('**/team'); await page.getByRole('heading', { name: 'People dedicated to the art of care.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Open navigation' }).getAttribute('aria-expanded'), 'false');
  await page.getByRole('textbox', { name: 'Search doctors' }).fill('Nikita'); assert.equal(await page.locator('.doctor-card').count(), 1);
  await visit('/departments/ophthalmology'); await page.getByRole('heading', { level: 1, name: 'Ophthalmology' }).waitFor();
  report.push('Mobile navigation, route changes, doctor search and department details work.');
  await visit('/book-appointment?department=2&doctor=1'); await page.locator('#full_name').waitFor();
  await page.getByRole('button', { name: 'Submit Appointment Request' }).click(); await page.locator('#full_name-error').waitFor();
  await page.locator('#full_name').fill(testName); await page.locator('#age').fill('35'); await page.locator('#gender').selectOption('Prefer not to say'); await page.locator('#mobile').fill('9999999990'); await page.locator('#email').fill(email); await page.locator('#preferred_date').fill(today); await page.locator('#preferred_time').selectOption('09:00–11:00'); await page.locator('#reason').fill(payload.reason); await page.locator('input[name="consent"]').check();
  await page.getByRole('button', { name: 'Submit Appointment Request' }).click(); await page.getByRole('heading', { name: 'One step closer to care.' }).waitFor();
  const reference = await page.locator('.reference-box strong').textContent(); assert.ok(reference.startsWith('LKS-'));
  const duplicate = await request('/api/appointments', 'POST', payload); assert.equal(duplicate.status, 200); assert.equal(duplicate.data.duplicate, true); assert.equal(duplicate.data.reference, reference);
  const saved = await request('/api/appointments', 'GET', undefined, true); assert.equal(saved.status, 200); const records = saved.data.filter(record => record.full_name === testName); assert.equal(records.length, 1); const recordId = records[0].id;
  report.push('Client validation, booking submission, unique reference, database persistence and duplicate protection pass.');
  const anonymousRead = await anonymous.from('lks_appointments').select('*').eq('id', recordId); assert.ok(anonymousRead.error || anonymousRead.data.length === 0, 'RLS exposed patient information');
  const privatePath = `appointments/${recordId}.json`;
  const anonymousFile = await anonymous.storage.from('lks-clinical-vault').download(privatePath); assert.ok(anonymousFile.error, 'An anonymous user could read the clinical vault');
  const signedFile = await client.storage.from('lks-clinical-vault').download(privatePath); assert.ok(signedFile.error, 'A browser session could bypass the staff API and read the clinical vault');
  const probe = `probes/qa-${runId}.json`;
  const signedWrite = await client.storage.from('lks-clinical-vault').upload(probe, '{}', { contentType: 'application/json' });
  if (!signedWrite.error) await client.storage.from('lks-clinical-vault').remove([probe]);
  assert.ok(signedWrite.error, 'A browser session could write directly to the clinical vault');
  await client.storage.from('lks-clinical-vault').remove([privatePath]);
  assert.ok((await request('/api/appointments', 'GET', undefined, true)).data.some(a => a.id === recordId), 'A browser session could delete the clinical vault record directly');
  report.push('Patient data is absent from public tables; vault read/write/delete access is denied to anonymous and browser-authenticated clients.');
  await visit('/contact'); await page.locator('#contact-name').fill(inquiryName); await page.locator('#contact-email').fill(email); await page.locator('#contact-message').fill('Automated QA inquiry. This is not a real patient request.'); await page.locator('input[name="consent"]').check(); await page.getByRole('button', { name: 'Send Inquiry' }).click(); await page.getByRole('heading', { name: 'Your inquiry has been saved.' }).waitFor();
  report.push('Contact inquiry form saves successfully.');
  assert.equal((await request('/api/appointments', 'PUT', { id: recordId, status: 'Confirmed' }, true)).status, 400);
  await page.setViewportSize({ width: 1440, height: 1000 }); await visit('/staff/login'); await page.locator('#staff-email').fill(process.env.TEST_STAFF_EMAIL); await page.locator('#staff-password').fill(process.env.TEST_STAFF_PASSWORD); await page.getByRole('button', { name: 'Sign In Securely' }).click(); await page.waitForURL('**/staff/dashboard'); await page.getByRole('heading', { name: 'Hello, Reception.' }).waitFor();
  await page.getByRole('textbox', { name: 'Search appointments' }).fill(testName); await page.getByRole('button', { name: 'Manage', exact: true }).click(); await page.locator('#appointment-status').selectOption('Confirmed'); await page.locator('#scheduled-date').fill(today); await page.locator('#scheduled-time').fill('11:00'); await page.locator('#staff-note').fill('Automated QA confirmation; not a clinical appointment.'); await page.getByRole('button', { name: 'Save Changes' }).click(); await page.locator('.status-confirmed').first().waitFor();
  const updated = (await request('/api/appointments', 'GET', undefined, true)).data.find(a => a.id === recordId); assert.equal(updated.status, 'Confirmed'); assert.equal(updated.status_history.length, 2);
  await page.screenshot({ path: 'test-results/dashboard-1440.png', fullPage: false });
  await page.getByRole('button', { name: /^Inquiries/ }).click(); const inquiry = page.locator('.inquiry-card').filter({ hasText: inquiryName }); await inquiry.getByRole('button', { name: 'Mark as reviewed' }).click(); await inquiry.getByRole('button', { name: 'Reopen inquiry' }).waitFor();
  await page.getByRole('button', { name: /^Appointments/ }).click(); await page.getByRole('button', { name: 'Manage', exact: true }).click(); await page.locator('#appointment-status').selectOption('Rescheduled'); await page.getByRole('button', { name: 'Save Changes' }).click(); await page.locator('.status-rescheduled').waitFor();
  await page.getByRole('button', { name: 'Manage', exact: true }).click(); await page.locator('#appointment-status').selectOption('Cancelled'); await page.getByRole('button', { name: 'Save Changes' }).click(); await page.locator('.status-cancelled').waitFor();
  await page.getByRole('button', { name: 'Manage', exact: true }).click(); page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Delete record' }).click(); await page.getByRole('status').filter({ hasText: 'Appointment and patient details deleted.' }).waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click(); await page.waitForURL('**/staff/login');
  report.push('Staff login, read, confirmation, rescheduling, cancellation, audit history, inquiry review, deletion and sign-out pass.');
  assert.equal(errors.length, 0, `Browser errors: ${errors.join('; ')}`); report.push('No uncaught browser runtime errors.');
  console.log(report.map(line => `PASS ${line}`).join('\n'));
  await writeFile('test-results/verification.md', `# Deployment verification\n\nDate: ${today}\n\n${report.map(line => `- PASS: ${line}`).join('\n')}\n\nTest records were removed. Notifications are not configured and were not tested. Automated Chromium viewport testing does not replace physical-device testing.\n`);
} finally {
  try {
    const cleanupSession = await client.auth.signInWithPassword({ email: process.env.TEST_STAFF_EMAIL, password: process.env.TEST_STAFF_PASSWORD });
    if (cleanupSession.error) throw cleanupSession.error;
    token = cleanupSession.data.session.access_token;
    const appointments = await request('/api/appointments', 'GET', undefined, true);
    for (const record of Array.isArray(appointments.data) ? appointments.data.filter(a => a.full_name === testName) : []) await request('/api/appointments', 'DELETE', { id: record.id }, true);
    const inquiries = await request('/api/inquiries', 'GET', undefined, true);
    for (const record of Array.isArray(inquiries.data) ? inquiries.data.filter(a => a.name === inquiryName) : []) await request('/api/inquiries', 'DELETE', { id: record.id }, true);
    await client.auth.signOut();
  } finally { await browser.close(); }
}
