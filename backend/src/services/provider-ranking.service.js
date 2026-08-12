import { AiService } from './ai.service.js';

// Keyword taxonomy for deterministic specialty relevance scoring
const FALLBACK_SPECIALTY_KEYWORDS = {
  cardio: ['heart', 'cardiac', 'cardio', 'hypertension', 'ecg', 'coronary', 'cardiology'],
  endo: ['diabetes', 'endocrine', 'hormone', 'thyroid', 'glycemic', 'endocrinology'],
  neuro: ['brain', 'neuro', 'stroke', 'seizure', 'neurology', 'headache', 'spinal'],
  nephro: ['kidney', 'renal', 'dialysis', 'nephrology', 'creatinine', 'urinary'],
  pulmo: ['lung', 'respiratory', 'chest', 'asthma', 'pulmonary', 'pulmonology', 'cough'],
  gastro: ['digestive', 'gastro', 'stomach', 'liver', 'hepatology', 'endoscopy', 'gastric'],
  ortho: ['bone', 'joint', 'fracture', 'spine', 'orthopedic', 'trauma', 'arthritis'],
  derm: ['skin', 'derma', 'dermatology', 'eczema', 'psoriasis'],
  pharma: ['pharmacy', 'chemist', 'drug', 'dispensary', 'pharmacist', 'prescription', 'medication'],
  general: ['general practice', 'family practice', 'family medicine', 'general physician', 'primary physician', 'family doctor']
};

/**
 * ProviderRankingService
 * 
 * Multi-factor deterministic & AI-native healthcare facility ranking engine.
 * Computes a standardized 0-100 match score across 5 core dimensions:
 * 1. Specialty & Clinical Relevance (0-40 pts)
 * 2. Spatial Proximity & Distance Decay (0-30 pts)
 * 3. Reputation & Patient Feedback (0-15 pts)
 * 4. Facility Completeness & Verifiability (0-10 pts)
 * 5. Availability & Extended Operating Hours (0-5 pts)
 */
export class ProviderRankingService {

  /**
   * Deterministic heuristic for specialty relevance scoring.
   * Accurately scores direct specialty focus, care-type alignment, and general facilities.
   * 
   * @param {Object} provider
   * @param {string|null} recommendedSpecialty
   * @param {Array<Object>} alternativeSpecialties
   * @param {string} careType
   * @returns {Object} { score: number, rationale: string }
   */
  static evaluateSpecialtyRelevanceHeuristic(provider, recommendedSpecialty = null, alternativeSpecialties = [], careType = 'primary_care') {
    const provName = (provider.name || '').toLowerCase();
    const provCategory = (provider.category || '').toLowerCase();
    const provSpecialty = (provider.specialty || '').toLowerCase();
    const facilityType = provider.facilityType || 'healthcare_facility';

    // When no specific AI specialty was inferred (e.g. AI unavailable or general discovery), score by base capability
    if (!recommendedSpecialty) {
      if (facilityType === 'hospital') {
        return {
          score: 30,
          rationale: 'Comprehensive hospital facility offering general outpatient consultations.'
        };
      }
      if (facilityType === 'clinic' || facilityType === 'doctors') {
        return {
          score: 28,
          rationale: 'Primary care clinic suited for general medical evaluation.'
        };
      }
      return {
        score: 20,
        rationale: 'Local verified healthcare provider.'
      };
    }

    const targetSpecClean = recommendedSpecialty.toLowerCase();
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
        rationale: `Clinic name and clinical focus match ${recommendedSpecialty} needs.`
      };
    }

    // 4. Large Hospital Multi-Disciplinary Coverage (for specialist referrals)
    if (careType === 'specialist' && (facilityType === 'hospital' || provName.includes('hospital'))) {
      const isTeachingOrGeneral = provName.includes('teaching') || provName.includes('general') || provName.includes('national') || provName.includes('base') || provName.includes('provincial');
      return {
        score: isTeachingOrGeneral ? 34 : 30,
        rationale: isTeachingOrGeneral 
          ? `Multi-disciplinary referral hospital with comprehensive ${recommendedSpecialty} departments.`
          : `General hospital with multi-specialty outpatient consulting.`
      };
    }

    // 5. Match against Specific Alternative Specialties
    if (Array.isArray(alternativeSpecialties) && alternativeSpecialties.length > 0) {
      for (const alt of alternativeSpecialties) {
        if (!alt || !alt.specialty) continue;
        const altSpecClean = alt.specialty.toLowerCase();
        
        let altKeywords = [];
        for (const [key, words] of Object.entries(FALLBACK_SPECIALTY_KEYWORDS)) {
          if (altSpecClean.includes(key)) {
            altKeywords = words;
            break;
          }
        }
        if (altKeywords.length === 0) {
          altKeywords = altSpecClean.split(/[\s-]+/).filter(w => w.length > 3);
        }

        const matchesAlt = altKeywords.some(kw => provName.includes(kw) || provCategory.includes(kw));
        if (matchesAlt) {
          return {
            score: 32,
            rationale: `Clinical capability aligned with alternative pathway: ${alt.specialty}.`
          };
        }
      }
    }

    // 6. Target is Primary Care / General Practice
    if (isTargetGeneral) {
      if (facilityType === 'clinic' || facilityType === 'doctors' || provName.includes('clinic') || provName.includes('centre') || provName.includes('center')) {
        return {
          score: 35,
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

    // 7. General baseline for clinics & hospitals
    if (facilityType === 'hospital') {
      return {
        score: 25,
        rationale: 'General hospital with broad diagnostic and medical consulting services.'
      };
    }
    if (facilityType === 'clinic' || facilityType === 'doctors') {
      return {
        score: 22,
        rationale: 'Local medical clinic for outpatient health assessment.'
      };
    }

    return {
      score: 15,
      rationale: 'Local healthcare service provider.'
    };
  }

  /**
   * Distance Decay Function (0 - 30 Points)
   * 
   * @param {number|null} distanceKm
   * @param {number} radiusKm
   * @returns {Object} { score: number, breakdown: string }
   */
  static evaluateDistanceScore(distanceKm, radiusKm = 25) {
    if (distanceKm == null || isNaN(distanceKm)) {
      return { score: 15, breakdown: 'Distance unlisted (central city default: 15.0/30)' };
    }

    const dist = Math.max(0, distanceKm);
    let score = 0;

    if (dist <= 1.0) {
      score = 30.0;
    } else if (dist <= 3.0) {
      score = 30.0 - (dist - 1.0) * 1.5; // 30.0 -> 27.0
    } else if (dist <= 5.0) {
      score = 27.0 - (dist - 3.0) * 1.5; // 27.0 -> 24.0
    } else if (dist <= 10.0) {
      score = 24.0 - (dist - 5.0) * 1.2; // 24.0 -> 18.0
    } else if (dist <= 20.0) {
      score = 18.0 - (dist - 10.0) * 0.8; // 18.0 -> 10.0
    } else if (dist <= radiusKm) {
      const remainingRange = Math.max(1, radiusKm - 20);
      score = 10.0 - ((dist - 20.0) / remainingRange) * 6.0; // 10.0 -> 4.0
    } else {
      score = Math.max(0, 4.0 - (dist - radiusKm) * 0.5);
    }

    score = Math.max(0.0, Math.min(30.0, parseFloat(score.toFixed(1))));
    return {
      score,
      breakdown: `${dist.toFixed(1)} km away (${score.toFixed(1)}/30 pts)`
    };
  }

  /**
   * Reputation & Patient Feedback Score (0 - 15 Points)
   * 
   * @param {number|null} rating
   * @param {number|null} reviewCount
   * @returns {Object} { score: number, breakdown: string }
   */
  static evaluateReputationScore(rating, reviewCount) {
    if (typeof rating !== 'number' || isNaN(rating) || rating <= 0) {
      return {
        score: 7.5,
        breakdown: 'Unrated in public directory (neutral baseline: 7.5/15 pts)'
      };
    }

    const clampedRating = Math.max(1.0, Math.min(5.0, rating));
    let baseScore = (clampedRating / 5.0) * 12.0;

    let reviewBonus = 0;
    const count = typeof reviewCount === 'number' ? reviewCount : 0;
    if (count >= 100) {
      reviewBonus = 3.0;
    } else if (count >= 30) {
      reviewBonus = 2.0;
    } else if (count >= 5) {
      reviewBonus = 1.0;
    } else if (count > 0) {
      reviewBonus = 0.5;
    }

    const score = Math.min(15.0, parseFloat((baseScore + reviewBonus).toFixed(1)));
    return {
      score,
      breakdown: `${clampedRating.toFixed(1)}★ (${count} reviews: ${score.toFixed(1)}/15 pts)`
    };
  }

  /**
   * Facility Completeness & Verifiability Score (0 - 10 Points)
   * 
   * @param {Object} provider
   * @returns {Object} { score: number, breakdown: string }
   */
  static evaluateCompletenessScore(provider) {
    let score = 0;
    const items = [];

    // Verified Address (+3 pts)
    if (provider.address && provider.address !== 'Address not listed' && provider.address.length > 5) {
      score += 3.0;
      items.push('Address');
    }

    // Verified Phone (+3 pts)
    if (provider.phone && provider.phone !== 'Not listed' && provider.phone.length > 6) {
      score += 3.0;
      items.push('Phone');
    }

    // GPS Geolocation (+2 pts)
    if (provider.latitude != null && provider.longitude != null) {
      score += 2.0;
      items.push('GPS');
    }

    // Official Authority Verification / Website (+2 pts)
    if (provider.governmentVerification || (provider.website && provider.website.startsWith('http'))) {
      score += 2.0;
      items.push(provider.governmentVerification ? 'MOH Verified' : 'Website');
    }

    return {
      score: Math.min(10.0, score),
      breakdown: `Verified: ${items.join(', ')} (${score}/10 pts)`
    };
  }

  /**
   * Availability & Operating Hours Score (0 - 5 Points)
   * 
   * @param {Object} provider
   * @param {string} userPreference
   * @returns {Object} { score: number, breakdown: string }
   */
  static evaluateAvailabilityScore(provider, userPreference = 'this_week') {
    const is24_7 = provider.emergencyCapable || provider.openingHours === '24/7' || (typeof provider.name === 'string' && (provider.name.toLowerCase().includes('teaching') || provider.name.toLowerCase().includes('national') || provider.name.toLowerCase().includes('general hospital')));

    let score = 3.0;
    let breakdown = 'Standard clinic outpatient operating schedule (3.0/5)';

    if (is24_7) {
      score = 5.0;
      breakdown = '24/7 Emergency & Outpatient Admissions available (5.0/5)';
    } else if (userPreference === 'today' || userPreference === 'urgent') {
      score = is24_7 ? 5.0 : 2.5;
      breakdown = is24_7 ? 'Immediate urgent walk-in available (5.0/5)' : 'Outpatient consultation queue (2.5/5)';
    }

    return { score, breakdown };
  }

  /**
   * Ranks an array of providers based on 5-factor scoring and semantic relevance.
   * 
   * @param {Array<Object>} providers - Raw unified provider records
   * @param {Object} recommendationContext - Finding & triage output
   * @param {Object} options - Search options
   * @returns {Promise<Array<Object>>} Sorted and ranked provider records with detailed scores
   */
  static async rankProviders(providers = [], recommendationContext = {}, options = {}) {
    if (!Array.isArray(providers) || providers.length === 0) {
      return [];
    }

    const { recommendedSpecialty = null, alternativeSpecialties = [], careType = 'all' } = recommendationContext;
    const { radiusKm = 25, availabilityPreference = 'this_week', skipAiSemantic = false } = options;

    // 1. Batch AI Semantic Specialty Matching (only if AI recommended a specialty and is configured)
    let aiRelevanceMap = new Map();
    if (!skipAiSemantic && recommendedSpecialty && AiService.isConfigured && AiService.isConfigured()) {
      try {
        const batchPayload = providers.slice(0, 15).map(p => ({
          id: p.id,
          name: p.name,
          category: p.category || p.facilityType,
          specialty: p.specialty || null,
          address: p.address || null
        }));

        const semanticMatches = await AiService.matchSpecialtyProvidersBatch({
          targetSpecialty: recommendedSpecialty,
          careType,
          providers: batchPayload
        });

        if (Array.isArray(semanticMatches)) {
          semanticMatches.forEach(match => {
            if (match && match.id) {
              aiRelevanceMap.set(match.id, match);
            }
          });
        }
      } catch (aiErr) {
        console.warn('[ProviderRankingService] AI semantic batch matching skipped:', aiErr.message);
      }
    }

    // 2. Score each provider across the 5 dimensions
    const scoredProviders = providers.map(prov => {
      // Dimension 1: Specialty Relevance (0 - 40 pts)
      let specialtyScore = 0;
      let matchReason = '';

      if (aiRelevanceMap.has(prov.id)) {
        const aiMatch = aiRelevanceMap.get(prov.id);
        specialtyScore = Math.max(0, Math.min(40, typeof aiMatch.specialtyScore === 'number' ? aiMatch.specialtyScore : 30));
        matchReason = aiMatch.matchReason || `Clinical capabilities aligned with ${recommendedSpecialty}.`;
      } else {
        const heuristic = this.evaluateSpecialtyRelevanceHeuristic(
          prov,
          recommendedSpecialty,
          alternativeSpecialties,
          careType
        );
        specialtyScore = heuristic.score;
        matchReason = heuristic.rationale;
      }

      // Dimension 2: Distance Decay (0 - 30 pts)
      const distanceEval = this.evaluateDistanceScore(prov.distanceKm, radiusKm);

      // Dimension 3: Reputation & Feedback (0 - 15 pts)
      const reputationEval = this.evaluateReputationScore(prov.rating, prov.reviewCount);

      // Dimension 4: Completeness & Verification (0 - 10 pts)
      const completenessEval = this.evaluateCompletenessScore(prov);

      // Dimension 5: Availability (0 - 5 pts)
      const availabilityEval = this.evaluateAvailabilityScore(prov, availabilityPreference);

      const totalScore = parseFloat(
        (specialtyScore + distanceEval.score + reputationEval.score + completenessEval.score + availabilityEval.score).toFixed(1)
      );

      return {
        ...prov,
        ranking: {
          totalScore,
          matchScorePercent: Math.min(100, Math.round((totalScore / 100) * 100)),
          matchReason,
          breakdown: {
            specialty: { score: specialtyScore, max: 40, rationale: matchReason },
            distance: { score: distanceEval.score, max: 30, details: distanceEval.breakdown },
            reputation: { score: reputationEval.score, max: 15, details: reputationEval.breakdown },
            completeness: { score: completenessEval.score, max: 10, details: completenessEval.breakdown },
            availability: { score: availabilityEval.score, max: 5, details: availabilityEval.breakdown }
          },
          scoreBreakdown: {
            specialtyScore,
            distanceScore: distanceEval.score,
            reputationScore: reputationEval.score,
            completenessScore: completenessEval.score,
            availabilityScore: availabilityEval.score
          }
        }
      };
    });

    // 3. Sort descending by total score, secondary sort by distance ascending
    scoredProviders.sort((a, b) => {
      if (b.ranking.totalScore !== a.ranking.totalScore) {
        return b.ranking.totalScore - a.ranking.totalScore;
      }
      const distA = a.distanceKm != null ? a.distanceKm : 999;
      const distB = b.distanceKm != null ? b.distanceKm : 999;
      return distA - distB;
    });

    // 4. Assign rank numbers
    return scoredProviders.map((prov, index) => ({
      ...prov,
      rank: index + 1
    }));
  }
}

export default ProviderRankingService;
