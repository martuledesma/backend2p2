import { eventsDao } from '../dao/events.dao.js';

class EventsRepository {
  async getAll() {
    // Capa intermedia entre el service y el DAO. Sin lógica todavía.
    return eventsDao.getAll();
  }
}

export const eventsRepository = new EventsRepository();
