import '../src/prestart.js';
import { runAdversarialIntegritySuite } from './adversarial-integrity.test.js';
import { runUnifiedProviderTests } from './unified-provider.test.js';
import { runDbResilienceSuite } from './db-resilience.test.js';
import { runDecommissionVerificationSuite } from './forecast-decommission.test.js';
import { pool } from '../src/config/db.js';

async function runAllMedAiTests() {
  console.log('================================================================');
  console.log('       MedAI Core Architectural Regression & Safety Suite       ');
  console.log('================================================================\n');

  const startTime = Date.now();
  const suiteResults = [];

  // Suite 1: Adversarial & Identity Integrity
  try {
    const res1 = await runAdversarialIntegritySuite();
    suiteResults.push({ name: 'Adversarial & Identity Integrity Suite', ...res1 });
  } catch (err) {
    console.error('Suite 1 failed with fatal error:', err.message);
    suiteResults.push({ name: 'Adversarial & Identity Integrity Suite', passed: 0, total: 12, success: false });
  }

  // Suite 2: Unified Provider Discovery & Ranking
  try {
    const res2 = await runUnifiedProviderTests();
    suiteResults.push({ name: 'Unified Provider Discovery & Cards', ...res2 });
  } catch (err) {
    console.error('Suite 2 failed with fatal error:', err.message);
    suiteResults.push({ name: 'Unified Provider Discovery & Cards', passed: 0, total: 8, success: false });
  }

  // Suite 3: Database Resilience & Pool Lifecycle
  try {
    const res3 = await runDbResilienceSuite();
    suiteResults.push({ name: 'PostgreSQL Pool Resilience & Lifecycle', ...res3 });
  } catch (err) {
    console.error('Suite 3 failed with fatal error:', err.message);
    suiteResults.push({ name: 'PostgreSQL Pool Resilience & Lifecycle', passed: 0, total: 8, success: false });
  }

  // Suite 4: Forecast Decommission Negative Architectural Verification
  try {
    const res4 = await runDecommissionVerificationSuite();
    suiteResults.push({ name: 'AI Forecast Decommission Negative Audit', ...res4 });
  } catch (err) {
    console.error('Suite 4 failed with fatal error:', err.message);
    suiteResults.push({ name: 'AI Forecast Decommission Negative Audit', passed: 0, total: 5, success: false });
  }

  // Close database pool connection cleanly
  try {
    await pool.end();
  } catch (e) {}

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalPassed = suiteResults.reduce((acc, s) => acc + s.passed, 0);
  const totalTests = suiteResults.reduce((acc, s) => acc + s.total, 0);
  const allPassed = suiteResults.every(s => s.success);

  console.log('================================================================');
  console.log('                    COMPREHENSIVE TEST SUMMARY                  ');
  console.log('================================================================');
  suiteResults.forEach(s => {
    const icon = s.success ? '✅' : '❌';
    console.log(` ${icon} ${s.name.padEnd(45)} ${s.passed}/${s.total} Passed`);
  });
  console.log('----------------------------------------------------------------');
  console.log(` Overall Execution: ${totalPassed}/${totalTests} Tests Passed in ${duration}s`);
  console.log('================================================================\n');

  if (allPassed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllMedAiTests().catch(err => {
  console.error('Fatal test orchestration error:', err);
  process.exit(1);
});
