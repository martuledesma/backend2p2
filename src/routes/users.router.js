import { Router } from 'express';
import { getAllUsers } from '../controllers/users.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = Router();

// Ruta administrativa: solo admin. auth primero (401 sin sesión), authorize
// después (403 si el rol no alcanza).
router.get('/', auth, authorize('admin'), getAllUsers);

export default router;
