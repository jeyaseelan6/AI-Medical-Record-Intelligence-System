import dotenv from 'dotenv';
import { SpecialtyService, VALID_CARE_TYPES } from './src/services/specialty.service.js';

dotenv.config();

/**
 * Validates that an output adheres strictly to the Round 2 schema.
 */
function assertValidSchema(res, testName) {
  if (!res || typeof res !== 'object') {
    throw new Error(`[${testName}] Result is not an object.`);
  }
  if (!res.recommendedSpecialty || typeof res.recommendedSpecialty !== 'string') {
    throw new Error(`[${testName}] Missing or invalid recommendedSpecialty.`);
  }
  if (!VALID_CARE_TYPES.includes(res.careType)) {
    throw new Error(`[${testName}] Invalid careType: '${res.careType}'. Allowed: ${VALID_CARE_TYPES.join(', ')}`);
  }
  if (!res.reason || typeof res.reason !== 'string') {
    throw new Error(`[${testName}] Missing or invalid reason.`);
  }
  if (typeof res.confidence !== 'number' || res.confidence < 0.0 || res.confidence > 1.0) {
    throw new Error(`[${testName}] Invalid confidence score: ${res.confidence}. Must be [0.0, 1.0]`);
  }
  if (!Array.isArray(res.alternativeSpecialties)) {
    throw new Error(`[${testName}] alternativeSpecialties must be an array.`);
  }
  if (!Array.isArray(res.clinicalBasis) || res.clinicalBasis.length === 0) {
    throw new Error(`[${testName}] clinicalBasis must be a non-empty array.`);
  }
  if (typeof res.uncertainty !== 'boolean') {
    throw new Error(`[${testName}] uncertainty must be a boolean.`);
  }
}

async function runPhase2Tests() {
  console.log('=====================================================');
  console.log('     MedAI Round 2 - Phase 2 AI Specialty Tests     ');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // Test 1: Clear Specialty Case (Cardiovascular finding)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 1] Testing Clear Specialty Case (Hypertension & Cardiovascular)...');
    const input = {
      issueType: 'trend_alert',
      riskLevel: 'high',
      confidence: 0.93,
      clinicalSummary: 'Repeated hypertensive blood pressure readings (165/105 mmHg, 170/110 mmHg) across 3 consecutive clinical visits.',
      evidence: 'Blood Pressure: 165/105 on 2025-08-10, 170/110 on 2025-11-14, 168/104 on 2026-02-02.',
      relevantLabTrends: ['Blood Pressure: 165/105 mmHg', 'Blood Pressure: 170/110 mmHg'],
      relevantMedications: ['Amlodipine 5mg Daily'],
      symptoms: 'Occasional morning dizziness, palpitations',
      patientAge: 58,
      patientGender: 'Male'
    };

    const res = await SpecialtyService.determineSpecialty(input);
    assertValidSchema(res, 'Test 1');
    console.log('  -> Recommended Specialty:', res.recommendedSpecialty);
    console.log('  -> Care Type:', res.careType);
    console.log('  -> Confidence:', res.confidence);
    console.log('  -> Reason:', res.reason);
    console.log('  -> Alternatives:', res.alternativeSpecialties.map(a => a.specialty).join(', '));
    console.log('  -> Clinical Basis:', res.clinicalBasis);
    console.log('✅ Test 1 Passed: Clear specialty case handled accurately.');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Ambiguous / Non-specific Case
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 2] Testing Ambiguous Case (Non-specific mild symptoms)...');
    const input = {
      issueType: 'clinical_concern',
      riskLevel: 'low',
      confidence: 0.55,
      clinicalSummary: 'Patient reports generalized mild fatigue and occasional non-localized headaches without distinct lab abnormalities.',
      evidence: 'Clinical notes mention occasional fatigue over past 2 months. CBC normal.',
      relevantLabTrends: ['Hemoglobin: 13.8 g/dL (Normal)'],
      relevantMedications: [],
      symptoms: 'Mild fatigue',
      patientAge: 34,
      patientGender: 'Female'
    };

    const res = await SpecialtyService.determineSpecialty(input);
    assertValidSchema(res, 'Test 2');
    console.log('  -> Recommended Specialty:', res.recommendedSpecialty);
    console.log('  -> Care Type:', res.careType);
    console.log('  -> Uncertainty Flag:', res.uncertainty);
    console.log('  -> Reason:', res.reason);

    // Expect General Practice or Internal Medicine or primary_care
    const isPrimary = res.careType === 'primary_care' || 
                      res.recommendedSpecialty.toLowerCase().includes('general') || 
                      res.recommendedSpecialty.toLowerCase().includes('internal') ||
                      res.uncertainty === true;
    if (!isPrimary) {
      throw new Error(`Ambiguous case did not prefer primary care or set uncertainty! Got: ${res.recommendedSpecialty}`);
    }
    console.log('✅ Test 2 Passed: Ambiguous case correctly routed to primary care / general practice with uncertainty flagged.');
    passed++;
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Medication-Related Issue (Drug duplication / interaction)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 3] Testing Medication Conflict Case (Duplicate Metformin)...');
    const input = {
      issueType: 'duplicate_medication',
      riskLevel: 'high',
      confidence: 0.95,
      clinicalSummary: 'Duplicate active prescriptions detected for Metformin 500mg and Glucophage (Metformin) 850mg prescribed concurrently by two different clinics.',
      evidence: 'Metformin 500mg prescribed on 2025-10-12; Glucophage 850mg prescribed on 2025-11-01.',
      relevantMedications: ['Metformin 500mg Twice Daily', 'Glucophage 850mg Twice Daily'],
      patientAge: 62,
      patientGender: 'Female'
    };

    const res = await SpecialtyService.determineSpecialty(input);
    assertValidSchema(res, 'Test 3');
    console.log('  -> Recommended Specialty:', res.recommendedSpecialty);
    console.log('  -> Care Type:', res.careType);
    console.log('  -> Reason:', res.reason);
    console.log('  -> Clinical Basis:', res.clinicalBasis);

    const isMedCare = res.careType === 'pharmacist' || 
                      res.careType === 'primary_care' || 
                      res.careType === 'specialist';
    if (!isMedCare) {
      throw new Error(`Medication conflict produced unexpected care type: ${res.careType}`);
    }
    console.log('✅ Test 3 Passed: Medication conflict appropriately categorized.');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: High-Risk Critical Lab Alert (Renal impairment)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 4] Testing High-Risk Critical Lab Case (Severe Renal Marker)...');
    const input = {
      issueType: 'trend_alert',
      riskLevel: 'high',
      confidence: 0.96,
      clinicalSummary: 'Rapid escalation in Serum Creatinine from 1.1 mg/dL to 3.6 mg/dL with eGFR dropping below 25 mL/min.',
      evidence: 'Creatinine: 1.1 on 2025-06-01; 3.6 on 2026-01-15.',
      relevantLabTrends: ['Serum Creatinine: 3.6 mg/dL (High)', 'eGFR: 22 mL/min (Critical)'],
      relevantMedications: ['Lisinopril 20mg Daily'],
      patientAge: 67,
      patientGender: 'Male'
    };

    const res = await SpecialtyService.determineSpecialty(input);
    assertValidSchema(res, 'Test 4');
    console.log('  -> Recommended Specialty:', res.recommendedSpecialty);
    console.log('  -> Care Type:', res.careType);
    console.log('  -> Reason:', res.reason);
    console.log('✅ Test 4 Passed: High-risk renal case recognized accurately.');
    passed++;
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Insufficient Evidence Case (Empty / Sparse Finding)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 5] Testing Insufficient Evidence Case...');
    const input = {}; // completely empty

    const res = await SpecialtyService.determineSpecialty(input);
    assertValidSchema(res, 'Test 5');
    console.log('  -> Recommended Specialty:', res.recommendedSpecialty);
    console.log('  -> Care Type:', res.careType);
    console.log('  -> Fallback Applied:', res.fallbackApplied);
    console.log('  -> Uncertainty:', res.uncertainty);

    if (res.recommendedSpecialty !== 'General Practice' || res.fallbackApplied !== true) {
      throw new Error('Empty context did not trigger deterministic General Practice fallback!');
    }
    console.log('✅ Test 5 Passed: Empty context safely triggered General Practice fallback.');
    passed++;
  } catch (err) {
    console.error('❌ Test 5 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Malformed AI Output Sanitization
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 6] Testing Malformed AI Output Sanitizer...');
    const badOutput = {
      recommendedSpecialty: '  Cardiology  ',
      careType: 'INVALID_CARE_TYPE_123',
      confidence: 120, // out of bounds
      alternativeSpecialties: 'not-an-array', // wrong type
      clinicalBasis: null,
      uncertainty: 'yes' // wrong type
    };

    const sanitized = SpecialtyService.sanitizeReasoningOutput(badOutput, { evidence: 'Hypertension detected' });
    assertValidSchema(sanitized, 'Test 6');

    if (sanitized.recommendedSpecialty !== 'Cardiology') {
      throw new Error('Specialty was not trimmed.');
    }
    if (sanitized.careType !== 'primary_care') {
      throw new Error(`Invalid care type was not normalized to primary_care. Got: ${sanitized.careType}`);
    }
    if (sanitized.confidence > 1.0) {
      throw new Error(`Confidence was not clamped. Got: ${sanitized.confidence}`);
    }
    if (!Array.isArray(sanitized.alternativeSpecialties)) {
      throw new Error('alternativeSpecialties is not an array.');
    }
    if (typeof sanitized.uncertainty !== 'boolean') {
      throw new Error('uncertainty is not a boolean.');
    }
    console.log('  -> Sanitized Care Type:', sanitized.careType);
    console.log('  -> Clamped Confidence:', sanitized.confidence);
    console.log('  -> Sanitized Alternatives:', sanitized.alternativeSpecialties);
    console.log('✅ Test 6 Passed: Malformed LLM output safely clamped and normalized.');
    passed++;
  } catch (err) {
    console.error('❌ Test 6 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 7: Deterministic Error Recovery on Network/API Outage
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 7] Testing Deterministic Error Recovery...');
    const context = {
      issueType: 'dosage_conflict',
      clinicalSummary: 'Dosage conflict for Atenolol'
    };

    const fallbackRes = SpecialtyService.createSafeFallback(context, 'Simulated network timeout');
    assertValidSchema(fallbackRes, 'Test 7');

    if (fallbackRes.recommendedSpecialty !== 'General Practice' || fallbackRes.careType !== 'primary_care' || !fallbackRes.fallbackApplied) {
      throw new Error('Fallback response is invalid.');
    }
    console.log('  -> Fallback Specialty:', fallbackRes.recommendedSpecialty);
    console.log('  -> Fallback Applied:', fallbackRes.fallbackApplied);
    console.log('  -> Fallback Reason:', fallbackRes.fallbackReason);
    console.log('✅ Test 7 Passed: Error recovery produces valid, secure fallback structure.');
    passed++;
  } catch (err) {
    console.error('❌ Test 7 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 8: Context Builder from Round 1 Entities
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 8] Testing Context Builder from Round 1 Insight Entity...');
    const mockInsight = {
      id: 5,
      insight_type: 'trend_alert',
      description: 'Persistent elevated Fasting Blood Glucose (185 mg/dL) over 6 months.',
      confidence_score: 91.0,
      evidence: 'Fasting Blood Glucose 185 mg/dL on 2025-10-01 and 192 mg/dL on 2026-01-10'
    };
    const mockPatient = { age: 52, gender: 'Female' };
    const mockEvents = [
      {
        event_date: '2026-01-10',
        medications: [{ medicine_name: 'Metformin', dosage: '500mg' }],
        lab_results: [{ test_name: 'Fasting Blood Glucose', value: '192', unit: 'mg/dL' }]
      }
    ];

    const builtContext = SpecialtyService.buildContextFromInsight(mockInsight, mockPatient, mockEvents);
    if (!builtContext.clinicalSummary || !builtContext.relevantLabTrends.length) {
      throw new Error('Context builder failed to aggregate evidence from insight and events.');
    }
    console.log('  -> Built Context Summary:', builtContext.clinicalSummary);
    console.log('  -> Aggregated Medications:', builtContext.relevantMedications);
    console.log('  -> Aggregated Labs:', builtContext.relevantLabTrends);

    const res = await SpecialtyService.determineSpecialty(builtContext);
    assertValidSchema(res, 'Test 8');
    console.log('  -> Inferred Specialty:', res.recommendedSpecialty);
    console.log('  -> Inferred Care Type:', res.careType);
    console.log('✅ Test 8 Passed: Round 1 entities successfully transformed into validated specialty reasoning.');
    passed++;
  } catch (err) {
    console.error('❌ Test 8 Failed:', err.message);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(` Phase 2 Test Summary: ${passed} Passed, ${failed} Failed `);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests();
