const { query } = require('./config/db');

const main = async () => {
  const result = await query('SELECT 1 + 1 AS result');
  console.log('Query result:', result.rows);
};

main().catch((error) => {
  console.error('Query failed:', error.message);
  process.exit(1);
});
