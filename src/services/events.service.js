import { eventsRepository } from '../repositories/events.repository.js';
import { ApiError } from '../utils/errors.js';

const UPDATABLE_FIELDS = ['title', 'description', 'date', 'location', 'status'];

class EventsService {
  async getAll() {
    return eventsRepository.findAll();
  }

  async createEvent(organizerId, { title, description, date, location }) {
    if (!title) {
      throw new ApiError(400, 'El título del evento es obligatorio');
    }

    // organizer siempre sale de req.user.id (el usuario autenticado que
    // hace el POST), nunca del body.
    return eventsRepository.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      date,
      location,
      organizer: organizerId,
    });
  }

  // Validación de propiedad: organizer solo puede modificar sus propios
  // eventos; admin puede modificar cualquiera. 404 si no existe, 403 si
  // existe pero no es dueño (y no es admin) — nunca 500 para estos casos.
  async updateEvent(eventId, user, updates) {
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Evento no encontrado');
    }

    const isOwner = String(event.organizer) === String(user.id);
    if (user.role !== 'admin' && !isOwner) {
      throw new ApiError(403, 'No podés modificar un evento que no te pertenece');
    }

    const safeUpdates = {};
    for (const field of UPDATABLE_FIELDS) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    return eventsRepository.updateById(eventId, safeUpdates);
  }

  async cancelEvent(eventId, user) {
    return this.updateEvent(eventId, user, { status: 'cancelled' });
  }
}

export const eventsService = new EventsService();
export default eventsService;
