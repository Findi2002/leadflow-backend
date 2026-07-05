const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => {
  // Keep the process alive; surface the issue for ops.
  console.error('[db] unexpected idle client error', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  // Run a function inside a transaction with a dedicated client.
  withTransaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
