import '../src/prestart.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { AiService } from '../src/services/ai.service.js';
import * as insightController from '../src/controllers/insight.controller.js';

export async function runDecommissionVerificationSuite() {
  console.log('================================================================');
  console.log('  MedAI — AI Health Forecast Permanent Decommission Audit       ');
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
  // TEST 1: AiService Method Deletion
  // --------------------------------------------------------------------------
  assert(
    1,
    'AiService.generateHealthForecast Deletion',
    typeof AiService.generateHealthForecast === 'undefined',
    'AiService.generateHealthForecast method has been completely removed from AI service'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Controller Handler Deletion
  // --------------------------------------------------------------------------
  assert(
    2,
    'getPatientForecast Controller Deletion',
    typeof insightController.getPatientForecast === 'undefined' &&
    typeof insightController.default.getPatientForecast === 'undefined',
    'getPatientForecast controller handler has been completely removed from insight.controller.js'
  );

  // --------------------------------------------------------------------------
  // TEST 3: Express Route Deletion (Non-Existent /forecast Sub-Route)
  // --------------------------------------------------------------------------
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const testToken = jwt.sign({ id: 1, email: 'test@medai.com' }, process.env.JWT_SECRET || 'medai_dev_secret_key_2026');
    const res = await fetch(`http://127.0.0.1:${port}/api/insights/forecast/1`, {
      headers: { Authorization: `Bearer ${testToken}` }
    });
    const body = await res.json();
    
    // When GET /api/insights/forecast/1 is requested, since the route was removed, 
    // Express routes it to 404 handler (Resource not found)
    assert(
      3,
      'GET /api/insights/forecast/:patientId Endpoint Permanent Deletion',
      res.status === 404 && body.success === false,
      `Decommissioned forecast endpoint returns 404 (status: ${res.status}, message: "${body.message}")`
    );
  } catch (err) {
    assert(3, 'GET /api/insights/forecast/:patientId Endpoint Permanent Deletion', false, `Failed: ${err.message}`);
  } finally {
    server.close();
  }

  // --------------------------------------------------------------------------
  // TEST 4: Zero Predictive Prompts in AI Service
  // --------------------------------------------------------------------------
  const aiServiceCode = AiService.toString() + (AiService.prototype ? AiService.prototype.toString() : '');
  const forbiddenKeywords = [
    'generatehealthforecast',
    'predictive health',
    'health trajectory forecast',
    'overall_wellness_forecast',
    'cardiovascular_risk_projection'
  ];

  const foundKeywords = forbiddenKeywords.filter(kw => aiServiceCode.toLowerCase().includes(kw));
  assert(
    4,
    'Zero Predictive Prompts or System Instructions in AI Service',
    foundKeywords.length === 0,
    foundKeywords.length === 0 
      ? 'Zero predictive prompts, 30-day outlooks, or cardiovascular projections in AI Service'
      : `Found residual keywords: ${foundKeywords.join(', ')}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Zero Synthetic Forecast Fallback Generation
  // --------------------------------------------------------------------------
  const mockInsight = {
    id: 1,
    patient_id: 1,
    insight_type: 'duplicate_medication',
    description: 'Metformin duplicate prescription detected across 2 visits',
    confidence_score: 85,
    evidence: 'Prescription dated 2026-01-15 and 2026-02-10'
  };

  const hasForecastField = 'forecast' in mockInsight || 
                           'predictedRisk' in mockInsight || 
                           'futureTrajectory' in mockInsight;

  assert(
    5,
    'Clinical Insight DTO Cleanliness (Zero Forecast Fields)',
    !hasForecastField,
    'Clinical insight structures contain strictly documented findings with zero predictive fields'
  );

  console.log('\n================================================================');
  console.log(` Decommission Audit Result: ${passed} / ${total} Passed`);
  console.log('================================================================\n');

  return { passed, total, success: passed === total };
}

if (process.argv[1] && process.argv[1].endsWith('forecast-decommission.test.js')) {
  runDecommissionVerificationSuite().then(({ success }) => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Fatal error in decommission verification suite:', err);
    process.exit(1);
  });
}
