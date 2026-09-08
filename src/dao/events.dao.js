import { Event } from '../models/Event.js';

class EventsDao {
  async findAll() {
    return Event.find({});
  }

  async findById(id) {
    try {
      return await Event.findById(id);
    } catch (error) {
      // Un id con formato inválido nunca debe explotar como 500: se trata
      // igual que "no encontrado" y la capa de servicio responde 404.
      if (error.name === 'CastError') return null;
      throw error;
    }
  }

  async create(data) {
    return Event.create(data);
  }

  async updateById(id, updates) {
    return Event.findByIdAndUpdate(id, updates, { new: true });
  }
}

export const eventsDao = new EventsDao();
export default eventsDao;
