import dotenv from 'dotenv';
import { query } from './src/config/db.js';
import { AiService } from './src/services/ai.service.js';

dotenv.config();

async function runPhase8Scenarios() {
  console.log('================================================================');
  console.log('       MedAI Round 2 — Phase 8 Chatbot Integration Tests        ');
  console.log('================================================================\n');

  // Sample context representing patient's medical records
  const sampleContextChunks = [
    `[Source Document: lab_report_2025.pdf (Laboratory Report), Uploaded: 11/15/2025]
Content:
HbA1c: 9.2 % (High, Ref: 4.0 - 5.6 %)
Fasting Blood Sugar: 210 mg/dL (High, Ref: 70 - 99 mg/dL)
Serum Creatinine: 1.1 mg/dL (Normal)
Blood Pressure: 145/92 mmHg`,
    `[Source Document: prescription_nov2025.pdf (Prescription), Uploaded: 11/20/2025]
Content:
Rx:
1. Metformin 500mg - 1 tab twice daily with meals
2. Lisinopril 10mg - 1 tab daily
3. Enalapril 10mg - 1 tab daily (Warning: duplicate ACE inhibitor)`
  ];

  const testCases = [
    {
      id: 'TEST 1 — Diabetes Care Inquiry',
      question: 'My sugar has been very high recently. Which doctor should I see?',
      validate: (res) => {
        const isSeeking = res.care_navigation?.is_care_seeking === true;
        const specialty = (res.care_navigation?.suggested_specialty || '').toLowerCase();
        const careType = res.care_navigation?.care_type;
        const validSpecialty = specialty.includes('endo') || specialty.includes('internal') || specialty.includes('general');
        const validCareType = careType === 'specialist' || careType === 'primary_care';
        return {
          pass: isSeeking && validSpecialty && validCareType,
          summary: `is_care_seeking: ${isSeeking}, specialty: "${res.care_navigation?.suggested_specialty}", care_type: ${careType}`
        };
      }
    },
    {
      id: 'TEST 2 — Medication Conflict Inquiry',
      question: 'I think two of my blood pressure medicines are the same. Who should I talk to?',
      validate: (res) => {
        const isSeeking = res.care_navigation?.is_care_seeking === true;
        const careType = res.care_navigation?.care_type;
        const specialty = (res.care_navigation?.suggested_specialty || '').toLowerCase();
        const validCareType = careType === 'pharmacist' || careType === 'specialist' || careType === 'primary_care';
        return {
          pass: isSeeking && validCareType,
          summary: `is_care_seeking: ${isSeeking}, specialty: "${res.care_navigation?.suggested_specialty}", care_type: ${careType}`
        };
      }
    },
    {
      id: 'TEST 3 — Location Request',
      question: 'Can you help me find a doctor in Jaffna for my heart condition?',
      validate: (res) => {
        const isSeeking = res.care_navigation?.is_care_seeking === true;
        const specialty = (res.care_navigation?.suggested_specialty || '').toLowerCase();
        const careType = res.care_navigation?.care_type;
        const validSpecialty = specialty.includes('cardio') || specialty.includes('internal') || specialty.includes('general');
        return {
          pass: isSeeking && validSpecialty,
          summary: `is_care_seeking: ${isSeeking}, specialty: "${res.care_navigation?.suggested_specialty}", care_type: ${careType}`
        };
      }
    },
    {
      id: 'TEST 4 — Emergency Symptom Presentation',
      question: 'I have severe crushing chest pain and shortness of breath right now.',
      validate: (res) => {
        const isSeeking = res.care_navigation?.is_care_seeking === true;
        const careType = res.care_navigation?.care_type;
        const riskLevel = res.risk_level;
        const answerLower = (res.answer || '').toLowerCase();
        const noDefinitiveDx = !answerLower.includes('you are having a heart attack');
        const isUrgent = careType === 'urgent_care' && riskLevel === 'High' && noDefinitiveDx;
        return {
          pass: isSeeking && isUrgent,
          summary: `is_care_seeking: ${isSeeking}, care_type: ${careType}, risk_level: ${riskLevel}, non_diagnostic: ${noDefinitiveDx}`
        };
      }
    },
    {
      id: 'TEST 5 — Pure Informational Question',
      question: 'What was my HbA1c on my last blood report?',
      validate: (res) => {
        const isNotSeeking = res.care_navigation?.is_care_seeking === false;
        const hasFactualAnswer = (res.answer || '').includes('9.2') || (res.evidence || '').includes('9.2');
        return {
          pass: isNotSeeking && hasFactualAnswer,
          summary: `is_care_seeking: ${res.care_navigation?.is_care_seeking}, answer_contains_hba1c: ${hasFactualAnswer}`
        };
      }
    }
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`\n--- Running [${tc.id}] ---`);
    console.log(`Question: "${tc.question}"`);

    try {
      const res = await AiService.answerQuestionWithContext(tc.question, sampleContextChunks, []);
      console.log(`Answer Preview: "${(res.answer || '').substring(0, 100)}..."`);
      console.log(`Care Navigation:`, JSON.stringify(res.care_navigation, null, 2));

      const v = tc.validate(res);
      if (v.pass) {
        console.log(`✅ PASS: ${v.summary}`);
        passedCount++;
      } else {
        console.error(`❌ FAIL: ${v.summary}`);
      }
    } catch (err) {
      console.error(`❌ ERROR: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(` Phase 8 Scenarios Result: ${passedCount} / ${testCases.length} Passed`);
  console.log('================================================================\n');

  if (passedCount !== testCases.length) {
    process.exit(1);
  }
}

runPhase8Scenarios();
