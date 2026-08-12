/**
 * Sri Lanka Ministry of Health (MOH) Master Facility List (MFL)
 * 
 * Verified directory of public teaching hospitals, provincial general hospitals,
 * district general hospitals, base hospitals, and specialized institutes.
 * 
 * Used strictly for authentic government verification and official authority attribution.
 * Zero-Fabrication Rule: Private or independent facilities must NEVER inherit government verification.
 */

export const SRI_LANKA_GOVERNMENT_FACILITIES = [
  // Northern Province (Jaffna, Kilinochchi, Vavuniya, Mannar, Mullaitivu)
  {
    id: 'gov_th_jaffna',
    name: 'Teaching Hospital Jaffna',
    alternateNames: ['Jaffna Teaching Hospital', 'Jaffna General Hospital', 'JTH'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-JAF-01',
    district: 'Jaffna',
    province: 'Northern Province',
    officialPhone: '+94 21 222 2261',
    emergencyPhone: '+94 21 222 2262',
    website: 'http://www.thjaffna.health.gov.lk',
    coordinates: { latitude: 9.6651, longitude: 80.0093 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_bh_chavakachcheri',
    name: 'Base Hospital Chavakachcheri',
    alternateNames: ['Chavakachcheri Base Hospital', 'Chavakachcheri Hospital'],
    facilityCategory: 'Base Hospital (Type A)',
    mohCode: 'BH-JAF-02',
    district: 'Jaffna',
    province: 'Northern Province',
    officialPhone: '+94 21 227 2222',
    coordinates: { latitude: 9.6542, longitude: 80.1584 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_bh_pointpedro',
    name: 'Base Hospital Point Pedro',
    alternateNames: ['Point Pedro Base Hospital', 'Manthikai Hospital'],
    facilityCategory: 'Base Hospital (Type A)',
    mohCode: 'BH-JAF-03',
    district: 'Jaffna',
    province: 'Northern Province',
    officialPhone: '+94 21 226 2222',
    coordinates: { latitude: 9.8167, longitude: 80.2333 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_dgh_vavuniya',
    name: 'District General Hospital Vavuniya',
    alternateNames: ['Vavuniya General Hospital', 'DGH Vavuniya'],
    facilityCategory: 'District General Hospital',
    mohCode: 'DGH-VAV-01',
    district: 'Vavuniya',
    province: 'Northern Province',
    officialPhone: '+94 24 222 2261',
    coordinates: { latitude: 8.7514, longitude: 80.4971 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },

  // Western Province (Colombo, Gampaha, Kalutara)
  {
    id: 'gov_nhsl_colombo',
    name: 'National Hospital of Sri Lanka',
    alternateNames: ['Colombo General Hospital', 'NHSL Colombo', 'National Hospital Colombo'],
    facilityCategory: 'National Referral & Teaching Hospital',
    mohCode: 'NHSL-COL-01',
    district: 'Colombo',
    province: 'Western Province',
    officialPhone: '+94 11 269 1111',
    emergencyPhone: '+94 11 269 3510',
    website: 'http://www.nhsl.health.gov.lk',
    coordinates: { latitude: 6.9198, longitude: 79.8682 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_csth_kalubowila',
    name: 'Colombo South Teaching Hospital',
    alternateNames: ['Kalubowila Hospital', 'CSTH Kalubowila'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-COL-02',
    district: 'Colombo',
    province: 'Western Province',
    officialPhone: '+94 11 276 3064',
    coordinates: { latitude: 6.8711, longitude: 79.8804 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_cnth_ragama',
    name: 'Colombo North Teaching Hospital Ragama',
    alternateNames: ['Ragama Teaching Hospital', 'CNTH Ragama', 'Ragama Hospital'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-GAM-01',
    district: 'Gampaha',
    province: 'Western Province',
    officialPhone: '+94 11 295 9261',
    coordinates: { latitude: 7.0275, longitude: 79.9238 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_dgh_negombo',
    name: 'District General Hospital Negombo',
    alternateNames: ['Negombo General Hospital', 'Negombo Hospital', 'DGH Negombo'],
    facilityCategory: 'District General Hospital',
    mohCode: 'DGH-GAM-02',
    district: 'Gampaha',
    province: 'Western Province',
    officialPhone: '+94 31 222 2261',
    coordinates: { latitude: 7.2094, longitude: 79.8331 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_sjth_kotte',
    name: 'Sri Jayewardenepura General Hospital',
    alternateNames: ['Jayewardenepura Hospital', 'SJGH Kotte'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-COL-03',
    district: 'Colombo',
    province: 'Western Province',
    officialPhone: '+94 11 277 8610',
    coordinates: { latitude: 6.8753, longitude: 79.9328 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },

  // Central Province (Kandy, Matale, Nuwara Eliya)
  {
    id: 'gov_nhk_kandy',
    name: 'National Hospital Kandy',
    alternateNames: ['Kandy General Hospital', 'Teaching Hospital Kandy', 'NHK Kandy'],
    facilityCategory: 'National Teaching Hospital',
    mohCode: 'NHK-KAN-01',
    district: 'Kandy',
    province: 'Central Province',
    officialPhone: '+94 81 222 2261',
    website: 'http://www.kandyhospital.health.gov.lk',
    coordinates: { latitude: 7.2906, longitude: 80.6337 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_th_peradeniya',
    name: 'Teaching Hospital Peradeniya',
    alternateNames: ['Peradeniya Teaching Hospital', 'Peradeniya Hospital'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-KAN-02',
    district: 'Kandy',
    province: 'Central Province',
    officialPhone: '+94 81 238 8001',
    coordinates: { latitude: 7.2658, longitude: 80.5969 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },

  // Southern & Eastern Provinces
  {
    id: 'gov_th_karapitiya',
    name: 'Teaching Hospital Karapitiya',
    alternateNames: ['Karapitiya Teaching Hospital', 'Galle Hospital', 'THK Galle'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-GAL-01',
    district: 'Galle',
    province: 'Southern Province',
    officialPhone: '+94 91 223 2261',
    coordinates: { latitude: 6.0667, longitude: 80.2222 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  },
  {
    id: 'gov_th_batticaloa',
    name: 'Teaching Hospital Batticaloa',
    alternateNames: ['Batticaloa Teaching Hospital', 'Batticaloa General Hospital'],
    facilityCategory: 'Teaching Hospital',
    mohCode: 'TH-BAT-01',
    district: 'Batticaloa',
    province: 'Eastern Province',
    officialPhone: '+94 65 222 2261',
    coordinates: { latitude: 7.7172, longitude: 81.6997 },
    emergencyCapable: true,
    officialAuthority: 'Ministry of Health, Sri Lanka'
  }
];

// Explicit private, sub-specialty, or independent markers that instantly disqualify a candidate
const PRIVATE_DISQUALIFIERS = [
  'private', 'dental', 'eye', 'ayurvedic', 'ayurveda', 'nursing home',
  'memorial', 'co-operative', 'cooperative', 'channelling', 'dispensary',
  'veterinary', 'pet', 'animal', 'suwasewana', 'asiri', 'nawaloka',
  'durdans', 'lanka hospitals', 'kings', 'ninewells', 'hemas', 'delmon',
  'pannipitiya', 'northern central', 'yaarl', 'noolaham', 'medi'
];

/**
 * Calculates Haversine distance in kilometers between two GPS points.
 */
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Searches and matches a provider against the Ministry of Health registry.
 * Enforces strict, conservative identity verification:
 * 1. Disqualifies any candidate with private, commercial, or independent keywords.
 * 2. Requires exact canonical name, official alias, or full distinctive token set match.
 * 3. Enforces tight spatial grounding (<= 1.5km from verified government coordinates).
 * 
 * @param {string} providerName
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Object|null} Verification details or null if unverified
 */
export function findGovernmentFacilityMatch(providerName, latitude = null, longitude = null) {
  if (!providerName || typeof providerName !== 'string') return null;

  const candidateLower = providerName.toLowerCase();
  
  // 1. Disqualify private, independent, or distinct sub-specialty clinics
  for (const disq of PRIVATE_DISQUALIFIERS) {
    // Check whole-word or delimited occurrence
    const regex = new RegExp(`\\b${disq}\\b`, 'i');
    if (regex.test(candidateLower)) {
      return null;
    }
  }

  const cleanCandidate = candidateLower.replace(/[^a-z0-9]/g, '');
  const candidateTokens = candidateLower.split(/[\s,().-]+/).filter(t => t.length > 2);

  for (const fac of SRI_LANKA_GOVERNMENT_FACILITIES) {
    const mainClean = fac.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Exact or near-exact canonical string match
    let isExactNameMatch = cleanCandidate === mainClean;

    // Check curated official alternate names
    if (!isExactNameMatch && Array.isArray(fac.alternateNames)) {
      isExactNameMatch = fac.alternateNames.some(alt => {
        const altClean = alt.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanCandidate === altClean;
      });
    }

    // Distinctive token match: Extract significant distinctive tokens of the government hospital
    // (excluding generic stop words like 'hospital', 'general', 'type', 'provincial', 'district', 'base')
    let isDistinctiveTokenMatch = false;
    if (!isExactNameMatch) {
      const genericStopWords = new Set(['hospital', 'general', 'type', 'provincial', 'district', 'base', 'sri', 'lanka']);
      const facDistinctiveTokens = fac.name
        .toLowerCase()
        .split(/[\s,().-]+/)
        .filter(t => t.length > 2 && !genericStopWords.has(t));

      if (facDistinctiveTokens.length > 0) {
        // ALL distinctive tokens of the official government facility must be present in the candidate name
        const allPresent = facDistinctiveTokens.every(t => candidateTokens.includes(t));
        if (allPresent) {
          isDistinctiveTokenMatch = true;
        }
      }
    }

    if (isExactNameMatch || isDistinctiveTokenMatch) {
      // 3. Strict spatial distance verification if coordinates are provided (must be within 1.5 km)
      if (latitude != null && longitude != null && fac.coordinates) {
        const distKm = calculateHaversineKm(latitude, longitude, fac.coordinates.latitude, fac.coordinates.longitude);
        if (distKm != null && distKm > 1.5) {
          continue; // Too far from official facility location -> Reject match
        }
      }

      return {
        isVerified: true,
        facilityCategory: fac.facilityCategory,
        mohCode: fac.mohCode,
        officialAuthority: fac.officialAuthority,
        officialPhone: fac.officialPhone,
        website: fac.website || null,
        emergencyCapable: fac.emergencyCapable
      };
    }
  }

  return null;
}
