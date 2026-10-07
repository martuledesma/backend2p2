import { usersService } from '../services/users.service.js';
import { toUserDTO } from '../dto/user.dto.js';

// Protegida con auth + authorize('admin') en el router. Nunca incluye
// password. El controller solo coordina: toda la lógica vive en
// usersService, nunca llama al repository ni al DAO directamente.
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await usersService.listUsers();
    res.status(200).json({ status: 'success', payload: users.map(toUserDTO) });
  } catch (error) {
    next(error);
  }
};
