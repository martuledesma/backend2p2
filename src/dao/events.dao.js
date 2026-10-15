import { Event } from '../models/Event.js';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Traduce los criterios de negocio (status/category/location/dateFrom/
// dateTo) a un filtro de Mongo. Este es el único lugar de toda la app que
// conoce operadores de Mongo ($regex, $gte, $lte): a la capa de servicio y
// de repository solo les importa el significado de negocio del filtro,
// nunca su sintaxis.
function buildFilter({ status, category, location, dateFrom, dateTo } = {}) {
  const filter = {};
  if (status) filter.status = status;
  // category/location: coincidencia exacta pero case-insensitive (mismo
  // criterio que antes, cuando se comparaba en memoria con .toLowerCase()).
  if (category) filter.category = { $regex: `^${escapeRegExp(category)}$`, $options: 'i' };
  if (location) filter.location = { $regex: `^${escapeRegExp(location)}$`, $options: 'i' };
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }
  return filter;
}

class EventsDao {
  // Trae una página de eventos ya filtrada, ordenada y paginada por Mongo
  // (find + sort + skip + limit, más countDocuments para el total). Nunca
  // trae todos los documentos a memoria para filtrar/ordenar/paginar acá:
  // eso es justamente lo que esta capa existe para evitar.
  async findPage({ status, category, location, dateFrom, dateTo, sort, skip, limit } = {}) {
    const filter = buildFilter({ status, category, location, dateFrom, dateTo });

    let query = Event.find(filter);
    if (sort) query = query.sort(sort);
    if (typeof skip === 'number') query = query.skip(skip);
    if (typeof limit === 'number') query = query.limit(limit);

    const [data, total] = await Promise.all([query, Event.countDocuments(filter)]);
    return { data, total };
  }

  async findById(id) {
    try {
      return await Event.findById(id);
    } catch (error) {
      // Un id con formato inválido nunca debe explotar como 500: se trata
      // igual que "no encontrado" y la capa de servicio responde 404.
      if (error.name === 'CastError') return null;
      throw error;
    }
  }

  async create(data) {
    return Event.create(data);
  }

  async updateById(id, updates) {
    return Event.findByIdAndUpdate(id, updates, { new: true });
  }
}

export const eventsDao = new EventsDao();
export default eventsDao;
