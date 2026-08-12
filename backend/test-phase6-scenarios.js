import dotenv from 'dotenv';
import { ProviderRankingService } from './src/services/provider-ranking.service.js';
import { SpecialtyService } from './src/services/specialty.service.js';

dotenv.config();

async function runScenarioValidation() {
  console.log('=====================================================');
  console.log('   MedAI Round 2 - Phase 6 Scenario Validation       ');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // Scenario 1: Diabetes -> Endocrinology
  // -------------------------------------------------------------
  try {
    console.log('\n[Scenario 1] Testing Diabetes -> Endocrinology...');
    const finding = {
      issueType: 'custom_concern',
      riskLevel: 'moderate',
      clinicalSummary: 'Patient with elevated fasting glucose (190 mg/dL) and HbA1c 9.2%.',
      patientAge: 58,
      patientGender: 'Female'
    };

    const triage = await SpecialtyService.determineSpecialty(finding);
    console.log('  -> AI Specialty Inferred:', triage.recommendedSpecialty);
    console.log('  -> Care Type:', triage.careType);
    console.log('  -> Rationale:', triage.reason);

    if (!triage.recommendedSpecialty.toLowerCase().includes('endo')) {
      throw new Error(`Expected Endocrinology for diabetes, got: ${triage.recommendedSpecialty}`);
    }

    const testCandidates = [
      { id: '1', name: 'Northern Diabetes & Hormone Center', facilityType: 'clinic', category: 'clinic', distanceKm: 2.1 },
      { id: '2', name: 'Teaching Hospital Jaffna', facilityType: 'hospital', category: 'hospital', distanceKm: 0.8 },
      { id: '3', name: 'SunRise Clinic', facilityType: 'clinic', category: 'clinic', distanceKm: 0.3 }
    ];

    const ranked = await ProviderRankingService.rankProviders(testCandidates, triage, { radiusKm: 25, skipAiSemantic: true });
    
    console.log('\n  [Scenario 1 Ranking & Explanations]:');
    ranked.forEach(p => {
      console.log(`   Rank #${p.rank}: ${p.name} (Score: ${p.ranking.totalScore}/100)`);
      console.log(`     - Explanation: "${p.ranking.primaryExplanation}"`);
    });

    const specialized = ranked.find(p => p.id === '1');
    const hospital = ranked.find(p => p.id === '2');
    const genericClinic = ranked.find(p => p.id === '3');

    if (!specialized.ranking.primaryExplanation.includes('aligned with Endocrinology')) {
      throw new Error(`Specialized clinic explanation inaccurate: ${specialized.ranking.primaryExplanation}`);
    }
    if (!hospital.ranking.primaryExplanation.includes('hospital facility suitable for multidisciplinary assessment')) {
      throw new Error(`Hospital explanation inaccurate: ${hospital.ranking.primaryExplanation}`);
    }
    if (!genericClinic.ranking.primaryExplanation.includes('General medical clinic suitable for initial assessment and referral')) {
      throw new Error(`Generic clinic explanation inaccurate: ${genericClinic.ranking.primaryExplanation}`);
    }

    console.log('✅ Scenario 1 Passed: Explanations correctly differentiate specialized, hospital, and general clinic facilities.');
    passed++;
  } catch (err) {
    console.error('❌ Scenario 1 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Scenario 2: Cardiovascular Alert -> Cardiology
  // -------------------------------------------------------------
  try {
    console.log('\n[Scenario 2] Testing Cardiovascular Alert -> Cardiology...');
    const finding = {
      issueType: 'trend_alert',
      riskLevel: 'high',
      clinicalSummary: 'Recurrent severe hypertension 175/110 mmHg with exertional chest tightness.',
      patientAge: 62,
      patientGender: 'Male'
    };

    const triage = await SpecialtyService.determineSpecialty(finding);
    console.log('  -> AI Specialty Inferred:', triage.recommendedSpecialty);

    const testCandidates = [
      { id: '1', name: 'Jaffna Heart & Cardiac Care Clinic', facilityType: 'clinic', category: 'clinic', distanceKm: 1.5 },
      { id: '2', name: 'Chavakachcheri Base Hospital', facilityType: 'hospital', category: 'hospital', distanceKm: 5.0 },
      { id: '3', name: 'City Medical Centre', facilityType: 'clinic', category: 'clinic', distanceKm: 0.5 }
    ];

    const ranked = await ProviderRankingService.rankProviders(testCandidates, triage, { radiusKm: 25, skipAiSemantic: true });
    
    console.log('\n  [Scenario 2 Ranking & Explanations]:');
    ranked.forEach(p => {
      console.log(`   Rank #${p.rank}: ${p.name} (Score: ${p.ranking.totalScore}/100)`);
      console.log(`     - Explanation: "${p.ranking.primaryExplanation}"`);
    });

    const specialized = ranked.find(p => p.id === '1');
    const genericClinic = ranked.find(p => p.id === '3');

    if (!specialized.ranking.primaryExplanation.includes('aligned with Cardiology')) {
      throw new Error(`Cardiology specialty explanation inaccurate: ${specialized.ranking.primaryExplanation}`);
    }
    if (!genericClinic.ranking.primaryExplanation.includes('assessment and referral') && !genericClinic.ranking.primaryExplanation.includes('outpatient evaluation')) {
      throw new Error(`Generic clinic explanation inaccurate: ${genericClinic.ranking.primaryExplanation}`);
    }

    console.log('✅ Scenario 2 Passed: Cardiovascular triage accurately mapped.');
    passed++;
  } catch (err) {
    console.error('❌ Scenario 2 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Scenario 3: Medication Conflict -> Clinical Pharmacist
  // -------------------------------------------------------------
  try {
    console.log('\n[Scenario 3] Testing Medication Conflict -> Clinical Pharmacist...');
    const finding = {
      issueType: 'duplicate_medication',
      riskLevel: 'high',
      clinicalSummary: 'Duplicate ACE inhibitor prescribed under two different brand names (Enalapril 10mg and Renitec 10mg).',
      patientAge: 70,
      patientGender: 'Female'
    };

    const triage = await SpecialtyService.determineSpecialty(finding);
    console.log('  -> AI Specialty Inferred:', triage.recommendedSpecialty);
    console.log('  -> Care Type:', triage.careType);

    const testCandidates = [
      { id: '1', name: 'State Pharmaceuticals Corporation', facilityType: 'pharmacy', category: 'pharmacy', distanceKm: 0.4 },
      { id: '2', name: 'Base Hospital', facilityType: 'hospital', category: 'hospital', distanceKm: 1.2 }
    ];

    const ranked = await ProviderRankingService.rankProviders(testCandidates, triage, { radiusKm: 25, skipAiSemantic: true });
    
    console.log('\n  [Scenario 3 Ranking & Explanations]:');
    ranked.forEach(p => {
      console.log(`   Rank #${p.rank}: ${p.name} (Score: ${p.ranking.totalScore}/100)`);
      console.log(`     - Explanation: "${p.ranking.primaryExplanation}"`);
    });

    const pharmacy = ranked.find(p => p.id === '1');
    if (!pharmacy.ranking.primaryExplanation.includes('Licensed pharmacy for prescription review')) {
      throw new Error(`Pharmacy explanation inaccurate: ${pharmacy.ranking.primaryExplanation}`);
    }

    console.log('✅ Scenario 3 Passed: Medication conflict accurately routed to pharmacy/pharmacology review.');
    passed++;
  } catch (err) {
    console.error('❌ Scenario 3 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Scenario 4: Ambiguous/General Symptoms -> General Practice
  // -------------------------------------------------------------
  try {
    console.log('\n[Scenario 4] Testing Ambiguous Symptoms -> General Practice...');
    const finding = {
      issueType: 'custom_concern',
      riskLevel: 'low',
      clinicalSummary: 'Mild fatigue and periodic routine wellness review.',
      patientAge: 35,
      patientGender: 'Male'
    };

    const triage = await SpecialtyService.determineSpecialty(finding);
    console.log('  -> AI Specialty Inferred:', triage.recommendedSpecialty);
    console.log('  -> Care Type:', triage.careType);

    const testCandidates = [
      { id: '1', name: 'Family Health Medical Clinic', facilityType: 'clinic', category: 'clinic', distanceKm: 0.6 },
      { id: '2', name: 'City Hospital', facilityType: 'hospital', category: 'hospital', distanceKm: 2.0 }
    ];

    const ranked = await ProviderRankingService.rankProviders(testCandidates, triage, { radiusKm: 25, skipAiSemantic: true });
    
    console.log('\n  [Scenario 4 Ranking & Explanations]:');
    ranked.forEach(p => {
      console.log(`   Rank #${p.rank}: ${p.name} (Score: ${p.ranking.totalScore}/100)`);
      console.log(`     - Explanation: "${p.ranking.primaryExplanation}"`);
    });

    const clinic = ranked.find(p => p.id === '1');
    if (!clinic.ranking.primaryExplanation.includes('Primary care clinic suited for initial general medical evaluation')) {
      throw new Error(`Primary clinic explanation inaccurate: ${clinic.ranking.primaryExplanation}`);
    }

    console.log('✅ Scenario 4 Passed: General symptoms routed to primary care.');
    passed++;
  } catch (err) {
    console.error('❌ Scenario 4 Failed:', err.message);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(` Scenario Validation Summary: ${passed} Passed, ${failed} Failed `);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runScenarioValidation();
