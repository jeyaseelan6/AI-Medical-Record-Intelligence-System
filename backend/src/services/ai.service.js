import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { createRequire } from 'module';
import dotenv from 'dotenv';

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

// Dynamic model names config from environment variables (SOLID provider abstraction)
const EXTRACT_MODEL_NAME = process.env.EXTRACT_MODEL_NAME || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-lite');
const EMBED_MODEL_NAME = process.env.EMBED_MODEL_NAME || (provider === 'openai' ? 'text-embedding-3-large' : 'gemini-embedding-001');
const REASON_MODEL_NAME = process.env.REASON_MODEL_NAME || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-lite');

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

    if (provider === 'openai') {
      if (!openaiClient) {
        throw new Error('OpenAI client is not initialized. Please configure a valid OPENAI_API_KEY.');
      }
      try {
        let responseText = '';
        
        if (mimeType === 'application/pdf') {
          // Parse PDF content to text representation
          const pdfData = await pdf(fileBuffer);
          const pdfText = pdfData.text || '';
          
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
        return this.cleanJsonParse(response.choices[0].message.content);
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

      return this.cleanJsonParse(result.response.text());
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
  static async answerQuestionWithContext(question, contextChunks) {
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
}
