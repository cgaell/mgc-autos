const express = require('express');
const cors = require('cors');
const { registrar, login } = require('./controladores/authController');
const { verifyToken, verifyRole } = require('./middleware/authMiddleware');
const { polizas } = require('./datos/users');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas Públicas
app.post('/api/auth/registrar', registrar);
app.post('/api/auth/login', login);

// Rutas Protegidas según alcance de MGC Seguros
// Cliente: Consulta sus pólizas vigentes
app.get('/api/polizas/mis-polizas', verifyToken, (req, res) => {
  const misPolizas = polizas.filter(p => p.titularEmail === req.user.email);
  return res.status(200).json(misPolizas);
});

// Administrador: Panel de control de todas las pólizas
app.get('/api/admin/polizas', verifyToken, verifyRole('administrador'), (req, res) => {
  return res.status(200).json(polizas);
});

module.exports = app;