import { query } from '../config/db.js';

/**
 * PatientController
 * Manages patient profile CRUD operations with tenant-like user isolation.
 */

/**
 * Creates a new patient profile.
 * Endpoint: POST /api/patients
 */
export const createPatient = async (req, res) => {
  const { patient_name, age, gender } = req.body;
  const userId = req.user.id; // From requireAuth middleware

  if (!patient_name) {
    return res.status(400).json({
      success: false,
      message: 'Patient name is required.'
    });
  }

  try {
    const newPatient = await query(
      'INSERT INTO patients (user_id, patient_name, age, gender) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, patient_name, age || null, gender || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Patient profile created successfully.',
      data: newPatient.rows[0]
    });
  } catch (error) {
    console.error('[Patient Controller Error] Create failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating patient profile.'
    });
  }
};

/**
 * Lists all patient profiles belonging to the authenticated user.
 * Endpoint: GET /api/patients
 */
export const getPatients = async (req, res) => {
  const userId = req.user.id;

  try {
    const patientList = await query(
      'SELECT * FROM patients WHERE user_id = $1 ORDER BY patient_name ASC',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: patientList.rows
    });
  } catch (error) {
    console.error('[Patient Controller Error] Fetch list failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving patients.'
    });
  }
};

/**
 * Retrieves a specific patient profile after verifying owner authorization.
 * Endpoint: GET /api/patients/:id
 */
export const getPatientById = async (req, res) => {
  const patientId = req.params.id;
  const userId = req.user.id;

  try {
    const patientQuery = await query(
      'SELECT * FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found.'
      });
    }

    const patient = patientQuery.rows[0];

    // Enforce strict security check: Verify profile ownership
    if (patient.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to view this medical profile.'
      });
    }

    return res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('[Patient Controller Error] Fetch by ID failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving patient details.'
    });
  }
};

/**
 * Updates a patient profile.
 * Endpoint: PUT /api/patients/:id
 */
export const updatePatient = async (req, res) => {
  const patientId = req.params.id;
  const { patient_name, age, gender } = req.body;
  const userId = req.user.id;

  if (!patient_name) {
    return res.status(400).json({
      success: false,
      message: 'Patient name is required for update.'
    });
  }

  try {
    // 1. Verify owner validation
    const patientQuery = await query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
    if (patientQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }
    if (patientQuery.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized profile update action.' });
    }

    // 2. Perform database update
    const updated = await query(
      `UPDATE patients 
       SET patient_name = $1, age = $2, gender = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [patient_name, age || null, gender || null, patientId]
    );

    return res.status(200).json({
      success: true,
      message: 'Patient profile updated successfully.',
      data: updated.rows[0]
    });
  } catch (error) {
    console.error('[Patient Controller Error] Update failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating patient profile.'
    });
  }
};

/**
 * Deletes a patient profile and cascading related database records.
 * Endpoint: DELETE /api/patients/:id
 */
export const deletePatient = async (req, res) => {
  const patientId = req.params.id;
  const userId = req.user.id;

  try {
    // 1. Verify owner validation
    const patientQuery = await query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
    if (patientQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }
    if (patientQuery.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized profile deletion action.' });
    }

    // 2. Perform cascade delete (Postgres automatically drops child uploads and history due to foreign keys cascades)
    await query('DELETE FROM patients WHERE id = $1', [patientId]);

    return res.status(200).json({
      success: true,
      message: 'Patient profile and all historical files deleted successfully.'
    });
  } catch (error) {
    console.error('[Patient Controller Error] Delete failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting patient profile.'
    });
  }
};

export default {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient
};
