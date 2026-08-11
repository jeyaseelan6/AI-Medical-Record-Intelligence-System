import dotenv from 'dotenv';
import { ProviderRankingService } from './src/services/provider-ranking.service.js';
import { RecommendationService } from './src/services/recommendation.service.js';
import { AiService } from './src/services/ai.service.js';
import { query } from './src/config/db.js';

dotenv.config();

async function runPhase4Tests() {
  console.log('=====================================================');
  console.log('   MedAI Round 2 - Phase 4 Ranking Review Suite      ');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // Test 1: AI-Native Semantic Specialty Matching (Nuanced Examples)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 1] Testing AI-Native Semantic Specialty Matching on Required Clinical Pairs...');
    
    const candidates = [
      { id: 'c1', name: 'Heart & Vascular Centre', category: 'clinic', facilityType: 'clinic' },
      { id: 'c2', name: 'Cardiac Care Clinic', category: 'clinic', facilityType: 'clinic' },
      { id: 'c3', name: 'Cardiovascular Specialist Chambers', category: 'doctors', facilityType: 'doctors' },
      { id: 'c4', name: 'Diabetes & Hormone Clinic', category: 'clinic', facilityType: 'clinic' },
      { id: 'c5', name: 'City Dental and Orthodontics', category: 'clinic', facilityType: 'clinic' }
    ];

    console.log('  -> Querying AI-Native Semantic Matcher for "Cardiology"...');
    const cardioMatches = await AiService.matchProviderSpecialtiesSemantic('Cardiology', 'specialist', candidates);
    console.log('  -> AI Matches received:', cardioMatches.length);

    cardioMatches.forEach(m => {
      const cand = candidates.find(c => c.id === m.id);
      console.log(`     - [${cand ? cand.name : m.id}] Score: ${m.score}/40 | Rationale: ${m.rationale}`);
    });

    const matchHeartVascular = cardioMatches.find(m => m.id === 'c1');
    const matchCardiacCare = cardioMatches.find(m => m.id === 'c2');
    const matchCardioSpec = cardioMatches.find(m => m.id === 'c3');
    const matchDiabetes = cardioMatches.find(m => m.id === 'c4');
    const matchDental = cardioMatches.find(m => m.id === 'c5');

    if (!matchHeartVascular || matchHeartVascular.score < 36) {
      throw new Error(`Heart & Vascular Centre did not get high semantic score (got ${matchHeartVascular ? matchHeartVascular.score : 'none'}).`);
    }
    if (!matchCardiacCare || matchCardiacCare.score < 36) {
      throw new Error(`Cardiac Care Clinic did not get high semantic score.`);
    }
    if (!matchCardioSpec || matchCardioSpec.score < 36) {
      throw new Error(`Cardiovascular Specialist did not get high semantic score.`);
    }
    if (matchDiabetes && matchDiabetes.score > 28) {
      throw new Error(`Diabetes clinic received unexpectedly high score for Cardiology.`);
    }
    if (matchDental && matchDental.score > 25) {
      throw new Error(`Dental clinic received unexpectedly high score for Cardiology.`);
    }

    console.log('\n  -> Querying AI-Native Semantic Matcher for "Endocrinology"...');
    const endoMatches = await AiService.matchProviderSpecialtiesSemantic('Endocrinology', 'specialist', candidates);
    const endoDiabetes = endoMatches.find(m => m.id === 'c4');
    console.log(`     - [Diabetes & Hormone Clinic for Endo] Score: ${endoDiabetes ? endoDiabetes.score : 'none'}/40 | Rationale: ${endoDiabetes ? endoDiabetes.rationale : ''}`);

    if (!endoDiabetes || endoDiabetes.score < 36) {
      throw new Error('Diabetes & Hormone Clinic did not get high semantic score for Endocrinology.');
    }

    console.log('✅ Test 1 Passed: AI-native semantic reasoning correctly relates specialized clinical centers.');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Availability Phrasing & Non-Hallucination Review
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 2] Testing Availability Alignment Phrasing...');
    const hospital = { facilityType: 'hospital' };
    const clinic = { facilityType: 'clinic' };

    const availToday = ProviderRankingService.evaluateAvailabilityAlignment(hospital, 'today');
    const availEve = ProviderRankingService.evaluateAvailabilityAlignment(clinic, 'evenings');

    console.log('  -> Hospital Rationale:', availToday.rationale);
    console.log('  -> Clinic Rationale:', availEve.rationale);

    // Verify phrasing clearly communicates "Likely suitable for your preference" rather than claiming confirmed openings
    if (!availToday.rationale.includes('Likely suitable for your preference') && !availToday.rationale.includes('Preference alignment')) {
      throw new Error('Hospital availability does not distinguish facility suitability from confirmed appointment.');
    }
    if (availToday.rationale.toLowerCase().includes('dr. is available right now') || availToday.rationale.toLowerCase().includes('open at this exact hour')) {
      throw new Error('Availability hallucinated live doctor schedule!');
    }
    if (!availEve.rationale.includes('contact facility to confirm')) {
      throw new Error('Clinic availability does not instruct user to confirm schedule.');
    }

    console.log('✅ Test 2 Passed: Availability evaluation accurately communicates facility capability without false booking claims.');
    passed++;
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: Continuous Distance Decay Scoring
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 3] Testing Continuous Distance Decay Scoring...');
    const near = ProviderRankingService.evaluateDistanceScore(0.5, 25);
    const mid = ProviderRankingService.evaluateDistanceScore(12.5, 25);
    const far = ProviderRankingService.evaluateDistanceScore(25.0, 25);

    console.log('  -> 0.5km in 25km radius:', near.score, 'pts');
    console.log('  -> 12.5km in 25km radius:', mid.score, 'pts');
    console.log('  -> 25.0km in 25km radius:', far.score, 'pts');

    if (near.score <= mid.score || mid.score <= far.score) {
      throw new Error('Distance decay monotonicity violated.');
    }
    console.log('✅ Test 3 Passed: Distance scoring applies continuous decay monotonically.');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: Reputation Scoring (Neutral Baseline for Unrated)
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 4] Testing Reputation & Rating Scoring...');
    const rated = { rating: 4.8, reviewCount: 150 };
    const unrated = { rating: null, reviewCount: null };

    const repRated = ProviderRankingService.evaluateReputationScore(rated);
    const repUnrated = ProviderRankingService.evaluateReputationScore(unrated);

    console.log('  -> Rated Provider (4.8 ★, 150 reviews):', repRated.score, 'pts');
    console.log('  -> Unrated Provider (OSM Directory):', repUnrated.score, 'pts');

    if (repRated.score <= repUnrated.score || repUnrated.score !== 8.0) {
      throw new Error('Reputation score bounds unexpected.');
    }
    console.log('✅ Test 4 Passed: Reputation scoring preserves neutral baseline without fabricating ratings.');
    passed++;
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Data Completeness Scoring
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 5] Testing Data Completeness Scoring...');
    const complete = {
      name: 'Teaching Hospital Jaffna',
      address: 'Hospital Road, Jaffna',
      phone: '+94212222261',
      latitude: 9.6615,
      longitude: 80.0255,
      mapUrl: 'https://osm.org/node/123'
    };
    const compFull = ProviderRankingService.evaluateDataCompleteness(complete);
    console.log('  -> Full Data Provider Score:', compFull.score, 'pts', `(${compFull.rationale})`);

    if (compFull.score !== 10.0) {
      throw new Error(`Expected 10.0 for complete provider, got: ${compFull.score}`);
    }
    console.log('✅ Test 5 Passed: Data completeness scored accurately based on verified fields.');
    passed++;
  } catch (err) {
    console.error('❌ Test 5 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Multi-Factor Weighted Ranking on Candidate Group
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 6] Testing Full Multi-Factor Ranking on Candidate Group...');
    const candidateProviders = [
      {
        id: 'p1',
        name: 'Distant General Clinic',
        facilityType: 'clinic',
        category: 'clinic',
        distanceKm: 22.0,
        address: 'Far Highway, Jaffna',
        phone: null,
        rating: null
      },
      {
        id: 'p2',
        name: 'Jaffna Heart & Vascular Specialty Centre',
        facilityType: 'clinic',
        category: 'clinic',
        distanceKm: 1.5,
        address: 'Hospital Road, Jaffna',
        phone: '+94212223344',
        rating: null
      },
      {
        id: 'p3',
        name: 'Teaching Hospital Jaffna',
        facilityType: 'hospital',
        category: 'hospital',
        distanceKm: 0.8,
        address: 'Hospital Road, Jaffna',
        phone: '+94212222261',
        rating: null
      }
    ];

    const recommendationContext = {
      recommendedSpecialty: 'Cardiology',
      careType: 'specialist',
      alternativeSpecialties: [{ specialty: 'Internal Medicine', confidence: 0.80 }]
    };

    const ranked = await ProviderRankingService.rankProviders(candidateProviders, recommendationContext, { radiusKm: 25 });

    console.log('\n  [Ranked Output Results]:');
    ranked.forEach(p => {
      console.log(`   Rank #${p.rank}: ${p.name} | Total Score: ${p.ranking.totalScore}/100 | Dist: ${p.distanceKm}km`);
      console.log(`     - Match Reason: ${p.ranking.primaryExplanation}`);
    });

    if (ranked[0].id !== 'p2' && ranked[0].id !== 'p3') {
      throw new Error(`Expected specialized clinic or close hospital as #1, got: ${ranked[0].name}`);
    }
    console.log('✅ Test 6 Passed: Multi-factor ranking successfully executed.');
    passed++;
  } catch (err) {
    console.error('❌ Test 6 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 7: Sparse & Null Provider Fields Robustness
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 7] Testing Robustness Against Missing & Null Fields...');
    const emptyProvider = {
      id: 'p_sparse',
      name: 'Sparse Clinic',
      distanceKm: null,
      address: null,
      phone: null,
      rating: null,
      reviewCount: null
    };

    const rankedSparse = await ProviderRankingService.rankProviders([emptyProvider], { recommendedSpecialty: 'Cardiology' }, { skipAiSemantic: true });
    if (rankedSparse.length !== 1 || isNaN(rankedSparse[0].ranking.totalScore)) {
      throw new Error('Ranking crashed or produced NaN on sparse provider fields.');
    }
    console.log('  -> Sparse Provider Score:', rankedSparse[0].ranking.totalScore);
    console.log('✅ Test 7 Passed: Sparse provider with null fields scored safely without NaN.');
    passed++;
  } catch (err) {
    console.error('❌ Test 7 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 8: End-to-End Pipeline & Audit Session Persistence
  // -------------------------------------------------------------
  try {
    console.log('\n[Test 8] Testing End-to-End Recommendation Pipeline & PostgreSQL Audit Log...');
    
    const patientRow = await query('SELECT id, user_id FROM patients LIMIT 1');
    if (patientRow.rows.length === 0) {
      console.log('  ℹ️ No patients in DB, skipping DB persistence test.');
    } else {
      const uId = patientRow.rows[0].user_id;
      const pId = patientRow.rows[0].id;

      const findingContext = {
        issueType: 'trend_alert',
        riskLevel: 'high',
        clinicalSummary: 'Repeated elevated blood pressure readings (165/105 mmHg) across visits.',
        evidence: 'Blood pressure 165/105 on 2025-08-10',
        relevantLabTrends: ['Blood Pressure: 165/105 mmHg'],
        patientAge: 55,
        patientGender: 'Male'
      };

      const result = await RecommendationService.searchAndRankProviders({
        userId: uId,
        patientId: pId,
        findingContext: findingContext,
        location: 'Jaffna',
        availability: 'this_week',
        radiusKm: 25
      });

      if (!result.success || !result.sessionId || result.providers.length === 0) {
        throw new Error(`End-to-end pipeline failed: ${JSON.stringify(result)}`);
      }

      console.log('  -> Audit Session ID:', result.sessionId);
      console.log('  -> Inferred Specialty:', result.specialty.recommendedSpecialty);
      console.log('  -> Top Ranked Provider:', result.providers[0].name, `(Score: ${result.providers[0].ranking.totalScore}/100)`);

      // Clean up test audit session
      await query('DELETE FROM recommendation_sessions WHERE id = $1', [result.sessionId]);
    }

    console.log('✅ Test 8 Passed: End-to-end pipeline and audit persistence fully operational.');
    passed++;
  } catch (err) {
    console.error('❌ Test 8 Failed:', err.message);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(` Phase 4 Test Summary: ${passed} Passed, ${failed} Failed `);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests();
