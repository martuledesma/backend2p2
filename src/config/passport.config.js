import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy } from 'passport-jwt';

import { usersService } from '../services/users.service.js';
import { config } from './config.js';

/**
 * Este archivo centraliza TODAS las estrategias de autenticación.
 * app.js solo llama a passport.initialize(); nunca define estrategias.
 *
 * A propósito, las estrategias NO contienen lógica de negocio (validar
 * campos, hashear, chequear duplicados, comparar passwords): eso vive en
 * users.service.js. Cada estrategia solo llama al service correspondiente
 * y traduce el resultado al contrato de Passport (`done(err, user)`).
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
// `passReqToCallback` para poder leer first_name/last_name del body además
// de email/password. Delega toda la validación/hash/unicidad en
// usersService.registerUser.
passport.use(
  'register',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password', passReqToCallback: true },
    async (req, email, password, done) => {
      try {
        const { first_name, last_name } = req.body || {};
        const user = await usersService.registerUser({ first_name, last_name, email, password });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// --- Estrategia 'login' --------------------------------------------------
// Delega la verificación de credenciales en usersService.validateCredentials.
// Nunca genera el JWT ni setea la cookie acá: eso queda para el controller
// tras un login exitoso, por diseño de la consigna.
passport.use(
  'login',
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const user = await usersService.validateCredentials(email, password);
        // user=null (sin error) ante credenciales inválidas: el controller
        // responde siempre con el mismo mensaje genérico, sin indicar si
        // falló el email o la contraseña.
        if (!user) {
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
