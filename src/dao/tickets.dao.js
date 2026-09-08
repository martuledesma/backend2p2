import { Ticket } from '../models/Ticket.js';

class TicketsDao {
  async findById(id) {
    try {
      return await Ticket.findById(id);
    } catch (error) {
      if (error.name === 'CastError') return null;
      throw error;
    }
  }

  // Plano, sin populate: lo usa tickets.service.js para calcular cupo
  // ocupado (createTicket) — ahí no hace falta traer datos del usuario.
  async findByEvent(eventId) {
    return Ticket.find({ event: eventId });
  }

  // Usado por GET /api/events/:eid/tickets (el organizer dueño del evento, o
  // admin): trae quién se inscribió con datos básicos y no sensibles del
  // usuario (nunca el password) vía populate.
  async findByEventWithAttendees(eventId) {
    return Ticket.find({ event: eventId }).populate('user', 'first_name last_name email');
  }

  // Trae los tickets del usuario con los datos del evento (título, fecha,
  // ubicación) resueltos vía populate, sin exponer nada más del evento ni
  // ningún dato de otros usuarios.
  async findByUser(userId) {
    return Ticket.find({ user: userId }).populate('event', 'title date location');
  }

  async create(data) {
    return Ticket.create(data);
  }

  async updateById(id, updates) {
    return Ticket.findByIdAndUpdate(id, updates, { new: true });
  }
}

export const ticketsDao = new TicketsDao();
export default ticketsDao;
