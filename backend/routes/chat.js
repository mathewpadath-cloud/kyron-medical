const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { doctors } = require('../data/doctors');

const DB_PATH = path.join(__dirname, '../data/db.json');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory session store
const sessions = new Map();

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { appointments: [] };
  }
}

function buildSlotsContext() {
  const db = readDB();
  const bookedSlotIds = new Set(db.appointments.map(a => a.slotId));
  const now = new Date();

  return doctors.map(doctor => {
    const available = doctor.slots
      .filter(s => !bookedSlotIds.has(s.id) && new Date(s.datetime) > now)
      .slice(0, 48); // ~6 weeks of first daily slots

    const grouped = {};
    for (const slot of available) {
      const d = new Date(slot.datetime);
      const dateKey = d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
      });
      if (!grouped[dateKey]) grouped[dateKey] = [];
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
      grouped[dateKey].push({ time, slotId: slot.id });
    }

    const slotsText = Object.entries(grouped)
      .slice(0, 20)
      .map(([date, times]) =>
        `  ${date}:\n${times.map(t => `    ${t.time} (INTERNAL_ID:${t.slotId})`).join('\n')}`
      ).join('\n');

    return `${doctor.name} (${doctor.specialty} | Available: ${doctor.availableDays.join(', ')}):\n${slotsText}`;
  }).join('\n\n');
}

function getSystemPrompt() {
  const slotsContext = buildSlotsContext();

  const doctorSpecialties = doctors.map(d =>
    `  - ${d.id}: ${d.name}, ${d.specialty} — treats: ${d.specialtyArea}`
  ).join('\n');

  return `You are Kyra, a warm and professional AI medical receptionist for Kyron Medical in Providence, RI.

YOUR MISSION: Guide patients through scheduling an appointment in a natural, conversational way.

STEP-BY-STEP FLOW:
1. Greet the patient warmly on their first message
2. Collect the following information ONE piece at a time (do not ask for multiple things at once):
   - First name and last name — if the patient gives both in one message (e.g. "John Smith"), accept it immediately and move on. Never ask for the last name separately if they already gave it.
   - Date of birth
   - Phone number
   - Email address
   - Reason for visit / symptoms
3. Match their reason to the correct doctor based on specialty
4. Present exactly 3 available time slots from the matched doctor's schedule
5. If the patient requests a specific day (e.g., "do you have Tuesday?"), filter and show only slots for that day
6. Confirm the appointment once the patient selects a slot

DOCTORS AT KYRON MEDICAL:
${doctorSpecialties}

IMPORTANT RULES:
- NEVER give medical advice, diagnoses, or interpret symptoms beyond matching to a specialty
- Be warm, concise, and empathetic — like a real receptionist, not a robot
- Keep responses brief (2-3 sentences max when possible)
- If the patient's condition does not match ANY of our specialties, say: "I'm sorry, our practice doesn't currently treat that condition. I'd recommend speaking with your primary care physician who can provide a referral."
- When presenting slot options, format them clearly and number them (1., 2., 3.)
- NEVER show slot IDs or UUIDs to the patient — they are for internal use only in the <BOOKING> tag

AVAILABLE APPOINTMENT SLOTS (use these slot IDs in the BOOKING confirmation):
${slotsContext}

BOOKING CONFIRMATION:
When the patient has explicitly confirmed their chosen slot (e.g., "I'll take option 2" or "Book slot 1"),
include the following JSON block at the VERY END of your response, after your confirmation message.
This block must be valid JSON and is required to process the booking:

<BOOKING>
{"firstName":"...","lastName":"...","dob":"...","phone":"...","email":"...","doctorId":"...","slotId":"...","reason":"..."}
</BOOKING>

Only include <BOOKING> when ALL information is collected AND the patient has explicitly confirmed a slot.
Do NOT include <BOOKING> when just presenting slot options.`;
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, smsOptIn } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' });
    }

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        messages: [],
        patient: {},
        matchedDoctorId: null,
        offeredSlotIds: [],
        booked: false
      });
    }

    const session = sessions.get(sessionId);

    if (smsOptIn !== undefined) {
      session.patient.smsOptIn = smsOptIn;
    }

    // Internal update — just update session state, don't send to Claude
    if (message === '__sms_update__') {
      return res.json({ message: '', sessionId, booking: null, matchedDoctorId: session.matchedDoctorId, sessionData: session.patient });
    }

    session.messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: getSystemPrompt(),
      messages: session.messages
    });

    const rawAssistantMessage = response.content[0].text;
    session.messages.push({ role: 'assistant', content: rawAssistantMessage });

    // Parse BOOKING block if present
    let bookingData = null;
    const bookingMatch = rawAssistantMessage.match(/<BOOKING>([\s\S]*?)<\/BOOKING>/);
    if (bookingMatch) {
      try {
        bookingData = JSON.parse(bookingMatch[1].trim());
        session.patient = { ...session.patient, ...bookingData };
        session.booked = true;
        console.log(`[Session ${sessionId}] Booking detected for ${bookingData.firstName} ${bookingData.lastName}`);
      } catch (e) {
        console.error('[Chat] Failed to parse BOOKING JSON:', e.message);
      }
    }

    // Extract patient info progressively for voice handoff
    const msgLower = rawAssistantMessage.toLowerCase();
    for (const doctor of doctors) {
      if (msgLower.includes(doctor.id) || msgLower.includes(doctor.name.toLowerCase())) {
        if (!session.matchedDoctorId) {
          session.matchedDoctorId = doctor.id;
          session.patient.doctorName = doctor.name;
          session.patient.doctorId = doctor.id;
        }
        break;
      }
    }

    // Strip BOOKING block from displayed message
    const cleanMessage = rawAssistantMessage.replace(/<BOOKING>[\s\S]*?<\/BOOKING>/g, '').trim();

    res.json({
      message: cleanMessage,
      sessionId,
      booking: bookingData,
      matchedDoctorId: session.matchedDoctorId,
      sessionData: session.patient
    });

  } catch (error) {
    console.error('[Chat Error]', error);
    if (error.status === 401) {
      return res.status(503).json({ error: 'AI service authentication failed. Please check ANTHROPIC_API_KEY.' });
    }
    res.status(500).json({ error: 'Chat service error', details: error.message });
  }
});

// GET /api/chat/session/:sessionId — for Vapi context retrieval
router.get('/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ session });
});

module.exports = router;
