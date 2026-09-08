import { Router } from 'express';
import {
  getEvents,
  createEvent,
  updateEvent,
  cancelEvent,
} from '../controllers/events.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = Router();

// Pública: cualquiera puede consultar los eventos publicados.
router.get('/', getEvents);

// Solo organizer o admin pueden crear eventos.
router.post('/', auth, authorize('organizer', 'admin'), createEvent);

// Modificar: organizer solo sus propios eventos, admin cualquiera. El chequeo
// de propiedad (dueño vs admin) vive en events.service.js, no acá.
router.put('/:id', auth, authorize('organizer', 'admin'), updateEvent);

// Cancelar: mismo criterio de propiedad que modificar.
router.patch('/:id/cancel', auth, authorize('organizer', 'admin'), cancelEvent);

export default router;
