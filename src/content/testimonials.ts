export const reviewsUrl = 'https://www.google.com/maps/place/Lion+Kartar+Singh+Hospital/@19.1242612,72.8409879,17z/';

export const publishedReviewSummary = {
  rating: '4.6',
  reviewCount: 455,
  sourceLabel: 'Google Reviews',
  isLive: false,
};

export interface Testimonial {
  name: string;
  rating: number;
  initials: string;
  attribution: string;
  attributionNote?: string;
  review: string;
}

export const testimonials: Testimonial[] = [
  {
    name: 'Trisha Rane',
    rating: 5,
    initials: 'TR',
    attribution: 'Hospital attribution pending confirmation · User-provided',
    // attributionNote: 'The review names SBS Healthcare Services Pvt. Ltd. (ICU unit). Its connection to this hospital has not been independently confirmed.',
    review: 'I had a very good experience at SBS Healthcare Services Pvt. Ltd. (ICU unit). The doctors were knowledgeable and explained everything clearly, which gave us a lot of confidence during a stressful time. The nursing staff was extremely caring, attentive, and always available whenever needed.\n\nThe hospital maintained good hygiene, and housekeeping was regular and efficient. The overall environment felt safe and well-managed. The patient care team and floor staff were polite, supportive, and handled everything smoothly, including the discharge process.\n\nBilling and communication were also transparent, which we really appreciated. Overall, we are satisfied with the treatment and care provided. I would definitely recommend this hospital to others.',
  },
  {
    name: 'Arun Gupta',
    rating: 5,
    initials: 'AG',
    attribution: 'User-provided; not independently verified',
    review: 'I had a very good experience at the hospital. The doctors and nursing staff were extremely caring, supportive, and professional. They handled everything very smoothly and ensured proper treatment and comfort for the patient. The cleanliness and management were also well maintained. I truly appreciate their dedication and hard work. Highly recommended for quality healthcare services.',
  },
  {
    name: 'Pushpa Patel',
    rating: 5,
    initials: 'PP',
    attribution: 'User-provided; not independently verified',
    review: 'My patient Mr. Harishchand Patel was admitted in this hospital for the last 5 days. Good care and management were provided.\n\nDue to financial issues, we shifted our patient to BMC.\n\nWe would like to thank Dr. Sarita for all her help and guidance.',
  },
];
