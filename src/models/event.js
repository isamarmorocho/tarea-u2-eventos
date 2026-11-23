// Catálogo de eventos (MongoDB)
// - sede: subdocumento embebido (1:1, se lee siempre con el evento)
// - agenda[]: arreglo embebido (1:pocos, acotado, "la agenda se muestra completa")
// - capacity: aforo. Es el límite duro que PostgreSQL hace cumplir al inscribir.
const mongoose = require("mongoose");

const { Schema } = mongoose;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const sedeSchema = new Schema(
  {
    name: { type: String, required: [true, "El nombre de la sede es obligatorio"], trim: true, maxlength: [100, "El nombre de la sede admite máximo 100 caracteres"] },
    address: { type: String, required: [true, "La dirección de la sede es obligatoria"], trim: true },
    city: { type: String, required: [true, "La ciudad de la sede es obligatoria"], trim: true },
    room: { type: String, trim: true },
  },
  { _id: false },
);

const agendaItemSchema = new Schema(
  {
    day: { type: Number, min: [1, "El día de la agenda empieza en 1"], default: 1 },
    startTime: {
      type: String,
      required: [true, "La hora de inicio de la actividad es obligatoria"],
      match: [HHMM, "La hora de inicio debe tener el formato HH:mm"],
    },
    endTime: {
      type: String,
      required: [true, "La hora de fin de la actividad es obligatoria"],
      match: [HHMM, "La hora de fin debe tener el formato HH:mm"],
      // Validación propia: la actividad termina después de empezar
      validate: {
        validator(value) {
          return !this.startTime || value > this.startTime;
        },
        message: (props) => `La hora de fin (${props.value}) debe ser posterior a la hora de inicio`,
      },
    },
    title: { type: String, required: [true, "El título de la actividad es obligatorio"], trim: true, maxlength: [120, "El título de la actividad admite máximo 120 caracteres"] },
    speaker: { type: String, trim: true, default: "Por confirmar" },
  },
  { _id: false },
);

const eventSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "El código del evento es obligatorio"],
      unique: true,
      trim: true,
      match: [/^EVT-\d{4}$/, "El código debe tener el formato EVT-0000"],
    },
    title: {
      type: String,
      required: [true, "El título del evento es obligatorio"],
      trim: true,
      minlength: [5, "El título debe tener al menos 5 caracteres"],
      maxlength: [120, "El título admite máximo 120 caracteres"],
    },
    description: { type: String, trim: true, maxlength: [1000, "La descripción admite máximo 1000 caracteres"] },
    category: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      enum: {
        values: ["CONFERENCIA", "TALLER", "SEMINARIO", "CONCIERTO", "FERIA"],
        message: "La categoría {VALUE} no es válida (CONFERENCIA, TALLER, SEMINARIO, CONCIERTO o FERIA)",
      },
    },
    status: {
      type: String,
      enum: { values: ["BORRADOR", "PUBLICADO", "CANCELADO"], message: "El estado {VALUE} no es válido" },
      default: "PUBLICADO",
    },
    sede: { type: sedeSchema, required: [true, "La sede es obligatoria"] },
    agenda: {
      type: [agendaItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length >= 1 && items.length <= 50,
        message: "La agenda debe tener entre 1 y 50 actividades",
      },
    },
    capacity: {
      type: Number,
      required: [true, "El aforo es obligatorio"],
      min: [1, "El aforo mínimo es 1"],
      max: [10000, "El aforo máximo es 10000"],
      validate: { validator: Number.isInteger, message: "El aforo debe ser un número entero" },
    },
    price: { type: Number, min: [0, "El precio no puede ser negativo"], default: 0 },
    startDate: { type: Date, required: [true, "La fecha de inicio es obligatoria"] },
    endDate: {
      type: Date,
      required: [true, "La fecha de fin es obligatoria"],
      // Validación propia: el evento no termina antes de empezar
      validate: {
        validator(value) {
          return !this.startDate || value >= this.startDate;
        },
        message: "La fecha de fin no puede ser anterior a la fecha de inicio",
      },
    },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual: duración en días (no se guarda, se calcula)
eventSchema.virtual("durationDays").get(function () {
  if (!this.startDate || !this.endDate) return undefined;
  const ms = this.endDate.getTime() - this.startDate.getTime();
  return Math.floor(ms / 86_400_000) + 1;
});

// Virtual: número de actividades de la agenda
eventSchema.virtual("agendaCount").get(function () {
  return Array.isArray(this.agenda) ? this.agenda.length : undefined;
});

// Middleware pre("validate") SIN next: normaliza antes de validar
eventSchema.pre("validate", function () {
  if (typeof this.code === "string") this.code = this.code.trim().toUpperCase();
  if (Array.isArray(this.agenda) && this.agenda.length > 1) {
    // La agenda se guarda ordenada (día y hora) porque se muestra completa
    const sorted = [...this.agenda].sort((a, b) => (a.day - b.day) || String(a.startTime).localeCompare(String(b.startTime)));
    this.agenda = sorted.map((item) => (item.toObject ? item.toObject() : item));
  }
  if (Array.isArray(this.tags)) this.tags = [...new Set(this.tags.filter(Boolean))];
});

// Índices que pide el workload
eventSchema.index({ startDate: 1 });
eventSchema.index({ category: 1, startDate: 1 });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);
