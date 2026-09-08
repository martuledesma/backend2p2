import { usersRepository } from '../repositories/users.repository.js';

// Protegida con auth + authorize('admin') en el router. Nunca incluye password.
export const getAllUsers = async (req, res) => {
  try {
    const users = await usersRepository.findAll();
    const payload = users.map((user) => ({
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    }));
    res.status(200).json({ status: 'success', payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
};
