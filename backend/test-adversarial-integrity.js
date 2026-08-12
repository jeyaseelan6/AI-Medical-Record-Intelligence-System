import dotenv from 'dotenv';
import { findGovernmentFacilityMatch } from './src/data/sri-lanka-health-facilities.js';
import { ProviderMerger } from './src/utils/provider-merger.js';
import { normalizeGooglePlace, normalizeOsmElement } from './src/utils/provider-normalizer.js';
import { SpecialtyService } from './src/services/specialty.service.js';
import { ProviderSearchService } from './src/services/provider-search.service.js';

dotenv.config();

async function runAdversarialIntegritySuite() {
  console.log('================================================================');
  console.log('   MedAI — Zero-Fabrication & Identity Integrity Red-Team Suite ');
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
  // TEST 1: "Jaffna Private Hospital" must NOT inherit "Teaching Hospital Jaffna"
  // --------------------------------------------------------------------------
  const matchPrivateJaffna = findGovernmentFacilityMatch('Jaffna Private Hospital', 9.6651, 80.0093);
  assert(
    1,
    'Private Facility False Match Prevention (Jaffna)',
    matchPrivateJaffna === null,
    `"Jaffna Private Hospital" at exact TH Jaffna GPS correctly rejected government verification: ${matchPrivateJaffna === null}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: "Kandy Eye Hospital" must NOT inherit "National Hospital Kandy"
  // --------------------------------------------------------------------------
  const matchKandyEye = findGovernmentFacilityMatch('Kandy Eye Hospital', 7.2906, 80.6337);
  assert(
    2,
    'Sub-specialty Facility False Match Prevention (Kandy)',
    matchKandyEye === null,
    `"Kandy Eye Hospital" correctly rejected "National Hospital Kandy" MOH verification: ${matchKandyEye === null}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Two different generic "Medical Centre" facilities within 300m must NOT merge
  // --------------------------------------------------------------------------
  const genericClinicA = {
    id: 'osm_clinic_a',
    name: 'Colombo Medical Centre',
    latitude: 6.9100,
    longitude: 79.8600,
    source: 'openstreetmap'
  };
  const genericClinicB = {
    id: 'google_clinic_b',
    name: 'Colombo Dental Clinic',
    latitude: 6.9110, // ~110m away
    longitude: 79.8605,
    source: 'google_places'
  };
  const mergedDistinctClinics = ProviderMerger.mergeAndEnrichProviders([genericClinicA], [genericClinicB]);
  assert(
    3,
    'Generic Stop-Word Facility Separation',
    mergedDistinctClinics.length === 2,
    `Distinct clinics with generic words at ~110m preserved as 2 separate cards (count: ${mergedDistinctClinics.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Same facility from Google + OSM MUST merge into one provider
  // --------------------------------------------------------------------------
  const asiriOsm = {
    id: 'osm_asiri_01',
    name: 'Asiri Hospital Colombo',
    latitude: 6.8905,
    longitude: 79.8735,
    source: 'openstreetmap'
  };
  const asiriGoogle = {
    id: 'google_asiri_01',
    name: 'Asiri Hospital Colombo',
    latitude: 6.8906,
    longitude: 79.8734,
    phone: '+94 11 452 4400',
    rating: 4.4,
    reviewCount: 450,
    source: 'google_places'
  };
  const mergedAsiri = ProviderMerger.mergeAndEnrichProviders([asiriOsm], [asiriGoogle]);
  assert(
    4,
    'Legitimate Google + OSM Facility Merge',
    mergedAsiri.length === 1 && mergedAsiri[0].phone === '+94 11 452 4400' && mergedAsiri[0].rating === 4.4,
    `Identical facility successfully unified into 1 card with enriched Google rating (${mergedAsiri[0]?.rating}★)`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Same facility with matching phone number MUST merge safely
  // --------------------------------------------------------------------------
  const matchingPhoneA = {
    id: 'osm_chav_01',
    name: 'Chavakachcheri Base Hospital',
    latitude: 9.6542,
    longitude: 80.1584,
    phone: '021 227 2222',
    source: 'openstreetmap'
  };
  const matchingPhoneB = {
    id: 'google_chav_01',
    name: 'Base Hospital Chavakachcheri',
    latitude: 9.6545,
    longitude: 80.1580,
    phone: '+94 21 227 2222',
    rating: 4.1,
    source: 'google_places'
  };
  const mergedPhoneMatch = ProviderMerger.mergeAndEnrichProviders([matchingPhoneA], [matchingPhoneB]);
  assert(
    5,
    'Verified Phone Number Match Merging',
    mergedPhoneMatch.length === 1 && mergedPhoneMatch[0].sources.includes('google_places') && mergedPhoneMatch[0].sources.includes('openstreetmap'),
    `Matching normalized phone number cleanly unified records into 1 card`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Different facilities with different phone numbers at 50m must NOT merge
  // --------------------------------------------------------------------------
  const neighborA = {
    id: 'prov_neighbor_a',
    name: 'Jaffna Health Care Centre',
    latitude: 9.6650,
    longitude: 80.0100,
    phone: '+94 21 222 1111',
    source: 'google_places'
  };
  const neighborB = {
    id: 'prov_neighbor_b',
    name: 'Jaffna Diagnostic Laboratory',
    latitude: 9.6653, // ~35m away
    longitude: 80.0102,
    phone: '+94 21 222 9999', // Different phone!
    source: 'google_places'
  };
  const mergedNeighbors = ProviderMerger.mergeAndEnrichProviders([neighborA], [neighborB]);
  assert(
    6,
    'Conflicting Phone Rejection at Close Proximity',
    mergedNeighbors.length === 2,
    `Neighboring facilities with conflicting phone numbers kept strictly separate (count: ${mergedNeighbors.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Google provider with no phone must remain phone: null
  // --------------------------------------------------------------------------
  const rawGoogleSparse = {
    displayName: { text: 'Community Clinic' },
    location: { latitude: 9.6600, longitude: 80.0100 }
  };
  const normalizedGoogleSparse = normalizeGooglePlace(rawGoogleSparse);
  assert(
    7,
    'Google Places Missing Phone Preservation',
    normalizedGoogleSparse !== null && normalizedGoogleSparse.phone === null,
    `Missing phone preserved as null without artificial contact generation`
  );

  // --------------------------------------------------------------------------
  // TEST 8: OSM provider with no rating must remain rating: null
  // --------------------------------------------------------------------------
  const rawOsmSparse = {
    id: 998877,
    type: 'node',
    lat: 9.6650,
    lon: 80.0100,
    tags: { name: 'Rural Dispensary', amenity: 'clinic' }
  };
  const normalizedOsmSparse = normalizeOsmElement(rawOsmSparse);
  assert(
    8,
    'OpenStreetMap Null Rating Baseline Preservation',
    normalizedOsmSparse !== null && normalizedOsmSparse.rating === null && normalizedOsmSparse.reviewCount === null,
    `OSM facility strictly preserved rating: null (zero 5-star placeholders)`
  );

  // --------------------------------------------------------------------------
  // TEST 9: Empty search (0 providers from APIs) produces providers: []
  // --------------------------------------------------------------------------
  const emptyMerged = ProviderMerger.mergeAndEnrichProviders([], []);
  assert(
    9,
    'Empty Search Zero-Fabrication Fallback',
    Array.isArray(emptyMerged) && emptyMerged.length === 0,
    `Empty adapter responses produce 0 providers with zero synthetic fallback objects`
  );

  // --------------------------------------------------------------------------
  // TEST 10: All external provider APIs fail -> providers: []
  // --------------------------------------------------------------------------
  const liveEmptyCoordSearch = await ProviderSearchService.searchProviders({
    latitude: 0.0001,
    longitude: 0.0001, // Remote ocean coordinate
    radiusKm: 1
  });
  assert(
    10,
    'No-Result Remote Coordinate Safety',
    liveEmptyCoordSearch.success === true && liveEmptyCoordSearch.providers.length === 0,
    `Remote query returned exactly 0 providers without injecting mock data (count: ${liveEmptyCoordSearch.providers.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 11: AI receives clinical finding and must never produce provider objects
  // --------------------------------------------------------------------------
  const clinicalFindingContext = {
    issueType: 'medication_conflict',
    riskLevel: 'high',
    clinicalSummary: 'Concurrent ACE inhibitor and Potassium-sparing diuretic risk of severe hyperkalemia.',
    relevantMedications: ['Lisinopril', 'Spironolactone']
  };
  const aiTriageResult = await SpecialtyService.determineSpecialty(clinicalFindingContext);
  assert(
    11,
    'AI Specialty Triage Decoupling & Boundary Verification',
    aiTriageResult.recommendedSpecialty && !aiTriageResult.providers && !aiTriageResult.doctors && !aiTriageResult.hospitals,
    `AI output contains recommended specialty ("${aiTriageResult.recommendedSpecialty}") and zero provider entities`
  );

  // --------------------------------------------------------------------------
  // TEST 12: Provider without government match has governmentVerification: null
  // --------------------------------------------------------------------------
  const privateHospital = {
    id: 'osm_yaarl_01',
    name: 'Yaarl Hospital Jaffna',
    facilityType: 'hospital',
    latitude: 9.6700,
    longitude: 80.0150,
    source: 'openstreetmap'
  };
  const mergedPrivate = ProviderMerger.mergeAndEnrichProviders([privateHospital], []);
  assert(
    12,
    'Unverified Facility Clean Null Government Status',
    mergedPrivate[0].governmentVerification === null,
    `Unregistered private hospital cleanly retained governmentVerification: null (zero false badges)`
  );

  console.log('\n================================================================');
  console.log(` Adversarial Test Suite Result: ${passed} / ${total} Passed`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAdversarialIntegritySuite().catch(err => {
  console.error('Fatal error during adversarial suite execution:', err);
  process.exit(1);
});
