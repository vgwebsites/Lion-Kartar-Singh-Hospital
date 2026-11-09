import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import supabase from '../../api/db-client.js';
export const privateBucket = 'lks-clinical-vault';
let provision;
async function bucket() {
  if (!provision) provision = (async () => {
    const { data, error } = await supabase.storage.getBucket(privateBucket);
    if (data) { if (data.public) throw new Error('Clinical vault must be private'); return; }
    if (error && !/not found|does not exist/i.test(error.message)) throw error;
    // The native service-role API creates a private bucket without granting access to all authenticated users.
    const created = await supabase.storage.createBucket(privateBucket, { public: false, fileSizeLimit: 262144, allowedMimeTypes: ['application/json'] });
    if (created.error && !/already exists|duplicate/i.test(created.error.message)) throw created.error;
  })().catch(error => { provision = undefined; throw error; });
  await provision;
  return supabase.storage.from(privateBucket);
}
const pathFor = (collection, id) => {
  if (!/^[a-z-]+$/.test(collection) || !/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid private record path');
  return `${collection}/${id}.json`;
};
const encryptionKey = () => createHash('sha256').update(`${process.env.SUPABASE_SERVICE_ROLE_KEY}:lks-clinical-vault-v1`).digest();
function seal(value, path) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); cipher.setAAD(Buffer.from(path));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: encrypted.toString('base64') };
}
function open(envelope, path) {
  if (envelope.version !== 1) throw new Error('Unsupported vault record');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(envelope.iv, 'base64')); decipher.setAAD(Buffer.from(path)); decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}
export async function readPrivate(collection, id) {
  const vault = await bucket(); const path = pathFor(collection, id);
  const { data, error } = await vault.download(path, {}, { cache: 'no-store' });
  if (error) { if (/not found|does not exist/i.test(error.message)) return null; throw error; }
  return open(JSON.parse(await data.text()), path);
}
export async function writePrivate(collection, id, value, overwrite = false) {
  const vault = await bucket(); const path = pathFor(collection, id); const envelope = seal(value, path);
  const { error } = await vault.upload(path, Buffer.from(JSON.stringify(envelope)), { contentType: 'application/json', upsert: overwrite, cacheControl: '0', metadata: { schema_version: 1, record_type: collection } });
  if (error) throw error;
  return await readPrivate(collection, id);
}
export async function listPrivate(collection) {
  const vault = await bucket();
  const { data: files, error } = await vault.list(collection, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw error;
  const records = [];
  for (let i = 0; i < files.length; i += 12) {
    const batch = await Promise.all(files.slice(i, i + 12).filter(file => file.name.endsWith('.json')).map(file => readPrivate(collection, file.name.slice(0, -5))));
    records.push(...batch.filter(Boolean));
  }
  return records.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}
export async function deletePrivate(collection, id) { const vault = await bucket(); const { error } = await vault.remove([pathFor(collection, id)]); if (error) throw error; }
export async function getVerifiedContent() {
  const approved = await readPrivate('content', 'approved-directory');
  const [hospital, departments] = await Promise.all([
    supabase.from('lks_hospital')
      .select('id,name,address,locality,city,maps_url,latitude,longitude,phone,email,hours,introduction,about,bed_count,verified_on,sources')
      .eq('id', 1)
      .eq('is_approved', true)
      .single(),
    supabase.from('lks_departments')
      .select('id,slug,name,icon,description,services,source_url,sort_order')
      .eq('is_approved', true)
      .order('sort_order', { ascending: true }),
  ]);
  if (hospital.error || departments.error) {
    if (approved) return approved;
    throw hospital.error || departments.error;
  }

  const departmentIds = departments.data.map(department => department.id);
  let doctorRecords = [];
  if (departmentIds.length) {
    const doctors = await supabase.from('lks_doctors')
      .select('id,name,qualification,specialty,experience,bio,department_id,source_url,initials')
      .eq('is_approved', true)
      .in('department_id', departmentIds)
      .order('id', { ascending: true });
    if (doctors.error) {
      if (approved) return approved;
      throw doctors.error;
    }
    doctorRecords = doctors.data;
  }

  const current = { hospital: hospital.data, departments: departments.data, doctors: doctorRecords };
  if (approved) return JSON.stringify(current) === JSON.stringify(approved) ? current : approved;
  try { return await writePrivate('content', 'approved-directory', current); }
  catch (error) { if (String(error.statusCode) === '409' || /already exists|duplicate/i.test(error.message)) return await readPrivate('content', 'approved-directory'); throw error; }
}
