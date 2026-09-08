import { Router } from 'express';
import { getMyTickets, cancelTicket } from '../controllers/tickets.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

const router = Router();

// Las rutas que dependen de un evento (crear ticket, listar inscriptos de un
// evento) viven en events.router.js bajo /api/events/:eid/tickets. Acá solo
// van las que son puramente "sobre tickets".
router.get('/my-tickets', auth, getMyTickets);
router.patch('/:tid/cancel', auth, cancelTicket);

export default router;
