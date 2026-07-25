import dotenv from 'dotenv';

dotenv.config();

async function listModelsRaw() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env.');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    console.log(`[REST] Fetching models registry from: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('[API Error] Service returned an error response:');
      console.error(JSON.stringify(data.error, null, 2));
      return;
    }

    if (!data.models || data.models.length === 0) {
      console.log('No models returned. API response:');
      console.log(data);
      return;
    }

    console.log('\nAvailable Models for your API Key:');
    data.models.forEach(model => {
      console.log(` - Name: ${model.name}`);
      console.log(`   Display: ${model.displayName}`);
      console.log(`   Methods: ${(model.supportedGenerationMethods || []).join(', ')}`);
      console.log('');
    });

  } catch (err) {
    console.error('[System Error] Raw fetch query failed:', err.message);
  }
}

listModelsRaw();
