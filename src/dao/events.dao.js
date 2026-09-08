class EventsDao {
  async getAll() {
    // Acceso a datos: en próximas entregas se conectará a MongoDB.
    // Por ahora devuelve una lista vacía.
    return [];
  }
}

export const eventsDao = new EventsDao();
