import supabase from './db-client.js';
import { headers, fail } from '../backend/middleware/security.js';
import { getVerifiedContent } from '../backend/services/privateStore.js';
export default async function handler(req, res) {
  if (headers(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const content = await getVerifiedContent();
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).json(content);
  } catch (err) { return fail(res, err); }
}
