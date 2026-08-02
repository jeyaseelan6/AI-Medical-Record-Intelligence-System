import fs from 'fs';
import path from 'path';
import { query, transaction } from '../config/db.js';
import { AiService } from '../services/ai.service.js';

/**
 * Helper to verify patient ownership.
 * Throws an error or returns false if unauthorized.
 */
const verifyPatientOwner = async (patientId, userId) => {
  const check = await query('SELECT user_id FROM patients WHERE id = $1', [patientId]);
  if (check.rows.length === 0) return false;
  return check.rows[0].user_id === userId;
};

/**
 * DocumentController
 * Handles file processing, AI data extraction, transaction db updates, and RAG indexing.
 */

/**
 * Uploads and processes a medical document.
 * Endpoint: POST /api/documents/upload
 */
export const uploadDocument = async (req, res) => {
  const { patientId } = req.body;
  const file = req.file;
  const userId = req.user.id;

  if (!patientId) {
    return res.status(400).json({ success: false, message: 'Patient ID is required.' });
  }
  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
    // 1. Verify access security
    const isOwner = await verifyPatientOwner(patientId, userId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unauthorized patient workspace.'
      });
    }

    // 2. Insert document metadata as 'Processing'
    const fileUrl = `/uploads/${file.filename}`;
    const docQuery = await query(
      `INSERT INTO documents (patient_id, file_name, file_url, document_type, processing_status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [patientId, file.originalname, fileUrl, 'Pending', 'Processing']
    );
    const documentId = docQuery.rows[0].id;

    // Execute AI pipeline asynchronously or synchronously? 
    // For local demo reliability and immediate dashboard feedback, we run synchronously.
    const fileBuffer = fs.readFileSync(file.path);
    const extracted = await AiService.extractMedicalData(fileBuffer, file.mimetype, file.originalname);

    // Categorize the document based on AI extraction and filename fallback analysis
    const docType = (() => {
      if (extracted.is_unrelated_document === true || (extracted.document_type || '').toLowerCase() === 'unrelated') {
        return 'Unrelated';
      }
      const name = (file.originalname || '').toLowerCase();
      const extractedType = (extracted.document_type || '').trim().toLowerCase();
      
      const validTypes = ['Prescription', 'Lab Report', 'Discharge Summary', 'Medical Notes'];
      const matched = validTypes.find(t => t.toLowerCase() === extractedType);
      if (matched) return matched;
      
      // Fallback filename keyword detection
      if (name.includes('prescription') || name.includes('rx') || name.includes('medication') || name.includes('meds') || name.includes('pill')) {
        return 'Prescription';
      }
      if (name.includes('lab') || name.includes('report') || name.includes('test') || name.includes('result') || name.includes('blood') || name.includes('urine') || name.includes('cbc') || name.includes('panel')) {
        return 'Lab Report';
      }
      if (name.includes('discharge') || name.includes('summary') || name.includes('hospital')) {
        return 'Discharge Summary';
      }
      return 'Medical Notes';
    })();

    // 3. Save extracted structure inside a secure SQL Transaction
    await transaction(async (client) => {
      // A. Update document classification
      await client.query(
        'UPDATE documents SET document_type = $1, processing_status = $2 WHERE id = $3',
        [docType, 'Completed', documentId]
      );

      // B. Insert Medical Event (Only if document is relevant to clinical history)
      if (docType !== 'Unrelated') {
        const event = extracted.event || {};
        const eventDate = event.date || new Date().toISOString().split('T')[0];
        const eventQuery = await client.query(
          `INSERT INTO medical_events (patient_id, document_id, event_date, doctor_name, diagnosis, symptoms, notes) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [
            patientId,
            documentId,
            eventDate,
            event.doctor_name || null,
            event.diagnosis || null,
            event.symptoms || null,
            event.notes || null
          ]
        );
        const eventId = eventQuery.rows[0].id;

        // C. Insert Medications
        const medications = extracted.medications || [];
        for (const med of medications) {
          if (med.name) {
            await client.query(
              `INSERT INTO medications (medical_event_id, medicine_name, dosage, frequency, duration) 
               VALUES ($1, $2, $3, $4, $5)`,
              [eventId, med.name, med.dosage || null, med.frequency || null, med.duration || null]
            );
          }
        }

        // D. Insert Lab Results
        const labResults = extracted.lab_results || [];
        for (const lab of labResults) {
          if (lab.test_name) {
            await client.query(
              `INSERT INTO lab_results (medical_event_id, test_name, value, unit, normal_range) 
               VALUES ($1, $2, $3, $4, $5)`,
              [eventId, lab.test_name, lab.value, lab.unit || null, lab.normal_range || null]
            );
          }
        }
      }
    });

    // 4. Generate RAG Vector Embeddings (Failsafe fallback design)
    try {
      // Only generate search index embeddings if the document is relevant to patient medical records
      if (docType !== 'Unrelated') {
        const eventData = extracted.event || {};
        const medSummary = (extracted.medications || []).map(m => `${m.name} ${m.dosage || ''} (${m.frequency || ''})`).join(', ');
        const labSummary = (extracted.lab_results || []).map(l => `${l.test_name}: ${l.value} ${l.unit || ''}`).join(', ');

        const contentChunk = `Document: ${file.originalname}. Date: ${eventData.date || 'Unknown'}. Document Type: ${docType}. Doctor: ${eventData.doctor_name || 'N/A'}. Diagnosis: ${eventData.diagnosis || 'None'}. Symptoms: ${eventData.symptoms || 'None'}. Notes: ${eventData.notes || 'None'}. Medications: [${medSummary || 'None'}]. Vitals/Labs: [${labSummary || 'None'}].`;

        const embedding = await AiService.generateEmbedding(contentChunk);

        // Store in vector table. Format standard float array to postgres vector bracket format [val, val, ...]
        const vectorString = `[${embedding.join(',')}]`;
        await query(
          `INSERT INTO embeddings (document_id, content_chunk, embedding_vector) 
           VALUES ($1, $2, $3::vector)`,
          [documentId, contentChunk, vectorString]
        );
      }
    } catch (vectorError) {
      console.warn('[Database Warning] Vector insert bypassed. This can happen if pgvector extension is not configured locally:', vectorError.message);
    }

    // 5. Run Longitudinal Clinical Analysis (Update insights)
    await runPatientAnalysis(patientId);

    return res.status(201).json({
      success: true,
      message: docType === 'Unrelated'
        ? 'Unrelated document detected. Saved to files but excluded from patient clinical history.'
        : 'Medical document parsed, saved, and indexed successfully.',
      documentId,
      isUnrelated: docType === 'Unrelated'
    });

  } catch (error) {
    console.error('[Document Controller Error] Upload failed:', error.message);

    // Update status to failed in database
    if (file && file.filename) {
      try {
        await query(
          "UPDATE documents SET processing_status = 'Failed' WHERE file_url LIKE $1",
          [`%${file.filename}%`]
        );
      } catch (err) {
        console.error('Failed to update status to Failed:', err.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process document. Please try again.'
    });
  }
};

/**
 * Returns all documents associated with a patient profile.
 * Endpoint: GET /api/documents/:patientId
 */
export const getDocuments = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.user.id;

  try {
    const isOwner = await verifyPatientOwner(patientId, userId);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized patient profile access.' });
    }

    const docs = await query(
      'SELECT * FROM documents WHERE patient_id = $1 ORDER BY uploaded_at DESC',
      [patientId]
    );

    return res.status(200).json({
      success: true,
      data: docs.rows
    });
  } catch (error) {
    console.error('[Document Controller Error] Fetch failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching patient documents.'
    });
  }
};

/**
 * Re-runs longitudinal analysis over all historic patient logs.
 * Updates AI insights table.
 */
export const runPatientAnalysis = async (patientId) => {
  try {
    // 1. Fetch Patient Info
    const patientQuery = await query('SELECT patient_name, age, gender FROM patients WHERE id = $1', [patientId]);
    const patientInfo = patientQuery.rows[0];

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

    // 3. Compute clinical insights using Gemini
    const insights = await AiService.analyzeLongitudinalInsights(events, patientInfo);

    // 4. Update the DB table in a Transaction
    await transaction(async (client) => {
      // Clear outdated insights
      await client.query('DELETE FROM ai_insights WHERE patient_id = $1', [patientId]);

      // Save fresh insights
      for (const ins of insights) {
        await client.query(
          `INSERT INTO ai_insights (patient_id, insight_type, description, confidence_score, evidence) 
           VALUES ($1, $2, $3, $4, $5)`,
          [patientId, ins.insight_type, ins.description, ins.confidence_score || 90.0, ins.evidence || null]
        );
      }
    });

    console.log(`[AI Engine] Longitudinal insights successfully updated for patient ${patientId}.`);
  } catch (error) {
    console.error('[AI Engine Error] Patient longitudinal analysis failed:', error.message);
  }
};

/**
 * Deletes an unrelated document from the database and disk storage.
 * Endpoint: DELETE /api/documents/:documentId
 */
export const deleteUnrelatedDocument = async (req, res) => {
  const { documentId } = req.params;
  const userId = req.user.id;

  if (!documentId) {
    return res.status(400).json({ success: false, message: 'Document ID is required.' });
  }

  try {
    // 1. Retrieve the document and check ownership
    const docQuery = await query(
      `SELECT d.*, p.user_id 
       FROM documents d
       JOIN patients p ON p.id = d.patient_id
       WHERE d.id = $1`,
      [documentId]
    );

    if (docQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = docQuery.rows[0];

    // 2. Validate patient profile ownership
    if (doc.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unauthorized patient workspace.'
      });
    }

    // 3. ENFORCE: Only unrelated documents can be deleted via this endpoint
    if (doc.document_type !== 'Unrelated') {
      return res.status(400).json({
        success: false,
        message: 'Only unrelated documents can be removed.'
      });
    }

    // 4. Delete the physical file from backend uploads directory
    try {
      const fileName = path.basename(doc.file_url);
      const filePath = path.resolve('uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn('[FS Warning] Failed to delete unrelated file from uploads folder:', fsErr.message);
    }

    // 5. Delete document record from database
    await query('DELETE FROM documents WHERE id = $1', [documentId]);

    return res.status(200).json({
      success: true,
      message: 'Unrelated document removed successfully.'
    });

  } catch (error) {
    console.error('[Document Controller Error] Failed to delete unrelated document:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while removing unrelated document.'
    });
  }
};

export default {
  uploadDocument,
  getDocuments,
  deleteUnrelatedDocument
};
