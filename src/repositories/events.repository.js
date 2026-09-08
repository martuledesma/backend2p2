import { eventsDao } from '../dao/events.dao.js';

class EventsRepository {
  async findAll() {
    return eventsDao.findAll();
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
