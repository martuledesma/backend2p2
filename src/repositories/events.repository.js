import { eventsDao } from '../dao/events.dao.js';

class EventsRepository {
  // Pasa el criterio de listado (filtros + paginación + orden) directo al
  // DAO, que es quien lo traduce a una query real de Mongo. El repository
  // no construye sintaxis de Mongo: solo intermedia entre el service y el DAO.
  async findPage(criteria) {
    return eventsDao.findPage(criteria);
  }

  async findById(id) {
    return eventsDao.findById(id);
  }

  async create(data) {
    return eventsDao.create(data);
  }

  async updateById(id, updates) {
    return eventsDao.updateById(id, updates);
  }
}

export const eventsRepository = new EventsRepository();
export default eventsRepository;
