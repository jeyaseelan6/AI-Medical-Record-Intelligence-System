import { query } from '../config/db.js';
import { AiService } from '../services/ai.service.js';

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

/**
 * Generates an AI-native 30-day health wellness and risk trajectory forecast for a patient.
 * Endpoint: GET /api/insights/forecast/:patientId
 */
export const getPatientForecast = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Verify owner security
    const check = await query('SELECT patient_name, age, gender, user_id FROM patients WHERE id = $1', [patientId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    const patientInfo = check.rows[0];
    if (patientInfo.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to patient forecast.' });
    }

    // 2. Fetch all medical events sorted chronologically (with nested drugs and lab measurements)
    const eventsQuery = await query(
      `SELECT me.*, 
       COALESCE(json_agg(DISTINCT med.*) FILTER (WHERE med.id IS NOT NULL), '[]') as medications,
       COALESCE(json_agg(DISTINCT lr.*) FILTER (WHERE lr.id IS NOT NULL), '[]') as lab_results
       FROM medical_events me
       LEFT JOIN medications med ON med.medical_event_id = me.id
       LEFT JOIN lab_results lr ON lr.medical_event_id = me.id
       WHERE me.patient_id = $1
       GROUP BY me.id
       ORDER BY me.event_date ASC`,
      [patientId]
    );
    const events = eventsQuery.rows;

    // 3. Compute clinical wellness forecast using LLM
    const forecast = await AiService.generateHealthForecast(events, {
      patient_name: patientInfo.patient_name,
      age: patientInfo.age,
      gender: patientInfo.gender
    });

    return res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('[Insights Controller Error] Forecast generation failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating AI health trajectory forecast.'
    });
  }
};

export default {
  getPatientInsights,
  getPatientForecast
};
