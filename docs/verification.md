# Deployment verification

Date: 2026-11-09

- PASS: Public content loads from Supabase; private API endpoints reject anonymous requests.
- PASS: Server rejects invalid mobile numbers, past dates and missing consent.
- PASS: All six pages render without horizontal overflow at 320, 375, 425, 768, 1024, 1280 and 1440px.
- PASS: Mobile navigation, route changes, doctor search and department details work.
- PASS: Client validation, booking submission, unique reference, database persistence and duplicate protection pass.
- PASS: Patient data is absent from public tables; vault read/write/delete access is denied to anonymous and browser-authenticated clients.
- PASS: Contact inquiry form saves successfully.
- PASS: Staff login, read, confirmation, rescheduling, cancellation, audit history, inquiry review, deletion and sign-out pass.
- PASS: No uncaught browser runtime errors.

Test records were removed. Notifications are not configured and were not tested. Automated Chromium viewport testing does not replace physical-device testing.
