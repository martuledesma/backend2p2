import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  changeEventStatus,
} from '../controllers/events.controller.js';
import { createEventTicket, getEventTickets } from '../controllers/tickets.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = Router();

// Públicas: cualquiera puede listar y consultar el detalle de un evento.
router.get('/', getEvents);
router.get('/:id', getEventById);

// Solo organizer o admin pueden crear eventos.
router.post('/', auth, authorize('organizer', 'admin'), createEvent);

// Modificar: organizer solo sus propios eventos, admin cualquiera. El chequeo
// de propiedad (dueño vs admin) y las reglas de negocio viven en
// events.service.js, no acá.
router.put('/:id', auth, authorize('organizer', 'admin'), updateEvent);

// Cambiar de estado (publicar, cancelar, marcar finalizado): mismo criterio
// de propiedad que modificar.
router.patch('/:id/status', auth, authorize('organizer', 'admin'), changeEventStatus);

// Inscripción a un evento: cualquier usuario autenticado (user, organizer o
// admin), sin restricción de rol — authorize() no aplica acá.
router.post('/:eid/tickets', auth, createEventTicket);

// Ver quién se inscribió a un evento: solo el organizer dueño de ESE evento
// (chequeo de propiedad en tickets.service.js) o un admin.
router.get('/:eid/tickets', auth, authorize('organizer', 'admin'), getEventTickets);

export default router;
