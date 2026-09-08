import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  changeEventStatus,
} from '../controllers/events.controller.js';
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

export default router;
