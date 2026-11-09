import { Link } from 'react-router-dom';
import { ArrowLeft, HeartPulse } from 'lucide-react';
export default function NotFound() { return <section className="container not-found"><HeartPulse size={49} /><span className="eyebrow">LET’S GET YOU BACK ON TRACK</span><h1>This page isn’t here.</h1><p>The page may have moved, but your next step is just a click away.</p><Link className="button primary" to="/"><ArrowLeft size={17} />Back to Home</Link></section>; }
