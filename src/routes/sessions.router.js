import { Router } from 'express';
import { getSessions, registerUser } from '../controllers/sessions.controller.js';

const router = Router();

router.get('/', getSessions);
router.post('/register', registerUser);

export default router;
