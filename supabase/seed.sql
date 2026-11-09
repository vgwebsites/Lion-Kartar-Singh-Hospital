-- Repeat-safe, non-destructive public directory seed.
-- Apply only to the Supabase project named by VITE_SUPABASE_URL.
-- Every write is INSERT ... DO NOTHING / WHERE NOT EXISTS; existing records
-- are never updated or deleted. Patient records are not stored in these tables.

begin;

insert into public.lks_hospital (
  id, is_approved, name, address, locality, city, maps_url, latitude, longitude,
  phone, email, hours, introduction, about, bed_count, verified_on, sources
) values (
  1,
  true,
  'Lion Kartar Singh Hospital',
  '1st Floor, 6-B, Dadabhai Cross Road, near Navrang Talkies, Gilbert Hill, Andheri West, Mumbai, Maharashtra 400058',
  'Andheri West',
  'Mumbai',
  'https://www.google.com/maps/place/Lion+Kartar+Singh+Hospital/@19.1242612,72.8409879,17z/',
  19.1242612,
  72.8409879,
  '09819459288',
  null,
  null,
  'SBS Health lists Lion Kartar Singh charitable Hospital (ICU Unit), managed by SBS Group, at 1st Floor, 6-B Dadabhai Cross Road, near Navrang Talkies, Gilbert Hill, Andheri West, Mumbai 400058.',
  'SBS Health lists 24/7 medical consultation, health check-ups, and in-house laboratory and imaging services for this facility. Practo currently lists 20 beds; the BMC registered nursing-home list from 2020 lists 13. Current bed capacity and operating hours require confirmation with the hospital.',
  20,
  date '2026-11-09',
  jsonb_build_array(
    jsonb_build_object('label', 'SBS Health: facility identity, address, contact, and listed services', 'url', 'https://www.sbshealth.com/locations.html'),
    jsonb_build_object('label', 'Practo hospital listing: current directory-listed bed count and specialties', 'url', 'https://www.practo.com/mumbai/hospital/lion-kartar-singh-hospital-andheri-west'),
    jsonb_build_object('label', 'BMC 2020 registered nursing-home list: older bed-count entry', 'url', 'https://www.mcgm.gov.in/irj/go/km/docs/documents/HomePage%20Data/Whats%20New/NON-%20COVID%20FACILITIES/REGISTERED%20PRIVATE%20NURSING%20HOMES%20LIST.pdf'),
    jsonb_build_object('label', 'Lions International District 3231 A3 medical-centre booklet', 'url', 'https://lionsdistrict3231a3.org/wp-content/uploads/2024/11/Booklet-on-Medical-Centres-in-District-3231-A3.pdf'),
    jsonb_build_object('label', 'Google Maps pin supplied by the project owner', 'url', 'https://www.google.com/maps/place/Lion+Kartar+Singh+Hospital/@19.1242612,72.8409879,17z/')
  )
)
on conflict (id) do nothing;

insert into public.lks_departments (
  is_approved, slug, name, icon, description, services, source_url, sort_order
) values
  (
    true, 'ophthalmology', 'Ophthalmology', 'eye',
    'Practo lists ophthalmology at Lion Kartar Singh Hospital. Confirm current services and clinician availability with the hospital.',
    '["Eye Checkup - General", "Laser Refractive And Cataract"]'::jsonb,
    'https://www.practo.com/mumbai/hospital/lion-kartar-singh-hospital-andheri-west',
    10
  ),
  (
    true, 'general-physician', 'General Physician', 'heart',
    'Practo lists a general physician at Lion Kartar Singh Hospital. Confirm current affiliation and availability with the hospital.',
    '["General Physician consultation (Practo-listed)"]'::jsonb,
    'https://www.practo.com/mumbai/hospital/lion-kartar-singh-hospital-andheri-west',
    20
  ),
  (
    true, 'dentistry', 'Dentistry', 'smile',
    'Practo lists a dentist at Lion Kartar Singh Hospital. Confirm current services and clinician availability with the hospital.',
    '["Dental consultation (Practo-listed)"]'::jsonb,
    'https://www.practo.com/mumbai/hospital/lion-kartar-singh-hospital-andheri-west',
    30
  ),
  (
    true, 'gynecology-obstetrics', 'Gynecology and Obstetrics', 'baby',
    'Practo lists Gynecology/Obstetrics for the hospital; the Lions District 3231 A3 booklet also lists gynaecology. Confirm current services with the hospital.',
    '["Gynecology/Obstetrics (Practo listing)", "Gynaecology (Lions District booklet)"]'::jsonb,
    'https://www.practo.com/mumbai/hospital/lion-kartar-singh-hospital-andheri-west',
    40
  )
on conflict (slug) do nothing;

with doctor_seed (
  name, qualification, specialty, experience, bio, department_slug, source_url, initials
) as (
  values
    (
      'Dr. Vidhan C Doshi',
      'MBBS, MS - Ophthalmology',
      'Ophthalmologist / Eye Surgeon',
      16,
      'Practo lists Dr. Vidhan C Doshi at Lion Kartar Singh Hospital and marks the medical registration verified. Confirm current affiliation and availability with the hospital.',
      'ophthalmology',
      'https://www.practo.com/mumbai/doctor/dr-vidhan-c-doshi?practice_id=689637',
      'VD'
    ),
    (
      'Dr. Nikita Pawar',
      'MBBS',
      'General Physician',
      12,
      'Practo lists Dr. Nikita Pawar at Lion Kartar Singh Hospital and marks the medical registration verified. Confirm current affiliation and availability with the hospital.',
      'general-physician',
      'https://www.practo.com/mumbai/doctor/dr-nikita-pawar-family-physician',
      'NP'
    )
), resolved_doctors as (
  select doctor_seed.*, department.id as department_id
  from doctor_seed
  join public.lks_departments as department
    on department.slug = doctor_seed.department_slug
   and department.is_approved
)
insert into public.lks_doctors (
  is_approved, name, qualification, specialty, experience, bio,
  department_id, source_url, initials
)
select
  true, doctor.name, doctor.qualification, doctor.specialty, doctor.experience,
  doctor.bio, doctor.department_id, doctor.source_url, doctor.initials
from resolved_doctors as doctor
where not exists (
  select 1
  from public.lks_doctors as existing
  where lower(existing.name) = lower(doctor.name)
    and existing.department_id = doctor.department_id
    and existing.source_url = doctor.source_url
)
on conflict do nothing;

notify pgrst, 'reload schema';
commit;
