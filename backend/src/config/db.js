import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connection options optimized for scalability and resilience
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Maximum number of clients in the pool
  max: 20,
  // Minimum idle connections to keep alive
  min: 2,
  // How long a client is allowed to remain idle before being closed
  idleTimeoutMillis: 30000,
  // How long to wait before timing out when connecting a new client
  connectionTimeoutMillis: 5000,
};

// Check if we are running against Neon PostgreSQL and enable SSL if so (required by Neon)
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

export const pool = new Pool(poolConfig);

// Monitor connection pool events for robust telemetry
pool.on('connect', () => {
  console.log('[Database] New client successfully connected to the PostgreSQL pool.');
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client in connection pool:', err.message);
});

/**
 * Standard database query helper that abstracts connection acquisition
 * and ensures parameters are safely bound to prevent SQL Injection.
 * 
 * @param {string} text - Parameterized SQL query string
 * @param {Array} params - Array of parameters matching $1, $2, etc.
 * @returns {Promise<import('pg').QueryResult>} Query execution result
 */
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 500ms) for performance optimization
    if (duration > 500) {
      console.warn(`[Database Warning] Slow Query: ${text} | Duration: ${duration}ms`);
    }
    
    return res;
  } catch (error) {
    console.error(`[Database Error] Query execution failed: ${text}`);
    console.error(`[Database Error] Details: ${error.message}`);
    throw error;
  }
};

/**
 * Transaction helper that automatically checks out a client,
 * runs the provided callback logic with that client, and handles
 * COMMIT/ROLLBACK logic automatically.
 * Useful for maintaining relational integrity when inserting parsed medical entities.
 * 
 * @param {function(pg.PoolClient): Promise<any>} callback - Logic to execute within the transaction
 * @returns {Promise<any>} Result returned from the callback
 */
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Database Transaction] Transaction rolled back due to error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

export default {
  query,
  transaction,
  pool
};
