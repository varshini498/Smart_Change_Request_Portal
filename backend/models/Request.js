const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Request = sequelize.define('Request', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {  // Who created the request
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = Request;
