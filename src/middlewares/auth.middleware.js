import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware de autenticación: lee el JWT de la cookie `currentUser`,
 * lo verifica y guarda el payload en req.user. Si no hay cookie o el
 * token es inválido/expiró, responde 401 sin distinguir el motivo.
 */
export const auth = (req, res, next) => {
  const token = req.cookies?.currentUser;

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'No autenticado' });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'No autenticado' });
  }
};

export default auth;
