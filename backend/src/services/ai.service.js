import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the application behaves safely even if the API Key is not set up yet
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('[AI Warning] GEMINI_API_KEY is not defined. AI queries and clinical reasoning services will fail.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Standard models to utilize
const EXTRACT_MODEL_NAME = 'gemini-2.0-flash-lite'; // Optimized for multimodal speed & cost
const EMBED_MODEL_NAME = 'gemini-embedding-001';  // Gemini's standard 3072-dim embedding model
const REASON_MODEL_NAME = 'gemini-2.0-flash-lite';  // Fast reasoning model for analysis & Q&A

/**
 * Service orchestrating LLM logic using the Google Generative AI SDK.
 * Follows SOLID principles by keeping LLM communication isolated from controllers.
 */
export class AiService {

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
    if (!genAI) {
      // Fallback vector for local testing if API key is missing
      return Array(768).fill(0).map(() => Math.random());
    }

    try {
      const model = genAI.getGenerativeModel({ model: EMBED_MODEL_NAME });
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('Invalid response structure from Gemini Embedding API.');
      }
      
      return result.embedding.values;
    } catch (error) {
      console.error('[AI Service Error] Embedding generation failed:', error.message);
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

      const systemPrompt = `
You are an expert AI medical record parser. Your job is to perform OCR on the medical document and extract information into a clean, structured JSON format.
Analyze the document carefully. If certain information is not present, use null or an empty array. Do not guess or hallucinate details.

Supported document types are: "Prescription", "Lab Report", "Discharge Summary", "Medical Notes".
Patient gender can be: "Male", "Female", "Other", or null.
Format all dates as YYYY-MM-DD (format dates ISO. If year is missing or unclear, infer rationally or default to 2026-07-25 if completely unknown).

Format the output strictly as a JSON object matching this structure:
{
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
    if (!genAI) {
      throw new Error('Gemini AI Service is not initialized. Please configure a valid GEMINI_API_KEY.');
    }
    if (events.length === 0) {
      return [];
    }

    try {
      const model = genAI.getGenerativeModel({ model: REASON_MODEL_NAME });
      
      const payload = {
        patient: patientInfo,
        history: events
      };

      const systemPrompt = `
You are a Clinical Intelligence and Patient Safety AI. Review this patient's chronological medical records and generate evidence-based clinical insights.
Strictly search for:
1. Duplicate Medications: The same medicine or same drug class prescribed across different visits overlapping in dates.
2. Dosage Conflicts: Changes in dosage (e.g. 500mg to 1000mg) or contradictions.
3. Health Trends: Track critical lab results or physical metrics (Weight, Temperature, Blood Pressure, Hemoglobin) over time and alert on negative or significant patterns.
4. Record Quality Issues: Check for patient identity mismatches (e.g. doctor logs a different patient name on the file), missing allergy warnings, or clear mathematical inconsistencies (e.g. quantity vs duration).

Provide insights as an array of JSON objects following this exact format:
[
  {
    "insight_type": "duplicate_medication" | "dosage_conflict" | "trend_alert" | "quality_issue",
    "description": "Clear medical warning or description of the trend.",
    "confidence_score": Float between 0 and 100,
    "evidence": "Brief citation. e.g., 'Same medication Paracetamol found in prescriptions dated 2019-10-03 and 2020-01-02.'"
  }
]

Important: Focus only on real issues. If there are no issues, return an empty array [].
`;

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

      return this.cleanJsonParse(result.response.text());
    } catch (error) {
      console.error('[AI Service Error] Longitudinal analysis failed:', error.message);
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
  static async answerQuestionWithContext(question, contextChunks) {
    if (!genAI) {
      throw new Error('Gemini AI Service is not initialized. Please configure a valid GEMINI_API_KEY.');
    }

    try {
      const model = genAI.getGenerativeModel({ model: REASON_MODEL_NAME });
      
      const contextText = contextChunks.join('\n\n');
      
      const prompt = `
Context from Patient Medical Records:
${contextText}

Question:
${question}

Instructions:
You are an intelligent, evidence-based clinical assistant. Answer the user's question using ONLY the provided medical records context.
If the answer cannot be found in the context, state: "I cannot find this information in the uploaded records." and do not speculate.

Every response must be safe, explainable, and return a JSON structure:
{
  "answer": "Clear, concise direct answer to the question.",
  "evidence": "Direct quote or document source with date verifying the answer.",
  "confidence": Integer from 0 to 100 representing your extraction confidence,
  "risk_level": "Low" | "Medium" | "High" (Assess if the query relates to critical medications, allergies, or high-risk findings),
  "recommendation": "Clinical advice or note (e.g. 'Please confirm with Dr. Smith regarding the dosage mismatch.')"
}
`;

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
      console.error('[AI Service Error] QA response generation failed:', error.message);
      if (error.message.includes('429') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('limit')) {
        throw new Error('Gemini AI API rate limit/quota exceeded. Clinical Assistant is temporarily unavailable.');
      }
      throw new Error(`Clinical Assistant failed: ${error.message}`);
    }
  }
}
