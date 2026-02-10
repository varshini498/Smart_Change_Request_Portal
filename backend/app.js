// app.js
const express = require("express");
const cors = require("cors"); // <--- import cors
require("dotenv").config();

const app = express(); // <--- define app BEFORE using it

// Body parser
app.use(express.json());

// CORS middleware
app.use(cors());

// Routes
const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);

module.exports = app;
