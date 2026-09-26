const fs = require('node:fs');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const enviarEmail = async ({ to, name, subject, htmlContent, attachmentPath }) => {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = process.env;

  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    console.warn('[Brevo] Credenciales no configuradas.');
    return null;
  }

  const attachments = attachmentPath
    ? [{
        name: 'poliza-mgc.pdf',
        content: (await fs.promises.readFile(attachmentPath)).toString('base64')
      }]
    : undefined;

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: BREVO_SENDER_NAME || 'MGC Seguros',
        email: BREVO_SENDER_EMAIL
      },
      to: [{ email: to, name }],
      subject,
      htmlContent,
      ...(attachments ? { attachment: attachments } : {})
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brevo respondió ${response.status}: ${error}`);
  }

  return response.json();
};

const enviarConfirmacionSolicitud = ({ email, nombre }) =>
  enviarEmail({
    to: email,
    name: nombre,
    subject: 'Solicitud recibida - MGC Seguros',
    htmlContent: `
      <h2>Solicitud recibida</h2>
      <p>Hola ${nombre || 'cliente'},</p>
      <p>Recibimos correctamente tu solicitud de seguro.</p>
      <p>Te notificaremos cuando sea revisada.</p>
    `
  });

const enviarResultadoSolicitud = ({ email, nombre, estado, motivo, attachmentPath }) =>
  enviarEmail({
    to: email,
    name: nombre,
    subject: `Tu solicitud fue ${estado.toLowerCase()} - MGC Seguros`,
    attachmentPath,
    htmlContent: `
      <h2>Solicitud ${estado}</h2>
      <p>Hola ${nombre || 'cliente'},</p>
      <p>Tu solicitud fue <strong>${estado.toLowerCase()}</strong>.</p>
      ${estado === 'Aceptada' ? '<p>Para conocer más detalles de tu póliza, escríbenos al <a href="tel:+528681150781">+52 868 115 0781</a> o al correo <a href="mailto:millenniumglobalcorporativo@gmail.com">millenniumglobalcorporativo@gmail.com</a>.</p>' : ''}
      ${motivo ? `<p>Motivo: ${motivo}</p>` : ''}
    `
  });

module.exports = {
  enviarConfirmacionSolicitud,
  enviarResultadoSolicitud
};