import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Ciclo de vida de un evento: nace en 'draft', se publica explícitamente vía
// PATCH /api/events/:id/status, y termina en 'cancelled' o 'finished'.
export const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'finished'];

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // Quién lo creó. Nunca se toma del body: siempre es el usuario
    // autenticado (req.user.id) que hizo el POST. Referencia (ObjectId), no
    // el objeto de usuario embebido.
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'draft',
    },
  },
  { timestamps: true },
);

export const Event = model('Event', eventSchema);

export default Event;
