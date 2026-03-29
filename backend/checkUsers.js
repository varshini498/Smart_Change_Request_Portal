const { query } = require('./config/db');

const main = async () => {
  const result = await query('SELECT * FROM users');
  console.log('Users table contents:', result.rows);
};

main().catch((error) => {
  console.error('Failed to fetch users:', error.message);
  process.exit(1);
});
