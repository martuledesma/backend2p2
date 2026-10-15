import crypto from 'node:crypto';
import { ticketsRepository } from '../repositories/tickets.repository.js';
import { eventsRepository } from '../repositories/events.repository.js';
import { ApiError } from '../utils/errors.js';
import { sendTicketConfirmationEmail } from '../utils/mailer.js';

function generateReservationCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RES-${stamp}-${random}`;
}

// Un ticket "activo" es cualquiera que no esté cancelado ('confirmed' o
// 'pending'): son los que ocupan cupo y los que cuentan para la regla de
// "una inscripción por usuario".
function isActive(ticket) {
  return ticket.status !== 'cancelled';
}

class TicketsService {
  // Toda la validación de negocio de la inscripción vive acá, nunca en el
  // controller ni en la ruta.
  async createTicket(userId, userEmail, eventId, rawQuantity) {
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Evento no encontrado');
    }

    if (event.status === 'cancelled') {
      throw new ApiError(400, 'No te podés inscribir: el evento está cancelado');
    }
    if (event.status === 'finished') {
      throw new ApiError(400, 'No te podés inscribir: el evento ya finalizó');
    }
    if (event.status !== 'published') {
      throw new ApiError(400, 'Solo se puede inscribir a eventos publicados');
    }

    const quantity = Number(rawQuantity === undefined ? 1 : rawQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError(400, 'La cantidad debe ser un número entero mayor a 0');
    }

    const eventTickets = await ticketsRepository.findByEvent(eventId);
    const activeTickets = eventTickets.filter(isActive);

    // El chequeo de duplicado va ANTES que el de cupo a propósito: si el
    // propio ticket activo del usuario es lo que está ocupando el cupo
    // (por ejemplo, capacity=1 y el usuario ya tiene esa única plaza), el
    // error correcto es "ya estás inscripto" (409), no "no hay cupo" (400).
    const alreadyEnrolled = activeTickets.some((t) => String(t.user) === String(userId));
    if (alreadyEnrolled) {
      throw new ApiError(409, 'Ya tenés una inscripción activa para este evento');
    }

    const occupied = activeTickets.reduce((sum, t) => sum + t.quantity, 0);
    const remaining = event.capacity - occupied;
    if (remaining < quantity) {
      throw new ApiError(
        400,
        `No hay cupos suficientes para este evento. Cupos disponibles: ${remaining}`,
      );
    }

    const ticket = await ticketsRepository.create({
      user: userId,
      event: eventId,
      status: 'confirmed',
      quantity,
      reservationCode: generateReservationCode(),
    });

    // Best-effort: si el email falla, la inscripción ya quedó confirmada en
    // la base y no se revierte por un problema de mail.
    try {
      await sendTicketConfirmationEmail({ to: userEmail, event, ticket });
    } catch (error) {
      console.error('No se pudo enviar el email de confirmación:', error.message);
    }

    return ticket;
  }

  async getMyTickets(userId) {
    return ticketsRepository.findByUser(userId);
  }

  // Solo el organizer dueño del evento, o un admin, pueden ver quién se
  // inscribió.
  async getEventTickets(eventId, user) {
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Evento no encontrado');
    }
    if (user.role !== 'admin' && String(event.organizer) !== String(user.id)) {
      throw new ApiError(403, 'No podés ver las inscripciones de un evento que no es tuyo');
    }
    return ticketsRepository.findByEventWithAttendees(eventId);
  }

  // Cancelar: cambia el status y registra cancelledAt, nunca borra el
  // documento. El cupo queda libre automáticamente porque los cancelados no
  // se cuentan en createTicket.
  async cancelTicket(ticketId, user) {
    const ticket = await ticketsRepository.findById(ticketId);
    if (!ticket) {
      throw new ApiError(404, 'Ticket no encontrado');
    }
    if (user.role !== 'admin' && String(ticket.user) !== String(user.id)) {
      throw new ApiError(403, 'No podés cancelar un ticket que no es tuyo');
    }
    if (ticket.status === 'cancelled') {
      throw new ApiError(400, 'Este ticket ya está cancelado');
    }

    return ticketsRepository.updateById(ticketId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
  }
}

export const ticketsService = new TicketsService();
export default ticketsService;
