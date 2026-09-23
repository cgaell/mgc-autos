const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('mgc_seguros', 'mgc_admin', 'milleniumglobal', {
  host: process.env.DB_HOST || '127.0.0.1',
  port: 3306,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Modelo de Usuarios
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  rol: { type: DataTypes.ENUM('cliente', 'agente', 'administrador'), defaultValue: 'cliente' }
}, { tableName: 'usuarios' });

// Modelo de Pólizas
const Poliza = sequelize.define('Poliza', {
  id: { type: DataTypes.STRING(30), primaryKey: true },
  numeroSerieVehiculo: { type: DataTypes.STRING(50), allowNull: false },
  vigenciaInicio: { type: DataTypes.DATEONLY, allowNull: false },
  vigenciaFin: { type: DataTypes.DATEONLY, allowNull: false },
  estatus: { 
    type: DataTypes.ENUM('Activa', 'Cancelada', 'Inactiva', 'Pendiente de renovación'), 
    defaultValue: 'Activa' 
  },
  archivoPdfUrl: { type: DataTypes.STRING(255), allowNull: true }
}, { tableName: 'polizas' });

const Solicitud = sequelize.define('Solicitud', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  purpose: { type: DataTypes.STRING(30), allowNull: false },
  line: { type: DataTypes.STRING(30), allowNull: false },
  vehicle: { type: DataTypes.STRING(30), allowNull: false },
  make: { type: DataTypes.STRING(80), allowNull: false },
  model: { type: DataTypes.STRING(80), allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  use: { type: DataTypes.STRING(30), allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false },
  phone: { type: DataTypes.STRING(30), allowNull: false },
  photos: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  estado: { type: DataTypes.ENUM('Pendiente', 'Aceptada', 'Rechazada'), allowNull: false, defaultValue: 'Pendiente' },
  motivoRechazo: { type: DataTypes.STRING(500), allowNull: true }
}, { tableName: 'solicitudes' });

User.hasMany(Poliza, { foreignKey: 'userId' });
Poliza.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Poliza, Solicitud };