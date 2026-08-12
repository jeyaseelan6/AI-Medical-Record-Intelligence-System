import { findGovernmentFacilityMatch } from '../data/sri-lanka-health-facilities.js';
import { calculateDistanceKm, deduplicateProviders } from './provider-normalizer.js';

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
 * - Tracks merged sources transparently.
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

      // Find match among existing unified providers using spatial proximity & name similarity
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
   * 
   * @param {Object} a - First provider
   * @param {Object} b - Second provider
   * @returns {boolean}
   */
  static areMatchingFacilities(a, b) {
    if (!a || !b || !a.name || !b.name) return false;

    // 1. Strict name similarity check
    const nameA = this.cleanFacilityName(a.name);
    const nameB = this.cleanFacilityName(b.name);

    const isExactName = nameA === nameB;
    const isSubstring = (nameA.length > 5 && nameB.length > 5) && (nameA.includes(nameB) || nameB.includes(nameA));

    // Token similarity (handles word order inversions like "Teaching Hospital Jaffna" vs "Jaffna Teaching Hospital")
    const tokensA = new Set(nameA.split(' ').filter(w => w.length > 2));
    const tokensB = new Set(nameB.split(' ').filter(w => w.length > 2));
    let commonTokens = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) commonTokens++;
    }
    const tokenOverlap = commonTokens / Math.min(tokensA.size, tokensB.size || 1);

    // 2. Spatial proximity check
    if (a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null) {
      const distKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);

      // Within 300 meters and similar name or token overlap -> Strong match
      if (distKm <= 0.3 && (isExactName || isSubstring || tokenOverlap >= 0.5)) {
        return true;
      }

      // Within 600 meters and high token overlap -> Match
      if (distKm <= 0.6 && (isExactName || tokenOverlap >= 0.65)) {
        return true;
      }

      // If more than 1.5 km apart, cannot be the same physical facility even if chain name matches
      if (distKm > 1.5) {
        return false;
      }
    }

    // 3. Fallback: Phone number match (Very high confidence)
    if (a.phone && b.phone && a.phone !== 'Not listed' && b.phone !== 'Not listed') {
      const cleanPhoneA = a.phone.replace(/[^0-9]/g, '');
      const cleanPhoneB = b.phone.replace(/[^0-9]/g, '');
      if (cleanPhoneA.length >= 7 && cleanPhoneB.length >= 7 && (cleanPhoneA === cleanPhoneB || cleanPhoneA.endsWith(cleanPhoneB) || cleanPhoneB.endsWith(cleanPhoneA))) {
        return true;
      }
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
