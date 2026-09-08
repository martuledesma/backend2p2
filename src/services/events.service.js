import { eventsRepository } from '../repositories/events.repository.js';

class EventsService {
  async getAll() {
    // Todavía sin lógica de negocio: delega directamente en el repositorio.
    return eventsRepository.getAll();
  }
}

export const eventsService = new EventsService();
