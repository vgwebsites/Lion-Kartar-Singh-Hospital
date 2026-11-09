import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ScrollReveal from './ScrollReveal';
export default function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="page-intro"><div className="container"><div className="breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><span>{eyebrow}</span></div><ScrollReveal><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></ScrollReveal><span className="intro-cross" aria-hidden="true">+</span></div></section>; }
