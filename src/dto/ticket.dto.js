import { toUserSummaryDTO } from './user.dto.js';
import { toEventSummaryDTO } from './event.dto.js';

// DTO del ticket. `user` y `event` pueden llegar poblados (populate) o como
// ObjectId sin resolver, según el método del repository que los trajo —
// toUserSummaryDTO/toEventSummaryDTO manejan ambos casos y son la segunda
// barrera que garantiza que, aunque venga poblado, nunca se filtre el
// password del usuario.
export function toTicketDTO(ticket) {
  return {
    id: ticket._id,
    user: toUserSummaryDTO(ticket.user),
    event: toEventSummaryDTO(ticket.event),
    status: ticket.status,
    quantity: ticket.quantity,
    reservationCode: ticket.reservationCode,
    createdAt: ticket.createdAt,
    cancelledAt: ticket.cancelledAt || null,
  };
}

export default { toTicketDTO };
