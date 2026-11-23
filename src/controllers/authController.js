const { registerUser, loginUser, getUserById, deleteUser } = require("../services/authService");
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    await registerUser(email, password, name);
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);
    return res.json({ token });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const me = async (req, res) => {
  try {
    return res.json(await getUserById(req.user.id));
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

const deleteMe = async (req, res, next) => {
  try {
    return res.json(await deleteUser(req.user.id));
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, me, deleteMe };
