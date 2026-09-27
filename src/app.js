const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');

const { registrar, login } = require('./controladores/authController');
const { verifyToken, verifyRole } = require('./middleware/authMiddleware');
const { sequelize, User, Poliza, Solicitud } = require('./database/db');
const {
  enviarConfirmacionSolicitud,
  enviarResultadoSolicitud
} = require('./servicios/emailService');
const { generarPolizaPdf } = require('./servicios/policyPdfService');

const app = express();

const sanitizeLogMessage = (message) => String(message || 'Error desconocido')
  .replace(/[\u0000-\u001F\u007F]/g, ' ');

const normalizeCode = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]/g, '')
  .toUpperCase();

const vehicleWmi = {
  TOYOTA: 'JT2',
  NISSAN: '3N1',
  HONDA: 'JHM',
  CHEVROLET: '3G1',
  FORD: '1FM',
  VOLKSWAGEN: '3VW',
  MAZDA: 'JM1',
  KIA: '3KP',
  HYUNDAI: 'KMH'
};

const buildPolicyNumber = (solicitud) => {
  const makeCode = normalizeCode(solicitud.make).slice(0, 3).padEnd(3, 'X');
  const modelCode = normalizeCode(solicitud.model).slice(0, 3).padEnd(3, 'X');
  return `MGC-${makeCode}-${modelCode}-${solicitud.year}-${String(solicitud.id).padStart(6, '0')}`;
};

const buildVehicleSerial = (solicitud) => {
  const wmi = vehicleWmi[normalizeCode(solicitud.make)] || 'MGC';
  const modelCode = normalizeCode(solicitud.model).slice(0, 3).padEnd(3, 'X');
  const sequence = String(solicitud.id).padStart(8, '0');
  return `${wmi}${modelCode}${String(solicitud.year).slice(-1)}A${sequence}V`;
};

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));

app.post('/api/auth/registrar', registrar);
app.post('/api/auth/login', login);

app.post('/api/solicitudes', async (req, res) => {
  try {
    const requiredFields = [
      'purpose',
      'line',
      'vehicle',
      'make',
      'model',
      'year',
      'vin',
      'use',
      'name',
      'email',
      'phone'
    ];

    const useLabels = {
      personal: 'Uso personal',
      work: 'Uso de trabajo',
      fleet: 'Operación empresarial'
    };

    const vin = String(req.body.vin || '').trim().toUpperCase();

    if (requiredFields.some((field) => !req.body[field]) || !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return res.status(400).json({
        error: 'Todos los campos obligatorios deben estar completos y el VIN debe tener 17 caracteres válidos'
      });
    }

    const solicitud = await Solicitud.create({
      ...req.body,
      year: Number(req.body.year),
      vin,
      use: useLabels[req.body.use] || req.body.use,
      photos: req.body.photos || {},
      estado: 'Pendiente',
      motivoRechazo: null
    });

    try {
      await enviarConfirmacionSolicitud({
        email: solicitud.email,
        nombre: solicitud.name
      });
    } catch (emailError) {
      console.error(
        'No fue posible enviar el correo de confirmación:',
        sanitizeLogMessage(emailError.message)
      );
    }

    return res.status(201).json({
      message: 'Solicitud guardada correctamente',
      solicitudId: solicitud.id
    });
  } catch (error) {
    console.error('Error al guardar la solicitud:', error.message);

    return res.status(500).json({
      error: 'No fue posible guardar la solicitud'
    });
  }
});

app.get('/api/polizas/mis-polizas', verifyToken, async (req, res) => {
  try {
    const misPolizas = await Poliza.findAll({
      where: { userId: req.user.userId }
    });

    return res.status(200).json(misPolizas);
  } catch (error) {
    return res.status(500).json({
      error: 'Error al obtener las pólizas del cliente'
    });
  }
});

app.get(
  '/api/admin/polizas',
  verifyToken,
  verifyRole('administrador'),
  async (req, res) => {
    try {
      const todasLasPolizas = await Poliza.findAll();

      return res.status(200).json(todasLasPolizas);
    } catch (error) {
      return res.status(500).json({
        error: 'Error al consultar panel administrativo'
      });
    }
  }
);

app.get(
  '/api/admin/solicitudes',
  verifyToken,
  verifyRole('administrador'),
  async (req, res) => {
    try {
      const solicitudes = await Solicitud.findAll({
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json(solicitudes);
    } catch (error) {
      return res.status(500).json({
        error: 'Error al consultar las solicitudes'
      });
    }
  }
);

app.patch(
  '/api/admin/polizas/:id',
  verifyToken,
  verifyRole('administrador'),
  async (req, res) => {
    try {
      const estadosPermitidos = [
        'Activa',
        'Cancelada',
        'Inactiva',
        'Pendiente de renovación'
      ];

      if (!estadosPermitidos.includes(req.body.estatus)) {
        return res.status(400).json({
          error: 'El estatus de póliza no es válido'
        });
      }

      const poliza = await Poliza.findByPk(req.params.id);

      if (!poliza) {
        return res.status(404).json({
          error: 'Póliza no encontrada'
        });
      }

      await poliza.update({
        estatus: req.body.estatus
      });

      return res.status(200).json(poliza);
    } catch (error) {
      return res.status(500).json({
        error: 'No fue posible actualizar la póliza'
      });
    }
  }
);

app.delete(
  '/api/admin/polizas/:id',
  verifyToken,
  verifyRole('administrador'),
  async (req, res) => {
    try {
      const poliza = await Poliza.findByPk(req.params.id);

      if (!poliza) {
        return res.status(404).json({
          error: 'Póliza no encontrada'
        });
      }

      await poliza.destroy();

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({
        error: 'No fue posible eliminar la póliza'
      });
    }
  }
);

app.patch(
  '/api/admin/solicitudes/:id',
  verifyToken,
  verifyRole('administrador'),
  async (req, res) => {
    let transaction;

    try {
      const { estado, motivoRechazo } = req.body;

      if (!['Aceptada', 'Rechazada'].includes(estado)) {
        return res.status(400).json({
          error: 'El estado debe ser Aceptada o Rechazada'
        });
      }

      if (estado === 'Rechazada' && !motivoRechazo?.trim()) {
        return res.status(400).json({
          error: 'Debes indicar un motivo para rechazar la solicitud'
        });
      }

      const solicitud = await Solicitud.findByPk(req.params.id);

      if (!solicitud) {
        return res.status(404).json({
          error: 'Solicitud no encontrada'
        });
      }

      transaction = await sequelize.transaction();

      let poliza = await Poliza.findOne({
        where: { solicitudId: solicitud.id },
        transaction
      });

      if (estado === 'Aceptada' && !poliza) {
        const cliente = await User.findOne({
          where: { email: solicitud.email },
          transaction
        });

        const inicio = new Date();
        const fin = new Date(inicio);
        fin.setFullYear(fin.getFullYear() + 1);

        const dateOnly = (date) => date.toISOString().slice(0, 10);

        poliza = await Poliza.create(
          {
            id: buildPolicyNumber(solicitud),
            numeroSerieVehiculo: buildVehicleSerial(solicitud),
            vigenciaInicio: dateOnly(inicio),
            vigenciaFin: dateOnly(fin),
            estatus: 'Activa',
            solicitudId: solicitud.id,
            userId: cliente?.id || null
          },
          { transaction }
        );
      }

      await solicitud.update(
        {
          estado,
          motivoRechazo:
            estado === 'Rechazada' ? motivoRechazo.trim() : null
        },
        { transaction }
      );

      await transaction.commit();

      let archivoPdfUrl = poliza?.archivoPdfUrl || null;
      let attachmentPath;

      if (estado === 'Aceptada' && poliza) {
        try {
          const generatedPdf = await generarPolizaPdf({ solicitud, poliza });
          attachmentPath = generatedPdf.filePath;
          archivoPdfUrl = generatedPdf.archivoPdfUrl;
          await poliza.update({ archivoPdfUrl });
        } catch (pdfError) {
          console.error(
            'No fue posible generar el PDF de la póliza:',
            sanitizeLogMessage(pdfError.message)
          );
        }
      }

      try {
        await enviarResultadoSolicitud({
          email: solicitud.email,
          nombre: solicitud.name,
          estado,
          motivo:
            estado === 'Rechazada'
              ? motivoRechazo.trim()
              : null,
            attachmentPath
        });
      } catch (emailError) {
        console.error(
          'No fue posible enviar el correo de resultado:',
            sanitizeLogMessage(emailError.message)
        );
      }

      return res.status(200).json({
        ...solicitud.toJSON(),
        poliza: poliza
          ? { ...poliza.toJSON(), archivoPdfUrl }
          : poliza
      });
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }

      console.error(
        'Error al actualizar la solicitud:',
        error.message
      );

      return res.status(500).json({
        error: 'No fue posible actualizar la solicitud'
      });
    }
  }
);

app.delete(
  '/api/admin/solicitudes/:id',
  verifyToken,
  verifyRole('administrador'),
  async (req, res) => {
    try {
      const solicitud = await Solicitud.findByPk(req.params.id);

      if (!solicitud) {
        return res.status(404).json({
          error: 'Solicitud no encontrada'
        });
      }

      await solicitud.destroy();

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({
        error: 'No fue posible eliminar la solicitud'
      });
    }
  }
);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

module.exports = app;