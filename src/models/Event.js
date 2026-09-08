import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const EVENT_STATUSES = ['published', 'cancelled'];

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
    },
    location: {
      type: String,
      trim: true,
    },
    // Quién lo creó. Nunca se toma del body: siempre es el usuario
    // autenticado (req.user.id) que hizo el POST.
    organizer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: EVENT_STATUSES,
      default: 'published',
    },
  },
  { timestamps: true },
);

export const Event = model('Event', eventSchema);

export default Event;
