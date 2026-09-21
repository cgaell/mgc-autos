const express = require('express');
const cors = require('cors');
const { registrar, login } = require('./controladores/authController');
const { verifyToken, verifyRole } = require('./middleware/authMiddleware');
const { Poliza } = require('./database/db');

const app = express();
app.use(cors());
app.use(express.json());

// Rutas Públicas
app.post('/api/auth/registrar', registrar);
app.post('/api/auth/login', login);

// Rutas Protegidas según alcance de MGC Seguros
// Cliente: Consulta sus pólizas vigentes
app.get('/api/polizas/mis-polizas', verifyToken, async (req, res) => {
  try {
  const misPolizas = await Poliza.findAll({ where: { titularEmail: req.user.email } });
  return res.status(200).json(misPolizas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener las pólizas del cliente'});
  }
});

app.get('/api/admin/polizas', verifyToken, verifyRole('administrador'), async (req, res) => {
  try {
    const todasLasPolizas = await Poliza.findAll();
    return res.status(200).json(todasLasPolizas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar panel administrativo' });
  }
});

module.exports = app;