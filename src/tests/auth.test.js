const request = require('supertest');
const bcrypt = require('bcryptjs');
const { sequelize, User, Poliza, Solicitud } = require('../database/db');
const app = require('../app');

const cliente = {
  nombre: 'Cliente de Prueba',
  email: 'cliente.test@mgc.com',
  password: 'PasswordSegura2026!',
  rol: 'cliente'
};

const administrador = {
  nombre: 'Administrador de Prueba',
  email: 'admin.test@mgc.com',
  password: 'AdminPassword2026!',
  rol: 'administrador'
};

const login = (credentials) => request(app)
  .post('/api/auth/login')
  .send({ email: credentials.email, password: credentials.password });

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('API MGC Seguros', () => {
  let clienteToken;
  let administradorToken;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    const clienteDb = await User.create({ ...cliente, password: await bcrypt.hash(cliente.password, 10) });
    const adminDb = await User.create({ ...administrador, password: await bcrypt.hash(administrador.password, 10) });

    await Poliza.create({
      id: 'POL-TEST-0001', numeroSerieVehiculo: 'SERIE-TEST-0001',
      vigenciaInicio: '2026-01-01', vigenciaFin: '2027-01-01', estatus: 'Activa', userId: clienteDb.id
    });
    await Poliza.create({
      id: 'POL-TEST-0002', numeroSerieVehiculo: 'SERIE-TEST-0002',
      vigenciaInicio: '2026-02-01', vigenciaFin: '2027-02-01', estatus: 'Pendiente de renovación', userId: adminDb.id
    });

    clienteToken = (await login(cliente)).body.token;
    administradorToken = (await login(administrador)).body.token;
  });

  afterAll(async () => sequelize.close());

  describe('Autenticación', () => {
    it('registra un cliente con rol por defecto', async () => {
      const response = await request(app).post('/api/auth/registrar').send({
        nombre: 'Nuevo Cliente', email: 'nuevo@mgc.com', password: 'Password123!'
      });
      expect(response.statusCode).toBe(201);
      expect(response.body).toMatchObject({ rol: 'cliente' });
      expect(response.body).toHaveProperty('userId');
    });

    it('rechaza un registro incompleto', async () => {
      const response = await request(app).post('/api/auth/registrar').send({ email: 'incompleto@mgc.com' });
      expect(response.statusCode).toBe(400);
    });

    it('rechaza registrar un email existente', async () => {
      const response = await request(app).post('/api/auth/registrar').send({ email: cliente.email, password: cliente.password });
      expect(response.statusCode).toBe(409);
    });

    it('registra correctamente un administrador', async () => {
      const response = await request(app).post('/api/auth/registrar').send({ email: 'otro-admin@mgc.com', password: 'Admin123!', rol: 'administrador' });
      expect(response.statusCode).toBe(201);
      expect(response.body.rol).toBe('administrador');
    });

    it('inicia sesión y devuelve un JWT con rol', async () => {
      const response = await login(administrador);
      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({ rol: 'administrador', nombre: administrador.nombre });
      expect(response.body.token).toEqual(expect.any(String));
    });

    it('rechaza usuario inexistente y contraseña incorrecta', async () => {
      const missingUser = await login({ email: 'no-existe@mgc.com', password: 'Password123!' });
      const wrongPassword = await login({ email: cliente.email, password: 'incorrecta' });
      expect(missingUser.statusCode).toBe(401);
      expect(wrongPassword.statusCode).toBe(401);
    });
  });

  describe('Autorización y pólizas', () => {
    it('sirve la landing pública', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });

    it('rechaza una ruta protegida sin token', async () => {
      const response = await request(app).get('/api/polizas/mis-polizas');
      expect(response.statusCode).toBe(401);
    });

    it('rechaza un token inválido', async () => {
      const response = await request(app).get('/api/polizas/mis-polizas').set('Authorization', 'Bearer token-invalido');
      expect(response.statusCode).toBe(403);
    });

    it('permite al cliente consultar sus pólizas', async () => {
      const response = await request(app).get('/api/polizas/mis-polizas').set(authHeader(clienteToken));
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('POL-TEST-0001');
    });

    it('impide al cliente consultar el panel administrativo', async () => {
      const response = await request(app).get('/api/admin/polizas').set(authHeader(clienteToken));
      expect(response.statusCode).toBe(403);
    });

    it('permite al administrador consultar todas las pólizas', async () => {
      const response = await request(app).get('/api/admin/polizas').set(authHeader(administradorToken));
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('permite al administrador actualizar todos los estados de una póliza', async () => {
      const estados = ['Cancelada', 'Inactiva', 'Pendiente de renovación', 'Activa'];
      for (const estatus of estados) {
        const response = await request(app)
          .patch('/api/admin/polizas/POL-TEST-0001')
          .set(authHeader(administradorToken))
          .send({ estatus });
        expect(response.statusCode).toBe(200);
        expect(response.body.estatus).toBe(estatus);
      }
    });

    it('rechaza estados inválidos, pólizas inexistentes y clientes sin permisos', async () => {
      const invalid = await request(app)
        .patch('/api/admin/polizas/POL-TEST-0001')
        .set(authHeader(administradorToken))
        .send({ estatus: 'Vencida' });
      const missing = await request(app)
        .patch('/api/admin/polizas/NO-EXISTE')
        .set(authHeader(administradorToken))
        .send({ estatus: 'Activa' });
      const forbidden = await request(app)
        .patch('/api/admin/polizas/POL-TEST-0001')
        .set(authHeader(clienteToken))
        .send({ estatus: 'Cancelada' });

      expect(invalid.statusCode).toBe(400);
      expect(missing.statusCode).toBe(404);
      expect(forbidden.statusCode).toBe(403);
    });
  });

  describe('Solicitudes de cotización', () => {
    const validRequest = {
      purpose: 'new', line: 'civil', vehicle: 'sedan', make: 'Toyota', model: 'Corolla', year: 2024,
      use: 'personal', name: 'Persona Solicitante', email: 'solicitud@mgc.com', phone: '5500000000',
      photos: { 'photo-front': 'frente.jpg' }
    };

    it('rechaza una solicitud incompleta', async () => {
      const response = await request(app).post('/api/solicitudes').send({ ...validRequest, phone: undefined });
      expect(response.statusCode).toBe(400);
    });

    it('guarda una solicitud y traduce el uso al español', async () => {
      const response = await request(app).post('/api/solicitudes').send(validRequest);
      const saved = await Solicitud.findByPk(response.body.solicitudId);
      expect(response.statusCode).toBe(201);
      expect(saved.estado).toBe('Pendiente');
      expect(saved.use).toBe('Uso personal');
      expect(saved.photos).toEqual(validRequest.photos);
    });

    it('traduce los otros usos del formulario', async () => {
      const work = await request(app).post('/api/solicitudes').send({ ...validRequest, email: 'work@mgc.com', use: 'work' });
      const fleet = await request(app).post('/api/solicitudes').send({ ...validRequest, email: 'fleet@mgc.com', use: 'fleet' });
      const saved = await Solicitud.findAll({ where: { id: [work.body.solicitudId, fleet.body.solicitudId] } });
      expect(saved.map((item) => item.use)).toEqual(expect.arrayContaining(['Uso de trabajo', 'Operación empresarial']));
    });

    it('permite al administrador consultar solicitudes', async () => {
      const response = await request(app).get('/api/admin/solicitudes').set(authHeader(administradorToken));
      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
      expect(response.body[0]).toHaveProperty('createdAt');
    });

    it('impide al cliente consultar solicitudes administrativas', async () => {
      const response = await request(app).get('/api/admin/solicitudes').set(authHeader(clienteToken));
      expect(response.statusCode).toBe(403);
    });

    it('rechaza actualizar una solicitud sin permisos de administrador', async () => {
      const created = await request(app).post('/api/solicitudes').send({ ...validRequest, email: 'unauthorized@mgc.com' });
      const response = await request(app)
        .patch(`/api/admin/solicitudes/${created.body.solicitudId}`)
        .set(authHeader(clienteToken))
        .send({ estado: 'Aceptada' });

      expect(response.statusCode).toBe(403);
    });

    it('no permite rechazar una solicitud sin explicar el motivo', async () => {
      const created = await request(app).post('/api/solicitudes').send({ ...validRequest, email: 'without-reason@mgc.com' });
      const response = await request(app)
        .patch(`/api/admin/solicitudes/${created.body.solicitudId}`)
        .set(authHeader(administradorToken))
        .send({ estado: 'Rechazada', motivoRechazo: '   ' });

      expect(response.statusCode).toBe(400);
    });

    it('permite al administrador aceptar una solicitud', async () => {
      const created = await request(app).post('/api/solicitudes').send({ ...validRequest, email: 'accepted@mgc.com' });
      const response = await request(app)
        .patch(`/api/admin/solicitudes/${created.body.solicitudId}`)
        .set(authHeader(administradorToken))
        .send({ estado: 'Aceptada' });

      expect(response.statusCode).toBe(200);
      expect(response.body.estado).toBe('Aceptada');
      expect(response.body.motivoRechazo).toBeNull();
    });

    it('permite rechazar una solicitud guardando el motivo', async () => {
      const created = await request(app).post('/api/solicitudes').send({ ...validRequest, email: 'rejected@mgc.com' });
      const response = await request(app)
        .patch(`/api/admin/solicitudes/${created.body.solicitudId}`)
        .set(authHeader(administradorToken))
        .send({ estado: 'Rechazada', motivoRechazo: 'La documentación está incompleta.' });

      expect(response.statusCode).toBe(200);
      expect(response.body.estado).toBe('Rechazada');
      expect(response.body.motivoRechazo).toBe('La documentación está incompleta.');
    });

    it('rechaza estados no permitidos y solicitudes inexistentes', async () => {
      const invalidStatus = await request(app)
        .patch('/api/admin/solicitudes/1')
        .set(authHeader(administradorToken))
        .send({ estado: 'En revisión' });
      const missing = await request(app)
        .patch('/api/admin/solicitudes/999999')
        .set(authHeader(administradorToken))
        .send({ estado: 'Aceptada' });

      expect(invalidStatus.statusCode).toBe(400);
      expect(missing.statusCode).toBe(404);
    });
  });
});
