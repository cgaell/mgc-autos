const request = require('supertest');
const app = require('../app');

describe('Pruebas Unitarias - Módulo de Autenticación y Roles MGC Seguros', () => {

  it('Debe registrar un nuevo cliente exitosamente (201)', async () => {
    const res = await request(app)
      .post('/api/auth/registrar')
      .send({
        email: 'cliente@mgc.com',
        password: 'PasswordSegura2026!',
        rol: 'cliente'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('Debe registrar un nuevo administrador exitosamente (201)', async () => {
    const res = await request(app)
      .post('/api/auth/registrar')
      .send({
        email: 'admin2@mgc.com',
        password: 'AdminPassword2026!',
        rol: 'administrador'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.rol).toBe('administrador');
  });

  it('Debe fallar al registrar usuario existente (409)', async () => {
    const res = await request(app)
      .post('/api/auth/registrar')
      .send({
        email: 'cliente@mgc.com',
        password: 'PasswordSegura2026!'
      });
    expect(res.statusCode).toEqual(409);
  });

  it('Debe fallar el login con credenciales incorrectas (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'cliente@mgc.com',
        password: 'WrongPassword'
      });
    expect(res.statusCode).toEqual(401);
  });

  it('Debe iniciar sesión y retornar un token JWT (200)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'cliente@mgc.com',
        password: 'PasswordSegura2026!'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('Debe rechazar acceso a ruta protegida sin token (401)', async () => {
    const res = await request(app).get('/api/polizas/mis-polizas');
    expect(res.statusCode).toEqual(401);
  });

  it('Un cliente no debe poder acceder a la ruta de administración (403)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@mgc.com', password: 'PasswordSegura2026!' });

    const res = await request(app)
      .get('/api/admin/polizas')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.statusCode).toEqual(403);
  });

  it('Un administrador sí puede acceder al panel administrativo (200)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin2@mgc.com', password: 'AdminPassword2026!' });

    const res = await request(app)
      .get('/api/admin/polizas')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});