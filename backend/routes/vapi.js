const express = require('express');
const router = express.Router();
const https = require('https');
const { doctors } = require('../data/doctors');

function vapiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.vapi.ai',
      path: endpoint,
      method,
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildVapiSystemPrompt(patient, chatHistory) {
  const historyText = chatHistory && chatHistory.length > 0
    ? chatHistory.map(m => `${m.role === 'user' ? 'Patient' : 'Kyra (AI)'}: ${m.content}`).join('\n')
    : '';

  const patientContext = patient && Object.keys(patient).length > 0
    ? [
        patient.firstName && `Name: ${patient.firstName} ${patient.lastName || ''}`.trim(),
        patient.dob && `Date of Birth: ${patient.dob}`,
        patient.phone && `Phone: ${patient.phone}`,
        patient.email && `Email: ${patient.email}`,
        patient.reason && `Reason for Visit: ${patient.reason}`,
        patient.doctorName && `Matched Doctor: ${patient.doctorName}`
      ].filter(Boolean).join('\n')
    : '';

  const doctorList = doctors.map(d =>
    `- ${d.name} (${d.specialty}): ${d.specialtyArea}`
  ).join('\n');

  return `You are Kyra, a warm and professional AI medical receptionist for Kyron Medical in Providence, RI.
This patient was chatting with you online and switched to a phone call — pick up naturally from where the chat left off.

${patientContext ? `PATIENT INFORMATION ALREADY COLLECTED:\n${patientContext}\n` : ''}
${historyText ? `PREVIOUS CHAT TRANSCRIPT:\n${historyText}\n` : ''}

DOCTORS AT KYRON MEDICAL:
${doctorList}

IMPORTANT RULES:
- Do NOT re-ask for information already collected above
- Be warm, brief, and natural — this is a phone call, not a form
- Never give medical advice or diagnoses
- If the patient has already been matched to a doctor and just needs a slot, go straight to offering times
- Keep responses concise for a voice conversation (one to two sentences)
- If you need to confirm a booking, ask for the patient's preferred time from available slots
- If this is a callback/return call, greet the patient by name and reference their previous visit warmly`;
}

// POST /api/vapi/initiate-call
router.post('/initiate-call', async (req, res) => {
  try {
    const { phoneNumber, chatHistory, patient, sessionId } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
      return res.status(503).json({
        error: 'Voice service not configured. Please set VAPI_API_KEY and VAPI_PHONE_NUMBER_ID.'
      });
    }

    const rawPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = rawPhone.startsWith('1') ? `+${rawPhone}` : `+1${rawPhone}`;

    const systemPrompt = buildVapiSystemPrompt(patient, chatHistory);

    const firstMessage = patient?.firstName
      ? `Hi ${patient.firstName}! This is Kyra calling from Kyron Medical. I can see you were just chatting with us online — let me pick right up from where we left off. How are you doing?`
      : `Hello! This is Kyra from Kyron Medical calling. How can I help you today?`;

    const callPayload = {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: formattedPhone,
        ...(patient?.firstName && { name: `${patient.firstName} ${patient.lastName || ''}`.trim() })
      },
      assistant: {
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          systemPrompt,
          maxTokens: 512
        },
        voice: {
          provider: 'openai',
          voiceId: 'alloy'
        },
        firstMessage,
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
        backgroundSound: 'off',
        backchannelingEnabled: false
      },
      metadata: {
        sessionId: sessionId || null,
        source: 'chat-handoff',
        patientPhone: formattedPhone
      }
    };

    const response = await vapiRequest('POST', '/call', callPayload);

    if (response.status >= 400) {
      console.error('[Vapi] Call initiation failed:', response.data);
      return res.status(response.status).json({
        error: 'Failed to initiate call',
        details: response.data
      });
    }

    console.log(`[Vapi] Outbound call initiated to ${formattedPhone}, callId: ${response.data?.id}`);

    res.json({
      success: true,
      callId: response.data?.id,
      status: response.data?.status
    });

  } catch (error) {
    console.error('[Vapi Route Error]', error);
    res.status(500).json({ error: 'Voice service error', details: error.message });
  }
});

// POST /api/vapi/webhook — handles Vapi callbacks and events
// For Pioneer Feature: incoming calls are recognized by phone number
router.post('/webhook', async (req, res) => {
  try {
    const { type, call, customer, message } = req.body;

    console.log(`[Vapi Webhook] Event type: ${type}`);

    if (type === 'call-started' && customer?.number) {
      const phone = customer.number.replace(/\D/g, '');
      console.log(`[Vapi Webhook] Incoming call from ${phone} — looking up patient history`);

      // Fetch appointment history for this patient (for context injection)
      // In a production system, you'd dynamically update the assistant's system prompt here
      // via the Vapi API. For now we log and acknowledge.
    }

    if (type === 'call-ended') {
      console.log(`[Vapi Webhook] Call ended. Duration: ${call?.endedAt || 'unknown'}`);
    }

    // Vapi expects a 200 response with optional assistant message override
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Vapi Webhook Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vapi/server-message — handles real-time Vapi server messages
// Used to inject dynamic patient context for callbacks (Pioneer Feature)
router.post('/server-message', async (req, res) => {
  try {
    const { message } = req.body;

    if (message?.type === 'assistant-request') {
      const customerPhone = message?.call?.customer?.number || '';
      const cleanPhone = customerPhone.replace(/\D/g, '');

      let patientContext = '';

      if (cleanPhone) {
        // Look up any previous appointments for this phone number
        const fs = require('fs');
        const path = require('path');
        const DB_PATH = path.join(__dirname, '../data/db.json');
        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

        const previousAppts = db.appointments.filter(a => {
          const apptPhone = (a.patient?.phone || '').replace(/\D/g, '');
          return apptPhone === cleanPhone || apptPhone.endsWith(cleanPhone) || cleanPhone.endsWith(apptPhone);
        });

        if (previousAppts.length > 0) {
          const latest = previousAppts[previousAppts.length - 1];
          patientContext = `This patient has been here before. Their name is ${latest.patient.firstName} ${latest.patient.lastName}. Their last appointment was with ${latest.doctorName} on ${new Date(latest.datetime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} for: ${latest.reason}. Greet them warmly by name and acknowledge their history.`;
        }
      }

      // Return dynamic assistant configuration
      return res.json({
        assistant: {
          model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
            systemPrompt: buildVapiSystemPrompt(null, null) + (patientContext ? `\n\nPATIENT HISTORY:\n${patientContext}` : ''),
            maxTokens: 512
          },
          voice: {
            provider: 'openai',
            voiceId: 'alloy'
          },
          firstMessage: patientContext
            ? `Welcome back to Kyron Medical! I see you've been with us before. How can I help you today?`
            : `Thank you for calling Kyron Medical. This is Kyra, your AI medical receptionist. How can I help you today?`
        }
      });
    }

    res.json({ received: true });

  } catch (error) {
    console.error('[Vapi Server Message Error]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
