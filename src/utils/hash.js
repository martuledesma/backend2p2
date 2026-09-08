import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña en texto plano. Reutilizable desde cualquier
 * capa de servicio que necesite guardar contraseñas de forma segura.
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra su hash guardado.
 * Se usará en el módulo de login (próxima entrega).
 */
export async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export default { hashPassword, comparePassword };
