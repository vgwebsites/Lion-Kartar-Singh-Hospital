import { HOSPITAL_WHATSAPP_NUMBER } from '../config/contact';

interface AppointmentMessageDetails {
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  department: string;
  doctor?: string;
}

export function buildAppointmentWhatsAppUrl(details: AppointmentMessageDetails): string {
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

  return `https://wa.me/${HOSPITAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
