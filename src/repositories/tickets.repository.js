import { ticketsDao } from '../dao/tickets.dao.js';

class TicketsRepository {
  async findById(id) {
    return ticketsDao.findById(id);
  }

  async findByEvent(eventId) {
    return ticketsDao.findByEvent(eventId);
  }

  async findByEventWithAttendees(eventId) {
    return ticketsDao.findByEventWithAttendees(eventId);
  }

  async findByUser(userId) {
    return ticketsDao.findByUser(userId);
  }

  async create(data) {
    return ticketsDao.create(data);
  }

  async updateById(id, updates) {
    return ticketsDao.updateById(id, updates);
  }
}

export const ticketsRepository = new TicketsRepository();
export default ticketsRepository;
