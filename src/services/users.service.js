import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import {
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  MIN_PASSWORD_LENGTH,
} from '../utils/validators.js';
import { ApiError } from '../utils/errors.js';

class UsersService {
  // Toda la lógica de negocio del registro vive acá: validación de campos,
  // formato de email, longitud de password, unicidad y hash. La estrategia
  // 'register' de Passport (passport.config.js) solo llama a este método y
  // traduce el resultado a done(err, user) — no valida ni hashea nada ella
  // misma.
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

    // El rol nunca sale del body: el modelo lo deja en 'user' por default,
    // sin importar qué mande el cliente.
    return usersRepository.create({
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });
  }

  // Verifica credenciales para el login: devuelve el user si son correctas,
  // o null si no (email inexistente o password incorrecta) — sin distinguir
  // el motivo, por seguridad. La estrategia 'login' solo llama a esto y
  // nunca compara passwords ella misma.
  async validateCredentials(email, password) {
    if (!email || !password) {
      throw new ApiError(400, 'Faltan campos obligatorios');
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await usersRepository.findByEmail(normalizedEmail);
    if (!user) {
      return null;
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return null;
    }

    return user;
  }

  // Usado por el endpoint administrativo GET /api/users.
  async listUsers() {
    return usersRepository.findAll();
  }
}

export const usersService = new UsersService();
export default usersService;
