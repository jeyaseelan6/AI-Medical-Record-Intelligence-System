import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { query, pool } from './src/config/db.js';

dotenv.config();

/**
 * Diagnostic & Initialization script to verify connection to Postgres
 * and run schema.sql to setup all necessary tables.
 * 
 * Run using: node test-db.js
 */
async function initDatabase() {
  console.log('=====================================================');
  console.log('    PostgreSQL DB Connection & Schema Initializer    ');
  console.log('=====================================================');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('[Error] DATABASE_URL environment variable is not defined.');
    console.log('\nPlease configure your .env file inside the backend directory:');
    console.log('DATABASE_URL=postgresql://user:password@host/database');
    process.exit(1);
  }

  try {
    console.log('[System] Attempting connection to database...');
    // Simple test query
    const checkConn = await query('SELECT NOW()');
    console.log(`[Success] Connected! Database Server Time: ${checkConn.rows[0].now}`);

    console.log('\n[System] Reading schema.sql script...');
    const schemaPath = path.resolve('src', 'db', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at path: ${schemaPath}`);
    }

    const sqlScript = fs.readFileSync(schemaPath, 'utf8');

    console.log('[System] Initializing tables, constraints, and indexes...');
    
    // Execute schema queries
    await query(sqlScript);
    console.log('[Success] Tables created and database indexes successfully configured.');

    console.log('\n[System] Verifying generated tables...');
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name ASC
    `);

    console.log('[System] Active database tables:');
    tableCheck.rows.forEach(row => {
      console.log(` - ${row.table_name}`);
    });

    console.log('\n=====================================================');
    console.log('    Database initialization completed successfully!   ');
    console.log('=====================================================');

  } catch (error) {
    console.error('\n[Fatal Error] Database connection or migration failed:');
    console.error(error.message);
    
    if (error.message.includes('vector')) {
      console.log('\nTip: If you receive a pgvector-related error, ensure that pgvector is supported');
      console.log('by your PostgreSQL provider (like Neon). Otherwise, remove the vector definition');
      console.log('from schema.sql and use the application fallback mechanism.');
    }
  } finally {
    // Release pool connection so script exits clean
    await pool.end();
  }
}

initDatabase();
