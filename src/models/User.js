import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Roles posibles para un usuario. El rol nunca se acepta desde el body de un
// registro público: siempre se asigna 'user' por defecto en la capa de servicio.
export const USER_ROLES = ['user', 'organizer', 'admin'];

const userSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'user',
    },
  },
  { timestamps: true },
);

export const User = model('User', userSchema);

export default User;
