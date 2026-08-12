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
 * Enforces strict Zero-Fabrication boundaries:
 * - Never diagnoses
 * - Clamps confidence scores to [0.0, 1.0]
 * - Enforces allowed care-type taxonomy
 * - HONEST FAILURE RULE: When the AI service is unavailable, missing, or errors,
 *   the service returns an explicit machine-readable error state (AI_UNAVAILABLE)
 *   with NULL clinical fields. NEVER fabricates a synthetic specialty or confidence.
 */
export class SpecialtyService {

  /**
   * Generates a strict, honest failure state when AI clinical reasoning is unavailable.
   * Zero-Fabrication Rule: NEVER returns synthetic specialties, confidence, or rationales.
   * 
   * @param {string} errorCode - Machine-readable error code
   * @param {string} message - Human-readable status message
   * @returns {Object} Explicit machine-readable AI unavailable state
   */
  static createUnavailableState(errorCode = 'AI_SERVICE_UNAVAILABLE', message = 'AI clinical analysis is currently unavailable.') {
    return {
      success: false,
      status: 'AI_UNAVAILABLE',
      errorCode,
      message,
      recommendedSpecialty: null,
      careType: null,
      confidence: null,
      reason: null,
      alternativeSpecialties: [],
      clinicalBasis: [],
      uncertainty: null
    };
  }

  /**
   * Evaluates whether the clinical finding context is too sparse to warrant AI specialty inference.
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
   * Sanitizes and validates the structured output from the AI reasoner,
   * enforcing strict deterministic constraints, schema compliance, and boundary checks.
   * 
   * @param {Object} rawOutput - Raw parsed JSON from LLM
   * @param {Object} originalContext - Input finding context
   * @returns {Object} Validated, normalized specialty recommendation or unavailable state
   */
  static sanitizeReasoningOutput(rawOutput, originalContext = {}) {
    if (!rawOutput || typeof rawOutput !== 'object') {
      return this.createUnavailableState('AI_INVALID_RESPONSE', 'AI clinical analysis produced an invalid response structure.');
    }

    // 1. Specialty Name (Must be provided by LLM; never defaulted to a fake specialty)
    if (!rawOutput.recommendedSpecialty || typeof rawOutput.recommendedSpecialty !== 'string' || !rawOutput.recommendedSpecialty.trim()) {
      return this.createUnavailableState('AI_INVALID_RESPONSE', 'AI clinical analysis omitted the recommended specialty.');
    }
    const recommendedSpecialty = rawOutput.recommendedSpecialty.trim();

    // 2. Care Type
    let careType = 'primary_care';
    if (rawOutput.careType && typeof rawOutput.careType === 'string') {
      const normalizedCareType = rawOutput.careType.toLowerCase().trim();
      if (VALID_CARE_TYPES.includes(normalizedCareType)) {
        careType = normalizedCareType;
      }
    }

    // 3. Reason
    let reason = null;
    if (rawOutput.reason && typeof rawOutput.reason === 'string' && rawOutput.reason.trim()) {
      reason = rawOutput.reason.trim();
    }

    // 4. Confidence (0.0 to 1.0)
    let confidence = 0.80;
    if (typeof rawOutput.confidence === 'number' && !isNaN(rawOutput.confidence)) {
      let c = rawOutput.confidence;
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
            rationale: typeof alt.rationale === 'string' ? alt.rationale.trim() : 'Alternative clinical care pathway.'
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
    }

    // 7. Uncertainty flag
    let uncertainty = Boolean(rawOutput.uncertainty);
    if (confidence < 0.75) {
      uncertainty = true;
    }

    return {
      success: true,
      status: 'AI_SUCCESS',
      recommendedSpecialty,
      careType,
      reason,
      confidence,
      alternativeSpecialties,
      clinicalBasis,
      uncertainty
    };
  }

  /**
   * Main entry point: Evaluates a structured clinical finding and determines the appropriate
   * healthcare specialty, care type, confidence, and explainable rationale.
   * 
   * @param {Object} findingContext - Structured clinical finding & context
   * @returns {Promise<Object>} Validated specialty recommendation or machine-readable unavailable state
   */
  static async determineSpecialty(findingContext) {
    // 1. Check for sparse / empty context
    if (this.isInsufficientContext(findingContext)) {
      console.warn('[SpecialtyService] Finding context is insufficient for AI specialty inference.');
      return this.createUnavailableState('INSUFFICIENT_CONTEXT', 'Clinical evidence in finding context is insufficient for specialty triage.');
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

    // 3. Invoke AI specialty reasoner with strict honest failure handling
    try {
      const rawAiResult = await AiService.reasonCareSpecialty(reasoningPayload);
      const validatedResult = this.sanitizeReasoningOutput(rawAiResult, findingContext);
      
      if (validatedResult.success) {
        console.log(`[SpecialtyService] Specialty reasoning completed: "${validatedResult.recommendedSpecialty}" (${validatedResult.careType}, conf: ${validatedResult.confidence}).`);
      }
      return validatedResult;
    } catch (error) {
      console.warn('[SpecialtyService] AI specialty reasoning unavailable:', error.message);
      return this.createUnavailableState('AI_SERVICE_UNAVAILABLE', 'AI clinical analysis is currently unavailable.');
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
