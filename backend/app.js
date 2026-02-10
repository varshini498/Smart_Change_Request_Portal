const express = require('express');
const app = express();
require('dotenv').config();

// Body parser
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);

module.exports = app; // EXPORT THE EXPRESS APP
