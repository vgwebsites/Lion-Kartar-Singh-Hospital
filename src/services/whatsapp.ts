const configuredPhoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '') ?? '';

interface AppointmentMessageDetails {
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  department: string;
  doctor?: string;
}

export function isWhatsAppConfigured(): boolean {
  return /^\d{8,15}$/.test(configuredPhoneNumber);
}

export function buildAppointmentWhatsAppUrl(details: AppointmentMessageDetails): string | null {
  if (!isWhatsAppConfigured()) return null;
  const message = [
    'Hello Lion Kartar Singh Hospital,',
    'I have submitted an appointment request through the website. Please confirm availability.',
    '',
    `Patient name: ${details.patientName}`,
    `Patient phone: ${details.patientPhone}`,
    `Preferred date: ${details.appointmentDate}`,
    `Preferred time: ${details.appointmentTime}`,
    `Department: ${details.department}`,
    ...(details.doctor ? [`Preferred doctor: ${details.doctor}`] : []),
  ].join('\n');

  return `https://wa.me/${configuredPhoneNumber}?text=${encodeURIComponent(message)}`;
}
