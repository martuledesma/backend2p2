import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

/**
 * Firma un JWT con el secreto y la expiración configurados por entorno.
 * El payload NUNCA debe incluir la contraseña ni otra info sensible.
 *
 * La verificación del JWT (para /current) la hace directamente la
 * estrategia 'current' de Passport (passport-jwt), no este archivo.
 */
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export default { signToken };
