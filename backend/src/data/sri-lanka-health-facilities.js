/**
 * Sri Lanka Ministry of Health (MOH) Master Facility List (MFL)
 * 
 * Verified directory of public teaching hospitals, provincial general hospitals,
 * district general hospitals, base hospitals, and specialized institutes.
 * 
 * Used for government verification and official authority attribution.
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

/**
 * Searches and matches a provider against the Ministry of Health registry.
 * 
 * @param {string} providerName
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Object|null} Verification details or null if unverified
 */
export function findGovernmentFacilityMatch(providerName, latitude = null, longitude = null) {
  if (!providerName || typeof providerName !== 'string') return null;

  const cleanName = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tokens = providerName.toLowerCase().split(/[\s,().-]+/).filter(t => t.length > 2);

  for (const fac of SRI_LANKA_GOVERNMENT_FACILITIES) {
    const mainClean = fac.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Direct or reverse inclusion
    let matchesName = cleanName.includes(mainClean) || mainClean.includes(cleanName);

    // Check alternate names
    if (!matchesName && Array.isArray(fac.alternateNames)) {
      matchesName = fac.alternateNames.some(alt => {
        const altClean = alt.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanName.includes(altClean) || altClean.includes(cleanName);
      });
    }

    // Token set overlap check (e.g. "Jaffna General (Teaching) Hospital" matches "Teaching Hospital Jaffna")
    if (!matchesName) {
      const facTokens = fac.name.toLowerCase().split(/[\s,().-]+/).filter(t => t.length > 2);
      const common = facTokens.filter(t => tokens.includes(t));
      if (common.length >= 2 && (common.includes('jaffna') || common.includes('kandy') || common.includes('colombo') || common.includes('negombo') || common.includes('galle') || common.includes('vavuniya') || common.includes('teaching') || common.includes('hospital'))) {
        matchesName = true;
      }
    }

    if (matchesName) {
      // Distance confirmation if coordinates provided
      if (latitude != null && longitude != null && fac.coordinates) {
        const dLat = Math.abs(latitude - fac.coordinates.latitude);
        const dLon = Math.abs(longitude - fac.coordinates.longitude);
        if (dLat > 0.25 || dLon > 0.25) {
          continue;
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
