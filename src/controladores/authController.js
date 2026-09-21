const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('../datos/users');

const JWT_SECRET = process.env.JWT_SECRET || 'llave_secreta_mgc';

const registrar = async (req, res) => {
  const { email, password, rol } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const usuarioExistente = users.find(u => u.email === email);
  if (usuarioExistente) {
    return res.status(409).json({ error: 'El usuario ya existe en MGC' });
  }

  const contrasena = await bcrypt.hash(password, 10);
  const nuevoUsuario = {
    id: users.length + 1,
    email,
    password: contrasena,
    rol: rol === 'administrador' ? 'administrador' : 'cliente'
  };

  users.push(nuevoUsuario);
  return res.status(201).json({ message: 'Usuario registrado exitosamente', userId: nuevoUsuario.id, rol: nuevoUsuario.rol });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return res.status(200).json({ token, rol: user.rol });
};

module.exports = { registrar, login, JWT_SECRET };