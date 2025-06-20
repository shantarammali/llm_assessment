import { OpenAI } from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
// services/llmService.ts
const explanationCache = new Map<string, string>();

/**
 * Retrieves an LLM explanation for a given prompt with caching support.
 * If the explanation has been previously generated for the same prompt,
 * it returns the cached version to improve performance and reduce API calls.
 * 
 * @param prompt - The input prompt to generate an explanation for
 * @returns Promise<string> - The LLM-generated explanation
 */

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
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
  });
  return response?.choices[0]?.message?.content?.trim() || '';
}

async function callFakeLLM(prompt: string): Promise<string> {
  return `Fallback LLM: Risk analysis for ${prompt}`;
}
