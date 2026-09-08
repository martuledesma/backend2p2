import { usersDao } from '../dao/users.dao.js';

class UsersRepository {
  async findByEmail(email) {
    return usersDao.findByEmail(email);
  }

  async findAll() {
    return usersDao.findAll();
  }

  async create(userData) {
    return usersDao.create(userData);
  }
}

export const usersRepository = new UsersRepository();
export default usersRepository;
