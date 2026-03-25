const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { doctors } = require('../data/doctors');

const DB_PATH = path.join(__dirname, '../data/db.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { appointments: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/appointments/slots/:doctorId?day=monday
router.get('/slots/:doctorId', (req, res) => {
  const { doctorId } = req.params;
  const { day, limit } = req.query;

  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  const db = readDB();
  const bookedSlotIds = new Set(db.appointments.map(a => a.slotId));
  const now = new Date();

  let available = doctor.slots.filter(s => !bookedSlotIds.has(s.id) && new Date(s.datetime) > now);

  if (day) {
    const dayLower = day.toLowerCase().trim();
    available = available.filter(slot => {
      const slotDay = new Date(slot.datetime)
        .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
        .toLowerCase();
      return slotDay.startsWith(dayLower.substring(0, 3));
    });
  }

  const slotLimit = parseInt(limit) || available.length;

  res.json({
    doctor: { id: doctor.id, name: doctor.name, specialty: doctor.specialty },
    slots: available.slice(0, slotLimit)
  });
});

// POST /api/appointments/book
router.post('/book', (req, res) => {
  const { slotId, doctorId, patient, reason } = req.body;

  if (!slotId || !doctorId || !patient || !reason) {
    return res.status(400).json({ error: 'Missing required fields: slotId, doctorId, patient, reason' });
  }

  const doctor = doctors.find(d => d.id === doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  const slot = doctor.slots.find(s => s.id === slotId);
  if (!slot) {
    return res.status(404).json({ error: 'Slot not found' });
  }

  const db = readDB();
  if (db.appointments.some(a => a.slotId === slotId)) {
    return res.status(409).json({ error: 'This slot has already been booked. Please choose another time.' });
  }

  const appointment = {
    id: uuidv4(),
    slotId,
    doctorId,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    patient,
    reason,
    datetime: slot.datetime,
    bookedAt: new Date().toISOString()
  };

  db.appointments.push(appointment);
  writeDB(db);

  console.log(`[Appointment Booked] ${appointment.patient.firstName} ${appointment.patient.lastName} with ${appointment.doctorName} on ${appointment.datetime}`);

  res.json({ success: true, appointment });
});

// GET /api/appointments
router.get('/', (req, res) => {
  const db = readDB();
  res.json({ appointments: db.appointments });
});

// GET /api/appointments/by-phone/:phone — for Vapi callback memory
router.get('/by-phone/:phone', (req, res) => {
  const db = readDB();
  const cleanedInput = req.params.phone.replace(/\D/g, '');

  const appointments = db.appointments.filter(a => {
    const apptPhone = (a.patient?.phone || '').replace(/\D/g, '');
    return apptPhone === cleanedInput || apptPhone.endsWith(cleanedInput) || cleanedInput.endsWith(apptPhone);
  });

  res.json({ appointments });
});

module.exports = router;
