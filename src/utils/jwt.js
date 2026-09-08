import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

/**
 * Firma un JWT con el secreto y la expiración configurados por entorno.
 * El payload NUNCA debe incluir la contraseña ni otra info sensible.
 */
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

/**
 * Verifica un JWT. Lanza si es inválido, está manipulado o expiró.
 */
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export default { signToken, verifyToken };
