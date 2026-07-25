import dotenv from 'dotenv';
import { AiService } from './src/services/ai.service.js';

dotenv.config();

/**
 * Diagnostic sanity script to test connection to Google Gemini API
 * and ensure that multimodal parsing operates correctly.
 * 
 * Run using: npm run test:ai
 */
async function runDiagnostic() {
  console.log('=====================================================');
  console.log('   MedAI Clinical Intelligence Engine Diagnostics   ');
  console.log('=====================================================');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[Error] GEMINI_API_KEY environment variable is not defined.');
    console.log('\nPlease configure your .env file inside the backend directory:');
    console.log('GEMINI_API_KEY=your_actual_key_here');
    process.exit(1);
  }

  console.log('[System] Checking Gemini API authentication...');
  
  try {
    // 1. Test Embedding Generation
    console.log('[AI] Testing text-embedding-004 embedding generation...');
    const testText = 'Patient John Doe was diagnosed with Type 2 Diabetes on 2019-10-03.';
    const vector = await AiService.generateEmbedding(testText);
    console.log(`[Success] Embedding generated successfully. Dimension count: ${vector.length}`);

    // 2. Test Structured Entity Extraction
    console.log('[AI] Testing gemini-1.5-flash document extraction model...');
    const mockFileBuffer = Buffer.from('Patient Name: Priya Sharma. Date: 2020-01-02. Symptoms: High fever, cough. Recommendation: Take Paracetamol 500mg twice daily for 5 days. Dr. Sen.');
    const extracted = await AiService.extractMedicalData(mockFileBuffer, 'text/plain');
    
    console.log('[Success] AI parsed and returned structured JSON:');
    console.log(JSON.stringify(extracted, null, 2));

    // 3. Test Longitudinal reasoning
    console.log('[AI] Testing clinical safety analytics engine...');
    const mockHistory = [
      {
        event_date: '2019-10-03',
        doctor_name: 'Dr. Sen',
        diagnosis: 'Fever',
        medications: [{ medicine_name: 'Paracetamol', dosage: '500mg', frequency: 'Morning/Night', duration: '5 days' }]
      },
      {
        event_date: '2020-01-02',
        doctor_name: 'Dr. Sen',
        diagnosis: 'High Fever',
        medications: [{ medicine_name: 'Paracetamol', dosage: '1000mg', frequency: 'Three times daily', duration: '5 days' }]
      }
    ];
    const insights = await AiService.analyzeLongitudinalInsights(mockHistory, { patient_name: 'Priya Sharma', age: 32, gender: 'Female' });
    console.log('[Success] safety insights parsed:');
    console.log(JSON.stringify(insights, null, 2));

    console.log('\n=====================================================');
    console.log('   All AI services successfully verified & active!   ');
    console.log('=====================================================');
  } catch (error) {
    console.error('\n[Fatal Error] Diagnostic check failed:');
    console.error(error.message);
    process.exit(1);
  }
}

runDiagnostic();
