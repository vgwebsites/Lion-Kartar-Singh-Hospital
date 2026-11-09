import { ArrowLeft, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { publishedReviewSummary, reviewsUrl, testimonials } from '../content/testimonials';
import { AverageStars } from '../components/Testimonials';
import '../styles/testimonials.css';

export default function Reviews() {
  return <main className="section testimonials-section reviews-page"><div className="container">
    <Link className="text-link" to="/"><ArrowLeft size={16} />Back to Home</Link>
    <header className="testimonials-heading reviews-page-heading"><div><span className="eyebrow">PATIENT & FAMILY FEEDBACK</span><h1 id="testimonials-title">Patient Reviews</h1><p>Feedback supplied for this website. It has not been independently verified or matched to Google reviews.</p></div>
      <div className="review-summary"><div className="review-score"><strong>{publishedReviewSummary.rating}</strong><span>/ 5</span></div><AverageStars /><span className="review-source">{publishedReviewSummary.sourceLabel} · {publishedReviewSummary.reviewCount} reviews</span><span className="review-static-note">Owner-provided figures; not live or independently refreshed.</span></div>
    </header>
    <div className="testimonial-grid reviews-full-grid">{testimonials.map((review) => <article className="testimonial-card" key={review.name}>
      <div className="testimonial-card-top"><span className="testimonial-quote-icon"><span aria-hidden="true">“</span></span><span className="testimonial-stars" role="img" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={14} className={i < review.rating ? 'is-filled' : ''} />)}</span></div>
      <div className="testimonial-review">{review.review.split('\n').map((paragraph, i) => <p className="testimonial-paragraph" key={i}>{paragraph}</p>)}</div>
      <div className="testimonial-author"><span className="testimonial-avatar" aria-hidden="true">{review.initials}</span><div><strong>{review.name}</strong><span>{review.attribution}</span></div></div>
      {'attributionNote' in review && review.attributionNote && <p className="testimonial-attribution-note">{review.attributionNote}</p>}
    </article>)}</div>
    <p className="testimonial-disclosure">These are user-provided testimonials, not verified Google reviews. The first review's connection to the hospital is unconfirmed. Google rating and review count are provided figures, not live data.</p>
    <div className="testimonials-actions"><a className="button primary" href={reviewsUrl} target="_blank" rel="noopener noreferrer">View Hospital on Google Maps<Star size={15} /></a></div>
  </div></main>;
}
