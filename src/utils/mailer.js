import nodemailer from 'nodemailer';
import { config } from '../config/config.js';

let cachedTransporter;

// El transporter se arma una sola vez, con las credenciales del .env
// (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS). Si no están configuradas
// (por ejemplo en un ambiente sin mail), se devuelve null y el envío se
// omite con un warning en vez de romper la inscripción.
function getTransporter() {
  if (!config.mail.host || !config.mail.user || !config.mail.pass) {
    return null;
  }
  if (!cachedTransporter) {
    const port = Number(config.mail.port) || 587;
    cachedTransporter = nodemailer.createTransport({
      host: config.mail.host,
      port,
      secure: port === 465,
      auth: {
        user: config.mail.user,
        pass: config.mail.pass,
      },
    });
  }
  return cachedTransporter;
}

// Envía el email de confirmación de una inscripción. Se llama después de
// confirmar el ticket en la base: si el envío falla, no debe tirar abajo la
// inscripción (que ya quedó guardada) — quien llama debe atrapar el error.
export async function sendTicketConfirmationEmail({ to, event, ticket }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      'MAIL_HOST/MAIL_USER/MAIL_PASS no configurados: se omite el envío del email de confirmación.',
    );
    return { sent: false };
  }

  const eventDate = event.date ? new Date(event.date).toLocaleString('es-AR') : '';

  const info = await transporter.sendMail({
    from: config.mail.from || config.mail.user,
    to,
    subject: `Inscripción confirmada: ${event.title}`,
    text: [
      `Hola! Tu inscripción a "${event.title}" quedó confirmada.`,
      '',
      `Código de reserva: ${ticket.reservationCode}`,
      `Cantidad: ${ticket.quantity}`,
      `Fecha del evento: ${eventDate}`,
      `Lugar: ${event.location}`,
      '',
      '¡Nos vemos ahí!',
    ].join('\n'),
    html: `
      <p>Hola! Tu inscripción a <strong>${event.title}</strong> quedó confirmada.</p>
      <ul>
        <li><strong>Código de reserva:</strong> ${ticket.reservationCode}</li>
        <li><strong>Cantidad:</strong> ${ticket.quantity}</li>
        <li><strong>Fecha:</strong> ${eventDate}</li>
        <li><strong>Lugar:</strong> ${event.location}</li>
      </ul>
      <p>¡Nos vemos ahí!</p>
    `,
  });

  return { sent: true, messageId: info.messageId };
}

export default { sendTicketConfirmationEmail };
