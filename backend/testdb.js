const db = require("./config/db");

db.query("SELECT 1 + 1 AS result", (err, results) => {
  if (err) return console.error("❌ Query failed:", err.message);
  console.log("✅ Query result:", results);
});
