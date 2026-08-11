import { AiService } from './ai.service.js';

/**
 * Valid care-type categories recognized by the MedAI Round 2 Care Intelligence Engine.
 */
export const VALID_CARE_TYPES = ['primary_care', 'specialist', 'pharmacist', 'urgent_care'];

/**
 * SpecialtyService
 * 
 * AI-native clinical care navigation and specialty triage service.
 * Translates structured clinical findings and longitudinal evidence into
 * recommended specialties, care categories, confidence scores, alternatives,
 * and clinical rationales.
 * 
 * Enforces strict deterministic boundaries outside the LLM:
 * - Never diagnoses
 * - Clamps confidence scores to [0.0, 1.0]
 * - Enforces allowed care-type taxonomy
 * - Provides graceful, deterministic fallbacks to General Practice / Internal Medicine
 *   for ambiguous findings, sparse evidence, or external LLM API outages.
 */
export class SpecialtyService {

  /**
   * Evaluates whether the clinical finding context is too sparse to warrant narrow AI specialty inference.
   * 
   * @param {Object} context - Clinical finding context
   * @returns {boolean} True if context is insufficient
   */
  static isInsufficientContext(context) {
    if (!context || typeof context !== 'object') return true;
    
    const hasSummary = context.clinicalSummary && typeof context.clinicalSummary === 'string' && context.clinicalSummary.trim().length > 5;
    const hasDescription = context.description && typeof context.description === 'string' && context.description.trim().length > 5;
    const hasIssueType = context.issueType && typeof context.issueType === 'string' && context.issueType.trim().length > 0;
    const hasEvidence = Array.isArray(context.evidence) ? context.evidence.length > 0 : (typeof context.evidence === 'string' && context.evidence.trim().length > 0);
    const hasMeds = Array.isArray(context.relevantMedications) && context.relevantMedications.length > 0;
    const hasLabs = Array.isArray(context.relevantLabTrends) && context.relevantLabTrends.length > 0;

    return !(hasSummary || hasDescription || hasIssueType || hasEvidence || hasMeds || hasLabs);
  }

  /**
   * Deterministic safe fallback response when evidence is sparse or LLM reasoning is unavailable.
   * 
   * @param {Object} context - Original finding context
   * @param {string} reasonNote - Rationale for fallback
   * @returns {Object} Standardized structured fallback recommendation
   */
  static createSafeFallback(context = {}, reasonNote = 'Baseline primary care evaluation is recommended.') {
    let basis = ['Clinical history requires professional medical review.'];
    if (context.evidence) {
      if (Array.isArray(context.evidence) && context.evidence.length > 0) {
        basis = context.evidence.map(e => String(e));
      } else if (typeof context.evidence === 'string' && context.evidence.trim()) {
        basis = [context.evidence.trim()];
      }
    } else if (context.description || context.clinicalSummary) {
      basis = [context.description || context.clinicalSummary];
    }

    return {
      recommendedSpecialty: 'General Practice',
      careType: 'primary_care',
      reason: 'A general clinical evaluation is recommended to assess the documented findings and determine if specialist referral or prescription adjustment is necessary.',
      confidence: 0.70,
      alternativeSpecialties: [
        {
          specialty: 'Internal Medicine',
          confidence: 0.65,
          rationale: 'Comprehensive adult health and multi-system medical review.'
        }
      ],
      clinicalBasis: basis,
      uncertainty: true,
      fallbackApplied: true,
      fallbackReason: reasonNote
    };
  }

  /**
   * Sanitizes and validates the structured output from the AI reasoner,
   * enforcing strict deterministic constraints, schema compliance, and boundary checks.
   * 
   * @param {Object} rawOutput - Raw parsed JSON from LLM
   * @param {Object} originalContext - Input finding context
   * @returns {Object} Validated, normalized specialty recommendation
   */
  static sanitizeReasoningOutput(rawOutput, originalContext = {}) {
    if (!rawOutput || typeof rawOutput !== 'object') {
      return this.createSafeFallback(originalContext, 'Malformed AI output structure.');
    }

    // 1. Specialty Name
    let recommendedSpecialty = 'General Practice';
    if (rawOutput.recommendedSpecialty && typeof rawOutput.recommendedSpecialty === 'string' && rawOutput.recommendedSpecialty.trim()) {
      recommendedSpecialty = rawOutput.recommendedSpecialty.trim();
    }

    // 2. Care Type
    let careType = 'primary_care';
    if (rawOutput.careType && typeof rawOutput.careType === 'string') {
      const normalizedCareType = rawOutput.careType.toLowerCase().trim();
      if (VALID_CARE_TYPES.includes(normalizedCareType)) {
        careType = normalizedCareType;
      }
    }

    // 3. Reason
    let reason = 'Professional clinical review is recommended based on documented patient history.';
    if (rawOutput.reason && typeof rawOutput.reason === 'string' && rawOutput.reason.trim()) {
      reason = rawOutput.reason.trim();
    }

    // 4. Confidence (0.0 to 1.0)
    let confidence = 0.75;
    if (typeof rawOutput.confidence === 'number' && !isNaN(rawOutput.confidence)) {
      let c = rawOutput.confidence;
      // If LLM returns 0-100 scale, normalize to 0.0-1.0
      if (c > 1.0 && c <= 100.0) {
        c = c / 100.0;
      }
      confidence = Math.max(0.0, Math.min(1.0, parseFloat(c.toFixed(2))));
    }

    // 5. Alternative Specialties
    let alternativeSpecialties = [];
    if (Array.isArray(rawOutput.alternativeSpecialties)) {
      alternativeSpecialties = rawOutput.alternativeSpecialties
        .filter(alt => alt && typeof alt === 'object' && alt.specialty && typeof alt.specialty === 'string')
        .map(alt => {
          let altConf = 0.60;
          if (typeof alt.confidence === 'number' && !isNaN(alt.confidence)) {
            let ac = alt.confidence;
            if (ac > 1.0 && ac <= 100.0) ac = ac / 100.0;
            altConf = Math.max(0.0, Math.min(1.0, parseFloat(ac.toFixed(2))));
          }
          return {
            specialty: alt.specialty.trim(),
            confidence: altConf,
            rationale: typeof alt.rationale === 'string' ? alt.rationale.trim() : 'Viable alternative clinical care pathway.'
          };
        });
    }

    // 6. Clinical Basis
    let clinicalBasis = [];
    if (Array.isArray(rawOutput.clinicalBasis) && rawOutput.clinicalBasis.length > 0) {
      clinicalBasis = rawOutput.clinicalBasis
        .filter(item => item && (typeof item === 'string' || typeof item === 'number'))
        .map(item => String(item).trim());
    } else if (originalContext.evidence) {
      clinicalBasis = Array.isArray(originalContext.evidence) 
        ? originalContext.evidence.map(String) 
        : [String(originalContext.evidence)];
    } else if (originalContext.description || originalContext.clinicalSummary) {
      clinicalBasis = [originalContext.description || originalContext.clinicalSummary];
    } else {
      clinicalBasis = ['Clinical finding identified across uploaded patient records.'];
    }

    // 7. Uncertainty flag
    let uncertainty = Boolean(rawOutput.uncertainty);
    if (confidence < 0.75) {
      uncertainty = true;
    }

    // Enforce inclusion of primary care / general medicine in alternatives if uncertain or specialist
    const hasGeneralAlt = alternativeSpecialties.some(alt => 
      alt.specialty.toLowerCase().includes('general') || 
      alt.specialty.toLowerCase().includes('internal') ||
      alt.specialty.toLowerCase().includes('primary')
    );

    if ((careType === 'specialist' || uncertainty) && recommendedSpecialty.toLowerCase() !== 'general practice' && !hasGeneralAlt) {
      alternativeSpecialties.push({
        specialty: 'Internal Medicine',
        confidence: Math.max(0.50, parseFloat((confidence * 0.85).toFixed(2))),
        rationale: 'Primary clinical assessment to verify multi-system stability.'
      });
    }

    return {
      recommendedSpecialty,
      careType,
      reason,
      confidence,
      alternativeSpecialties,
      clinicalBasis,
      uncertainty,
      fallbackApplied: false
    };
  }

  /**
   * Main entry point: Evaluates a structured clinical finding and determines the appropriate
   * healthcare specialty, care type, confidence, and explainable rationale.
   * 
   * @param {Object} findingContext - Structured clinical finding & context
   * @returns {Promise<Object>} Validated specialty recommendation
   */
  static async determineSpecialty(findingContext) {
    // 1. Check for sparse / empty context
    if (this.isInsufficientContext(findingContext)) {
      console.warn('[SpecialtyService] Finding context is insufficient for narrow specialty triage. Returning safe General Practice baseline.');
      return this.createSafeFallback(findingContext, 'Insufficient clinical evidence in finding context.');
    }

    // 2. Anonymize and prepare payload for AI reasoning
    const reasoningPayload = {
      issueType: findingContext.issueType || findingContext.insight_type || 'clinical_concern',
      riskLevel: findingContext.riskLevel || findingContext.risk_level || 'moderate',
      confidence: findingContext.confidence || findingContext.confidence_score || null,
      clinicalSummary: findingContext.clinicalSummary || findingContext.description || '',
      evidence: findingContext.evidence || null,
      relevantMedications: findingContext.relevantMedications || findingContext.medications || [],
      relevantLabTrends: findingContext.relevantLabTrends || findingContext.lab_results || [],
      symptoms: findingContext.symptoms || null,
      patientContext: {
        age: findingContext.patientAge || findingContext.age || null,
        gender: findingContext.patientGender || findingContext.gender || null
      }
    };

    // 3. Invoke AI specialty reasoner with safety boundary
    try {
      const rawAiResult = await AiService.reasonCareSpecialty(reasoningPayload);
      const validatedResult = this.sanitizeReasoningOutput(rawAiResult, findingContext);
      
      console.log(`[SpecialtyService] Specialty reasoning completed: "${validatedResult.recommendedSpecialty}" (${validatedResult.careType}, conf: ${validatedResult.confidence}).`);
      return validatedResult;
    } catch (error) {
      console.error('[SpecialtyService Error] AI specialty reasoning failed. Activating deterministic fallback:', error.message);
      return this.createSafeFallback(findingContext, `AI reasoner error: ${error.message}`);
    }
  }

  /**
   * Helper utility to assemble finding context from an ai_insights database record,
   * associated patient demographics, and recent medical events.
   * 
   * @param {Object} insight - Record from ai_insights table
   * @param {Object} patient - Record from patients table
   * @param {Array<Object>} events - Array of medical_events records
   * @returns {Object} Structured finding context ready for determineSpecialty()
   */
  static buildContextFromInsight(insight, patient = {}, events = []) {
    if (!insight) return {};

    // Extract recent medications and lab trends from events if available
    const medications = [];
    const labResults = [];
    const symptoms = [];

    if (Array.isArray(events)) {
      events.forEach(evt => {
        if (evt.symptoms) symptoms.push(evt.symptoms);
        if (Array.isArray(evt.medications)) {
          evt.medications.forEach(m => {
            if (m.medicine_name) medications.push(`${m.medicine_name} (${m.dosage || 'dosage unlisted'})`);
          });
        }
        if (Array.isArray(evt.lab_results)) {
          evt.lab_results.forEach(lr => {
            if (lr.test_name) labResults.push(`${lr.test_name}: ${lr.value || ''} ${lr.unit || ''}`);
          });
        }
      });
    }

    return {
      issueType: insight.insight_type,
      riskLevel: (insight.confidence_score && insight.confidence_score > 85) ? 'high' : 'moderate',
      confidence: insight.confidence_score ? (insight.confidence_score / 100) : 0.85,
      clinicalSummary: insight.description,
      evidence: insight.evidence,
      relevantMedications: [...new Set(medications)].slice(0, 10),
      relevantLabTrends: [...new Set(labResults)].slice(0, 10),
      symptoms: symptoms.join('; ') || null,
      patientAge: patient.age || null,
      patientGender: patient.gender || null
    };
  }
}

export default SpecialtyService;
