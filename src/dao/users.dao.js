import { User } from '../models/User.js';

class UsersDao {
  async findByEmail(email) {
    return User.findOne({ email });
  }

  async findAll() {
    return User.find({});
  }

  async create(userData) {
    return User.create(userData);
  }
}

export const usersDao = new UsersDao();
export default usersDao;
