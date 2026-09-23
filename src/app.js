const path = require('path');
const express = require('express');
const cors = require('cors');
const { registrar, login } = require('./controladores/authController');
const { verifyToken, verifyRole } = require('./middleware/authMiddleware');
const { Poliza } = require('./database/db');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Servir el directorio completo de archivos estáticos (public/)
app.use(express.static(path.join(__dirname, '../public')));

// 2. Rutas de la API (Autenticación)
app.post('/api/auth/registrar', registrar);
app.post('/api/auth/login', login);

// 3. Rutas Protegidas (RBAC)
// Cliente: Consulta las pólizas vinculadas a su ID de usuario
app.get('/api/polizas/mis-polizas', verifyToken, async (req, res) => {
  try {
    // req.user viene del token verificado en authMiddleware
    const misPolizas = await Poliza.findAll({ where: { userId: req.user.userId } });
    return res.status(200).json(misPolizas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las pólizas del cliente' });
  }
});

// Administrador: Consulta todas las pólizas del parque vehicular
app.get('/api/admin/polizas', verifyToken, verifyRole('administrador'), async (req, res) => {
  try {
    const todasLasPolizas = await Poliza.findAll();
    return res.status(200).json(todasLasPolizas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar panel administrativo' });
  }
});

// 4. Ruta raíz / SPA Fallback para redirigir a index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

module.exports = app;