import { OpenAI } from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
// services/llmService.ts
const explanationCache = new Map<string, string>();

export async function getLLMExplanation(prompt: string): Promise<string> {
  if (explanationCache.has(prompt)) {
    return explanationCache.get(prompt)!;
  }

  const explanation = await callLLMWithFallback(prompt);
  explanationCache.set(prompt, explanation);
  return explanation;
}

async function callLLMWithFallback(prompt: string): Promise<string> {
  try {
    return await callOpenAI(prompt);
  } catch (err) {
    console.warn('Primary LLM failed, using fallback.');
    return await callFakeLLM(prompt);
  }
}

async function callOpenAI(prompt: string): Promise<string> {
  // Replace with real OpenAI fetch using your API key
  //return `OpenAI says: Risk explanation for ${prompt}`;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
  });
  return response?.choices[0]?.message?.content?.trim() || '';
}

async function callFakeLLM(prompt: string): Promise<string> {
  return `Fallback LLM: Risk analysis for ${prompt}`;
}
