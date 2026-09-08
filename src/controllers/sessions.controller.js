import passport from '../config/passport.config.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/errors.js';
import { config } from '../config/config.js';

const COOKIE_NAME = 'currentUser';
const isProduction = config.nodeEnv === 'production';

// Nunca incluye password, ni en texto plano ni hasheada.
function toPublicUser(user) {
  return {
    id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
  };
}

export const getSessions = (req, res) => {
  res.status(200).json({ status: 'success', payload: [] });
};

// La ruta delega en passport.authenticate('register', ...); toda la lógica
// de validación/hash/unicidad vive en la estrategia (passport.config.js).
// Este controller solo traduce el resultado a la respuesta HTTP.
export const registerUser = (req, res, next) => {
  passport.authenticate('register', { session: false }, (err, user) => {
    if (err) {
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
      }
      // Resguardo ante condición de carrera en el índice unique de Mongo.
      if (err.code === 11000) {
        return res.status(409).json({ status: 'error', message: 'El email ya está registrado' });
      }
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }

    if (!user) {
      return res.status(400).json({ status: 'error', message: 'No se pudo registrar el usuario' });
    }

    return res.status(201).json({ status: 'success', payload: toPublicUser(user) });
  })(req, res, next);
};

// La ruta delega en passport.authenticate('login', ...). La estrategia solo
// valida credenciales; el JWT y la cookie los genera este controller, nunca
// la estrategia.
export const loginUser = (req, res, next) => {
  passport.authenticate('login', { session: false }, (err, user) => {
    if (err) {
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
      }
      console.error(err);
      return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }

    // Mensaje siempre genérico: no distingue email inexistente de password
    // incorrecta.
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
    }

    const token = signToken({ id: user._id, email: user.email, role: user.role });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600000,
      secure: isProduction,
    });

    return res.status(200).json({ status: 'success', message: 'Login correcto' });
  })(req, res, next);
};

// El middleware `auth` (que envuelve la estrategia 'current') ya dejó el
// payload del JWT en req.user antes de llegar acá.
export const getCurrentUser = (req, res) => {
  const { id, email, role } = req.user;
  res.status(200).json({ status: 'success', payload: { id, email, role } });
};

// Logout no pasa por Passport: solo borra la cookie.
export const logoutUser = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
};
