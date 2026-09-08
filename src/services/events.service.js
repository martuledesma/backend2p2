import { eventsRepository } from '../repositories/events.repository.js';
import { ApiError } from '../utils/errors.js';
import { EVENT_STATUSES } from '../models/Event.js';

// Campos que se pueden tocar vía PUT. El status SIEMPRE va por
// PATCH /api/events/:id/status, nunca por acá.
const UPDATABLE_FIELDS = ['title', 'description', 'category', 'date', 'location', 'capacity', 'price'];

function parseAndValidateDate(rawDate) {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, 'La fecha del evento es inválida');
  }
  if (parsedDate.getTime() < Date.now()) {
    throw new ApiError(400, 'La fecha del evento no puede ser en el pasado');
  }
  return parsedDate;
}

function parseAndValidateCapacity(rawCapacity) {
  const capacity = Number(rawCapacity);
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new ApiError(400, 'La capacidad debe ser un número mayor a 0');
  }
  return capacity;
}

function parseAndValidatePrice(rawPrice) {
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price < 0) {
    throw new ApiError(400, 'El precio debe ser un número mayor o igual a 0');
  }
  return price;
}

function assertCanBeModified(event) {
  // Regla documentada: un evento cancelado no se puede modificar (ni sus
  // campos vía PUT, ni su estado vía PATCH /status) una vez cancelado.
  if (event.status === 'cancelled') {
    throw new ApiError(400, 'No se puede modificar un evento cancelado');
  }
}

function assertOwnerOrAdmin(event, user) {
  const isOwner = String(event.organizer) === String(user.id);
  if (user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'No podés modificar un evento que no te pertenece');
  }
}

class EventsService {
  // Listado con filtros + paginación + ordenamiento. La construcción del
  // filtro y el "cómo" se pagina/ordena es lógica de negocio y vive acá; el
  // DAO solo sabe traer todos los documentos.
  async listEvents(queryParams = {}) {
    const { status, category, location, dateFrom, dateTo, page, limit, sort } = queryParams;

    const all = await eventsRepository.findAll();

    let filtered = all.filter((event) => {
      if (status && event.status !== status) return false;
      if (category && String(event.category).toLowerCase() !== String(category).toLowerCase()) {
        return false;
      }
      if (location && String(event.location).toLowerCase() !== String(location).toLowerCase()) {
        return false;
      }
      if (dateFrom && new Date(event.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(event.date) > new Date(dateTo)) return false;
      return true;
    });

    if (sort) {
      const descending = sort.startsWith('-');
      const field = descending ? sort.slice(1) : sort;
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal === bVal) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        const result = aVal > bVal ? 1 : -1;
        return descending ? -result : result;
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const start = (pageNum - 1) * limitNum;
    const data = filtered.slice(start, start + limitNum);

    return { data, page: pageNum, limit: limitNum, total, totalPages };
  }

  async getById(eventId) {
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Evento no encontrado');
    }
    return event;
  }

  // organizer siempre sale de req.user.id (el usuario autenticado que hace
  // el POST), nunca del body. El evento siempre nace en 'draft': para
  // publicarlo hay que usar PATCH /api/events/:id/status.
  async createEvent(organizerId, { title, description, category, date, location, capacity, price }) {
    if (!title || !description || !category || !location) {
      throw new ApiError(400, 'Faltan campos obligatorios (title, description, category, location)');
    }
    if (!date) {
      throw new ApiError(400, 'La fecha del evento es obligatoria');
    }

    const parsedDate = parseAndValidateDate(date);
    const parsedCapacity = parseAndValidateCapacity(capacity);
    const parsedPrice = parseAndValidatePrice(price);

    return eventsRepository.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      date: parsedDate,
      location: String(location).trim(),
      capacity: parsedCapacity,
      price: parsedPrice,
      organizer: organizerId,
      status: 'draft',
    });
  }

  // Validación de propiedad: organizer solo puede modificar sus propios
  // eventos; admin puede modificar cualquiera. 404 si no existe, 403 si
  // existe pero no es dueño (y no es admin), 400 si está cancelado — nunca
  // 500 para estos casos.
  async updateEvent(eventId, user, updates) {
    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Evento no encontrado');
    }

    assertOwnerOrAdmin(event, user);
    assertCanBeModified(event);

    const safeUpdates = {};
    for (const field of UPDATABLE_FIELDS) {
      if (updates[field] === undefined) continue;

      if (field === 'date') {
        safeUpdates.date = parseAndValidateDate(updates.date);
      } else if (field === 'capacity') {
        safeUpdates.capacity = parseAndValidateCapacity(updates.capacity);
      } else if (field === 'price') {
        safeUpdates.price = parseAndValidatePrice(updates.price);
      } else {
        safeUpdates[field] = String(updates[field]).trim();
      }
    }

    return eventsRepository.updateById(eventId, safeUpdates);
  }

  // Único camino para cambiar el status de un evento (publicar, cancelar,
  // marcar como finalizado). Mismo criterio de propiedad que updateEvent.
  async changeStatus(eventId, user, newStatus) {
    if (!EVENT_STATUSES.includes(newStatus)) {
      throw new ApiError(400, `Estado inválido. Debe ser uno de: ${EVENT_STATUSES.join(', ')}`);
    }

    const event = await eventsRepository.findById(eventId);
    if (!event) {
      throw new ApiError(404, 'Evento no encontrado');
    }

    assertOwnerOrAdmin(event, user);
    assertCanBeModified(event);

    if (newStatus === 'published' && event.status === 'finished') {
      throw new ApiError(400, 'No se puede publicar un evento ya finalizado');
    }

    return eventsRepository.updateById(eventId, { status: newStatus });
  }
}

export const eventsService = new EventsService();
export default eventsService;
