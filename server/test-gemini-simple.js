import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('🧪 Direct Gemini 2.5 Pro Test...');

async function testDirect() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    
    console.log('Testing gemini-2.5-pro directly...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const result = await model.generateContent([
      { text: 'Hello! What version of Gemini are you? Please respond with your capabilities.' }
    ]);
    
    const response = result.response;
    console.log('✅ Raw response:', response);
    console.log('✅ Text:', response.text());
    console.log('✅ Usage:', response.usageMetadata);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.status) {
      console.log('Status:', error.status);
    }
  }
}

testDirect();