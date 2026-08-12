import dotenv from 'dotenv';
import { ProviderMerger } from './src/utils/provider-merger.js';
import { ProviderSearchService } from './src/services/provider-search.service.js';
import { ProviderRankingService } from './src/services/provider-ranking.service.js';
import { findGovernmentFacilityMatch } from './src/data/sri-lanka-health-facilities.js';
import { ChannelingAdapter } from './src/services/adapters/channeling.adapter.js';

dotenv.config();

async function runUnifiedProviderTests() {
  console.log('================================================================');
  console.log('       MedAI — Unified Provider Information Card Validation     ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (testName, condition, details) => {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ PASS: [${testName}] ${details}`);
    } else {
      console.error(`❌ FAIL: [${testName}] ${details}`);
    }
  };

  // --------------------------------------------------------------------------
  // TEST 1: OSM-only provider handling
  // --------------------------------------------------------------------------
  const osmOnlyProvider = {
    id: 'osm_node_1001',
    externalId: '1001',
    name: 'Jaffna Community Health Clinic',
    facilityType: 'clinic',
    address: 'Kandy Road, Jaffna',
    latitude: 9.665,
    longitude: 80.010,
    distanceKm: 0.5,
    phone: null,
    rating: null,
    reviewCount: null,
    source: 'openstreetmap'
  };

  const mergedOsmOnly = ProviderMerger.mergeAndEnrichProviders([osmOnlyProvider], [], { targetSpecialty: 'General Practice' });
  assert(
    'TEST 1 — OSM-Only Provider',
    mergedOsmOnly.length === 1 && mergedOsmOnly[0].phone === null && mergedOsmOnly[0].rating === null && mergedOsmOnly[0].sources.includes('openstreetmap'),
    `Single card created with unlisted fields preserved as null. Sources: [${mergedOsmOnly[0]?.sources?.join(', ')}]`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Google + OSM Provider Merge (One Single Card)
  // --------------------------------------------------------------------------
  const osmHospital = {
    id: 'osm_node_2001',
    name: 'Asiri Surgical Hospital',
    facilityType: 'hospital',
    address: 'Kirula Road, Colombo 05',
    latitude: 6.885,
    longitude: 79.875,
    distanceKm: 1.2,
    phone: null,
    rating: null,
    source: 'openstreetmap'
  };

  const googleHospital = {
    id: 'google_place_g2001',
    name: 'Asiri Surgical Hospital Colombo',
    facilityType: 'hospital',
    address: '21 Kirula Rd, Colombo 00500',
    latitude: 6.8851,
    longitude: 79.8752,
    distanceKm: 1.2,
    phone: '+94 11 452 4400',
    rating: 4.4,
    reviewCount: 450,
    openingHours: true,
    website: 'https://asirihealth.com',
    source: 'google_places'
  };

  const mergedGoogleOsm = ProviderMerger.mergeAndEnrichProviders([osmHospital], [googleHospital], { targetSpecialty: 'Cardiology' });
  assert(
    'TEST 2 — Google + OSM Merger',
    mergedGoogleOsm.length === 1 && mergedGoogleOsm[0].phone === '+94 11 452 4400' && mergedGoogleOsm[0].rating === 4.4 && mergedGoogleOsm[0].reviewCount === 450,
    `Successfully merged into 1 card. Phone: "${mergedGoogleOsm[0]?.phone}", Rating: ${mergedGoogleOsm[0]?.rating}★ (${mergedGoogleOsm[0]?.reviewCount} reviews)`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Government + Google + OSM Provider
  // --------------------------------------------------------------------------
  const jaffnaTeachingBase = {
    id: 'osm_node_3001',
    name: 'Jaffna Teaching Hospital',
    facilityType: 'hospital',
    address: 'Hospital Road, Jaffna, 40000',
    latitude: 9.6651,
    longitude: 80.0093,
    distanceKm: 0.4,
    source: 'openstreetmap'
  };

  const jaffnaGoogle = {
    id: 'google_jaf_01',
    name: 'Teaching Hospital Jaffna',
    facilityType: 'hospital',
    address: 'Hospital St, Jaffna',
    latitude: 9.6652,
    longitude: 80.0094,
    distanceKm: 0.4,
    rating: 4.3,
    reviewCount: 320,
    source: 'google_places'
  };

  const mergedGovProvider = ProviderMerger.mergeAndEnrichProviders([jaffnaTeachingBase], [jaffnaGoogle], { targetSpecialty: 'Cardiology' });
  const govCard = mergedGovProvider[0];

  assert(
    'TEST 3 — Government + Google + OSM Unified Card',
    mergedGovProvider.length === 1 && govCard.governmentVerification?.isVerified === true && govCard.rating === 4.3 && govCard.phone.includes('222'),
    `Verified: Government Verified (${govCard?.governmentVerification?.facilityCategory}), Google Rating (${govCard?.rating}★), Phone (${govCard?.phone})`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Deduplication of Overlapping Sources
  // --------------------------------------------------------------------------
  const dup1 = { id: 'osm_1', name: 'Kandy General Hospital', latitude: 7.2906, longitude: 80.6337, distanceKm: 0.8, source: 'openstreetmap' };
  const dup2 = { id: 'google_1', name: 'National Hospital Kandy', latitude: 7.2907, longitude: 80.6338, distanceKm: 0.8, phone: '+94 81 222 2261', source: 'google_places' };

  const deduplicatedRes = ProviderMerger.mergeAndEnrichProviders([dup1], [dup2], { targetSpecialty: 'Internal Medicine' });
  assert(
    'TEST 4 — Duplicate Source Deduplication',
    deduplicatedRes.length === 1,
    `Overlapping OSM and Google records for Kandy Hospital yielded exactly 1 unified card.`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Missing Google Data Fallback
  // --------------------------------------------------------------------------
  const fallbackTest = ProviderMerger.mergeAndEnrichProviders([osmOnlyProvider], [], { targetSpecialty: 'General Practice' });
  assert(
    'TEST 5 — Missing Google Fallback',
    fallbackTest.length === 1 && fallbackTest[0].source === 'openstreetmap',
    `Fell back cleanly to OpenStreetMap baseline without crash.`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Zero Fabrication of Missing Details
  // --------------------------------------------------------------------------
  const ruralClinic = {
    id: 'osm_rural_01',
    name: 'Rural Dispensary',
    facilityType: 'clinic',
    latitude: 9.700,
    longitude: 80.100,
    distanceKm: 4.5,
    source: 'openstreetmap'
  };
  const ruralMerged = ProviderMerger.mergeAndEnrichProviders([ruralClinic], [], {});
  assert(
    'TEST 6 — Zero Fabrication of Missing Contact',
    ruralMerged[0].phone == null && ruralMerged[0].rating == null && ruralMerged[0].governmentVerification == null,
    `Missing fields strictly preserved as null. No artificial phone or 5-star rating injected.`
  );

  // --------------------------------------------------------------------------
  // TEST 7 & 8: Doc990 / Doctor Channeling Availability
  // --------------------------------------------------------------------------
  const channelingDetails = ChannelingAdapter.getChannelingDetails(jaffnaTeachingBase, 'Endocrinology');
  assert(
    'TEST 8 — Legitimate Channeling Enrichment',
    channelingDetails !== null && channelingDetails.available === true && channelingDetails.bookingUrl.includes('doc990.lk'),
    `Attached verified booking portal: ${channelingDetails?.bookingUrl} (Hotline: ${channelingDetails?.hotline})`
  );

  const noChannelingDetails = ChannelingAdapter.getChannelingDetails(ruralClinic, 'General Practice');
  assert(
    'TEST 7 — Channeling Unavailable Case',
    noChannelingDetails === null,
    `Unregistered rural dispensary cleanly returned null channeling (zero fake doctor slots).`
  );

  // --------------------------------------------------------------------------
  // TEST 9: Multi-Factor Ranking Evaluation of Unified Provider
  // --------------------------------------------------------------------------
  const rankedGov = await ProviderRankingService.rankProviders(mergedGovProvider, { recommendedSpecialty: 'Cardiology', careType: 'specialist', alternativeSpecialties: [] }, { radiusKm: 15, availabilityPreference: 'today', skipAiSemantic: true });
  const topRank = rankedGov[0];
  const b = topRank.ranking.scoreBreakdown;
  const calculatedSum = parseFloat((b.specialtyScore + b.distanceScore + b.reputationScore + b.completenessScore + b.availabilityScore).toFixed(1));

  assert(
    'TEST 9 — Multi-Factor Score Consistency on Enriched Card',
    calculatedSum === topRank.ranking.totalScore && topRank.ranking.totalScore >= 80,
    `Total Score: ${topRank.ranking.totalScore}/100 (Completeness: ${b.completenessScore}/10, Reputation: ${b.reputationScore}/15)`
  );

  // --------------------------------------------------------------------------
  // TEST 10: Live Search Service Discovery
  // --------------------------------------------------------------------------
  console.log('\n--- Running Live Unified Provider Search Test (Jaffna) ---');
  const liveSearch = await ProviderSearchService.searchProviders({
    latitude: 9.6651,
    longitude: 80.0093,
    radiusKm: 15,
    careType: 'primary_care',
    specialty: 'Cardiology'
  });

  const hasGovVerified = liveSearch.providers.some(p => p.governmentVerification?.isVerified);
  const hasChanneling = liveSearch.providers.some(p => p.channeling?.available);

  assert(
    'TEST 10 — Live Unified Search Service',
    liveSearch.success && liveSearch.providers.length > 0 && hasGovVerified && hasChanneling,
    `Found ${liveSearch.providers.length} providers. Live government verification and channeling successfully enriched.`
  );

  console.log('\n================================================================');
  console.log(` Unified Provider Card Test Result: ${passed} / ${total} Passed`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runUnifiedProviderTests();
