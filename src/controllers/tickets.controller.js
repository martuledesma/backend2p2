import { ticketsService } from '../services/tickets.service.js';
import { ApiError } from '../utils/errors.js';

function toPublicTicket(ticket) {
  return {
    id: ticket._id,
    user: ticket.user,
    event: ticket.event,
    status: ticket.status,
    quantity: ticket.quantity,
    reservationCode: ticket.reservationCode,
    createdAt: ticket.createdAt,
    cancelledAt: ticket.cancelledAt || null,
  };
}

function handleError(error, res) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ status: 'error', message: error.message });
  }
  console.error(error);
  return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
}

// POST /api/events/:eid/tickets — cualquier usuario autenticado (user,
// organizer o admin) se puede inscribir a un evento publicado.
export const createEventTicket = async (req, res) => {
  try {
    const { quantity } = req.body || {};
    const ticket = await ticketsService.createTicket(
      req.user.id,
      req.user.email,
      req.params.eid,
      quantity,
    );
    res.status(201).json({ status: 'success', payload: toPublicTicket(ticket) });
  } catch (error) {
    handleError(error, res);
  }
};

// GET /api/tickets/my-tickets — tickets del usuario autenticado, con los
// datos del evento (title/date/location) ya resueltos por populate.
export const getMyTickets = async (req, res) => {
  try {
    const tickets = await ticketsService.getMyTickets(req.user.id);
    res.status(200).json({ status: 'success', payload: tickets.map(toPublicTicket) });
  } catch (error) {
    handleError(error, res);
  }
};

// GET /api/events/:eid/tickets — organizer dueño del evento, o admin.
export const getEventTickets = async (req, res) => {
  try {
    const tickets = await ticketsService.getEventTickets(req.params.eid, req.user);
    res.status(200).json({ status: 'success', payload: tickets.map(toPublicTicket) });
  } catch (error) {
    handleError(error, res);
  }
};

// PATCH /api/tickets/:tid/cancel — dueño del ticket, o admin.
export const cancelTicket = async (req, res) => {
  try {
    const ticket = await ticketsService.cancelTicket(req.params.tid, req.user);
    res.status(200).json({ status: 'success', payload: toPublicTicket(ticket) });
  } catch (error) {
    handleError(error, res);
  }
};
