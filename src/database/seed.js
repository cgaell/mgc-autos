const { sequelize, User, Poliza } = require('./db');
const bcrypt = require('bcryptjs');

async function seedMySQL() {
  try {
    console.log('Autenticando conexión con MySQL...');
    await sequelize.authenticate();
    console.log('Conexión establecida con éxito.');

    // Sincroniza y recrea las tablas limpias
    await sequelize.sync({ force: true });
    console.log('Tablas "usuarios" y "polizas" creadas en MySQL.');

    const passwordHasheada = await bcrypt.hash('contrasenamilleniumglobal', 10);

    // 1. Crear Administrador general de MGC
    const admin = await User.create({
      nombre: 'Director de MGC',
      email: 'admin@mgc.com',
      password: passwordHasheada,
      rol: 'administrador'
    });

    console.log('Usuario Administrador creado: admin@mgc.com');

    // 2. Crear Clientes con sus Pólizas asociadas
    for (let i = 1; i <= 15; i++) {
      const cliente = await User.create({
        nombre: `Conductor Asegurado ${i}`,
        email: `cliente${i}@mgc.com`,
        password: passwordHasheada,
        rol: 'cliente'
      });

      // Póliza principal asignada al cliente
      await Poliza.create({
        id: `POL-2026-${String(i).padStart(4, '0')}`,
        numeroSerieVehiculo: `3N1AB7AP${i}KY${100000 + i}`,
        vigenciaInicio: '2026-01-01',
        vigenciaFin: '2027-01-01',
        estatus: i % 4 === 0 ? 'Vencida' : 'Activa',
        archivoPdfUrl: '/docs/poliza-mgc-muestra.pdf', // o la URL externa de Condusef
        userId: cliente.id
        });
    }

    console.log('Sembrado completado: 1 Administrador, 15 Clientes y 15 Pólizas listas.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante el seeder de MySQL:', error);
    process.exit(1);
  }
}

seedMySQL();