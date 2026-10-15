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

// Traduce el parámetro de query "sort" (ej. "-date", "price") a un objeto de
// orden de Mongo ({ date: -1 } / { price: 1 }). Esta es la única traducción
// de sintaxis que conserva el service: el signo "-" es un formato de la URL,
// no de Mongo, así que decidir qué significa es responsabilidad del service;
// una vez traducido, quien ejecuta la query real es el DAO.
function buildSortSpec(sort) {
  if (!sort) return undefined;
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  return { [field]: descending ? -1 : 1 };
}

class EventsService {
  // Listado con filtros + paginación + ordenamiento. El service solo decide
  // los valores de negocio (página/límite por default, qué significa cada
  // filtro, cómo traducir el string de sort); quien ejecuta find/skip/limit/
  // sort contra Mongo es el DAO, vía repository.findPage.
  async listEvents(queryParams = {}) {
    const { status, category, location, dateFrom, dateTo, page, limit, sort } = queryParams;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
    const sortSpec = buildSortSpec(sort);

    const { data, total } = await eventsRepository.findPage({
      status,
      category,
      location,
      dateFrom,
      dateTo,
      sort: sortSpec,
      skip,
      limit: limitNum,
    });

    const totalPages = Math.max(1, Math.ceil(total / limitNum));

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
