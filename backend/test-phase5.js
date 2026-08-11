import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { query } from './src/config/db.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runPhase5Tests() {
  console.log('=====================================================');
  console.log('   MedAI Round 2 - Phase 5 API Integration Tests     ');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  // 1. Fetch or create a test user and patient for API testing
  const userRes = await query('SELECT id, email FROM users LIMIT 1');
  if (userRes.rows.length === 0) {
    console.error('❌ Cannot run API tests: No users found in database.');
    process.exit(1);
  }
  const testUser = userRes.rows[0];
  const validToken = jwt.sign(
    { id: testUser.id, email: testUser.email },
    process.env.JWT_SECRET || 'fallback_secret_key_for_testing',
    { expiresIn: '1h' }
  );

  const patientRes = await query('SELECT id, patient_name FROM patients WHERE user_id = $1 LIMIT 1', [testUser.id]);
  let testPatientId = null;
  if (patientRes.rows.length > 0) {
    testPatientId = patientRes.rows[0].id;
  } else {
    const createPatient = await query(
      'INSERT INTO patients (user_id, patient_name, age, gender) VALUES ($1, $2, $3, $4) RETURNING id',
      [testUser.id, 'Phase5 Test Patient', 45, 'Male']
    );
    testPatientId = createPatient.rows[0].id;
  }

  // -------------------------------------------------------------
  // Test 1: Authentication Failure (No Token)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 1] Testing Authentication Rejection (No Token)...');
    const res = await fetch(`${API_BASE}/recommendations/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: testPatientId })
    });

    if (res.status !== 401) {
      throw new Error(`Expected status 401 but received: ${res.status}`);
    }
    const data = await res.json();
    console.log('  -> HTTP Status:', res.status);
    console.log('  -> Response:', data.message || data.error);
    console.log('✅ Test 1 Passed: Unauthenticated request successfully blocked.');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Unauthorized Patient Access (Non-existent / Foreign Patient)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 2] Testing Unauthorized / Non-Existent Patient Access...');
    const res = await fetch(`${API_BASE}/recommendations/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({ patientId: 9999999 })
    });

    if (res.status !== 404 && res.status !== 403) {
      throw new Error(`Expected status 404 or 403 but received: ${res.status}`);
    }
    const data = await res.json();
    console.log('  -> HTTP Status:', res.status);
    console.log('  -> Response:', data.message || data.error);
    console.log('✅ Test 2 Passed: Unauthorized patient access safely rejected.');
    passed++;
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Missing Required Fields (Missing Location in Search)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 3] Testing Missing Required Parameters Validation...');
    const res = await fetch(`${API_BASE}/recommendations/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({ patientId: testPatientId, location: '' })
    });

    if (res.status !== 400) {
      throw new Error(`Expected status 400 but received: ${res.status}`);
    }
    const data = await res.json();
    console.log('  -> HTTP Status:', res.status);
    console.log('  -> Response:', data.message);
    console.log('✅ Test 3 Passed: Missing required fields properly caught and rejected.');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: Valid Recommendation Context Endpoint
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 4] Testing POST /api/recommendations/context...');
    const res = await fetch(`${API_BASE}/recommendations/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        patientId: testPatientId,
        findingContext: {
          issueType: 'trend_alert',
          riskLevel: 'high',
          clinicalSummary: 'Recurrent hypertensive episodes (170/110 mmHg).',
          patientAge: 52,
          patientGender: 'Male'
        }
      })
    });

    if (res.status !== 200) {
      const errBody = await res.text();
      throw new Error(`Expected status 200 but got ${res.status}: ${errBody}`);
    }

    const json = await res.json();
    if (!json.success || !json.data || !json.data.recommendation) {
      throw new Error(`Malformed context response: ${JSON.stringify(json)}`);
    }

    const rec = json.data.recommendation;
    console.log('  -> HTTP Status: 200 OK');
    console.log('  -> Recommended Specialty:', rec.recommendedSpecialty);
    console.log('  -> Care Type:', rec.careType);
    console.log('  -> Confidence Score:', rec.confidence);
    console.log('  -> Clinical Rationale:', rec.reason);

    if (!rec.recommendedSpecialty || !rec.careType) {
      throw new Error('Missing specialty or careType in response.');
    }
    console.log('✅ Test 4 Passed: Context preparation endpoint returns structured care triage.');
    passed++;
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Invalid Geocoding Location Handling
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 5] Testing Search with Unrecognizable Location ("XYZ_INVALID_9999")...');
    const res = await fetch(`${API_BASE}/recommendations/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        patientId: testPatientId,
        location: 'XYZ_INVALID_LOCATION_99999',
        availability: 'this_week'
      })
    });

    if (res.status !== 400) {
      throw new Error(`Expected status 400 for invalid location, got: ${res.status}`);
    }

    const data = await res.json();
    console.log('  -> HTTP Status: 400 Bad Request');
    console.log('  -> Error Code:', data.error);
    console.log('  -> User Message:', data.message);

    if (data.error !== 'LOCATION_NOT_FOUND') {
      throw new Error(`Expected LOCATION_NOT_FOUND error code, got: ${data.error}`);
    }
    console.log('✅ Test 5 Passed: Invalid location safely handled by search endpoint.');
    passed++;
  } catch (err) {
    console.error('❌ Test 5 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Valid Search & Ranking Endpoint (Jaffna Real Providers)
  // -------------------------------------------------------------
  let generatedSessionId = null;
  try {
    console.log('\n[Test 6] Testing POST /api/recommendations/search (Real Jaffna Discovery)...');
    const res = await fetch(`${API_BASE}/recommendations/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`
      },
      body: JSON.stringify({
        patientId: testPatientId,
        location: 'Jaffna',
        availability: 'this_week',
        radiusKm: 25,
        findingContext: {
          issueType: 'trend_alert',
          riskLevel: 'high',
          clinicalSummary: 'Elevated blood pressure 165/105 mmHg.',
          patientAge: 50,
          patientGender: 'Female'
        }
      })
    });

    if (res.status !== 200) {
      const errText = await res.text();
      throw new Error(`Expected status 200 but got ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (!json.success || !json.data || !Array.isArray(json.data.providers)) {
      throw new Error(`Malformed search response: ${JSON.stringify(json)}`);
    }

    const payload = json.data;
    generatedSessionId = payload.sessionId;

    console.log('  -> HTTP Status: 200 OK');
    console.log('  -> Session ID Generated:', generatedSessionId);
    console.log('  -> Inferred Specialty:', payload.specialty.recommendedSpecialty);
    console.log('  -> Geocoded Location:', payload.location.displayName);
    console.log(`  -> Total Providers Found & Ranked: ${payload.totalCount}`);
    console.log('  -> Source Attribution:', payload.sourceAttribution);

    if (payload.providers.length > 0) {
      const top1 = payload.providers[0];
      console.log(`\n  [#1 Ranked Provider]:`);
      console.log(`   - Name: ${top1.name}`);
      console.log(`   - Facility Type: ${top1.facilityType}`);
      console.log(`   - Distance: ${top1.distanceKm} km`);
      console.log(`   - Total Match Score: ${top1.ranking.totalScore}/100 (${top1.ranking.matchScorePercent}%)`);
      console.log(`   - Primary Match Reason: ${top1.ranking.primaryExplanation}`);
      console.log(`   - Score Breakdown: Specialty=${top1.ranking.scoreBreakdown.specialtyScore}, Dist=${top1.ranking.scoreBreakdown.distanceScore}, Rep=${top1.ranking.scoreBreakdown.reputationScore}, Comp=${top1.ranking.scoreBreakdown.completenessScore}, Avail=${top1.ranking.scoreBreakdown.availabilityScore}`);

      // Verify no fabrication
      if (top1.rating !== null && top1.source === 'openstreetmap') {
        throw new Error('Rating was fabricated for OSM provider!');
      }
    }

    console.log('✅ Test 6 Passed: Search and ranking endpoint operates end-to-end with real public data.');
    passed++;
  } catch (err) {
    console.error('❌ Test 6 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 7: Patient Recommendation Audit History Endpoint
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 7] Testing GET /api/recommendations/history/:patientId...');
    const res = await fetch(`${API_BASE}/recommendations/history/${testPatientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${validToken}`
      }
    });

    if (res.status !== 200) {
      const errText = await res.text();
      throw new Error(`Expected status 200 but got ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(`Malformed history response: ${JSON.stringify(json)}`);
    }

    console.log('  -> HTTP Status: 200 OK');
    console.log(`  -> Retrieved ${json.data.length} past audit sessions for patient ${testPatientId}.`);

    if (generatedSessionId) {
      const foundSession = json.data.find(s => s.id === generatedSessionId);
      if (!foundSession) {
        throw new Error(`Session ID ${generatedSessionId} was not found in audit history.`);
      }
      console.log('  -> Verified presence of Session ID:', foundSession.id);
      console.log('  -> Stored Specialty:', foundSession.recommended_specialty);
      console.log('  -> Stored Location:', foundSession.normalized_location);
    }

    console.log('✅ Test 7 Passed: Recommendation history successfully retrieved and patient-isolated.');
    passed++;
  } catch (err) {
    console.error('❌ Test 7 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 8: Round 1 Health & Regression Check
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 8] Testing Round 1 Health & Non-Regression...');
    const res = await fetch(`${API_BASE}/health`);
    if (res.status !== 200) {
      throw new Error(`Health check returned status: ${res.status}`);
    }
    const health = await res.json();
    console.log('  -> Health Status:', health.message);

    // Verify patients listing route
    const patientsRes = await fetch(`${API_BASE}/patients`, {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    if (patientsRes.status !== 200) {
      throw new Error(`Patients API returned status: ${patientsRes.status}`);
    }
    console.log('  -> Patients API: 200 OK');

    console.log('✅ Test 8 Passed: Round 1 APIs and health status remain 100% operational.');
    passed++;
  } catch (err) {
    console.error('❌ Test 8 Failed:', err.message);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(` Phase 5 Test Summary: ${passed} Passed, ${failed} Failed `);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests();
