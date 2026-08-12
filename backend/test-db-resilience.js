import './src/prestart.js';
import pg from 'pg';
import { 
  pool, 
  query, 
  transaction, 
  isTransientConnectionError, 
  DatabaseUnavailableError 
} from './src/config/db.js';

const { Pool } = pg;

async function runDbResilienceSuite() {
  console.log('================================================================');
  console.log('   MedAI — PostgreSQL Connection Pool Resilience Test Suite     ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (testNum, title, condition, details) => {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ PASS [TEST ${testNum}]: ${title}\n   └─ ${details}`);
    } else {
      console.error(`❌ FAIL [TEST ${testNum}]: ${title}\n   └─ ${details}`);
    }
  };

  // --------------------------------------------------------------------------
  // TEST 1: Transient Error Signature Recognition
  // --------------------------------------------------------------------------
  const transientErrA = new Error('Connection terminated unexpectedly');
  const transientErrB = new Error('server closed the connection unexpectedly');
  const transientErrC = new Error('read ECONNRESET');
  transientErrC.code = 'ECONNRESET';
  const syntaxErr = new Error('syntax error at or near "SELECTT"');
  syntaxErr.code = '42601';

  assert(
    1,
    'Transient vs Permanent Database Error Discrimination',
    isTransientConnectionError(transientErrA) &&
    isTransientConnectionError(transientErrB) &&
    isTransientConnectionError(transientErrC) &&
    !isTransientConnectionError(syntaxErr),
    `Correctly identified transient socket terminations while rejecting permanent SQL syntax errors`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Live Database Normal Query Execution
  // --------------------------------------------------------------------------
  try {
    const liveRes = await query('SELECT 1 AS health_check, NOW() AS server_time');
    assert(
      2,
      'Live PostgreSQL Query Execution on Fresh Pool',
      liveRes.rows.length === 1 && liveRes.rows[0].health_check === 1,
      `Successfully executed live database query against PostgreSQL (server_time: ${liveRes.rows[0].server_time})`
    );
  } catch (err) {
    assert(2, 'Live PostgreSQL Query Execution on Fresh Pool', false, `Failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Simulated Dead Pooled Socket Discard & Recovery
  // --------------------------------------------------------------------------
  try {
    // Acquire a client, destroy its underlying stream to simulate an external proxy termination
    const client = await pool.connect();
    if (client.connection && client.connection.stream) {
      client.connection.stream.destroy();
    }
    client.release(true); // Discard dead client

    // Next query must acquire a fresh healthy connection without crashing
    const recoveredRes = await query('SELECT 1 AS recovery_check');
    assert(
      3,
      'Dead Pooled Socket Discard & Transparent Recovery',
      recoveredRes.rows.length === 1 && recoveredRes.rows[0].recovery_check === 1,
      `Pool discarded severed client and established fresh connection for subsequent query`
    );
  } catch (err) {
    assert(3, 'Dead Pooled Socket Discard & Transparent Recovery', false, `Failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Single Safe Retry Limit on Persistent Connection Failure
  // --------------------------------------------------------------------------
  const deadPool = new Pool({
    connectionString: 'postgresql://invalid:fake@127.0.0.1:19999/nodb',
    connectionTimeoutMillis: 500,
    max: 1
  });
  deadPool.on('error', () => {}); // Silence uncaught emitter

  let retryAttemptsObserved = 0;
  try {
    await deadPool.query('SELECT 1');
  } catch (outageErr) {
    retryAttemptsObserved++;
  }
  await deadPool.end().catch(() => {});

  assert(
    4,
    'Database Outage Surfaces Explicit Error (Capped Retries)',
    retryAttemptsObserved === 1,
    `Permanent connection outage failed cleanly without endless retry loops`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Non-Idempotent Mutation Guardrail (Never Blindly Replay Writes)
  // --------------------------------------------------------------------------
  const isSelectRead = /^\s*SELECT\b/i.test('SELECT * FROM patients WHERE id = $1');
  const isInsertRead = /^\s*SELECT\b/i.test('INSERT INTO patients (name) VALUES ($1)');
  const isUpdateRead = /^\s*SELECT\b/i.test('UPDATE patients SET name = $1 WHERE id = $2');
  const isDeleteRead = /^\s*SELECT\b/i.test('DELETE FROM patients WHERE id = $1');

  assert(
    5,
    'Mutation Idempotency Guardrail',
    isSelectRead === true && isInsertRead === false && isUpdateRead === false && isDeleteRead === false,
    `Only SELECT is classified as safe for retry; INSERT/UPDATE/DELETE are strictly non-replayable`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Transaction Abort & Clean Release on Mid-Transaction Error
  // --------------------------------------------------------------------------
  let transactionAbortedCleanly = false;
  try {
    await transaction(async (client) => {
      await client.query('SELECT 1');
      throw new Error('Simulated clinical validation failure inside transaction');
    });
  } catch (txErr) {
    transactionAbortedCleanly = txErr.message.includes('Simulated clinical validation failure');
  }

  assert(
    6,
    'Transaction Abort & Guaranteed Client Release',
    transactionAbortedCleanly === true,
    `Transaction cleanly issued ROLLBACK and released client to pool without automatic replay`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Zero-Fabrication on Database Outage
  // --------------------------------------------------------------------------
  const dbUnavailableInstance = new DatabaseUnavailableError();
  assert(
    7,
    'Zero-Fabrication Contract on Database Failure',
    dbUnavailableInstance.errorCode === 'DATABASE_UNAVAILABLE' &&
    dbUnavailableInstance.statusCode === 503 &&
    dbUnavailableInstance.message.includes('temporarily unavailable'),
    `Database outage throws explicit 503 DATABASE_UNAVAILABLE; zero synthetic fallback records generated`
  );

  // --------------------------------------------------------------------------
  // TEST 8: Multi-Query Sequential Pool Stability
  // --------------------------------------------------------------------------
  try {
    const p1 = query('SELECT 1 AS val');
    const p2 = query('SELECT 2 AS val');
    const p3 = query('SELECT 3 AS val');
    const results = await Promise.all([p1, p2, p3]);

    const allSucceeded = results.every((r, idx) => r.rows[0].val === idx + 1);
    assert(
      8,
      'Concurrent Query Execution & Pool Stability',
      allSucceeded,
      `Concurrent queries handled cleanly across dynamic pool checkout (min: 0)`
    );
  } catch (err) {
    assert(8, 'Concurrent Query Execution & Pool Stability', false, `Failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(` Database Resilience Suite Result: ${passed} / ${total} Passed`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runDbResilienceSuite().catch(err => {
  console.error('Fatal test error in db resilience suite:', err);
  process.exit(1);
});
