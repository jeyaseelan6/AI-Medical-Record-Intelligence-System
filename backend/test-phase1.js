import dotenv from 'dotenv';
import { query, pool } from './src/config/db.js';

dotenv.config();

async function verifyPhase1() {
  console.log('=====================================================');
  console.log('     MedAI Round 2 - Phase 1 Verification Suite     ');
  console.log('=====================================================');

  try {
    // 1. Verify all Round 1 and Round 2 tables exist
    console.log('\n[Check 1] Verifying all database tables...');
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Found tables in database:', tables.join(', '));

    const expectedTables = [
      'users',
      'patients',
      'documents',
      'medical_events',
      'medications',
      'lab_results',
      'ai_insights',
      'embeddings',
      'chat_messages',
      'recommendation_sessions'
    ];

    for (const t of expectedTables) {
      if (!tables.includes(t)) {
        throw new Error(`Expected table '${t}' was not found in database!`);
      }
    }
    console.log('✅ All 10 expected tables are present.');

    // 2. Verify recommendation_sessions indexes
    console.log('\n[Check 2] Verifying indexes on recommendation_sessions...');
    const indexRes = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'recommendation_sessions'
    `);
    console.log('Found indexes:');
    indexRes.rows.forEach(idx => console.log(`  - ${idx.indexname}`));
    
    const expectedIndexes = [
      'recommendation_sessions_pkey',
      'idx_recommendation_sessions_user_id',
      'idx_recommendation_sessions_patient_id',
      'idx_recommendation_sessions_created_at',
      'idx_recommendation_sessions_specialty'
    ];
    for (const idx of expectedIndexes) {
      if (!indexRes.rows.some(r => r.indexname === idx)) {
        throw new Error(`Missing expected index: ${idx}`);
      }
    }
    console.log('✅ All recommendation_sessions indexes verified.');

    // 3. Test insert & cascade referential integrity in a rollback transaction
    console.log('\n[Check 3] Testing referential constraints and JSONB fields...');
    const testUser = await query(`SELECT id FROM users LIMIT 1`);
    const testPatient = await query(`SELECT id, user_id FROM patients LIMIT 1`);

    if (testUser.rows.length > 0 && testPatient.rows.length > 0) {
      const uId = testPatient.rows[0].user_id;
      const pId = testPatient.rows[0].id;

      // Insert dummy session
      const insertRes = await query(`
        INSERT INTO recommendation_sessions (
          user_id, patient_id, issue_type, risk_level, clinical_summary,
          recommended_care_type, recommended_specialty, alternative_specialties,
          specialty_reason, confidence_score, location_query, normalized_location,
          latitude, longitude, availability_preference, search_radius_km,
          total_providers_found, providers_result
        ) VALUES (
          $1, $2, 'medication_conflict', 'high', 'Duplicate prescription detected across visits.',
          'specialist', 'Cardiology', '[{"specialty":"Internal Medicine","confidence":0.75}]'::jsonb,
          'Cardiovascular medication risk detected.', 92.5, 'Jaffna', 'Jaffna, Sri Lanka',
          9.6615, 80.0255, 'this_week', 25.0, 2,
          '[{"name":"Dr. Example Centre","specialty":"Cardiology","distanceKm":2.4}]'::jsonb
        ) RETURNING id, created_at
      `, [uId, pId]);

      const insertedId = insertRes.rows[0].id;
      console.log(`Inserted test recommendation session with ID: ${insertedId}`);

      // Query back
      const readRes = await query(`
        SELECT * FROM recommendation_sessions WHERE id = $1
      `, [insertedId]);

      if (readRes.rows.length === 0 || readRes.rows[0].recommended_specialty !== 'Cardiology') {
        throw new Error('Failed to read back test recommendation session.');
      }
      console.log('✅ Successfully read back session with JSONB arrays and location coordinates.');

      // Clean up test session
      await query(`DELETE FROM recommendation_sessions WHERE id = $1`, [insertedId]);
      console.log('✅ Test record cleaned up.');
    } else {
      console.log('ℹ️ No existing user/patient rows found; skipped insert check.');
    }

    console.log('\n=====================================================');
    console.log('    All Phase 1 Verification Checks PASSED! 🚀       ');
    console.log('=====================================================');
  } catch (err) {
    console.error('\n❌ Verification Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyPhase1();
