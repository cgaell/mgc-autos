//base de datos simulada para usuarios y pólizas

const users = [];

const polizas = [
  { id: "POL-001", titularEmail: "cliente1@mgc.com", aseguradora: "Qualitas", cobertura: "Amplia", estatus: "Activa" },
  { id: "POL-002", titularEmail: "empresa@yahoo.com", aseguradora: "GNP", cobertura: "Comercial", estatus: "Activa" }
];

module.exports = { users, polizas };