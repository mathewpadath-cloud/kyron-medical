const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

const OFFICE_ADDRESS = '123 Medical Plaza, Providence, RI 02903';
const OFFICE_PHONE = '(401) 555-0100';

function formatDateTime(isoString) {
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC'
  });
  return { dateStr, timeStr };
}

function buildEmailHTML(appointment) {
  const { dateStr, timeStr } = formatDateTime(appointment.datetime);
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation — Kyron Medical</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0A1628 0%,#0033CC 100%);border-radius:16px 16px 0 0;padding:40px 36px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 20px;margin-bottom:16px;">
        <span style="color:white;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Kyron Medical</span>
      </div>
      <h1 style="color:white;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Appointment Confirmed</h1>
      <p style="color:rgba(255,255,255,0.7);margin:10px 0 0;font-size:15px;">Your booking has been successfully scheduled</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:40px 36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="font-size:17px;color:#1a2332;margin:0 0 8px;">Hello ${appointment.patient.firstName},</p>
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 28px;">
        We're looking forward to seeing you! Your appointment at Kyron Medical has been confirmed. Please review the details below.
      </p>

      <!-- Date highlight box -->
      <div style="background:linear-gradient(135deg,#EEF4FF,#E8EFFF);border:1px solid #B8D0FF;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:600;color:#0066FF;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Your Appointment</div>
        <div style="font-size:22px;font-weight:700;color:#0A1628;margin-bottom:6px;">${dateStr}</div>
        <div style="font-size:18px;font-weight:600;color:#0066FF;">${timeStr}</div>
      </div>

      <!-- Appointment details -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:600;color:#0066FF;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Appointment Details</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;width:130px;">Doctor</td>
            <td style="padding:8px 0;font-size:14px;color:#1a2332;font-weight:600;">${appointment.doctorName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Specialty</td>
            <td style="padding:8px 0;">
              <span style="background:#EEF4FF;color:#0066FF;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${appointment.specialty}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Patient</td>
            <td style="padding:8px 0;font-size:14px;color:#1a2332;font-weight:500;">${patientName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Reason</td>
            <td style="padding:8px 0;font-size:14px;color:#1a2332;">${appointment.reason}</td>
          </tr>
        </table>
      </div>

      <!-- Location -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:600;color:#0066FF;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;">Location</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;width:130px;">Address</td>
            <td style="padding:8px 0;font-size:14px;color:#1a2332;font-weight:500;">${OFFICE_ADDRESS}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Phone</td>
            <td style="padding:8px 0;font-size:14px;color:#1a2332;">${OFFICE_PHONE}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Parking</td>
            <td style="padding:8px 0;font-size:14px;color:#1a2332;">Free on-site parking available</td>
          </tr>
        </table>
      </div>

      <!-- Reminder -->
      <div style="border-left:3px solid #0066FF;padding-left:16px;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
          <strong style="color:#1a2332;">Please arrive 15 minutes early</strong> to complete any necessary paperwork.
          If you need to reschedule or cancel, please call us at <strong>${OFFICE_PHONE}</strong> at least 24 hours in advance.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:24px 36px;text-align:center;">
      <p style="margin:0 0 6px;font-size:14px;color:#1a2332;font-weight:600;">Kyron Medical</p>
      <p style="margin:0 0 4px;font-size:13px;color:#64748b;">${OFFICE_ADDRESS}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;">${OFFICE_PHONE}</p>
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        This is an automated confirmation email. Please do not reply directly to this message.
      </p>
    </div>

  </div>
</body>
</html>`;
}

// POST /api/email/send-confirmation
router.post('/send-confirmation', async (req, res) => {
  try {
    const { appointment } = req.body;

    if (!appointment || !appointment.patient?.email) {
      return res.status(400).json({ error: 'appointment.patient.email is required' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not set — skipping email send');
      return res.json({ success: true, skipped: true, reason: 'RESEND_API_KEY not configured' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { dateStr, timeStr } = formatDateTime(appointment.datetime);

    const { data, error } = await resend.emails.send({
      from: 'Kyron Medical <onboarding@resend.dev>',
      to: [appointment.patient.email],
      subject: `Appointment Confirmed: ${dateStr} at ${timeStr} — ${appointment.doctorName}`,
      html: buildEmailHTML(appointment)
    });

    if (error) {
      console.error('[Email] Resend error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }
    if (!data?.id) {
      console.error('[Email] Resend returned no ID — possible silent failure');
    }

    console.log(`[Email] Confirmation sent to ${appointment.patient.email} (ID: ${data?.id})`);

    // SMS confirmation via Twilio if opted in
    if (
      appointment.patient.smsOptIn &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      try {
        const twilio = require('twilio');
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const rawPhone = (appointment.patient.phone || '').replace(/\D/g, '');
        const formattedPhone = rawPhone.startsWith('1') ? `+${rawPhone}` : `+1${rawPhone}`;

        const smsBody = `Kyron Medical: Appt confirmed with ${appointment.doctorName} on ${dateStr} at ${timeStr}. Address: ${OFFICE_ADDRESS}. Questions? Call ${OFFICE_PHONE}. Reply STOP to opt out.`;

        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        });

        console.log(`[SMS] Confirmation sent to ${formattedPhone}`);
      } catch (smsErr) {
        console.error('[SMS] Non-critical send failure:', smsErr.message);
      }
    }

    res.json({ success: true, emailId: data?.id });

  } catch (error) {
    console.error('[Email Route Error]', error);
    res.status(500).json({ error: 'Email service error', details: error.message });
  }
});

module.exports = router;
