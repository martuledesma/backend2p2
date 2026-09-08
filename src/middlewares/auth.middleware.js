import passport from '../config/passport.config.js';

/**
 * Middleware de autenticación: envuelve la estrategia 'current' de Passport
 * (JWT desde la cookie `currentUser`) para responder siempre en el formato
 * JSON del proyecto. Si no hay token válido, 401 "No autenticado"; si es
 * válido, deja el payload en req.user y sigue.
 */
export const auth = (req, res, next) => {
  passport.authenticate('current', { session: false }, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ status: 'error', message: 'No autenticado' });
    }
    req.user = user;
    next();
  })(req, res, next);
};

export default auth;
