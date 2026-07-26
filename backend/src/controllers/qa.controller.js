import { query } from '../config/db.js';
import { AiService } from '../services/ai.service.js';

/**
 * QAController
 * Implements RAG (Retrieval-Augmented Generation) on the patient's medical files.
 */

/**
 * Ask a medical history question.
 * Endpoint: POST /api/ask
 */
export const askQuestion = async (req, res) => {
  const { patientId, question } = req.body;
  const userId = req.user.id;

  if (!patientId || !question) {
    return res.status(400).json({
      success: false,
      message: 'Both patientId and question are required.'
    });
  }

  try {
    // 1. Verify access security
    const check = await query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    }
    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized patient profile.' });
    }

    let contextChunks = [];

    // 2. Try Vector Search via pgvector
    try {
      const questionEmbedding = await AiService.generateEmbedding(question);
      const vectorString = `[${questionEmbedding.join(',')}]`;

      // SQL JOIN optimized to query embeddings belonging ONLY to the patient's uploaded documents
      const vectorSearch = await query(
        `SELECT e.content_chunk, (e.embedding_vector <=> $1::vector) as distance
         FROM embeddings e
         JOIN documents d ON d.id = e.document_id
         WHERE d.patient_id = $2
         ORDER BY distance ASC
         LIMIT 5`,
        [vectorString, patientId]
      );
      
      contextChunks = vectorSearch.rows.map(row => row.content_chunk);
    } catch (vectorError) {
      console.warn('[QA Engine Warning] pgvector search failed or not configured, using fallback query:', vectorError.message);
    }

    // 3. Fallback: If pgvector search returned 0 results or failed, compile timeline context dynamically
    if (contextChunks.length === 0) {
      const fallbackQuery = await query(
        `SELECT me.event_date, me.doctor_name, me.diagnosis, me.symptoms, me.notes,
         COALESCE(json_agg(DISTINCT med.*) FILTER (WHERE med.id IS NOT NULL), '[]') as medications,
         COALESCE(json_agg(DISTINCT lr.*) FILTER (WHERE lr.id IS NOT NULL), '[]') as lab_results
         FROM medical_events me
         LEFT JOIN medications med ON med.medical_event_id = me.id
         LEFT JOIN lab_results lr ON lr.medical_event_id = me.id
         WHERE me.patient_id = $1
         GROUP BY me.id
         ORDER BY me.event_date DESC`,
        [patientId]
      );

      contextChunks = fallbackQuery.rows.map(row => {
        const medsStr = row.medications.map(m => `${m.medicine_name} ${m.dosage || ''}`).join(', ');
        const labsStr = row.lab_results.map(l => `${l.test_name}: ${l.value} ${l.unit || ''}`).join(', ');
        return `Date: ${row.event_date}. Doctor: ${row.doctor_name || 'N/A'}. Diagnosis: ${row.diagnosis || 'None'}. Symptoms: ${row.symptoms || 'None'}. Notes: ${row.notes || 'None'}. Medications: [${medsStr || 'None'}]. Labs: [${labsStr || 'None'}].`;
      });
    }

    // 4. Generate QA response via Gemini using gathered context
    if (contextChunks.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          answer: "No medical documents or history records found for this patient profile. Please upload a medical record first.",
          evidence: "No historical files",
          confidence: 100,
          risk_level: "Low",
          recommendation: "Please upload prescription or laboratory PDF/Images to begin asking questions."
        }
      });
    }

    const qaResult = await AiService.answerQuestionWithContext(question, contextChunks);

    return res.status(200).json({
      success: true,
      data: qaResult
    });

  } catch (error) {
    console.error('[QA Controller Error] Question answering failed:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while resolving question.'
    });
  }
};

export default {
  askQuestion
};
