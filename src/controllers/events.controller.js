import { eventsService } from '../services/events.service.js';
import { ApiError } from '../utils/errors.js';

function toPublicEvent(event) {
  return {
    id: event._id,
    title: event.title,
    description: event.description,
    date: event.date,
    location: event.location,
    organizer: event.organizer,
    status: event.status,
  };
}

export const getEvents = async (req, res) => {
  try {
    const events = await eventsService.getAll();
    res.status(200).json({ status: 'success', payload: events.map(toPublicEvent) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error al obtener los eventos' });
  }
};

// Protegida con auth + authorize('organizer', 'admin') en el router.
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, location } = req.body || {};
    const event = await eventsService.createEvent(req.user.id, {
      title,
      description,
      date,
      location,
    });
    res.status(201).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

// Protegida con auth + authorize('organizer', 'admin'); la validación de
// propiedad (organizer solo lo suyo, admin cualquiera) vive en el service.
export const updateEvent = async (req, res) => {
  try {
    const event = await eventsService.updateEvent(req.params.id, req.user, req.body || {});
    res.status(200).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

export const cancelEvent = async (req, res) => {
  try {
    const event = await eventsService.cancelEvent(req.params.id, req.user);
    res.status(200).json({ status: 'success', payload: toPublicEvent(event) });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};
