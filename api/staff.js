import supabase from './db-client.js';
import { headers, fail, requireStaff } from '../backend/middleware/security.js';
export default async function handler(req, res) { if (headers(req, res)) return; if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' }); try { const staff = await requireStaff(req); return res.status(200).json(staff); } catch (err) { return fail(res, err); } }
