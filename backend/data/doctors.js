const { v4: uuidv4 } = require('uuid');

const START_DATE = new Date('2026-03-25T00:00:00.000Z');
const END_DATE = new Date('2026-05-24T00:00:00.000Z');
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateSlots(doctorId, availableDays) {
  const slots = [];
  const current = new Date(START_DATE);

  while (current <= END_DATE) {
    const dayName = DAY_NAMES[current.getUTCDay()];
    if (availableDays.includes(dayName)) {
      for (let hour = 9; hour < 17; hour++) {
        const slotTime = new Date(current);
        slotTime.setUTCHours(hour, 0, 0, 0);
        slots.push({
          id: uuidv4(),
          doctorId,
          datetime: slotTime.toISOString(),
          booked: false
        });
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return slots;
}

const doctors = [
  {
    id: 'dr-chen',
    name: 'Dr. Sarah Chen',
    specialty: 'Cardiologist',
    specialtyArea: 'heart, cardiovascular, chest pain, palpitations, shortness of breath, blood pressure, heart disease, arrhythmia',
    availableDays: ['Mon', 'Wed', 'Fri'],
    slots: generateSlots('dr-chen', ['Mon', 'Wed', 'Fri'])
  },
  {
    id: 'dr-okafor',
    name: 'Dr. James Okafor',
    specialty: 'Orthopedist',
    specialtyArea: 'bones, joints, muscles, back pain, knee pain, hip pain, fractures, arthritis, sports injuries, shoulder, wrist, ankle',
    availableDays: ['Tue', 'Thu'],
    slots: generateSlots('dr-okafor', ['Tue', 'Thu'])
  },
  {
    id: 'dr-patel',
    name: 'Dr. Priya Patel',
    specialty: 'Neurologist',
    specialtyArea: 'brain, nerves, headaches, migraines, seizures, dizziness, numbness, tingling, memory issues, tremors, stroke, concussion',
    availableDays: ['Mon', 'Thu', 'Fri'],
    slots: generateSlots('dr-patel', ['Mon', 'Thu', 'Fri'])
  },
  {
    id: 'dr-rivera',
    name: 'Dr. Marcus Rivera',
    specialty: 'Dermatologist',
    specialtyArea: 'skin, hair, nails, rash, acne, eczema, psoriasis, moles, skin cancer screening, hives, dermatitis, hair loss',
    availableDays: ['Wed', 'Fri'],
    slots: generateSlots('dr-rivera', ['Wed', 'Fri'])
  }
];

module.exports = { doctors };
