import { eventsService } from '../services/events.service.js';
import { ApiError } from '../utils/errors.js';

function toPublicEvent(event) {
  return {
    id: event._id,
    title: event.title,
    description: event.description,
    category: event.category,
    date: event.date,
    location: event.location,
    capacity: event.capacity,
    price: event.price,
    organizer: event.organizer,
    status: event.status,
  };
}

function handleError(error, res) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ status: 'error', message: error.message });
  }
  console.error(error);
  return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
}

// Pública. Soporta filtros (status, category, location, dateFrom, dateTo),
// paginación (page, limit) y ordenamiento (sort=campo o sort=-campo).
export const getEvents = async (req, res) => {
  try {
    const result = await eventsService.listEvents(req.query || {});
    res.status(200).json({
      status: 'success',
      payload: {
        data: result.data.map(toPublicEvent),
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Pública. 404 si no existe.
export const getEventById = async (req, res) => {
  try {
    const event = await eventsService.getById(req.params.id);
    res.status(200).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    handleError(error, res);
  }
};

// Protegida con auth + authorize('organizer', 'admin') en el router.
export const createEvent = async (req, res) => {
  try {
    const { title, description, category, date, location, capacity, price } = req.body || {};
    const event = await eventsService.createEvent(req.user.id, {
      title,
      description,
      category,
      date,
      location,
      capacity,
      price,
    });
    res.status(201).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    handleError(error, res);
  }
};

// Protegida con auth + authorize('organizer', 'admin'); la validación de
// propiedad (organizer solo lo suyo, admin cualquiera) vive en el service.
export const updateEvent = async (req, res) => {
  try {
    const event = await eventsService.updateEvent(req.params.id, req.user, req.body || {});
    res.status(200).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    handleError(error, res);
  }
};

// Único endpoint para cambiar el estado de un evento (publicar, cancelar,
// marcar finalizado). Body: { "status": "published" | "cancelled" | ... }.
export const changeEventStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const event = await eventsService.changeStatus(req.params.id, req.user, status);
    res.status(200).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    handleError(error, res);
  }
};
