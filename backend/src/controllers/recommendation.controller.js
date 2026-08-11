import { RecommendationService } from '../services/recommendation.service.js';
import { query } from '../config/db.js';

/**
 * RecommendationController
 * 
 * Thin HTTP controller orchestrating Care Navigation requests:
 * 1. POST /api/recommendations/context
 * 2. POST /api/recommendations/search
 * 3. GET  /api/recommendations/history/:patientId
 */

/**
 * Prepares recommendation context and AI care reasoning for a clinical finding.
 * 
 * @route POST /api/recommendations/context
 */
export const getRecommendationContext = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId, insightId, findingContext } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required.'
      });
    }

    const result = await RecommendationService.prepareRecommendationContext({
      userId,
      patientId: parseInt(patientId, 10),
      insightId: insightId ? parseInt(insightId, 10) : null,
      findingContext
    });

    if (!result.success) {
      const statusCode = result.error === 'PATIENT_NOT_FOUND' 
        ? 404 
        : (result.error === 'UNAUTHORIZED' ? 403 : 400);
      return res.status(statusCode).json(result);
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[RecommendationController Error] prepareContext failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while preparing recommendation context.'
    });
  }
};

/**
 * Searches and ranks real healthcare providers near a requested location for a finding.
 * 
 * @route POST /api/recommendations/search
 */
export const searchRecommendedProviders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId, insightId, findingContext, location, availability, radiusKm } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required.'
      });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Location is required (e.g., city, town, or area).'
      });
    }

    const result = await RecommendationService.searchAndRankProviders({
      userId,
      patientId: parseInt(patientId, 10),
      insightId: insightId ? parseInt(insightId, 10) : null,
      findingContext,
      location: location.trim(),
      availability: availability || 'this_week',
      radiusKm: radiusKm ? parseFloat(radiusKm) : 25
    });

    if (!result.success) {
      let statusCode = 400;
      if (result.error === 'PATIENT_NOT_FOUND') statusCode = 404;
      else if (result.error === 'UNAUTHORIZED') statusCode = 403;
      else if (result.error === 'LOCATION_NOT_FOUND') statusCode = 400;
      else if (result.error === 'PROVIDER_SEARCH_ERROR' || result.error === 'OSM_SERVICE_UNAVAILABLE') statusCode = 502;

      return res.status(statusCode).json(result);
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[RecommendationController Error] searchProviders failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while searching and ranking healthcare providers.'
    });
  }
};

/**
 * Retrieves past recommendation session history for a patient.
 * 
 * @route GET /api/recommendations/history/:patientId
 */
export const getRecommendationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required.'
      });
    }

    // 1. Verify patient ownership
    const patientCheck = await query(
      'SELECT id, patient_name, user_id FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    if (patientCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to patient records.'
      });
    }

    // 2. Fetch past recommendation sessions
    const sessionsQuery = await query(
      `SELECT id, user_id, patient_id, insight_id, issue_type, risk_level, clinical_summary,
              recommended_care_type, recommended_specialty, alternative_specialties,
              specialty_reason, confidence_score, location_query, normalized_location,
              latitude, longitude, availability_preference, search_radius_km,
              total_providers_found, providers_result, status, created_at
       FROM recommendation_sessions 
       WHERE patient_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [patientId, userId]
    );

    return res.status(200).json({
      success: true,
      data: sessionsQuery.rows
    });

  } catch (error) {
    console.error('[RecommendationController Error] getHistory failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving recommendation audit history.'
    });
  }
};
