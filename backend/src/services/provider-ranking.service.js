import { AiService } from './ai.service.js';

/**
 * ProviderRankingService
 * 
 * Multi-Factor Deterministic & AI-Native Recommendation Ranking Engine.
 * 
 * Explanation Hierarchy:
 * 1. Direct Specialty Match -> "Specialized facility aligned with [Specialty] care."
 * 2. Pharmacy / Pharmacist Care -> "Licensed pharmacy for prescription review and medication consultation."
 * 3. Urgent Care -> "Full-service acute hospital / Walk-in clinic for prompt evaluation."
 * 4. Alternative Specialty Match -> "Alternative care pathway aligned with [Alt Specialty]."
 * 5. General / Primary Care Fallback -> "General medical clinic / hospital suitable for initial assessment and referral."
 */

// Fallback keyword taxonomy for deterministic safety floor
const FALLBACK_SPECIALTY_KEYWORDS = {
  cardiology: ['cardio', 'heart', 'cardiac', 'coronary', 'vascular', 'hypertension', 'ecg', 'cardiovascular'],
  endocrinology: ['endocrine', 'diabetes', 'diabetic', 'thyroid', 'glucose', 'metabolism', 'hormone', 'insulin'],
  nephrology: ['nephro', 'kidney', 'renal', 'dialysis', 'creatinine', 'urology', 'urinary'],
  gastroenterology: ['gastro', 'liver', 'hepat', 'digest', 'stomach', 'endoscopy', 'gi'],
  pulmonology: ['pulmo', 'chest', 'lung', 'respiratory', 'asthma', 'breathing', 'tb'],
  neurology: ['neuro', 'brain', 'nerve', 'stroke', 'spine', 'headache'],
  pharmacology: ['pharmacy', 'chemist', 'pharmacist', 'dispensary', 'drug', 'medicine', 'apothecary'],
  oncology: ['onco', 'cancer', 'tumor', 'radiation', 'chemo', 'hematology'],
  pediatrics: ['pediatric', 'child', 'baby', 'maternity', 'infant'],
  orthopedics: ['ortho', 'bone', 'joint', 'fracture', 'trauma'],
  dermatology: ['derma', 'skin', 'laser'],
  general: ['general practice', 'family practice', 'family medicine', 'general physician', 'primary physician', 'family doctor']
};

export class ProviderRankingService {

  /**
   * Deterministic fallback heuristic for specialty relevance scoring.
   * Accurately distinguishes between direct specialty focus, care-type alignment, alternative pathways, and general facility fallbacks.
   * 
   * @param {Object} provider
   * @param {string} recommendedSpecialty
   * @param {Array<Object>} alternativeSpecialties
   * @param {string} careType
   * @returns {Object} { score: number, rationale: string }
   */
  static evaluateSpecialtyRelevanceHeuristic(provider, recommendedSpecialty = 'General Practice', alternativeSpecialties = [], careType = 'primary_care') {
    const provName = (provider.name || '').toLowerCase();
    const provCategory = (provider.category || '').toLowerCase();
    const provSpecialty = (provider.specialty || '').toLowerCase();
    const facilityType = provider.facilityType || 'healthcare_facility';

    const targetSpecClean = (recommendedSpecialty || 'General Practice').toLowerCase();
    const isTargetGeneral = targetSpecClean.includes('general') || targetSpecClean.includes('family') || targetSpecClean.includes('primary');

    // 1. Direct Care Type: Pharmacist Specifics
    if (careType === 'pharmacist') {
      if (facilityType === 'pharmacy' || provName.includes('pharmacy') || provName.includes('chemist') || provName.includes('dispensary') || provName.includes('pharmaceutical')) {
        return {
          score: 38,
          rationale: 'Licensed pharmacy for prescription review and medication consultation.'
        };
      }
      if (facilityType === 'hospital' || facilityType === 'clinic') {
        return {
          score: 32,
          rationale: 'Healthcare facility with on-site pharmacy and prescribing clinicians.'
        };
      }
    }

    // 2. Direct Specialty tag or category match (38 - 40 pts)
    if (provSpecialty && provSpecialty.includes(targetSpecClean)) {
      return {
        score: 40,
        rationale: `Specialized facility aligned with ${recommendedSpecialty} care.`
      };
    }

    // 3. Keyword cluster match for recommended specialty
    let targetKeywords = [];
    for (const [key, words] of Object.entries(FALLBACK_SPECIALTY_KEYWORDS)) {
      if (targetSpecClean.includes(key)) {
        targetKeywords = words;
        break;
      }
    }
    if (targetKeywords.length === 0) {
      targetKeywords = targetSpecClean.split(/[\s-]+/).filter(w => w.length > 3);
    }

    const matchesTargetSpecialty = targetKeywords.some(kw => provName.includes(kw) || provCategory.includes(kw));
    if (matchesTargetSpecialty) {
      return {
        score: 38,
        rationale: `Specialized facility aligned with ${recommendedSpecialty} care.`
      };
    }

    // 4. Urgent Care Type Handling
    if (careType === 'urgent_care') {
      if (facilityType === 'hospital' || provName.includes('base hospital') || provName.includes('teaching hospital') || provName.includes('general hospital')) {
        return {
          score: 39,
          rationale: 'Full-service acute hospital equipped for urgent clinical stabilization.'
        };
      }
      if (facilityType === 'clinic') {
        return {
          score: 30,
          rationale: 'Walk-in medical clinic for prompt outpatient evaluation.'
        };
      }
    }

    // 5. Match against Specific Alternative Specialties (excluding generic fallbacks)
    if (Array.isArray(alternativeSpecialties)) {
      for (const altObj of alternativeSpecialties) {
        const altName = (altObj.specialty || '').trim();
        const altClean = altName.toLowerCase();
        
        if (altClean.includes('general') || altClean.includes('family') || altClean.includes('primary')) {
          continue;
        }

        let altKeywords = [];
        for (const [key, words] of Object.entries(FALLBACK_SPECIALTY_KEYWORDS)) {
          if (altClean.includes(key)) {
            altKeywords = words;
            break;
          }
        }
        if (altKeywords.length === 0) altKeywords = altClean.split(/[\s-]+/).filter(w => w.length > 3);

        const matchesAlt = altKeywords.some(kw => provName.includes(kw) || provCategory.includes(kw));
        if (matchesAlt) {
          return {
            score: 32,
            rationale: `Alternative care pathway aligned with ${altName}.`
          };
        }
      }
    }

    // 6. Target is Primary Care / General Practice
    if (isTargetGeneral) {
      if (facilityType === 'clinic' || facilityType === 'doctors') {
        return {
          score: 34,
          rationale: 'Primary care clinic suited for initial general medical evaluation.'
        };
      }
      if (facilityType === 'hospital') {
        return {
          score: 32,
          rationale: 'Comprehensive hospital facility offering general outpatient consultations.'
        };
      }
    }

    // 7. General Hospital Multidisciplinary Baseline (When unspecialized)
    if (facilityType === 'hospital' || provName.includes('hospital') || provName.includes('nursing home')) {
      return {
        score: 30,
        rationale: 'Comprehensive hospital facility suitable for multidisciplinary assessment and referral.'
      };
    }

    // 8. General Medical Clinic Baseline (When unspecialized)
    if (facilityType === 'clinic' || facilityType === 'doctors' || provName.includes('clinic') || provName.includes('center') || provName.includes('centre')) {
      return {
        score: 25,
        rationale: 'General medical clinic suitable for initial assessment and referral.'
      };
    }

    // 9. Baseline Healthcare Facility
    return {
      score: 18,
      rationale: 'General medical facility suitable for initial assessment and referral.'
    };
  }

  /**
   * Evaluates proximity score (0 - 30 pts) using continuous distance decay.
   * 
   * @param {number|null} distanceKm - Distance in kilometers
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Object} { score: number, rationale: string }
   */
  static evaluateDistanceScore(distanceKm, radiusKm = 25) {
    if (distanceKm == null || isNaN(distanceKm)) {
      return {
        score: 15,
        rationale: 'Located within selected search region.'
      };
    }

    const rad = Math.max(1, radiusKm);
    const clampedDist = Math.min(distanceKm, rad);
    
    // Linear decay score from 30 points at 0km down to 5 points at edge of radius
    const rawScore = 30 * (1 - (clampedDist / rad) * 0.83);
    const score = Math.max(5, Math.min(30, parseFloat(rawScore.toFixed(1))));

    let rationale = `${distanceKm} km away`;
    if (distanceKm < 1.0) {
      rationale = `Very close: ${Math.round(distanceKm * 1000)} meters away`;
    } else if (distanceKm <= 5.0) {
      rationale = `Nearby: ${distanceKm} km from location`;
    } else {
      rationale = `${distanceKm} km from selected location`;
    }

    return {
      score,
      rationale
    };
  }

  /**
   * Evaluates reputation and rating signals (0 - 15 pts).
   * Strictly avoids fabricating ratings.
   * 
   * @param {Object} provider
   * @returns {Object} { score: number, rationale: string }
   */
  static evaluateReputationScore(provider) {
    if (typeof provider.rating === 'number' && provider.rating > 0) {
      const ratingPts = (Math.min(5.0, provider.rating) / 5.0) * 10; // Up to 10 pts
      const reviewPts = typeof provider.reviewCount === 'number' 
        ? Math.min(5, Math.log10(provider.reviewCount + 1) * 2.5) // Up to 5 pts
        : 2.0;

      const totalRepScore = parseFloat((ratingPts + reviewPts).toFixed(1));
      return {
        score: Math.min(15, totalRepScore),
        rationale: `Public rating: ${provider.rating} ★ (${provider.reviewCount || 0} reviews)`
      };
    }

    // Neutral baseline for unrated public directories (8.0 / 15)
    return {
      score: 8.0,
      rationale: 'Verified public healthcare directory listing'
    };
  }

  /**
   * Evaluates data completeness & contact readiness (0 - 10 pts).
   * 
   * @param {Object} provider
   * @returns {Object} { score: number, rationale: string }
   */
  static evaluateDataCompleteness(provider) {
    let score = 0;
    let details = [];

    if (provider.name && provider.name.trim().length > 2) {
      score += 2.5;
    }

    if (provider.address && provider.address.trim().length > 5) {
      score += 2.5;
      details.push('Address listed');
    }

    if (provider.phone && provider.phone.trim().length > 3) {
      score += 2.5;
      details.push('Phone available');
    }

    if (provider.mapUrl || (provider.latitude && provider.longitude)) {
      score += 2.5;
      details.push('Direct map navigation');
    }

    return {
      score: parseFloat(score.toFixed(1)),
      rationale: details.length > 0 ? details.join(' • ') : 'Verified facility listing'
    };
  }

  /**
   * Evaluates alignment with user availability preference (0 - 5 pts)
   * explicitly framed as facility capability ("Likely suitable for your preference")
   * without falsely implying live appointment booking.
   * 
   * @param {Object} provider
   * @param {string} availabilityPreference - 'this_week', 'today', 'evenings', 'weekends', 'flexible'
   * @returns {Object} { score: number, rationale: string }
   */
  static evaluateAvailabilityAlignment(provider, availabilityPreference = 'this_week') {
    const facilityType = provider.facilityType || 'healthcare_facility';
    const pref = (availabilityPreference || 'this_week').toLowerCase();

    if (facilityType === 'hospital') {
      if (pref === 'today' || pref === 'evenings' || pref === 'weekends') {
        return {
          score: 5.0,
          rationale: 'Likely suitable for your preference: Full-service hospital with 24/7 or acute capability (contact facility to confirm specific doctor schedules).'
        };
      }
      return {
        score: 4.5,
        rationale: 'Likely suitable for your preference: Facility offers daily scheduled outpatient clinics (contact facility to confirm consultation days).'
      };
    }

    if (facilityType === 'pharmacy') {
      return {
        score: 4.0,
        rationale: 'Likely suitable for your preference: Retail dispensary standard operating hours.'
      };
    }

    // Standard clinics
    return {
      score: 3.5,
      rationale: 'Preference alignment: Outpatient medical clinic (contact facility to confirm consultation times).'
    };
  }

  /**
   * Main ranking function: Evaluates, scores, and sorts candidate providers using
   * AI-native semantic matching with deterministic fallback and multi-criteria scoring.
   * 
   * @param {Array<Object>} providers - Array of normalized real provider records
   * @param {Object} recommendationContext - Context containing AI specialty, careType, and alternatives
   * @param {Object} options - Search options (radiusKm, availabilityPreference, skipAiSemantic)
   * @returns {Promise<Array<Object>>} Ranked provider list with totalScore, breakdown, and explanations
   */
  static async rankProviders(providers = [], recommendationContext = {}, options = {}) {
    if (!Array.isArray(providers) || providers.length === 0) {
      return [];
    }

    const { recommendedSpecialty = 'General Practice', alternativeSpecialties = [], careType = 'primary_care' } = recommendationContext;
    const { radiusKm = 25, availabilityPreference = 'this_week', skipAiSemantic = false } = options;

    // 1. Batch AI Semantic Specialty Matching (with deterministic fallback)
    const semanticMap = new Map();

    if (!skipAiSemantic && providers.length > 0) {
      try {
        const candidateSlice = providers.slice(0, 30);
        const aiMatches = await AiService.matchProviderSpecialtiesSemantic(
          recommendedSpecialty,
          careType,
          candidateSlice
        );

        if (Array.isArray(aiMatches)) {
          aiMatches.forEach(m => {
            if (m && m.id && typeof m.score === 'number') {
              semanticMap.set(m.id, {
                score: Math.max(15, Math.min(40, parseFloat(m.score.toFixed(1)))),
                rationale: m.rationale || `Evaluated for ${recommendedSpecialty}.`
              });
            }
          });
        }
      } catch (aiErr) {
        console.warn('[ProviderRankingService] AI semantic batch matching failed, using deterministic fallback floor:', aiErr.message);
      }
    }

    // 2. Score all providers across all 5 dimensions
    const scoredProviders = providers.map(provider => {
      // 1. Specialty Score (0 - 40 pts): AI semantic score if available, else deterministic heuristic
      let specialtyEval = semanticMap.get(provider.id);
      if (!specialtyEval) {
        specialtyEval = this.evaluateSpecialtyRelevanceHeuristic(provider, recommendedSpecialty, alternativeSpecialties, careType);
      }

      // 2. Distance Score (0 - 30 pts)
      const distanceEval = this.evaluateDistanceScore(provider.distanceKm, radiusKm);

      // 3. Reputation Score (0 - 15 pts)
      const reputationEval = this.evaluateReputationScore(provider);

      // 4. Data Completeness (0 - 10 pts)
      const completenessEval = this.evaluateDataCompleteness(provider);

      // 5. Availability Alignment (0 - 5 pts)
      const availabilityEval = this.evaluateAvailabilityAlignment(provider, availabilityPreference);

      // Total Score (0 - 100)
      const totalScore = parseFloat(
        (specialtyEval.score + distanceEval.score + reputationEval.score + completenessEval.score + availabilityEval.score).toFixed(1)
      );

      // Collect concise explainable match bullet points
      const matchReasons = [
        specialtyEval.rationale,
        distanceEval.rationale,
        availabilityEval.rationale
      ];
      if (provider.phone) matchReasons.push(`Phone: ${provider.phone}`);
      if (provider.rating) matchReasons.push(`Rating: ${provider.rating} ★`);

      return {
        ...provider,
        ranking: {
          totalScore,
          matchScorePercent: Math.round(totalScore),
          scoreBreakdown: {
            specialtyScore: specialtyEval.score,
            distanceScore: distanceEval.score,
            reputationScore: reputationEval.score,
            completenessScore: completenessEval.score,
            availabilityScore: availabilityEval.score
          },
          matchReasons,
          primaryExplanation: specialtyEval.rationale
        }
      };
    });

    // 3. Sort descending by totalScore, breaking ties with closer distanceKm
    scoredProviders.sort((a, b) => {
      if (b.ranking.totalScore !== a.ranking.totalScore) {
        return b.ranking.totalScore - a.ranking.totalScore;
      }
      return (a.distanceKm || 999) - (b.distanceKm || 999);
    });

    // 4. Assign integer rank positions (1, 2, 3...)
    return scoredProviders.map((prov, index) => ({
      ...prov,
      rank: index + 1
    }));
  }
}

export default ProviderRankingService;
