const twilio = require('twilio');

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
const smsConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
const client = smsConfigured ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

const normalizePhone = (phone) => {
  if (!phone) return null;
  const trimmedPhone = String(phone).trim();
  if (trimmedPhone.startsWith('+')) return trimmedPhone;

  const digits = trimmedPhone.replace(/\D/g, '');
  if (digits.length === 10) return `+52${digits}`;
  if (digits.startsWith('52') && digits.length === 12) return `+${digits}`;
  return trimmedPhone;
};

const enviarSmsConfirmacion = async ({ phone, name }) => {
  if (!client) {
    console.warn('[Twilio SMS] Credenciales no configuradas.');
    return null;
  }

  try {
    const codigo = Math.floor(100000 + Math.random() * 900000);

    // Formato exacto predefinido admitido por Twilio Trial:
    const response = await client.messages.create({
      body: `Your verification code is: ${codigo}`,
      from: TWILIO_PHONE_NUMBER,
      to: normalizePhone(phone)
    });

    console.log(`[Twilio SMS] Enviado correctamente. SID: ${response.sid}`);
    return response;
  } catch (error) {
    console.error('No fue posible enviar el SMS de confirmación:', error.message);
    return null;
  }
};

module.exports = { enviarSmsConfirmacion, normalizePhone };