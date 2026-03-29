// app.js
const express = require("express");
const cors = require("cors"); // <--- import cors
const path = require("path");
require("dotenv").config();

const app = express(); // <--- define app BEFORE using it

// Body parser
app.use(express.json());

// CORS middleware
app.use(cors());

// Routes
const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const policyRoutes = require("./routes/policyRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const copilotRoutes = require("./routes/copilotRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const requestAliasRoutes = require("./routes/requestAliasRoutes");
const teamLeadRoutes = require("./routes/teamLeadRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", copilotRoutes);
app.use("/api", copilotRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teamlead", teamLeadRoutes);
app.use("/api", requestAliasRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

module.exports = app;
