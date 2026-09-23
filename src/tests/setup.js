const { sequelize } = require('../database/db');

beforeAll(async () => {
  // Conecta y crea las tablas usuarios y polizas en MySQL
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // Cierra el socket para evitar hilos abiertos
  await sequelize.close();
});