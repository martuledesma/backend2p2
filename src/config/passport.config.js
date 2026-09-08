import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy } from 'passport-jwt';

import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  MIN_PASSWORD_LENGTH,
} from '../utils/validators.js';
import { ApiError } from '../utils/errors.js';
import { config } from './config.js';

/**
 * Este archivo centraliza TODAS las estrategias de autenticación.
 * app.js solo llama a passport.initialize(); nunca define estrategias.
 *
 * Para sumar un provider externo en una entrega futura (Google, GitHub,
 * etc.) alcanza con registrar una estrategia nueva acá abajo (por ejemplo
 * `passport.use('google', new GoogleStrategy(...))`) y usarla en el router
 * con `passport.authenticate('google', ...)` — no hace falta tocar app.js
 * ni el resto de las estrategias existentes.
 */

// Extrae el JWT desde la cookie `currentUser` en vez de un header
// Authorization (que es lo que passport-jwt espera por defecto).
const cookieExtractor = (req) => {
  return (req && req.cookies && req.cookies.currentUser) || null;
};

// --- Estrategia 'register' ---------------------------------------------
// Toda la lógica de POST /api/sessions/register vive acá: validación,
// normalización de email, unicidad, hash con bcrypt y rol por defecto.
// `passReqToCallback` para poder leer first_name/last_name del body además
// de email/password.
passport.use(
  'register',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password', passReqToCallback: true },
    async (req, email, password, done) => {
      try {
        const { first_name, last_name } = req.body || {};

        if (!first_name || !last_name || !email || !password) {
          return done(new ApiError(400, 'Faltan campos obligatorios'));
        }

        if (!isValidEmail(email)) {
          return done(new ApiError(400, 'Formato de email inválido'));
        }

        if (!isValidPassword(password)) {
          return done(
            new ApiError(400, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`),
          );
        }

        const normalizedEmail = normalizeEmail(email);

        const existingUser = await usersRepository.findByEmail(normalizedEmail);
        if (existingUser) {
          return done(new ApiError(409, 'El email ya está registrado'));
        }

        const hashedPassword = await hashPassword(password);

        // El rol nunca sale del body: el modelo lo deja en 'user' por default,
        // sin importar qué mande el cliente.
        const user = await usersRepository.create({
          first_name: String(first_name).trim(),
          last_name: String(last_name).trim(),
          email: normalizedEmail,
          password: hashedPassword,
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// --- Estrategia 'login' --------------------------------------------------
// Busca el usuario y compara la contraseña con bcrypt. Nunca genera el JWT
// ni setea la cookie acá: eso queda para el controller tras un login
// exitoso, por diseño de la consigna.
passport.use(
  'login',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        if (!email || !password) {
          return done(new ApiError(400, 'Faltan campos obligatorios'));
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await usersRepository.findByEmail(normalizedEmail);

        // user=false (sin error) ante credenciales inválidas: el controller
        // responde siempre con el mismo mensaje genérico, sin indicar si
        // falló el email o la contraseña.
        if (!user) {
          return done(null, false);
        }

        const passwordMatches = await comparePassword(password, user.password);
        if (!passwordMatches) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// --- Estrategia 'current' -------------------------------------------------
// Lee el JWT desde la cookie `currentUser`, lo valida (firma + expiración)
// y deja el payload disponible como req.user vía el middleware `auth`.
passport.use(
  'current',
  new JwtStrategy(
    {
      jwtFromRequest: cookieExtractor,
      secretOrKey: config.jwtSecret,
    },
    (jwtPayload, done) => {
      // El payload ya es { id, email, role, iat, exp }: nunca incluyó password.
      return done(null, jwtPayload);
    },
  ),
);

export default passport;
