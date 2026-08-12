import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Determine if running within AWS Lambda / serverless environment
const isLambda = !!(process.env.AWS_EXECUTION_ENV || process.env.LAMBDA_TASK_ROOT);

/**
 * Custom Error for Database Availability Failures
 */
export class DatabaseUnavailableError extends Error {
  constructor(message = 'Database service is temporarily unavailable. Please try again.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
    this.errorCode = 'DATABASE_UNAVAILABLE';
    this.statusCode = 503;
    this.isDatabaseUnavailable = true;
  }
}

/**
 * Connection pool configuration optimized for serverless / remote pooled databases.
 * - min: 0 prevents holding artificial idle connections that get reaped during inactivity.
 * - idleTimeoutMillis: 15s cleans up unused sockets before remote proxies sever them.
 * - keepAlive: Socket-level keep-alive probes to help maintain TCP connection state.
 */
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : (isLambda ? 3 : 10),
  min: 0,
  idleTimeoutMillis: isLambda ? 10000 : 15000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true
};

// Enable SSL for remote cloud databases (Neon, AWS RDS)
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('amazonaws.com'))) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

export const pool = new Pool(poolConfig);

// Pool lifecycle diagnostics
pool.on('connect', () => {
  // Client connection established
});

pool.on('error', (err) => {
  // Idle client disconnected externally (e.g. cloud proxy closing idle socket).
  // pg.Pool automatically removes and discards the dead socket.
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [Database Pool Notice] Idle pooled client disconnected (${err.message || err.code}). Dead socket discarded.`);
});

/**
 * Detects whether a database error is caused by a transient network / connection termination.
 * 
 * @param {Error} error 
 * @returns {boolean}
 */
export const isTransientConnectionError = (error) => {
  if (!error) return false;

  const transientCodes = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED', '57P01', '08006', '08003', '08001'];
  if (error.code && transientCodes.includes(error.code)) {
    return true;
  }

  const msg = (error.message || '').toLowerCase();
  const transientPhrases = [
    'connection terminated unexpectedly',
    'server closed the connection unexpectedly',
    'connection is closed',
    'client was closed',
    'terminating connection due to administrator command',
    'the database system is shutting down',
    'broken pipe'
  ];

  return transientPhrases.some(phrase => msg.includes(phrase));
};

/**
 * Executes a parameterized database query with transient connection resilience.
 * 
 * Retry Rules:
 * 1. Safe to retry: Read-only `SELECT` queries OR connection acquisition failure before dispatch.
 * 2. Never retried: In-flight mutations (INSERT, UPDATE, DELETE) with uncertain execution state.
 * 3. Max retries: Strictly capped at 1 retry.
 * 
 * @param {string} text - Parameterized SQL query string
 * @param {Array} params - Array of parameters matching $1, $2, etc.
 * @param {Object} options - Optional execution controls
 * @returns {Promise<import('pg').QueryResult>} Query execution result
 */
export const query = async (text, params, options = {}) => {
  const isReadOnly = /^\s*SELECT\b/i.test(text);
  const start = Date.now();
  let attempt = 0;

  while (attempt <= 1) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 500) {
        console.warn(`[Database Warning] Slow Query (${duration}ms): ${text.slice(0, 80)}`);
      }

      return res;
    } catch (error) {
      attempt++;
      const isTransient = isTransientConnectionError(error);

      // Retry condition: Transient connection error AND (read-only query OR attempt === 1)
      if (isTransient && isReadOnly && attempt === 1) {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [Database Retry] Transient connection failure on read query ("${text.slice(0, 50)}..."). Discarding dead client and retrying with fresh connection (Attempt 1/1)...`);
        continue;
      }

      // Non-retryable or second attempt failed
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [Database Error] Query execution failed (Attempt ${attempt}/2, Transient: ${isTransient}, ReadOnly: ${isReadOnly}): ${error.message}`);

      if (isTransient) {
        throw new DatabaseUnavailableError();
      }

      throw error;
    }
  }
};

/**
 * Transaction helper that automatically checks out a client,
 * runs the provided callback logic with that client, and handles
 * COMMIT/ROLLBACK logic.
 * 
 * Safety Rules:
 * - If connection drops during an active transaction, the transaction is strictly
 *   aborted and surfaces DatabaseUnavailableError. It is NEVER automatically replayed.
 * - Client connection is guaranteed to be released in the finally block.
 * 
 * @param {function(pg.PoolClient): Promise<any>} callback - Logic to execute within the transaction
 * @returns {Promise<any>} Result returned from the callback
 */
export const transaction = async (callback) => {
  let client;
  try {
    client = await pool.connect();
  } catch (connectError) {
    if (isTransientConnectionError(connectError)) {
      console.warn('[Database Transaction] Failed to acquire client from pool. Retrying client checkout once...');
      try {
        client = await pool.connect();
      } catch (retryConnectError) {
        console.error('[Database Transaction] Client checkout retry failed:', retryConnectError.message);
        throw new DatabaseUnavailableError();
      }
    } else {
      throw connectError;
    }
  }

  let transactionBegun = false;
  try {
    await client.query('BEGIN');
    transactionBegun = true;

    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (transactionBegun) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.warn('[Database Transaction] Rollback encountered exception (connection likely severed):', rollbackErr.message);
      }
    }

    if (isTransientConnectionError(error)) {
      console.error('[Database Transaction Error] Connection terminated during active transaction. Aborting without replay.');
      throw new DatabaseUnavailableError();
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

export default { pool, query, transaction, isTransientConnectionError, DatabaseUnavailableError };
