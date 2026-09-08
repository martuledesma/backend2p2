import app from './app.js';
import { config } from './config/config.js';
import { connectDB } from './config/db.js';

const PORT = config.port;

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}

start();
