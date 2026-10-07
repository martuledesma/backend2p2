import { ticketsService } from '../services/tickets.service.js';
import { toTicketDTO } from '../dto/ticket.dto.js';

// POST /api/events/:eid/tickets — cualquier usuario autenticado (user,
// organizer o admin) se puede inscribir a un evento publicado.
export const createEventTicket = async (req, res, next) => {
  try {
    const { quantity } = req.body || {};
    const ticket = await ticketsService.createTicket(
      req.user.id,
      req.user.email,
      req.params.eid,
      quantity,
    );
    res.status(201).json({ status: 'success', payload: toTicketDTO(ticket) });
  } catch (error) {
    next(error);
  }
};

// GET /api/tickets/my-tickets — tickets del usuario autenticado, con los
// datos del evento (title/date/location) ya resueltos por populate.
export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await ticketsService.getMyTickets(req.user.id);
    res.status(200).json({ status: 'success', payload: tickets.map(toTicketDTO) });
  } catch (error) {
    next(error);
  }
};

// GET /api/events/:eid/tickets — organizer dueño del evento, o admin.
export const getEventTickets = async (req, res, next) => {
  try {
    const tickets = await ticketsService.getEventTickets(req.params.eid, req.user);
    res.status(200).json({ status: 'success', payload: tickets.map(toTicketDTO) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tickets/:tid/cancel — dueño del ticket, o admin.
export const cancelTicket = async (req, res, next) => {
  try {
    const ticket = await ticketsService.cancelTicket(req.params.tid, req.user);
    res.status(200).json({ status: 'success', payload: toTicketDTO(ticket) });
  } catch (error) {
    next(error);
  }
};
