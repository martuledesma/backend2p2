import { Event } from '../models/Event.js';

class EventsDao {
  async findAll() {
    return Event.find({});
  }

  async findById(id) {
    return Event.findOne({ _id: id });
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
