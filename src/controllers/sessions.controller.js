import { sessionsService } from '../services/sessions.service.js';
import { ApiError } from '../utils/errors.js';

export const getSessions = (req, res) => {
  // Sin lógica de auth todavía: placeholder para futuras entregas
  // (login, JWT, cookies, Passport).
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
