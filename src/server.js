const app = require('./app');
const { sequelize } = require('./database/db');
const PORT = process.env.PORT || 3000;

sequelize.sync()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor MGC Seguros corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No fue posible preparar la base de datos:', error);
    process.exit(1);
  });