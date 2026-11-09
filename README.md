# Lion Kartar Singh Hospital

A deployed, responsive healthcare website with six public pages, specialty details, attributed public directory content, appointment and inquiry forms, and an authenticated reception workspace. React/TypeScript (TSX), Vite, React Router, Lucide, Framer Motion and **custom CSS only**. No Tailwind, Bootstrap or Material UI is used.

## Supported stack

As approved, this uses Vercel Node.js serverless APIs and Supabase instead of Express/MongoDB. Public directory information is in Supabase/Postgres. **Patient and inquiry records are encrypted JSON documents in a service-only Supabase Storage vault**, with object indexes/metadata in the managed Postgres storage schema. This is persistent backend storage, not a frontend demo. Authentication is Supabase Auth; passwords are not stored by the app.

## Install and run

1. `npm ci`
2. Configure a Supabase project in the root `.env` using `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never put the service-role key in a `VITE_` variable or frontend code.
3. `npm run build` runs TypeScript checks and creates the production bundle.
4. `npm run dev` runs Vite with the project's API handlers mounted for local development. `npm run dev:vercel` runs the app through Vercel's local runtime when you need deployment parity.
5. Deploy to Vercel with the server/public environment variables. The existing configuration preserves those variables and adds nested-page routing.

## Supabase database setup

The configured Supabase project must be the same project named by `VITE_SUPABASE_URL`.

1. Open the Supabase project matching `VITE_SUPABASE_URL` in the Dashboard and open **SQL Editor**.
2. The connected project already has all three tables with the expected 19/11/12 columns, so **do not run the initial schema migration against it**. That migration is for a fresh project only; it uses `CREATE TABLE` and is not a retrofit script.
3. Review and run [`supabase/seed.sql`](supabase/seed.sql) in SQL Editor. It uses conflict-safe inserts and never updates or deletes existing rows. It seeds the current operator-listed hospital contact/address, sourced department listings, and the two Practo profiles marked registration-verified. Conflicting bed-count sources are disclosed in `about`; `email` and `hours` remain `NULL` pending hospital confirmation.
4. The seed inserts one approved hospital row with `id = 1`; the API uses `.single()` for that row. It sets department and doctor foreign keys through the approved department slugs. Review all source-linked data before running the seed.
5. In SQL Editor, verify the tables and hospital row:

   ```sql
   select table_name
   from information_schema.tables
   where table_schema = 'public'
     and table_name in ('lks_hospital', 'lks_departments', 'lks_doctors')
   order by table_name;

   select id, name, verified_on from public.lks_hospital;

   select id, slug, name, is_approved
   from public.lks_departments
   order by sort_order, id;

   select doctor.id, doctor.name, doctor.department_id, department.slug as department_slug
   from public.lks_doctors as doctor
   join public.lks_departments as department on department.id = doctor.department_id
   order by doctor.id;
   ```

6. Restart the dev server and request `/api/content`. The REST API should return HTTP 200 JSON. A missing table produces `PGRST205`; a missing `id = 1` row produces `PGRST116`. The migration file in this repository does not change the remote project until it is run there.

### Directory details to confirm with hospital staff

- Current bed capacity: Practo currently lists 20; the BMC registered nursing-home list from 2020 lists 13. The seeded `about` text discloses this discrepancy; the page labels the number as Practo-listed.
- Current OPD hours: the SBS Health operator page lists Mon–Sat 9 AM–9 PM; the Lions District 3231 A3 booklet lists 8:30 AM–6 PM daily. The database `hours` field is left `NULL` until confirmed.
- Facility-specific email: left `NULL`; the SBS Health site lists a general company email, not a facility-specific address.
- Contact number: seeded from the SBS Health operator listing; confirm that it is still the hospital reception number before relying on it.
- Doctor affiliation and availability: profiles are directory-listed and should be confirmed with the hospital before booking. Practo marks the two seeded profiles' medical registrations verified; this is not independent confirmation of current hospital affiliation.
- The seed does not add hospital photos or patient reviews.

The application does not store appointments or inquiries in additional public tables. It encrypts these records in the private `lks-clinical-vault` Storage bucket; API handlers verify the Supabase Auth user's `app_metadata.lks_role` is `receptionist` or `administrator` before using the server-only service role. The bucket has no anonymous or authenticated client policies, so patient records remain inaccessible directly from browser clients. Do not add public Storage policies or expose the service-role key.

## Project structure

- `src/App.tsx` and `src/HospitalApp.tsx`: app entry, lazy-loaded routes and providers.
- `src/components/`: navbar, footer, page intro, cards, loader, scroll reveals, contexts and appointment form.
- `src/pages/`: Home, AboutUs, OurTeam, Departments, ContactUs, BookAppointment, privacy/sources and 404.
- `src/admin/`: login and receptionist dashboard.
- `src/services/`: fetch client and Supabase/Google authentication helpers.
- `src/styles/site.css`: all custom responsive styles.
- `api/`: content, appointment, inquiry and staff REST handlers. Existing resilient `db-client.js`/`db-wake.js` are preserved.
- `backend/middleware/security.js`: validation, authenticated staff roles, no-cache headers, honeypot and persistent rate limiting.
- `backend/services/privateStore.js`: secure vault provisioning, AES-256-GCM encryption, persistent record CRUD and approved directory snapshot.
- `scripts/verify-live.mjs`: deployed browser/API/security verification.
- `public/images/hospital-concept.webp`: optimized, labelled AI visualization.

## Persistence and schema

Active public tables (created by the migration above):
- `lks_hospital`: identity, address, map coordinates, sourced text, bed count, source URLs and review date.
- `lks_departments`: specialty names, descriptions, services, sources and ordering.
- `lks_doctors`: names, listed qualifications/experience, specialties, department FK and source URLs.

Private records in **`lks-clinical-vault`**:
- `appointments/<HMAC>.json`: reference, name, age, gender, phone, optional email, department/doctor IDs, date/time preferences, reason/message, consent and creation/update timestamps, status, agreed schedule, internal note and last 200 audit events.
- `inquiries/<UUID>.json`: name, email, message, consent time, creation time and reviewed flag.
- `limits/<HMAC>.json`: approximate request count and reset timestamp; no raw IP.
- `content/approved-directory.json`: approved snapshot of the actual database directory rows.

Every document is encrypted with AES-256-GCM, a random 96-bit IV and a path-bound authentication tag. The encryption key is derived server-side from the service-role key with a domain separator; never expose it to the browser. Key rotation therefore requires decrypt/re-encrypt migration using the old key. Storage indexes and non-sensitive record-type metadata are maintained by Supabase's Postgres storage schema. No patient record or medical detail is inserted into public-schema application tables.

### Why a service-only vault?

Security testing detected that the provided table-creation tooling installs a permissive `allow_all` policy, and its policy tool cannot remove an existing policy. A generic private-bucket helper also grants access to all authenticated users. **Those defaults are not trusted for patient data or staff authorization.** The final backend provisions a different bucket through the native service-role Storage API, which creates no client-facing policies. It rejects a public bucket, encrypts each document, and exposes records only through staff-authorized APIs. Anonymous and ordinary authenticated direct storage access must remain denied.

Initial scaffold tables `lks_appointments`, `lks_inquiries`, `lks_staff` and `lks_rate_limits`, and the unused `lks-private-records` bucket, are not used for sensitive data or authorization. They can be removed by a database administrator. Never put patient information in those scaffold tables without replacing their permissive default grants. The public content API compares database rows to its protected approved snapshot and falls back to the approved version if public rows are altered. To publish a verified directory update, an authorized infrastructure administrator must deliberately refresh the approved encrypted snapshot using the backend helper after reviewing the database changes.

## REST routes

- `GET /api/content`: reads the real public database, checks the protected approved snapshot, returns directory content.
- `POST /api/appointments`: server validation, durable encrypted save, reference response only.
- `GET /api/appointments`: authorized staff list of up to 1000 records.
- `PUT /api/appointments`: authorized status/schedule/note changes and audit history.
- `DELETE /api/appointments`: authorized permanent deletion, with a confirmation dialog in the UI.
- `POST /api/inquiries`: validates and saves a general inquiry.
- `GET/PUT/DELETE /api/inquiries`: authorized read, review and deletion.
- `GET /api/staff`: verifies a session token and immutable administrative staff role.

Indian mobile validation, consent, doctor/department matching, valid date checks and length limits run on the server and client. Dates use Asia/Kolkata. Preferred time windows are not verified clinic hours. Confirmed/rescheduled records require an agreed date and time. A deterministic HMAC path and non-upserting creation prevent simultaneous duplicate submissions for the same normalized name, phone, specialty, date and time. Rate limiting allows roughly eight submissions per 15 minutes per hashed IP and form type; simultaneous edge requests may marginally exceed it. Use an atomic gateway limiter, paginated indexed queries, concurrency controls and an operational audit system for larger deployments.

## Reception staff

Staff authorization depends on Supabase Auth **`app_metadata.lks_role`**, not user-editable metadata or the scaffold staff table. Only `receptionist` and `administrator` roles are accepted. API handlers validate each access token with Supabase Auth before checking that role. A bootstrap testing account was provisioned through the privileged administrative pathway. Its credentials are not stored in this repository or published in the app. No route can grant new staff access.

To authorize real staff, use Supabase's privileged admin workflow to create/invite users and set `app_metadata` fields `lks_role` and `lks_display_name`. Public users cannot set these fields. To revoke access, remove `lks_role`. Remove/replace the bootstrap account before real patient use. Use administrator-managed account recovery and enable MFA before operational hospital deployment. Google sign-in uses the supplied proxy, but a Google session alone never grants clinical access.

## Notifications: not operational

Email and SMS delivery are **not implemented or enabled**. No verified official hospital mailbox or delivery integration is available. Requests and status updates are saved only. UI confirmations explicitly say no hospital/patient notification was sent. `.env.example` reserves SMTP and official-email fields for a future integration; filling them alone does not activate transport. A verified operator must implement a server-only transport and durable delivery queue with retries, consent review and audit logging, then test delivery before making any delivery claim.

## Accuracy and images

Sources reviewed 9 November 2026:
- Supplied map coordinates: 19.1242612, 72.8409879.
- Practo: https://www.practo.com/mumbai/hospital/lion-kartar-singh-hospital-andheri-west
- Lybrate ENT: https://www.lybrate.com/mumbai/clinic/lion-kartar-singh-hospital-gilbert-hill-andheri-west-

Public directory affiliations/qualifications are attributed, not independently verified registrations or guaranteed current availability. Conflicting postal codes and hours are omitted. Official phone/email, emergency facilities, ownership/founding date, accreditation and hospital mission are not invented. Actual exterior/reception/interior/facility/clinician photos are withheld until licensed permissions are available. The AI building is labelled as fictional, not the existing hospital or an approved development. Neutral silhouettes do not impersonate clinicians. Testimonials are not republished without verification and reuse permission.

## Verification

Run after deployment with environment-only credentials:

`TEST_BASE_URL=... TEST_STAFF_EMAIL=... TEST_STAFF_PASSWORD=... node --env-file=.env scripts/verify-live.mjs`

The test checks all six pages at 320, 375, 425, 768, 1024, 1280 and 1440 px; mobile navigation; directory search; nested routes; client/server validation; real persistence; duplicate protection; anonymous/private storage denial; staff login; status changes; inquiry review; audit history; deletion; and sign-out. It cleans up its explicitly labelled QA records and saves screenshots/report in `test-results/`. No real patient data is used. Chromium viewport testing is not physical Android/iOS testing. Email delivery and actual hospital scheduling cannot be tested because those integrations are absent.

## Before accepting real patients

This independently built portal has no verified hospital participation. A saved request is not a confirmed visit and is never an emergency service. Complete hospital onboarding, official contact verification, staff provisioning, privacy/legal review, backup/retention policy, MFA, key-management and recovery procedures before real clinical use. Records persist until staff deletion; no automatic retention is configured. CSV exports contain sensitive data and must be stored securely. Google Maps and Fonts make third-party connections. No advertising analytics were added.
