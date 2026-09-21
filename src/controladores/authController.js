const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'llave_secreta_mgc';

const registrar = async (req, res) => {
  try {
    const { email, password, rol, nombre } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Consulta SQL directa a MySQL
    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({ error: 'El usuario ya existe en MGC' });
    }

    const contrasena = await bcrypt.hash(password, 10);
    const nuevoUsuario = await User.create({
      nombre: nombre || 'Usuario MGC',
      email,
      password: contrasena,
      rol: rol === 'administrador' ? 'administrador' : 'cliente'
    });

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: nuevoUsuario.id,
      rol: nuevoUsuario.rol
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Búsqueda en la tabla usuarios de MySQL
    const user = await User.findOne({ where: { email } });
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
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { registrar, login, JWT_SECRET };