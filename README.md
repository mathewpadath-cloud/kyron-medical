# Kyron Medical Patient Portal

An AI-powered patient portal for scheduling medical appointments via conversational chat and voice.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI Chat | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Voice AI | Vapi.ai (outbound & inbound calls) |
| Email | Resend API |
| SMS (optional) | Twilio |
| Database | JSON file (`backend/data/db.json`) |

## Doctors

| Doctor | Specialty | Schedule |
|--------|-----------|----------|
| Dr. Sarah Chen | Cardiologist | Mon / Wed / Fri |
| Dr. James Okafor | Orthopedist | Tue / Thu |
| Dr. Priya Patel | Neurologist | Mon / Thu / Fri |
| Dr. Marcus Rivera | Dermatologist | Wed / Fri |

Slots are pre-generated from **March 25 – May 24, 2026**, 9 AM – 4 PM, 1-hour increments.

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd kyron-medical
npm run install:all
```

### 2. Configure environment

Copy `.env.example` and fill in your keys:

```bash
# Backend
cp .env.example backend/.env
# Edit backend/.env with your API keys

# Frontend
# frontend/.env is already created with defaults
```

**Required keys:**
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `RESEND_API_KEY` — from [resend.com](https://resend.com)
- `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` — from [vapi.ai](https://vapi.ai)

**Optional (SMS):**
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### 3. Run development

```bash
npm run dev
```

Opens:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

### 4. Deploy to EC2

```bash
# Build frontend
npm run build

# Start backend (serves API only — serve frontend/dist separately via nginx)
npm start
```

## Features

- **Conversational intake** — Kyra (AI) collects patient info naturally via chat
- **Smart doctor matching** — Semantically matches symptoms to the right specialty
- **Slot filtering** — "Do you have Tuesday?" filters and shows only Tuesday slots
- **Email confirmation** — Professional HTML email via Resend on booking
- **SMS confirmation** — Optional SMS via Twilio (checkbox during intake)
- **Voice handoff** — "Switch to Phone Call" button triggers Vapi outbound call with full chat context
- **Callback memory** — Vapi `/server-message` webhook looks up patient history by phone number

## API Endpoints

```
POST /api/chat              — Send message to AI
GET  /api/chat/session/:id  — Get session data

GET  /api/appointments/slots/:doctorId  — Available slots
POST /api/appointments/book             — Book appointment
GET  /api/appointments/by-phone/:phone  — Patient history by phone

POST /api/vapi/initiate-call   — Start outbound Vapi call
POST /api/vapi/webhook         — Vapi event webhook
POST /api/vapi/server-message  — Vapi dynamic assistant config

POST /api/email/send-confirmation  — Send confirmation email
```

## Vapi Configuration

1. Create a phone number in your Vapi dashboard
2. Set the **Server URL** for the number to: `https://your-domain.com/api/vapi/server-message`
3. This enables the **callback memory** feature — returning callers are recognized by phone number

## Project Structure

```
kyron-medical/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── chat.js          — Claude AI conversation
│   │   ├── appointments.js  — Slot management & booking
│   │   ├── vapi.js          — Voice AI integration
│   │   └── email.js         — Resend + Twilio notifications
│   ├── data/
│   │   ├── doctors.js       — Doctor profiles + slot generation
│   │   └── db.json          — Appointments store
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── ChatInterface.jsx    — Main chat UI
│   │       ├── VoiceCallButton.jsx  — Vapi handoff button
│   │       ├── PatientIntake.jsx    — Standalone form component
│   │       └── AppointmentPicker.jsx — Slot picker component
│   └── .env
└── package.json
```
