import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  MIN_PASSWORD_LENGTH,
} from '../utils/validators.js';
import { ApiError } from '../utils/errors.js';

class SessionsService {
  async registerUser({ first_name, last_name, email, password }) {
    if (!first_name || !last_name || !email || !password) {
      throw new ApiError(400, 'Faltan campos obligatorios');
    }

    if (!isValidEmail(email)) {
      throw new ApiError(400, 'Formato de email inválido');
    }

    if (!isValidPassword(password)) {
      throw new ApiError(
        400,
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      );
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await usersRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ApiError(409, 'El email ya está registrado');
    }

    const hashedPassword = await hashPassword(password);

    // El rol nunca se toma del body: siempre queda en el default ('user')
    // que define el modelo, sin importar qué mande el cliente.
    const user = await usersRepository.create({
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return this.toPublicUser(user);
  }

  async loginUser({ email, password }) {
    if (!email || !password) {
      throw new ApiError(400, 'Faltan campos obligatorios');
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await usersRepository.findByEmail(normalizedEmail);

    // Mensaje siempre genérico: no se distingue "no existe" de "contraseña
    // incorrecta" para no darle pistas a quien intenta adivinar credenciales.
    if (!user) {
      throw new ApiError(401, 'Credenciales inválidas');
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      throw new ApiError(401, 'Credenciales inválidas');
    }

    // El JWT solo lleva lo mínimo: nunca la contraseña.
    return signToken({ id: user._id, email: user.email, role: user.role });
  }

  // Nunca incluye password, ni en texto plano ni hasheada.
  toPublicUser(user) {
    return {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    };
  }
}

export const sessionsService = new SessionsService();
export default sessionsService;
