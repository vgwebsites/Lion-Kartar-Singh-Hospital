import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import ScrollReveal from './ScrollReveal';
import { publishedReviewSummary, reviewsUrl, testimonials, type Testimonial } from '../content/testimonials';
import '../styles/testimonials.css';

function Stars({ value, label }: { value: number; label: string }) {
  return <span className="testimonial-stars" role="img" aria-label={label}>{Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" className={index < value ? 'is-filled' : ''} size={15} />)}</span>;
}

export function AverageStars() {
  return <span className="testimonial-stars average-stars" role="img" aria-label="4.6 out of 5 stars">
    {Array.from({ length: 5 }, (_, index) => <span className="average-star" key={index}><Star aria-hidden="true" size={20} /><span style={{ width: index < 4 ? '100%' : '60%' }}><Star aria-hidden="true" size={20} /></span></span>)}
  </span>;
}

function ReviewCard({ review, index }: { review: Testimonial; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();
  const long = review.review.length > 280;
  const content = !long || expanded ? review.review : `${review.review.slice(0, 280).trimEnd()}…`;
  return <motion.article className="testimonial-card" initial={reducedMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.45, delay: reducedMotion ? 0 : index * 0.1 }} whileHover={reducedMotion ? undefined : { y: -4 }}>
    <div className="testimonial-card-top"><span className="testimonial-quote-icon"><Quote size={20} aria-hidden="true" /></span><Stars value={review.rating} label={`${review.rating} out of 5 stars`} /></div>
    <div className="testimonial-review" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.p key={expanded ? 'full' : 'short'} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0 }} transition={{ duration: 0.18 }}>{content.split('\n').map((paragraph, paragraphIndex) => <span className="testimonial-paragraph" key={paragraphIndex}>{paragraph}</span>)}</motion.p></AnimatePresence></div>
    {long && <button className="testimonial-read-more" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? 'Read less' : 'Read more'}</button>}
    <div className="testimonial-author"><span className="testimonial-avatar" aria-hidden="true">{review.initials}</span><div><strong>{review.name}</strong><span>{review.attribution}</span></div></div>
    {review.attributionNote && <p className="testimonial-attribution-note">{review.attributionNote}</p>}
  </motion.article>;
}

export default function Testimonials() {
  return <section className="testimonials-section section" aria-labelledby="testimonials-title">
    <div className="container">
      <ScrollReveal className="testimonials-heading"><div><span className="eyebrow">PATIENT & FAMILY FEEDBACK</span><h2 id="testimonials-title">What Our Patients Say</h2><p>Real experiences and feedback from patients and their families.</p></div>
        <div className="review-summary" aria-label={`${publishedReviewSummary.rating} out of 5, ${publishedReviewSummary.reviewCount} reviews`}><div className="review-score"><strong>{publishedReviewSummary.rating}</strong><span>/ 5</span></div><AverageStars /><span className="review-source">{publishedReviewSummary.sourceLabel} · {publishedReviewSummary.reviewCount} reviews</span><span className="review-static-note">Figures supplied by the site owner; not live or independently refreshed.</span></div>
      </ScrollReveal>
      <motion.div className="testimonial-grid" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
        {testimonials.map((review, index) => <ReviewCard key={review.name} review={review} index={index} />)}
      </motion.div>
      <div className="testimonials-actions"><Link className="button outline" to="/reviews">View All Patient Reviews<ArrowRight size={16} /></Link><a className="button outline" href={reviewsUrl} target="_blank" rel="noopener noreferrer">View All Reviews<ArrowRight size={16} /></a><a className="button primary" href={reviewsUrl} target="_blank" rel="noopener noreferrer">Write a Google Review<ArrowRight size={16} /></a></div>
      <p className="testimonial-disclosure">Testimonials on this page were supplied by the site owner and have not been independently verified or matched to Google reviews. The first testimonial's hospital attribution is awaiting confirmation. The rating and count are provided figures, not live Google data.</p>
    </div>
  </section>;
}
