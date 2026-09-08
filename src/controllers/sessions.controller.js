import { sessionsService } from '../services/sessions.service.js';
import { ApiError } from '../utils/errors.js';
import { config } from '../config/config.js';

const COOKIE_NAME = 'currentUser';
const isProduction = config.nodeEnv === 'production';

export const getSessions = (req, res) => {
  // Sin lógica de auth todavía: placeholder para futuras entregas.
  res.status(200).json({ status: 'success', payload: [] });
};

export const registerUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body || {};

    const payload = await sessionsService.registerUser({
      first_name,
      last_name,
      email,
      password,
    });

    res.status(201).json({ status: 'success', payload });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }

    // Resguardo ante una condición de carrera: dos registros simultáneos con
    // el mismo email podrían pasar la validación previa y chocar recién en
    // el índice unique de Mongo.
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'El email ya está registrado' });
    }

    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const token = await sessionsService.loginUser({ email, password });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600000,
      secure: isProduction,
    });

    res.status(200).json({ status: 'success', message: 'Login correcto' });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message });
    }

    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};

// El middleware `auth` ya validó el token y dejó el payload en req.user
// antes de llegar acá. Nunca incluye password: el JWT nunca la tuvo.
export const getCurrentUser = (req, res) => {
  const { id, email, role } = req.user;
  res.status(200).json({ status: 'success', payload: { id, email, role } });
};

export const logoutUser = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
};
