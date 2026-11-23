require("dotenv").config();
const app = require("./app.js");
const connectMongo = require("./db/mongo.js");
const prisma = require("./db/prisma.js");
const Event = require("./models/event.js");
const Survey = require("./models/survey.js");
const PORT = process.env.PORT || 3000;

// El servidor arranca SOLO si MongoDB conecta
connectMongo()
  .then(async () => {
    // Crea los índices (code único, registrationId único, etc.) antes de recibir peticiones
    await Promise.all([Event.init(), Survey.init()]);
    await prisma.$connect();
    console.log("Connected to PostgreSQL (Prisma)");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo iniciar el servidor (MongoDB o PostgreSQL):", error.message);
    process.exit(1);
  });
