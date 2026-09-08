import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDB() {
  if (!config.mongoUrl) {
    console.warn(
      'MONGO_URL no está definida. El servidor no se conectará a MongoDB (configurala en tu .env).',
    );
    return;
  }

  try {
    await mongoose.connect(config.mongoUrl);
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
}

export default connectDB;
