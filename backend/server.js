require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRoutes = require('./routes/chat');
const appointmentRoutes = require('./routes/appointments');
const vapiRoutes = require('./routes/vapi');
const emailRoutes = require('./routes/email');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost origin (any port) and requests with no origin (curl, Postman)
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, process.env.FRONTEND_URL === origin);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', chatRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/vapi', vapiRoutes);
app.use('/api/email', emailRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Kyron Medical API', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🏥 Kyron Medical backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
