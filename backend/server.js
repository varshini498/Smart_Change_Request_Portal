require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initPromise } = require('./config/db');
const app = express();
const allowedOrigins = [
  'https://smart-change-request-portal-3.onrender.com', // your frontend URL
  'http://localhost:5173'  // local dev
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const policyRoutes = require('./routes/policyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const copilotRoutes = require('./routes/copilotRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const userRoutes = require('./routes/userRoutes');
const teamLeadRoutes = require('./routes/teamLeadRoutes');
const notificationService = require('./services/notificationService');

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', copilotRoutes);
app.use('/api', copilotRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teamlead', teamLeadRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initPromise;

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // SLA escalation scan: every 30 minutes.
  setInterval(() => {
    notificationService.runEscalation().catch((error) => {
      console.error('Escalation job failed:', error.message);
    });
  }, 30 * 60 * 1000);
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
