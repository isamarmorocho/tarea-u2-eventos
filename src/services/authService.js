const prisma = require("../db/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Survey = require("../models/survey");

const registerUser = async (email, password, name) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "USER",
    },
  });
  return newUser;
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid email or password");
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new Error("Invalid email or password");
  }
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "4h" },
  );
  return token;
};

// Datos del usuario del token, sin la contraseña
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new Error("Usuario no encontrado");
  return user;
};

// Elimina la cuenta: PostgreSQL borra sus inscripciones (onDelete: Cascade)
// y aquí se borran sus encuestas en MongoDB (entre bases no hay FK).
const deleteUser = async (id) => {
  await prisma.user.delete({ where: { id } });
  const { deletedCount } = await Survey.deleteMany({ userId: id });
  return { message: "Cuenta eliminada", surveysDeleted: deletedCount };
};

module.exports = { registerUser, loginUser, getUserById, deleteUser };
