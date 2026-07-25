import { query } from '../config/db.js';

/**
 * TimelineController
 * Serves chronological, consolidated medical logs for a patient dashboard.
 */

/**
 * Fetches the medical timeline for a patient.
 * Single aggregated query joining events, medications, and lab results for high performance.
 * Endpoint: GET /api/timeline/:patientId
 */
export const getPatientTimeline = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.user.id;

  try {
    // 1. Verify safety/ownership
    const check = await query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to patient data.' });
    }

    // 2. Query timeline with pre-aggregated json results
    const timelineQuery = await query(
      `SELECT me.id, me.event_date, me.doctor_name, me.diagnosis, me.symptoms, me.notes, me.document_id,
       COALESCE(
         (SELECT json_agg(m) FROM (
           SELECT id, medicine_name, dosage, frequency, duration 
           FROM medications 
           WHERE medical_event_id = me.id
         ) m), '[]'
       ) as medications,
       COALESCE(
         (SELECT json_agg(lr) FROM (
           SELECT id, test_name, value, unit, normal_range 
           FROM lab_results 
           WHERE medical_event_id = me.id
         ) lr), '[]'
       ) as lab_results
       FROM medical_events me
       WHERE me.patient_id = $1
       ORDER BY me.event_date DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      data: timelineQuery.rows
    });

  } catch (error) {
    console.error('[Timeline Controller Error] Retrieve timeline failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while assembling timeline.'
    });
  }
};

export default {
  getPatientTimeline
};
