import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Search, ShieldCheck } from 'lucide-react';
import { useContent } from '../components/ContentContext';
import { DepartmentCard, DoctorCard, MedicalIcon } from '../components/Cards';
import PageIntro from '../components/PageIntro';
import { CareCTA } from '../components/Layout';
import NotFound from './NotFound';
export default function Departments() {
  const { departments, doctors } = useContent();
  const { slug } = useParams();
  const [search, setSearch] = useState('');
  if (slug) {
    const department = departments.find(d => d.slug === slug);
    if (!department) return <NotFound />;
    const team = doctors.filter(d => d.department_id === department.id);
    return <><PageIntro eyebrow="Departments" title={department.name} description={department.description} /><section className="section container"><Link className="text-link back-link" to="/departments"><ArrowLeft size={17} />All departments</Link><div className="department-detail"><div><span className="medical-icon"><MedicalIcon name={department.icon} size={34} /></span><h2>A starting point for your care.</h2><p>{department.description}</p><h3>Publicly listed services</h3><ul className="service-list">{department.services.map(service => <li key={service}><Check size={18} />{service}</li>)}</ul><p className="muted">This is a directory-based overview, not confirmation that a procedure or clinician is available on your preferred date.</p><a href={department.source_url} target="_blank" rel="noreferrer" className="text-link">View the supporting source ↗</a></div><aside className="care-aside"><ShieldCheck size={32} /><h3>Let’s find your next step.</h3><p>Share your preferred date and specialty. All requests need authorized reception review and confirmation.</p><Link to={`/book-appointment?department=${department.id}`} className="button primary">Request an Appointment<ArrowRight size={17} /></Link><small>This portal does not offer medical advice or emergency care.</small></aside></div>{team.length > 0 ? <><div className="section-heading team-subheading"><div><span className="eyebrow">PUBLICLY LISTED CLINICIANS</span><h2>Meet the specialists.</h2></div></div><div className="doctor-grid">{team.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} />)}</div></> : <div className="information-note"><ShieldCheck /><p>No individual clinician has been independently verified for this specialty. Choose “Reception to advise” when requesting an appointment.</p></div>}</section><CareCTA /></>;
  }
  const filtered = departments.filter(d => `${d.name} ${d.description}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageIntro eyebrow="Departments" title="Specialist care. A clearer path forward." description="Explore specialties supported by public hospital listings. Find the right place to start your conversation." /><section className="section container"><div className="directory-toolbar"><p><strong>{departments.length} listed specialties</strong><span>Care for different chapters of life.</span></p><div className="search-field"><Search size={18} /><input aria-label="Search departments" placeholder="Find a department…" value={search} onChange={e => setSearch(e.target.value)} /></div></div><div className="department-grid full-grid">{filtered.map((department, index) => <DepartmentCard key={department.id} department={department} index={index} />)}</div>{!filtered.length && <div className="empty-state"><Search /><h3>No matching departments</h3><p>Try another specialty or clear your search.</p><button className="button outline" onClick={() => setSearch('')}>Clear search</button></div>}<div className="information-note"><ShieldCheck size={23} /><p>These specialties are based on Practo and Lybrate listings reviewed on 9 November 2026. Current availability, equipment, procedures and clinician schedules need confirmation directly with the hospital.</p></div></section><CareCTA /></>;
}
