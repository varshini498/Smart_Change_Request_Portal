const db = require('./config/db'); // make sure path is correct

// Fetch all users
const rows = db.prepare('SELECT * FROM users').all();
console.log('Users table contents:', rows);
