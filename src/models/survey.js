// Encuesta de satisfacción (MongoDB): el registro que crece sin límite.
// Va en su propia colección (no embebida en Event) para no llegar al límite de 16 MB.
const mongoose = require("mongoose");

const { Schema } = mongoose;

const surveySchema = new Schema(
  {
    // Referencia dentro de MongoDB: ObjectId + ref (se une con populate)
    event: { type: Schema.Types.ObjectId, ref: "Event", required: [true, "El evento es obligatorio"] },
    // Referencias a PostgreSQL (sin FK): las garantiza el servicio con Prisma
    registrationId: { type: Number, required: [true, "La inscripción es obligatoria"] },
    userId: { type: Number, required: [true, "El usuario es obligatorio"] },
    // Dato copiado de PostgreSQL (desnormalización) para listar sin ir a la otra base
    attendeeName: { type: String, required: [true, "El nombre del asistente es obligatorio"], trim: true },
    rating: {
      type: Number,
      required: [true, "La calificación es obligatoria"],
      min: [1, "La calificación mínima es 1"],
      max: [5, "La calificación máxima es 5"],
      validate: { validator: Number.isInteger, message: "La calificación debe ser un número entero" },
    },
    comment: { type: String, trim: true, maxlength: [500, "El comentario admite máximo 500 caracteres"] },
    wouldRecommend: { type: Boolean, default: true },
    aspects: [
      {
        type: String,
        enum: { values: ["CONTENIDO", "PONENTES", "SEDE", "ORGANIZACION", "PUNTUALIDAD"], message: "El aspecto {VALUE} no es válido" },
      },
    ],
  },
  { timestamps: true },
);

// Una encuesta por inscripción → E11000 si se repite (409)
surveySchema.index({ registrationId: 1 }, { unique: true });
// Listar encuestas de un evento, las más nuevas primero
surveySchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.models.Survey || mongoose.model("Survey", surveySchema);
