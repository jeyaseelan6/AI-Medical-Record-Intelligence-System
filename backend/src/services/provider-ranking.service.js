import { AiService } from './ai.service.js';

// Keyword taxonomy for clinical specialty relevance matching
const SPECIALTY_KEYWORD_TAXONOMY = {
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
 * Orders real healthcare facilities based on objective factual signals:
 * 1. Specialty & Clinical Relevance Tier (Direct specialty clinic -> Referral hospital -> General clinic)
 * 2. Official Authority Verification (MOH Master Facility List verified status)
 * 3. Physical Distance (Haversine GPS proximity ascending)
 * 
 * Zero-Fabrication / No False Precision:
 * - Does NOT compute or expose arbitrary numerical recommendation percentages (e.g. "87.9/100").
 * - Returns clean, factual healthcare provider information with objective relevance reasons.
 */
export class ProviderRankingService {

  /**
   * Evaluates the clinical relevance tier and explanation for a facility.
   * 
   * @param {Object} provider - Real provider record
   * @param {string|null} recommendedSpecialty - AI Recommended specialty
   * @param {Array<Object>} alternativeSpecialties - Alternative clinical pathways
   * @param {string} careType - Care type category
   * @returns {Object} { relevanceTier: number, matchReason: string }
   */
  static evaluateRelevance(provider, recommendedSpecialty = null, alternativeSpecialties = [], careType = 'primary_care') {
    const provName = (provider.name || '').toLowerCase();
    const provCategory = (provider.category || '').toLowerCase();
    const provSpecialty = (provider.specialty || '').toLowerCase();
    const facilityType = provider.facilityType || 'healthcare_facility';

    // Case 0: General discovery when no narrow AI specialty was inferred
    if (!recommendedSpecialty) {
      if (facilityType === 'hospital') {
        return {
          relevanceTier: 2,
          matchReason: 'Comprehensive hospital facility offering general outpatient consultations.'
        };
      }
      if (facilityType === 'clinic' || facilityType === 'doctors') {
        return {
          relevanceTier: 2,
          matchReason: 'Primary care clinic suited for general medical evaluation.'
        };
      }
      return {
        relevanceTier: 3,
        matchReason: 'Local verified healthcare facility.'
      };
    }

    const targetSpecClean = recommendedSpecialty.toLowerCase();
    const isTargetGeneral = targetSpecClean.includes('general') || targetSpecClean.includes('family') || targetSpecClean.includes('primary');

    // Case 1: Pharmacist care need
    if (careType === 'pharmacist') {
      if (facilityType === 'pharmacy' || provName.includes('pharmacy') || provName.includes('chemist') || provName.includes('dispensary') || provName.includes('pharmaceutical')) {
        return {
          relevanceTier: 1,
          matchReason: 'Licensed pharmacy for prescription review and medication consultation.'
        };
      }
      if (facilityType === 'hospital' || facilityType === 'clinic') {
        return {
          relevanceTier: 2,
          matchReason: 'Healthcare facility with on-site pharmacy and prescribing clinicians.'
        };
      }
    }

    // Case 2: Direct specialty tag or category match
    if (provSpecialty && provSpecialty.includes(targetSpecClean)) {
      return {
        relevanceTier: 1,
        matchReason: `Specialized facility aligned with ${recommendedSpecialty} care.`
      };
    }

    // Case 3: Keyword cluster match for recommended specialty
    let targetKeywords = [];
    for (const [key, words] of Object.entries(SPECIALTY_KEYWORD_TAXONOMY)) {
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
        relevanceTier: 1,
        matchReason: `Clinical focus and facility capabilities match ${recommendedSpecialty} needs.`
      };
    }

    // Case 4: Major Referral & Teaching Hospitals (comprehensive department coverage)
    if (careType === 'specialist' && (facilityType === 'hospital' || provName.includes('hospital'))) {
      const isTeachingOrGeneral = provName.includes('teaching') || provName.includes('general') || provName.includes('national') || provName.includes('base') || provName.includes('provincial');
      return {
        relevanceTier: 2,
        matchReason: isTeachingOrGeneral 
          ? `Multi-disciplinary referral hospital with comprehensive ${recommendedSpecialty} departments.`
          : `General hospital with multi-specialty outpatient consulting.`
      };
    }

    // Case 5: Match against Alternative Specialties
    if (Array.isArray(alternativeSpecialties) && alternativeSpecialties.length > 0) {
      for (const alt of alternativeSpecialties) {
        if (!alt || !alt.specialty) continue;
        const altSpecClean = alt.specialty.toLowerCase();
        
        let altKeywords = [];
        for (const [key, words] of Object.entries(SPECIALTY_KEYWORD_TAXONOMY)) {
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
            relevanceTier: 2,
            matchReason: `Clinical capability aligned with alternative pathway: ${alt.specialty}.`
          };
        }
      }
    }

    // Case 6: Primary care / general medicine target
    if (isTargetGeneral) {
      if (facilityType === 'clinic' || facilityType === 'doctors' || provName.includes('clinic') || provName.includes('centre') || provName.includes('center')) {
        return {
          relevanceTier: 1,
          matchReason: 'Primary care clinic suited for general medical evaluation.'
        };
      }
      if (facilityType === 'hospital') {
        return {
          relevanceTier: 2,
          matchReason: 'Comprehensive hospital facility offering general outpatient consultations.'
        };
      }
    }

    // Case 7: General baseline
    if (facilityType === 'hospital') {
      return {
        relevanceTier: 3,
        matchReason: 'General hospital with broad diagnostic and medical consulting services.'
      };
    }
    if (facilityType === 'clinic' || facilityType === 'doctors') {
      return {
        relevanceTier: 3,
        matchReason: 'Local medical clinic for outpatient health assessment.'
      };
    }

    return {
      relevanceTier: 4,
      matchReason: 'Local healthcare service provider.'
    };
  }

  /**
   * Orders an array of real providers based on factual clinical relevance, government verification, and proximity.
   * 
   * @param {Array<Object>} providers - Raw unified provider records
   * @param {Object} recommendationContext - Finding & triage output
   * @param {Object} options - Search options
   * @returns {Promise<Array<Object>>} Factually ordered provider records
   */
  static async rankProviders(providers = [], recommendationContext = {}, options = {}) {
    if (!Array.isArray(providers) || providers.length === 0) {
      return [];
    }

    const { recommendedSpecialty = null, alternativeSpecialties = [], careType = 'all' } = recommendationContext;

    // 1. Evaluate objective relevance tier and match reason for each provider
    const evaluatedProviders = providers.map(prov => {
      const evalResult = this.evaluateRelevance(
        prov,
        recommendedSpecialty,
        alternativeSpecialties,
        careType
      );

      return {
        ...prov,
        relevanceTier: evalResult.relevanceTier,
        matchReason: evalResult.matchReason
      };
    });

    // 2. Sort by factual signals:
    //    Priority 1: Clinical relevance tier (Tier 1 -> Tier 2 -> Tier 3 -> Tier 4)
    //    Priority 2: Verified Government MOH status (verified first within tier)
    //    Priority 3: Distance in km ascending (closest first)
    evaluatedProviders.sort((a, b) => {
      // 1. Clinical relevance tier
      if (a.relevanceTier !== b.relevanceTier) {
        return a.relevanceTier - b.relevanceTier;
      }

      // 2. Government verification bonus within same tier
      const aGov = a.governmentVerification?.isVerified ? 1 : 0;
      const bGov = b.governmentVerification?.isVerified ? 1 : 0;
      if (bGov !== aGov) {
        return bGov - aGov;
      }

      // 3. Proximity ascending
      const distA = a.distanceKm != null ? a.distanceKm : 999;
      const distB = b.distanceKm != null ? b.distanceKm : 999;
      return distA - distB;
    });

    // 3. Return clean provider records
    return evaluatedProviders;
  }
}

export default ProviderRankingService;
