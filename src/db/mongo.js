// Una sola conexión a MongoDB (Mongoose) para todo el proyecto
const mongoose = require("mongoose");

const connectMongo = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta MONGODB_URI en el archivo .env");
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to MongoDB: ${mongoose.connection.name}`);
};

module.exports = connectMongo;
