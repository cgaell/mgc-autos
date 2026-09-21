const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controladores/authController');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== requiredRole) {
      return res.status(403).json({ error: 'Acceso denegado: Permisos insuficientes' });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };