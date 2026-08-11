import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { query, pool } from './src/config/db.js';

dotenv.config();

/**
 * Migration runner script to execute incremental database migrations safely
 * without dropping or altering existing clinical history tables.
 * 
 * Usage: node migrate.js
 */
async function runMigrations() {
  console.log('=====================================================');
  console.log('       MedAI Round 2 Database Migration Runner       ');
  console.log('=====================================================');

  try {
    const migrationsDir = path.resolve('src', 'db', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    console.log(`[Migrations] Found ${files.length} migration file(s) to apply.`);

    for (const file of files) {
      console.log(`\n[Migrations] Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await query(sql);
      console.log(`[Migrations] Successfully applied: ${file}`);
    }

    // Verify created table schema
    console.log('\n[Migrations] Verifying recommendation_sessions table structure...');
    const colCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'recommendation_sessions'
      ORDER BY ordinal_position ASC
    `);

    if (colCheck.rows.length === 0) {
      throw new Error('Table recommendation_sessions was not found in information_schema.');
    }

    console.log('[Migrations] Table recommendation_sessions columns:');
    colCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    console.log('\n=====================================================');
    console.log('  Phase 1 Database Migration Complete Successfully!   ');
    console.log('=====================================================');
  } catch (error) {
    console.error('\n[Migration Error] Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
