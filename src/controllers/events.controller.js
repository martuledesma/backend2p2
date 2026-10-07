import { eventsService } from '../services/events.service.js';
import { toEventDTO } from '../dto/event.dto.js';

// Pública. Soporta filtros (status, category, location, dateFrom, dateTo),
// paginación (page, limit) y ordenamiento (sort=campo o sort=-campo).
export const getEvents = async (req, res, next) => {
  try {
    const result = await eventsService.listEvents(req.query || {});
    res.status(200).json({
      status: 'success',
      payload: {
        data: result.data.map(toEventDTO),
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Pública. 404 si no existe.
export const getEventById = async (req, res, next) => {
  try {
    const event = await eventsService.getById(req.params.id);
    res.status(200).json({ status: 'success', payload: toEventDTO(event) });
  } catch (error) {
    next(error);
  }
};

// Protegida con auth + authorize('organizer', 'admin') en el router.
export const createEvent = async (req, res, next) => {
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
    res.status(201).json({ status: 'success', payload: toEventDTO(event) });
  } catch (error) {
    next(error);
  }
};

// Protegida con auth + authorize('organizer', 'admin'); la validación de
// propiedad (organizer solo lo suyo, admin cualquiera) vive en el service.
export const updateEvent = async (req, res, next) => {
  try {
    const event = await eventsService.updateEvent(req.params.id, req.user, req.body || {});
    res.status(200).json({ status: 'success', payload: toEventDTO(event) });
  } catch (error) {
    next(error);
  }
};

// Único endpoint para cambiar el estado de un evento (publicar, cancelar,
// marcar finalizado). Body: { "status": "published" | "cancelled" | ... }.
export const changeEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const event = await eventsService.changeStatus(req.params.id, req.user, status);
    res.status(200).json({ status: 'success', payload: toEventDTO(event) });
  } catch (error) {
    next(error);
  }
};
