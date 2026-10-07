import passport from '../config/passport.config.js';
import { signToken } from '../utils/jwt.js';
import { config } from '../config/config.js';
import { toUserDTO, toCurrentUserDTO } from '../dto/user.dto.js';

const COOKIE_NAME = 'currentUser';
const isProduction = config.nodeEnv === 'production';

export const getSessions = (req, res) => {
  res.status(200).json({ status: 'success', payload: [] });
};

// La ruta delega en passport.authenticate('register', ...); toda la lógica
// de negocio (validación/hash/unicidad) vive en users.service.js. Este
// controller solo traduce el resultado a la respuesta HTTP: nunca importa
// el modelo ni el repository de User.
export const registerUser = (req, res, next) => {
  passport.authenticate('register', { session: false }, (err, user) => {
    if (err) {
      // Resguardo ante condición de carrera en el índice unique de Mongo
      // (dos registros concurrentes con el mismo email): no es un ApiError
      // de negocio, así que se maneja puntualmente acá en vez de en el
      // middleware centralizado.
      if (err.code === 11000) {
        return res.status(409).json({ status: 'error', message: 'El email ya está registrado' });
      }
      return next(err);
    }

    if (!user) {
      return res.status(400).json({ status: 'error', message: 'No se pudo registrar el usuario' });
    }

    return res.status(201).json({ status: 'success', payload: toUserDTO(user) });
  })(req, res, next);
};

// La ruta delega en passport.authenticate('login', ...). La estrategia solo
// valida credenciales (vía users.service.js); el JWT y la cookie los genera
// este controller, nunca la estrategia.
export const loginUser = (req, res, next) => {
  passport.authenticate('login', { session: false }, (err, user) => {
    if (err) {
      return next(err);
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
  res.status(200).json({ status: 'success', payload: toCurrentUserDTO(req.user) });
};

// Logout no pasa por Passport: solo borra la cookie.
export const logoutUser = (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(200).json({ status: 'success', message: 'Sesión cerrada' });
};
