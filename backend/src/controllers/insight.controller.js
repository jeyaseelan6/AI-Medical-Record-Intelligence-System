import { query } from '../config/db.js';

/**
 * InsightController
 * Fetches AI-generated insights (Duplicate check, safety reports, vitals alerts) for a patient.
 */

/**
 * Retrieves AI insights for a specific patient.
 * Endpoint: GET /api/insights/:patientId
 */
export const getPatientInsights = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Verify owner security
    const check = await query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to patient insights.' });
    }

    // 2. Fetch all insights for this patient
    const insightsQuery = await query(
      'SELECT * FROM ai_insights WHERE patient_id = $1 ORDER BY created_at DESC',
      [patientId]
    );

    return res.status(200).json({
      success: true,
      data: insightsQuery.rows
    });
  } catch (error) {
    console.error('[Insights Controller Error] Fetch failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching AI clinical insights.'
    });
  }
};

export default {
  getPatientInsights
};
