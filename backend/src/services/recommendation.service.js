import { query } from '../config/db.js';
import { SpecialtyService } from './specialty.service.js';
import { LocationService } from './location.service.js';
import { ProviderSearchService } from './provider-search.service.js';
import { ProviderRankingService } from './provider-ranking.service.js';

/**
 * RecommendationService
 * 
 * Orchestrates the end-to-end Care Intelligence & Provider Navigation flow:
 * 1. Resolves clinical context from patient history / medical alerts.
 * 2. Invokes AI Specialty Triage Reasoner (with strict Zero-Fabrication / Honest Failure boundaries).
 * 3. Geocodes search location via OpenStreetMap Nominatim.
 * 4. Discovers real public healthcare facilities via OpenStreetMap & Google Places.
 * 5. Runs deterministic multi-factor provider scoring and ranking.
 * 6. Persists audit session records in PostgreSQL.
 */
export class RecommendationService {

  /**
   * Prepares and resolves the clinical finding context for specialty triage.
   * 
   * @param {Object} params
   * @param {number} params.userId - Authenticated user ID
   * @param {number} params.patientId - Target patient ID
   * @param {number} [params.insightId] - Optional specific ai_insights ID
   * @param {Object} [params.findingContext] - Optional custom finding context
   * @returns {Promise<Object>} Assembled context and AI specialty triage result
   */
  static async prepareRecommendationContext({ userId, patientId, insightId = null, findingContext = null }) {
    // 1. Verify patient ownership and retrieve basic demographics
    const patientQuery = await query(
      `SELECT id, patient_name, age, gender, user_id FROM patients WHERE id = $1 AND user_id = $2`,
      [patientId, userId]
    );

    if (patientQuery.rows.length === 0) {
      return {
        success: false,
        error: 'PATIENT_NOT_FOUND',
        message: 'Patient record not found or access denied.'
      };
    }

    const patient = patientQuery.rows[0];
    let assembledContext = findingContext;

    // 2. If an insightId is provided, retrieve the alert and recent medical events
    if (insightId && !assembledContext) {
      const insightQuery = await query(
        `SELECT * FROM ai_insights WHERE id = $1 AND patient_id = $2`,
        [insightId, patientId]
      );

      if (insightQuery.rows.length > 0) {
        const insight = insightQuery.rows[0];

        // Fetch recent medical events to enrich context
        const eventsQuery = await query(
          `SELECT event_date, event_type, diagnosis, symptoms, medications, lab_results 
           FROM medical_events 
           WHERE patient_id = $1 
           ORDER BY event_date DESC 
           LIMIT 5`,
          [patientId]
        );

        assembledContext = SpecialtyService.buildContextFromInsight(insight, patient, eventsQuery.rows);
      }
    }

    if (!assembledContext) {
      assembledContext = {
        issueType: 'general_medical_review',
        riskLevel: 'moderate',
        clinicalSummary: 'General medical history review.',
        patientAge: patient.age,
        patientGender: patient.gender
      };
    }

    // 3. Invoke AI Specialty & Care Reasoner (Returns honest AI_UNAVAILABLE on failure; never synthetic fallback)
    const specialtyReasoning = await SpecialtyService.determineSpecialty(assembledContext);

    return {
      success: true,
      patientId: patient.id,
      patientName: patient.patient_name,
      insightId: insightId,
      findingContext: assembledContext,
      recommendation: specialtyReasoning
    };
  }

  /**
   * Executes full end-to-end provider discovery and multi-factor ranking for a patient finding.
   * 
   * @param {Object} params
   * @param {number} params.userId
   * @param {number} params.patientId
   * @param {number} params.insightId
   * @param {Object} params.findingContext
   * @param {string} params.location - Location string (e.g. "Jaffna", "Colombo")
   * @param {string} params.availability - User availability preference ('this_week', 'today', etc.)
   * @param {number} params.radiusKm - Search radius in km (default 25)
   * @returns {Promise<Object>} Ranked providers, location metadata, and session ID
   */
  static async searchAndRankProviders({
    userId,
    patientId,
    insightId = null,
    findingContext = null,
    location,
    availability = 'this_week',
    radiusKm = 25
  }) {
    if (!location || typeof location !== 'string' || !location.trim()) {
      return {
        success: false,
        error: 'LOCATION_REQUIRED',
        message: 'Please provide a valid city, town, or area.'
      };
    }

    // 1. Prepare recommendation context & specialty determination
    const contextRes = await this.prepareRecommendationContext({
      userId,
      patientId,
      insightId,
      findingContext
    });

    if (!contextRes.success) {
      return contextRes;
    }

    const specialtyResult = contextRes.recommendation;

    // 2. Geocode Location
    const geocodeRes = await LocationService.geocodeLocation(location);
    if (!geocodeRes.success) {
      return {
        success: false,
        error: geocodeRes.error,
        message: geocodeRes.message,
        specialty: specialtyResult
      };
    }

    // 3. Search Real Providers (uses recommended specialty if AI succeeded; otherwise searches general care)
    const searchRes = await ProviderSearchService.searchProviders({
      latitude: geocodeRes.latitude,
      longitude: geocodeRes.longitude,
      radiusKm: radiusKm || 25,
      specialty: specialtyResult?.recommendedSpecialty || null,
      careType: specialtyResult?.careType || 'all'
    });

    if (!searchRes.success) {
      return {
        success: false,
        error: searchRes.error,
        message: searchRes.message,
        location: geocodeRes,
        specialty: specialtyResult
      };
    }

    // 4. Multi-Factor Deterministic & AI-Native Ranking
    const rankedProviders = await ProviderRankingService.rankProviders(
      searchRes.providers,
      specialtyResult || {},
      {
        radiusKm: radiusKm || 25,
        availabilityPreference: availability
      }
    );

    // 5. Persist Recommendation Audit Session in PostgreSQL
    let sessionId = null;
    try {
      const sessionInsert = await query(
        `INSERT INTO recommendation_sessions (
          user_id, patient_id, insight_id, issue_type, risk_level, clinical_summary,
          recommended_care_type, recommended_specialty, alternative_specialties,
          specialty_reason, confidence_score, location_query, normalized_location,
          latitude, longitude, availability_preference, search_radius_km,
          total_providers_found, providers_result, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING id`,
        [
          userId,
          patientId,
          insightId,
          contextRes.findingContext.issueType || 'clinical_concern',
          contextRes.findingContext.riskLevel || 'moderate',
          contextRes.findingContext.clinicalSummary || '',
          specialtyResult?.careType || null,
          specialtyResult?.recommendedSpecialty || null,
          JSON.stringify(specialtyResult?.alternativeSpecialties || []),
          specialtyResult?.reason || null,
          specialtyResult?.confidence ? parseFloat((specialtyResult.confidence * 100).toFixed(2)) : null,
          location.trim(),
          geocodeRes.displayName,
          geocodeRes.latitude,
          geocodeRes.longitude,
          availability,
          radiusKm,
          rankedProviders.length,
          JSON.stringify(rankedProviders.slice(0, 20)),
          specialtyResult?.status === 'AI_UNAVAILABLE' ? 'ai_unavailable' : 'completed'
        ]
      );
      sessionId = sessionInsert.rows[0].id;
      console.log(`[RecommendationService] Audit session persisted with ID ${sessionId} for patient ${patientId}.`);
    } catch (auditErr) {
      console.error('[RecommendationService Error] Failed to persist recommendation session audit:', auditErr.message);
      // Non-blocking: We still return ranked providers to the user
    }

    return {
      success: true,
      sessionId,
      patientId,
      patientName: contextRes.patientName,
      location: {
        query: location.trim(),
        displayName: geocodeRes.displayName,
        latitude: geocodeRes.latitude,
        longitude: geocodeRes.longitude
      },
      searchRadiusKm: radiusKm || 25,
      availabilityPreference: availability,
      specialty: specialtyResult,
      totalCount: rankedProviders.length,
      providers: rankedProviders,
      sourceAttribution: searchRes.sourceAttribution || 'OpenStreetMap contributors'
    };
  }

  /**
   * Retrieves past recommendation session history for a given patient.
   * 
   * @param {number} userId - Authenticated user ID
   * @param {number} patientId - Target patient ID
   * @returns {Promise<Array<Object>>} List of historical recommendation sessions
   */
  static async getRecommendationHistory(userId, patientId) {
    const historyQuery = await query(
      `SELECT rs.*, p.patient_name
       FROM recommendation_sessions rs
       JOIN patients p ON rs.patient_id = p.id
       WHERE rs.patient_id = $1 AND rs.user_id = $2
       ORDER BY rs.created_at DESC
       LIMIT 20`,
      [patientId, userId]
    );

    return historyQuery.rows;
  }
}

export default RecommendationService;
