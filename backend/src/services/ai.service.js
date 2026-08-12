import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config();

const provider = process.env.AI_PROVIDER || 'gemini';

// Initialize Google Gemini
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey && provider === 'gemini') {
  console.warn('[AI Warning] GEMINI_API_KEY is not defined. Gemini services will fail.');
}
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Initialize OpenAI
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey && provider === 'openai') {
  console.warn('[AI Warning] OPENAI_API_KEY is not defined. OpenAI services will fail.');
}
const openaiClient = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

// Resolve default configuration parameters dynamically from external JSON mapping
const configPath = path.resolve('src/config/ai-models.json');
let modelDefaults = {
  openai: { extract: 'gpt-4o-mini', embed: 'text-embedding-3-large', reason: 'gpt-4o-mini' },
  gemini: { extract: 'gemini-2.0-flash-lite', embed: 'gemini-embedding-001', reason: 'gemini-2.0-flash-lite' }
};

try {
  if (fs.existsSync(configPath)) {
    modelDefaults = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (configErr) {
  console.warn('[AI Config Warning] Failed to read models config file, using fallback definitions:', configErr.message);
}

const activeDefaults = modelDefaults[provider] || modelDefaults.gemini;

const EXTRACT_MODEL_NAME = process.env.EXTRACT_MODEL_NAME || activeDefaults.extract;
const EMBED_MODEL_NAME = process.env.EMBED_MODEL_NAME || activeDefaults.embed;
const REASON_MODEL_NAME = process.env.REASON_MODEL_NAME || activeDefaults.reason;

/**
 * Service orchestrating LLM logic using the Google Generative AI SDK.
 * Follows SOLID principles by keeping LLM communication isolated from controllers.
 */
export class AiService {

  /**
   * Universal PDF parser helper that supports legacy functional pdf-parse
   * as well as modern class-based pdf-parse v2+ exports.
   */
  static async parsePdfText(fileBuffer) {
    if (typeof pdf === 'function') {
      const data = await pdf(fileBuffer);
      return data.text || '';
    }
    if (pdf && typeof pdf.PDFParse === 'function') {
      const parser = new pdf.PDFParse(new Uint8Array(fileBuffer));
      const result = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      return result.text || '';
    }
    if (pdf && pdf.default && typeof pdf.default.PDFParse === 'function') {
      const parser = new pdf.default.PDFParse(new Uint8Array(fileBuffer));
      const result = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      return result.text || '';
    }
    throw new Error('PDF parsing library was imported but no compatible parsing method was detected.');
  }

  /**
   * Helper utility to scrub markdown delimiters, code blocks,
   * or notes before attempting JSON parsing.
   */
  static cleanJsonParse(text) {
    let clean = text.trim();
    if (clean.startsWith('```')) {
      const lines = clean.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      if (lines[lines.length - 1].startsWith('```')) {
        lines.pop();
      }
      clean = lines.join('\n').trim();
    }
    try {
      return JSON.parse(clean);
    } catch (e) {
      const startCurly = clean.indexOf('{');
      const endCurly = clean.lastIndexOf('}');
      const startSquare = clean.indexOf('[');
      const endSquare = clean.lastIndexOf(']');
      
      let startIdx = -1;
      let endIdx = -1;
      
      if (startCurly !== -1 && endCurly !== -1) {
        if (startSquare !== -1 && startSquare < startCurly) {
          startIdx = startSquare;
          endIdx = endSquare;
        } else {
          startIdx = startCurly;
          endIdx = endCurly;
        }
      } else if (startSquare !== -1 && endSquare !== -1) {
        startIdx = startSquare;
        endIdx = endSquare;
      }
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          return JSON.parse(clean.substring(startIdx, endIdx + 1));
        } catch (innerErr) {
          throw new Error(`JSON Extraction failed. Raw: ${text}. Inner: ${innerErr.message}`);
        }
      }
      throw e;
    }
  }
  
  /**
   * Generates a 768-dimension semantic vector for the provided text block.
   * Useful for loading RAG embeddings into the pgvector database.
   * 
   * @param {string} text - Segment of text to embed
   * @returns {Promise<Array<number>>} 768 float array vector
   */
  static async generateEmbedding(text) {
    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please configure a valid OPENAI_API_KEY.');
      }
      try {
        const response = await openaiClient.embeddings.create({
          model: EMBED_MODEL_NAME,
          input: text,
          dimensions: 3072
        });
        if (!response.data || !response.data[0] || !response.data[0].embedding) {
          throw new Error('Invalid response structure from OpenAI Embedding API.');
        }
        return response.data[0].embedding;
      } catch (error) {
        console.error('[AI Service Error] OpenAI Embedding generation failed:', error.message);
        throw error;
      }
    }

    // Default: Gemini
    if (!genAI) {
      throw new Error('Gemini AI Service is not initialized. Please configure a valid GEMINI_API_KEY.');
    }

    try {
      const model = genAI.getGenerativeModel({ model: EMBED_MODEL_NAME });
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('Invalid response structure from Gemini Embedding API.');
      }
      
      return result.embedding.values;
    } catch (error) {
      console.error('[AI Service Error] Gemini Embedding generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Processes a medical document (Image or PDF) using Gemini's vision capability.
   * Performs high-fidelity OCR and extracts structured entities.
   * 
   * @param {Buffer} fileBuffer - The binary buffer of the uploaded file
   * @param {string} mimeType - e.g. "application/pdf" or "image/png"
   * @returns {Promise<Object>} Clean JSON structured representation of the record
   */
  static async extractMedicalData(fileBuffer, mimeType, fileName = '') {
    const systemPrompt = `
You are an expert AI medical record parser. Your job is to perform OCR on the document and extract information into a clean, structured JSON format.

First, determine if the document content is related to healthcare, clinical visits, medical tests, prescriptions, doctor notes, patient care, or hospital billing/records.
If the document is completely unrelated to medicine or healthcare (for example: a grocery store receipt, an academic math exam paper, general homework, a software code listing, restaurant menus, airline boarding passes, etc.), set the field "is_unrelated_document" to true. Otherwise, set it to false.

Supported document types are: "Prescription", "Lab Report", "Discharge Summary", "Medical Notes".
Patient gender can be: "Male", "Female", "Other", or null.
Format all dates as YYYY-MM-DD (format dates ISO. If year is missing or unclear, infer rationally or default to 2026-07-25 if completely unknown).

Format the output strictly as a JSON object matching this structure:
{
  "is_unrelated_document": false,
  "document_type": "Prescription",
  "patient_info": {
    "name": "Priya Sharma",
    "age": 35,
    "gender": "Female",
    "weight": "62kg",
    "height": "165cm",
    "bmi": "22.8"
  },
  "event": {
    "date": "2026-07-25",
    "doctor_name": "Dr. Sen",
    "diagnosis": "Mild Fever",
    "symptoms": "High temperature, fatigue",
    "notes": "Take complete rest."
  },
  "medications": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "5 days"
    }
  ],
  "lab_results": [
    {
      "test_name": "Temperature",
      "value": "38.2",
      "unit": "C",
      "normal_range": "36.5 - 37.5"
    }
  ]
}
`;

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please configure a valid OPENAI_API_KEY.');
      }
      try {
        let responseText = '';
        
        if (mimeType === 'application/pdf') {
          // Parse PDF content to text representation
          const pdfText = await AiService.parsePdfText(fileBuffer);
          
          const response = await openaiClient.chat.completions.create({
            model: EXTRACT_MODEL_NAME,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Analyze the following text extracted from a PDF medical record and return structured medical details:\n\n${pdfText}` }
            ]
          });
          responseText = response.choices[0].message.content;
        } else {
          // Process Image files via gpt-4o-mini vision capabilities
          const base64Image = fileBuffer.toString('base64');
          const response = await openaiClient.chat.completions.create({
            model: EXTRACT_MODEL_NAME,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Analyze the attached image and extract structured medical details.' },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ]
          });
          responseText = response.choices[0].message.content;
        }
        
        return this.cleanJsonParse(responseText);
      } catch (error) {
        console.error('[AI Service Error] OpenAI document extraction failed:', error.message);
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
          throw new Error('OpenAI AI API rate limit/quota exceeded. Please try again in a few moments or configure a premium key.');
        }
        throw new Error(`AI record parsing failed: ${error.message}`);
      }
    }

    // Default: Gemini
    if (!genAI) {
      throw new Error('Gemini AI Service is not initialized. Please configure a valid GEMINI_API_KEY inside the backend environment variables.');
    }

    try {
      const model = genAI.getGenerativeModel({ model: EXTRACT_MODEL_NAME });
      
      const filePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              filePart,
              { text: systemPrompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = result.response.text();
      return this.cleanJsonParse(responseText);

    } catch (error) {
      console.error('[AI Service Error] Multimodal document extraction failed:', error.message);
      if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
        throw new Error('Gemini AI API rate limit/quota exceeded. Please try again in a few moments or use a premium API key.');
      }
      throw new Error(`AI record parsing failed: ${error.message}`);
    }
  }

  /**
   * Compares all records and patient logs to generate medical insights.
   * Compares medications, detects duplicate drugs, dosage changes, measurements over time, and quality issues.
   * 
   * @param {Array<Object>} events - Array of medical events with medications and lab results
   * @param {Object} patientInfo - Patient profile details (name, age, gender)
   * @returns {Promise<Array<Object>>} Array of safety and intelligence insights
   */
  static async analyzeLongitudinalInsights(events, patientInfo) {
    if (events.length === 0) {
      return [];
    }

    const systemPrompt = `
You are a Clinical Intelligence and Patient Safety AI. Review this patient's chronological medical records and generate evidence-based clinical insights.
Strictly search for:
1. Duplicate Medications: The same medicine or same drug class prescribed across different visits overlapping in dates.
2. Dosage Conflicts: Changes in dosage (e.g. 500mg to 1000mg) or contradictions.
3. Health Trends: Track critical lab results or physical metrics (Weight, Temperature, Blood Pressure, Hemoglobin) over time and alert on negative or significant patterns.
4. Record Quality Issues: Check for patient identity mismatches (e.g. doctor logs a different patient name on the file), missing allergy warnings, or clear mathematical inconsistencies (e.g. quantity vs duration).

Provide insights strictly as a JSON object containing an "insights" key with an array of objects matching this format:
{
  "insights": [
    {
      "insight_type": "duplicate_medication" | "dosage_conflict" | "trend_alert" | "quality_issue",
      "description": "Clear medical warning or description of the trend.",
      "confidence_score": Float between 0 and 100,
      "evidence": "Brief citation. e.g., 'Same medication Paracetamol found in prescriptions dated 2019-10-03 and 2020-01-02.'"
    }
  ]
}

Important: Focus only on real issues. If there are no issues, return an empty array under the "insights" key.
`;

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please configure a valid OPENAI_API_KEY.');
      }
      try {
        const response = await openaiClient.chat.completions.create({
          model: REASON_MODEL_NAME,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Patient History Data:\n${JSON.stringify({ patient: patientInfo, history: events })}` }
          ]
        });
        const parsed = this.cleanJsonParse(response.choices[0].message.content);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (parsed && Array.isArray(parsed.insights)) {
          return parsed.insights;
        }
        return [];
      } catch (error) {
        console.error('[AI Service Error] OpenAI longitudinal analysis failed:', error.message);
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
          throw new Error('OpenAI AI API rate limit/quota exceeded for clinical analysis.');
        }
        throw error;
      }
    }

    // Default: Gemini
    if (!genAI) {
      throw new Error('Gemini AI Service is not initialized. Please configure a valid GEMINI_API_KEY.');
    }

    try {
      const model = genAI.getGenerativeModel({ model: REASON_MODEL_NAME });
      
      const payload = {
        patient: patientInfo,
        history: events
      };

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `Data: ${JSON.stringify(payload)}\n\nInstructions: ${systemPrompt}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = this.cleanJsonParse(result.response.text());
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && Array.isArray(parsed.insights)) {
        return parsed.insights;
      }
      return [];
    } catch (error) {
      console.error('[AI Service Error] Gemini longitudinal analysis failed:', error.message);
      if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
        throw new Error('Gemini AI API rate limit/quota exceeded for clinical analysis.');
      }
      throw error;
    }
  }

  /**
   * Question Answering Engine (RAG)
   * Answers patient or physician questions using matching semantic chunks as context.
   * 
   * @param {string} question - Query text
   * @param {Array<string>} contextChunks - Content chunks fetched from pgvector similarity search
   * @returns {Promise<Object>} Structured safety response
   */
  static async answerQuestionWithContext(question, contextChunks, conversationHistory = []) {
    const contextText = contextChunks.join('\n\n');
    
    let conversationText = 'No previous messages.';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationText = conversationHistory
        .map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text || m.message_text}`)
        .join('\n');
    }
    
    const prompt = `
You are an intelligent, evidence-based clinical assistant. Answer the user's question by reasoning across the provided patient medical records, including comparing details across different documents (like checking new prescriptions against allergies noted in older reports).

Context from Patient Medical Records:
${contextText}

Conversation History (for resolving follow-up questions and maintaining context):
${conversationText}

Current Question:
${question}

Instructions:
1. Answer the current question using ONLY the provided medical records context.
2. If the answer cannot be found in the context, set "answer" to "I cannot find this information in the uploaded records." and set "confidence" to 0. Do not speculate or diagnose.
3. Never present the answer as a direct clinical diagnosis. The system must never self-diagnose or prescribe.
4. Assess the safety risk of the question and answer (e.g., questions about drug interactions, allergies, dosage changes, or critical lab alerts should be classed as "High" or "Medium" risk).
5. For ANY answer that is flagged as "Medium" or "High" risk, or where your confidence score is low (less than 80%), you MUST clearly write a recommendation to consult a doctor, physician, or pharmacist in the "recommendation" field.
6. Determine Care Navigation Intent ("care_navigation"):
   - Set "is_care_seeking" to true when the user:
     * asks which doctor, specialist, or physician they should see
     * asks for medical care, provider assistance, or where to go
     * asks to find a doctor, clinic, or hospital
     * describes a health concern or symptom where professional evaluation is reasonably being sought
     * asks who they should consult regarding a medication conflict, interaction, or dosage concern
     * describes an acute symptom requiring urgent medical evaluation
   - Set "is_care_seeking" to false for purely informational questions such as:
     * "What was my HbA1c on my last blood report?"
     * "What medicines did I take?"
     * "Explain my blood report."
     * "What does this medication do?"
   - When "is_care_seeking" is true:
     * "suggested_specialty": Suggested clinical specialty (e.g. "Endocrinology", "Cardiology", "Clinical Pharmacology", "General Practice", "Pulmonology", "Neurology", "Gastroenterology", "Nephrology"). If there is insufficient evidence to identify a specific specialty, use "General Practice" or "Internal Medicine" rather than inventing a condition.
     * "care_type": Exactly one of ["specialist", "urgent_care", "pharmacist", "primary_care"].
     * "clinical_summary": Concise clinical summary of the user's health concern or question for care navigation handoff.
   - For emergency symptoms (e.g. severe crushing chest pain, acute heart attack signs, stroke-like symptoms, acute severe breathing difficulty / cyanosis):
     * "care_type": "urgent_care"
     * "risk_level": "High"
     * Advise urgent medical evaluation without claiming a definitive diagnosis.

Return a JSON structure:
{
  "answer": "Clear, concise direct answer to the question, formulated as informational clinical assistant guidance, NOT a direct diagnosis.",
  "evidence": "Direct quote or document source with date verifying the answer (e.g. 'Allergy noted in prescription_xyz.pdf from Sept 2025').",
  "confidence": Integer from 0 to 100 representing your reasoning confidence,
  "risk_level": "Low" | "Medium" | "High",
  "recommendation": "Clinical warning/recommendation. MUST recommend consulting a doctor, practitioner, or pharmacist if risk is Medium/High or confidence < 80.",
  "care_navigation": {
    "is_care_seeking": boolean,
    "suggested_specialty": "string or null",
    "care_type": "specialist" | "urgent_care" | "pharmacist" | "primary_care" | null,
    "clinical_summary": "string or null"
  }
}
`;

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please configure a valid OPENAI_API_KEY.');
      }
      try {
        const response = await openaiClient.chat.completions.create({
          model: REASON_MODEL_NAME,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'user', content: prompt }
          ]
        });
        return this.cleanJsonParse(response.choices[0].message.content);
      } catch (error) {
        console.error('[AI Service Error] OpenAI QA response generation failed:', error.message);
        if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
          throw new Error('OpenAI AI API rate limit/quota exceeded. Clinical Assistant is temporarily unavailable.');
        }
        throw new Error(`Clinical Assistant failed: ${error.message}`);
      }
    }

    // Default: Gemini
    if (!genAI) {
      throw new Error('Gemini AI Service is not initialized. Please configure a valid GEMINI_API_KEY.');
    }

    try {
      const model = genAI.getGenerativeModel({ model: REASON_MODEL_NAME });
      
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      return this.cleanJsonParse(result.response.text());
    } catch (error) {
      console.error('[AI Service Error] Gemini QA response generation failed:', error.message);
      if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
        throw new Error('Gemini AI API rate limit/quota exceeded. Clinical Assistant is temporarily unavailable.');
      }
      throw new Error(`Clinical Assistant failed: ${error.message}`);
    }
  }

  /**
   * Generates a 30-day health trajectory forecast based on chronological vitals/medication history.
   * Uses clinical safety guidelines and disclaimers.
   * 
   * @param {Array<Object>} events - Array of medical events with nested medications and lab results
   * @param {Object} patientInfo - Patient profile details
   * @returns {Promise<Object>} Object containing risk categories, trajectories, metrics, and disclaimers
   */
  static async generateHealthForecast(events, patientInfo) {
    if (!events || events.length === 0) {
      return {
        forecast_metrics: [],
        overall_wellness_forecast: "No historic clinical events parsed yet. Please upload patient medical records to enable predictive trajectory forecasting.",
        cardiovascular_risk_projection: "Insufficient Data",
        safety_disclaimer: "This is an AI-generated health trajectory projection based on historic vital patterns. It does not constitute a diagnostic clinical forecast or treatment recommendation. Clinicians must verify trends manually."
      };
    }

    const systemPrompt = `
You are a Clinical Intelligence and Predictive Health AI. Review this patient's chronological medical records and generate a 30-day health trajectory forecast based strictly on the historic trend metrics, vitals, lab results, and medications.

Analyze and predict:
1. Projected trends for key vitals/lab values (e.g. Blood Sugar, Blood Pressure, Hemoglobin, Weight) based on historical values.
2. An overall wellness trajectory description.
3. A cardiovascular risk projection category (Low, Moderate, High, or Insufficient Data).

Return a strict JSON object with this exact shape:
{
  "forecast_metrics": [
    {
      "metric": "Blood Sugar" | "Blood Pressure" | "Hemoglobin" | "Weight" | etc.,
      "current_status": "e.g., 140 mg/dL",
      "projected_trend": "Improving" | "Stable" | "Declining" | "Risk of Elevation",
      "confidence": Float between 0 and 100,
      "rationale": "Brief scientific rationale based on medication changes or lab trends."
    }
  ],
  "overall_wellness_forecast": "A user-friendly description of the patient's projected health trajectory for the next 30 days.",
  "cardiovascular_risk_projection": "Low" | "Moderate" | "High" | "Insufficient Data",
  "safety_disclaimer": "This is an AI-generated health trajectory projection based on historic vital patterns. It does not constitute a diagnostic clinical forecast or treatment recommendation. Clinicians must verify trends manually."
}

Important: Do not prescribe any medication adjustments. Focus strictly on trend trajectories.
`;

    const userPrompt = `Patient Profile:\n${JSON.stringify(patientInfo)}\n\nChronological Medical History Events:\n${JSON.stringify(events)}`;

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized.');
      }
      try {
        const response = await openaiClient.chat.completions.create({
          model: REASON_MODEL_NAME,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        return this.cleanJsonParse(response.choices[0].message.content);
      } catch (error) {
        console.error('[AI Service Error] OpenAI health forecast failed:', error.message);
        throw error;
      }
    } else {
      if (!genAI) {
        throw new Error('Google Gemini client is not initialized.');
      }
      try {
        const model = genAI.getGenerativeModel({
          model: REASON_MODEL_NAME,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent([systemPrompt, userPrompt]);
        const text = result.response.text();
        return this.cleanJsonParse(text);
      } catch (error) {
        console.error('[AI Service Error] Gemini health forecast failed:', error.message);
        throw error;
      }
    }
  }

  /**
   * AI-Native Specialty & Care-Type Reasoning Engine (Round 2)
   * Analyzes structured clinical findings and context to deduce recommended specialty, care type,
   * confidence, alternative specialties, clinical basis, and uncertainty.
   * 
   * @param {Object} clinicalContext - Structured finding and evidence context
   * @returns {Promise<Object>} Structured recommendation reasoning matching Round 2 schema
   */
  static async reasonCareSpecialty(clinicalContext) {
    const systemPrompt = `
You are an expert Clinical Care Navigation and Medical Specialty Triage AI.
Your responsibility is to analyze structured clinical findings detected in a patient's medical records and determine the most appropriate healthcare specialty or care category for professional consultation.

You must follow these strict clinical safety rules:
1. NEVER diagnose the patient or claim they have a specific disease.
2. NEVER invent clinical evidence, symptoms, lab values, or medications not present in the provided context.
3. NEVER assume a narrow, overly specific sub-specialty unless the clinical evidence and diagnosis clearly justify it.
4. When the finding is ambiguous, non-specific, low-confidence, or multi-system, PREFER "General Practice" or "Internal Medicine" as the primary recommended specialty.
5. Allowed care types are strictly one of:
   - "primary_care" (General Physician, Family Medicine, Internal Medicine)
   - "specialist" (e.g., Cardiology, Endocrinology, Gastroenterology, Nephrology, Pulmonology, Neurology, Dermatology, Orthopedics, Oncology, etc.)
   - "pharmacist" (for medication interactions, dosage duplications, prescription discrepancies, or drug queries)
   - "urgent_care" (for severe, critical, or rapidly destabilizing vital/lab abnormalities)
6. For medication-related concerns (e.g., duplicate prescriptions, conflicting dosages, drug interactions), determine whether a Clinical Pharmacist, Prescribing Physician, or Primary Care Physician is the best initial point of review.
7. Provide realistic alternative specialties (e.g., if Cardiology is recommended, Internal Medicine or General Practice may be valid alternatives).
8. State clear, concise, evidence-based reasoning ("reason") explaining why this care type is suggested, citing the specific evidence points ("clinicalBasis").
9. If evidence is sparse, insufficient, or uncertain, set "uncertainty" to true and explain why general evaluation is safer.

Return STRICT JSON matching this exact schema:
{
  "recommendedSpecialty": "string (e.g., 'Cardiology', 'Internal Medicine', 'General Practice', 'Clinical Pharmacology', 'Endocrinology', etc.)",
  "careType": "primary_care" | "specialist" | "pharmacist" | "urgent_care",
  "reason": "Clear explanation of why this professional type is suggested based on the records.",
  "confidence": 0.0 to 1.0 (float representing reasoning certainty),
  "alternativeSpecialties": [
    {
      "specialty": "string",
      "confidence": 0.0 to 1.0,
      "rationale": "Brief rationale for why this alternative is viable"
    }
  ],
  "clinicalBasis": [
    "List of direct evidence points or observations from the finding context that informed this recommendation"
  ],
  "uncertainty": boolean
}
`;

    const userPrompt = `Clinical Finding Context:\n${JSON.stringify(clinicalContext, null, 2)}`;

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please configure a valid OPENAI_API_KEY.');
      }
      try {
        const response = await openaiClient.chat.completions.create({
          model: REASON_MODEL_NAME,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        return this.cleanJsonParse(response.choices[0].message.content);
      } catch (error) {
        console.error('[AI Service Error] OpenAI specialty reasoning failed:', error.message);
        throw error;
      }
    } else {
      if (!genAI) {
        throw new Error('Google Gemini client is not initialized. Please configure a valid GEMINI_API_KEY.');
      }
      try {
        const model = genAI.getGenerativeModel({
          model: REASON_MODEL_NAME,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent([systemPrompt, userPrompt]);
        const text = result.response.text();
        return this.cleanJsonParse(text);
      } catch (error) {
        console.error('[AI Service Error] Gemini specialty reasoning failed:', error.message);
        throw error;
      }
    }
  }

  /**
   * AI-Native Semantic Specialty Matcher
   * Evaluates the semantic and clinical relevance between an AI-recommended specialty
   * and a batch of candidate healthcare providers.
   * 
   * @param {string} recommendedSpecialty - e.g. "Cardiology", "Endocrinology"
   * @param {string} careType - e.g. "specialist", "pharmacist", "primary_care"
   * @param {Array<Object>} candidates - Array of { id, name, category, facilityType }
   * @returns {Promise<Array<Object>>} Array of { id, score, rationale }
   */
  static async matchProviderSpecialtiesSemantic(recommendedSpecialty, careType, candidates = []) {
    if (!candidates || candidates.length === 0) return [];

    const systemPrompt = `
You are an expert Clinical Directory Semantic Matcher.
Your task is to evaluate the clinical relevance between a recommended healthcare specialty and candidate healthcare providers.

Instructions:
1. For each candidate provider, evaluate their clinical and domain relevance to the recommended specialty (${recommendedSpecialty}) and care category (${careType}).
2. Assign a relevance score between 15 and 40 points and provide a precise rationale:
   - 38 - 40 points: Direct specialty focus (e.g. Cardiology matching "Heart & Vascular Centre", "Cardiac Clinic"; Endocrinology matching "Diabetes & Hormone Clinic"). Rationale: "Specialized facility aligned with ${recommendedSpecialty} care."
   - 32 - 37 points: Multidisciplinary hospital or direct care-type match (e.g. licensed pharmacy for pharmacist care, or teaching/general hospital). Rationale: "Comprehensive hospital facility suitable for multidisciplinary assessment and referral."
   - 25 - 31 points: General outpatient medical clinic without dedicated specialty tags. Rationale: "General medical clinic suitable for initial assessment and referral."
   - 15 - 24 points: Generic or unrelated facility. Rationale: "General medical facility suitable for initial assessment and referral."
3. Do NOT claim that an unspecialized clinic or hospital is a dedicated specialty facility unless its name or category explicitly indicates that specialty.
4. Never invent providers or ratings. Only evaluate the given candidate IDs.

Return STRICT JSON:
{
  "matches": [
    {
      "id": "string matching candidate id",
      "score": number between 15 and 40,
      "rationale": "Concise rationale for semantic match"
    }
  ]
}
`;

    const userPrompt = `Recommended Specialty: ${recommendedSpecialty}\nCare Category: ${careType}\n\nCandidate Providers:\n${JSON.stringify(candidates.map(c => ({ id: c.id, name: c.name, category: c.category, facilityType: c.facilityType })), null, 2)}`;

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized.');
      }
      try {
        const response = await openaiClient.chat.completions.create({
          model: REASON_MODEL_NAME,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        });
        const parsed = this.cleanJsonParse(response.choices[0].message.content);
        return Array.isArray(parsed.matches) ? parsed.matches : [];
      } catch (error) {
        console.error('[AI Service Error] OpenAI semantic matching failed:', error.message);
        throw error;
      }
    } else {
      if (!genAI) {
        throw new Error('Google Gemini client is not initialized.');
      }
      try {
        const model = genAI.getGenerativeModel({
          model: REASON_MODEL_NAME,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent([systemPrompt, userPrompt]);
        const text = result.response.text();
        const parsed = this.cleanJsonParse(text);
        return Array.isArray(parsed.matches) ? parsed.matches : [];
      } catch (error) {
        console.error('[AI Service Error] Gemini semantic matching failed:', error.message);
        throw error;
      }
    }
  }
}


