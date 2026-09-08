import { Router } from 'express';
import {
  getSessions,
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from '../controllers/sessions.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getSessions);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/current', auth, getCurrentUser);
router.post('/logout', logoutUser);

export default router;
