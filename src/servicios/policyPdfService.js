const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const publicDirectory = path.join(__dirname, '../../public');
const policyDirectory = path.join(publicDirectory, 'docs/polizas');
const logoPath = path.join(publicDirectory, 'mgc.jpg');
const colors = {
  blue: '#164a9c',
  pink: '#d00068',
  ink: '#171717',
  muted: '#657189',
  line: '#d8dfeb',
  white: '#ffffff'
};

const formatDate = (value) => new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(new Date(`${value}T00:00:00`));

const addSectionTitle = (document, title) => {
  document.moveDown(0.8);
  document.fillColor(colors.blue).fontSize(13).font('Helvetica-Bold').text(title);
  document.moveDown(0.25);
  document.strokeColor(colors.pink).lineWidth(1.5).moveTo(50, document.y).lineTo(545, document.y).stroke();
  document.moveDown(0.45);
};

const addField = (document, label, value) => {
  document.font('Helvetica-Bold').fontSize(10).fillColor(colors.muted).text(`${label}: `, { continued: true });
  document.font('Helvetica').fillColor(colors.ink).text(String(value || 'No especificado'));
};

const generarPolizaPdf = async ({ solicitud, poliza }) => {
  await fs.promises.mkdir(policyDirectory, { recursive: true });

  const fileName = `${poliza.id}.pdf`;
  const filePath = path.join(policyDirectory, fileName);
  const archivoPdfUrl = `/docs/polizas/${encodeURIComponent(fileName)}`;

  await new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'LETTER', margin: 50 });
    const output = fs.createWriteStream(filePath);

    output.on('finish', resolve);
    output.on('error', reject);
    document.on('error', reject);
    document.pipe(output);

    document.rect(0, 0, 612, 132).fill(colors.blue);
    document.rect(50, 116, 110, 4).fill(colors.pink);
    document.fillColor(colors.white).fontSize(25).font('Helvetica-Bold').text('MGC SEGUROS', 50, 42);
    document.fillColor(colors.white).fontSize(10).font('Helvetica').text('Protección clara para tu camino', 52, 76);
    document.fillColor(colors.pink).fontSize(12).font('Helvetica-Bold').text('CONSTANCIA DE PÓLIZA', 50, 101);
    document.image(logoPath, 420, 38, { fit: [135, 58], align: 'right', valign: 'center' });
    document.y = 154;
    document.fillColor(colors.ink).fontSize(18).font('Helvetica-Bold').text('Póliza activa');
    document.fillColor(colors.muted).fontSize(10).font('Helvetica').text(`Documento generado el ${formatDate(new Date().toISOString().slice(0, 10))}`);

    addSectionTitle(document, 'Datos de la póliza');
    addField(document, 'Número de póliza', poliza.id);
    addField(document, 'Estatus', poliza.estatus);
    addField(document, 'Vigencia', `${formatDate(poliza.vigenciaInicio)} al ${formatDate(poliza.vigenciaFin)}`);
    addField(document, 'Número de serie asignado', poliza.numeroSerieVehiculo);

    addSectionTitle(document, 'Datos del cliente');
    addField(document, 'Nombre', solicitud.name);
    addField(document, 'Correo electrónico', solicitud.email);
    addField(document, 'Teléfono', solicitud.phone);

    addSectionTitle(document, 'Datos del vehículo');
    addField(document, 'Tipo de vehículo', solicitud.vehicle);
    addField(document, 'Marca', solicitud.make);
    addField(document, 'Modelo', solicitud.model);
    addField(document, 'Año', solicitud.year);
    addField(document, 'Línea', solicitud.line);
    addField(document, 'Uso declarado', solicitud.use);
    addField(document, 'Propósito de la solicitud', solicitud.purpose);

    addSectionTitle(document, 'Información proporcionada');
    const photos = Object.keys(solicitud.photos || {});
    document.font('Helvetica').fontSize(10).fillColor(colors.ink).text(
      photos.length ? `Archivos registrados: ${photos.join(', ')}` : 'No se registraron fotografías.'
    );
    document.moveDown(1.2);
    document.fontSize(9).fillColor(colors.muted).text(
      'Esta constancia se genera con la información proporcionada en la solicitud. Para conocer coberturas, condiciones y detalles adicionales, comunícate con MGC Seguros.'
    );

    document.end();
  });

  return { filePath, archivoPdfUrl };
};

module.exports = { generarPolizaPdf };
