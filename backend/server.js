const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes'); // NEW: Add this line

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
// NEW: Add this line to enable the Admin Module
app.use('/api/admin', require('./routes/adminRoutes'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));