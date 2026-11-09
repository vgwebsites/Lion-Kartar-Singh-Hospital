import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Content } from '../types';
import { api } from '../services/api';
import Loader from './Loader';
import { HeartPulse, RefreshCw } from 'lucide-react';
const ContentContext = createContext<Content | null>(null);
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState('');
  const load = () => { setError(''); api<Content>('/api/content').then(setContent).catch(err => setError(err.message)); };
  useEffect(load, []);
  if (error) return <div className="app-error"><HeartPulse size={48} /><h1>A moment of care, please.</h1><p>{error}</p><button className="button primary" onClick={load}><RefreshCw size={17} />Try again</button></div>;
  if (!content) return <Loader full />;
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}
export function useContent() { const data = useContext(ContentContext); if (!data) throw new Error('Hospital content is unavailable.'); return data; }
