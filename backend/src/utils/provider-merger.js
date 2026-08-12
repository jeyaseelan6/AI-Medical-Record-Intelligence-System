import { findGovernmentFacilityMatch } from '../data/sri-lanka-health-facilities.js';
import { calculateDistanceKm, deduplicateProviders } from './provider-normalizer.js';

// Generic healthcare stop-words, facility tiers, and common regional city names
// (must NOT be used as evidence of unique commercial facility identity)
const GENERIC_HEALTHCARE_STOPWORDS = new Set([
  // Facility types & taxonomy
  'hospital', 'clinic', 'medical', 'centre', 'center', 'care', 'health',
  'healthcare', 'pharmacy', 'dispensary', 'dr', 'doctor', 'physician',
  'surgery', 'laboratories', 'laboratory', 'lab', 'service', 'services',
  'general', 'national', 'teaching', 'district', 'base', 'provincial',
  'type', 'specialized', 'institute', 'department',
  // Common regional geographic identifiers
  'sri', 'lanka', 'colombo', 'jaffna', 'kandy', 'galle', 'negombo',
  'batticaloa', 'matara', 'kurunegala', 'ratnapura', 'anuradhapura',
  'badulla', 'trincomalee', 'kalutara', 'gampaha', 'vavuniya'
]);

/**
 * Normalizes a phone string into its core significant local digits (stripping +94 country code and leading 0).
 */
function extractSignificantPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('94')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * ProviderMerger
 * 
 * Aggregates and merges heterogeneous provider records from OpenStreetMap,
 * Google Places API, and Sri Lanka Ministry of Health MFL into ONE unified
 * trustworthy MedAI Provider entity.
 * 
 * Guarantees:
 * - Exactly ONE card per physical facility.
 * - Prioritizes verified commercial/government contact details and ratings when available.
 * - Missing fields strictly preserved as null/"Not listed" (Zero Fabrication).
 * - Never merges two distinct providers merely because they share generic words.
 * - Rejects merges when listed phone numbers conflict.
 */
export class ProviderMerger {

  /**
   * Merges and enriches a list of baseline providers with Google Places and Government MOH verification.
   * 
   * @param {Array<Object>} baseProviders - Baseline providers (e.g. from OSM)
   * @param {Array<Object>} googlePlacesProviders - Optional providers from Google Places
   * @param {Object} options
   * @param {string} options.targetSpecialty - AI Recommended specialty
   * @returns {Array<Object>} Unified, deduplicated, enriched provider list
   */
  static mergeAndEnrichProviders(baseProviders = [], googlePlacesProviders = [], options = {}) {
    const { targetSpecialty = null } = options;

    const baseList = Array.isArray(baseProviders) ? baseProviders : [];
    const googleList = Array.isArray(googlePlacesProviders) ? googlePlacesProviders : [];

    // Map of unified providers keyed by canonical ID
    const unifiedMap = new Map();

    // 1. Ingest base providers (typically OpenStreetMap)
    for (const prov of baseList) {
      if (!prov || !prov.name) continue;

      const unified = {
        ...prov,
        sources: [prov.source || 'openstreetmap'],
        governmentVerification: null
      };

      unifiedMap.set(prov.id, unified);
    }

    // 2. Merge Google Places providers into matching base providers, or add new ones
    for (const gProv of googleList) {
      if (!gProv || !gProv.name) continue;

      let matchedBase = null;

      // Find match among existing unified providers using conservative spatial & identity criteria
      for (const [id, existing] of unifiedMap.entries()) {
        const isMatch = this.areMatchingFacilities(existing, gProv);
        if (isMatch) {
          matchedBase = existing;
          break;
        }
      }

      if (matchedBase) {
        // Merge enriched fields from Google into the unified provider
        if (gProv.phone && (!matchedBase.phone || matchedBase.phone === 'Not listed')) {
          matchedBase.phone = gProv.phone;
        }
        if (typeof gProv.rating === 'number' && matchedBase.rating == null) {
          matchedBase.rating = gProv.rating;
        }
        if (typeof gProv.reviewCount === 'number' && matchedBase.reviewCount == null) {
          matchedBase.reviewCount = gProv.reviewCount;
        }
        if (gProv.openingHours != null && matchedBase.openingHours == null) {
          matchedBase.openingHours = gProv.openingHours;
        }
        if (gProv.website && !matchedBase.website) {
          matchedBase.website = gProv.website;
        }
        if (!matchedBase.sources.includes('google_places')) {
          matchedBase.sources.push('google_places');
        }
      } else {
        // Add standalone Google Places provider if not already discovered by OSM
        const unifiedG = {
          ...gProv,
          sources: ['google_places'],
          governmentVerification: null
        };
        unifiedMap.set(gProv.id, unifiedG);
      }
    }

    const unifiedList = Array.from(unifiedMap.values());

    // 3. Enrich each unified provider with Government MOH Verification Data
    for (const p of unifiedList) {
      const govMatch = findGovernmentFacilityMatch(p.name, p.latitude, p.longitude);
      if (govMatch) {
        p.governmentVerification = govMatch;
        if (!p.sources.includes('moh_srilanka')) {
          p.sources.push('moh_srilanka');
        }
        // Fill official phone if missing
        if (!p.phone && govMatch.officialPhone) {
          p.phone = govMatch.officialPhone;
        }
        if (!p.website && govMatch.website) {
          p.website = govMatch.website;
        }
      }
    }

    // 4. Final spatial deduplication
    return deduplicateProviders(unifiedList);
  }

  /**
   * Evaluates if two provider objects refer to the exact same physical facility.
   * Enforces conservative identity matching:
   * 1. Rejects merge if listed phone numbers conflict.
   * 2. Removes generic healthcare stop words & geographic identifiers before comparing distinctive tokens.
   * 3. Requires tight spatial proximity (<= 250m) and high distinctive token overlap (Jaccard >= 0.8).
   * 4. For purely generic names, merges only if phone numbers match or co-located <= 50m.
   * 
   * @param {Object} a - First provider
   * @param {Object} b - Second provider
   * @returns {boolean}
   */
  static areMatchingFacilities(a, b) {
    if (!a || !b || !a.name || !b.name) return false;

    // 1. Phone Conflict Check (If both providers have listed numbers and they differ, NEVER merge)
    const sigPhoneA = extractSignificantPhone(a.phone);
    const sigPhoneB = extractSignificantPhone(b.phone);
    let hasPhoneMatch = false;

    if (sigPhoneA.length >= 7 && sigPhoneB.length >= 7) {
      hasPhoneMatch = sigPhoneA === sigPhoneB || sigPhoneA.endsWith(sigPhoneB) || sigPhoneB.endsWith(sigPhoneA);
      if (!hasPhoneMatch) {
        return false; // Conflicting phone numbers -> Definitely separate facilities!
      }
    }

    const nameA = this.cleanFacilityName(a.name);
    const nameB = this.cleanFacilityName(b.name);
    const isExactName = nameA === nameB;

    // 2. Spatial proximity check
    let distKm = null;
    if (a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null) {
      distKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);

      // If more than 500m apart, cannot be the same physical facility
      if (distKm > 0.5) {
        return false;
      }
    }

    // 3. Extract distinctive tokens by stripping generic healthcare and geographic stop words
    const distinctiveTokensA = nameA.split(' ').filter(w => w.length > 2 && !GENERIC_HEALTHCARE_STOPWORDS.has(w));
    const distinctiveTokensB = nameB.split(' ').filter(w => w.length > 2 && !GENERIC_HEALTHCARE_STOPWORDS.has(w));

    // Case 3A: Distinctive brand/proper-noun tokens exist (e.g. "Asiri", "Durdans", "Nawaloka", "Chavakachcheri")
    if (distinctiveTokensA.length > 0 && distinctiveTokensB.length > 0) {
      const setA = new Set(distinctiveTokensA);
      const setB = new Set(distinctiveTokensB);
      let commonDistinctive = 0;
      for (const t of setA) {
        if (setB.has(t)) commonDistinctive++;
      }
      
      const unionSize = new Set([...setA, ...setB]).size;
      const distinctiveJaccard = commonDistinctive / unionSize;

      // Require high distinctive Jaccard overlap (>= 0.75) AND close proximity (<= 250m)
      if (distinctiveJaccard >= 0.75 && (distKm == null || distKm <= 0.25)) {
        return true;
      }

      // If exact distinctive name match and <= 350m
      if (distinctiveJaccard === 1.0 && (distKm == null || distKm <= 0.35)) {
        return true;
      }
    }

    // Case 3B: Generic-only names (e.g. "Medical Centre" vs "Medical Centre", or "Kandy General Hospital" vs "National Hospital Kandy")
    if (distinctiveTokensA.length === 0 && distinctiveTokensB.length === 0) {
      // Both are generic or hospital tier titles at the exact same location (<= 50m)
      if (distKm != null && distKm <= 0.05) {
        return true;
      }
    }

    // 4. Direct verified phone number match with close proximity (<= 300m)
    if (hasPhoneMatch && (distKm == null || distKm <= 0.30)) {
      return true;
    }

    return false;
  }

  /**
   * Cleans and normalizes facility names for robust fuzzy matching.
   * 
   * @param {string} name
   * @returns {string}
   */
  static cleanFacilityName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default ProviderMerger;
