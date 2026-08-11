import { query } from '../config/db.js';
import { SpecialtyService } from './specialty.service.js';
import { LocationService } from './location.service.js';
import { ProviderSearchService } from './provider-search.service.js';
import { ProviderRankingService } from './provider-ranking.service.js';

/**
 * RecommendationService
 * 
 * Master coordinator for Round 2 Care Navigation.
 * Orchestrates the full pipeline:
 * Finding Context -> AI Specialty Triage -> Location Geocoding -> Real Provider Search -> Multi-Factor Ranking -> Session Persistence
 */
export class RecommendationService {

  /**
   * Generates clinical care navigation context and AI specialty determination for a given insight/finding.
   * 
   * @param {Object} params
   * @param {number} params.userId - Authenticated user ID
   * @param {number} params.patientId - Patient ID
   * @param {number} params.insightId - Optional AI insight ID from ai_insights
   * @param {Object} params.findingContext - Optional direct finding context (for forecast or chat risk flags)
   * @returns {Promise<Object>} Recommendation context ready for UI location input
   */
  static async prepareRecommendationContext({ userId, patientId, insightId = null, findingContext = null }) {
    // 1. Verify patient ownership
    const patientCheck = await query(
      'SELECT id, patient_name, age, gender, user_id FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return { success: false, error: 'PATIENT_NOT_FOUND', message: 'Patient not found.' };
    }
    const patient = patientCheck.rows[0];
    if (patient.user_id !== userId) {
      return { success: false, error: 'UNAUTHORIZED', message: 'Unauthorized access to patient records.' };
    }

    let assembledContext = findingContext;

    // 2. If insightId is supplied, assemble finding context from database
    if (insightId) {
      const insightRes = await query(
        'SELECT * FROM ai_insights WHERE id = $1 AND patient_id = $2',
        [insightId, patientId]
      );

      if (insightRes.rows.length > 0) {
        const insight = insightRes.rows[0];
        
        // Fetch recent medical events to enrich context
        const eventsRes = await query(
          `SELECT me.*, 
           COALESCE(json_agg(DISTINCT med.*) FILTER (WHERE med.id IS NOT NULL), '[]') as medications,
           COALESCE(json_agg(DISTINCT lr.*) FILTER (WHERE lr.id IS NOT NULL), '[]') as lab_results
           FROM medical_events me
           LEFT JOIN medications med ON med.medical_event_id = me.id
           LEFT JOIN lab_results lr ON lr.medical_event_id = me.id
           WHERE me.patient_id = $1
           GROUP BY me.id
           ORDER BY me.event_date DESC LIMIT 5`,
          [patientId]
        );

        assembledContext = SpecialtyService.buildContextFromInsight(insight, patient, eventsRes.rows);
      }
    }

    if (!assembledContext) {
      assembledContext = {
        issueType: 'general_medical_review',
        riskLevel: 'moderate',
        clinicalSummary: 'General medical history review recommended.',
        patientAge: patient.age,
        patientGender: patient.gender
      };
    }

    // 3. Invoke AI Specialty & Care Reasoner
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

    // 3. Search Real Providers
    const searchRes = await ProviderSearchService.searchProviders({
      latitude: geocodeRes.latitude,
      longitude: geocodeRes.longitude,
      radiusKm: radiusKm || 25,
      specialty: specialtyResult.recommendedSpecialty,
      careType: specialtyResult.careType
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
      specialtyResult,
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
          specialtyResult.careType,
          specialtyResult.recommendedSpecialty,
          JSON.stringify(specialtyResult.alternativeSpecialties || []),
          specialtyResult.reason,
          specialtyResult.confidence ? parseFloat((specialtyResult.confidence * 100).toFixed(2)) : 75.0,
          location.trim(),
          geocodeRes.displayName,
          geocodeRes.latitude,
          geocodeRes.longitude,
          availability,
          radiusKm,
          rankedProviders.length,
          JSON.stringify(rankedProviders.slice(0, 20)), // Store top 20 ranked providers in audit record
          'completed'
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
      sessionId: sessionId,
      patientId: patientId,
      specialty: specialtyResult,
      location: {
        query: location,
        displayName: geocodeRes.displayName,
        latitude: geocodeRes.latitude,
        longitude: geocodeRes.longitude,
        country: geocodeRes.country,
        region: geocodeRes.region,
        city: geocodeRes.city
      },
      searchRadiusKm: radiusKm,
      availabilityPreference: availability,
      totalCount: rankedProviders.length,
      providers: rankedProviders,
      source: searchRes.source,
      sourceAttribution: searchRes.sourceAttribution
    };
  }
}

export default RecommendationService;
