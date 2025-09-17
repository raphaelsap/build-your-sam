import { createPerplexityChatCompletion } from '../clients/perplexityClient.js';
import { extractFirstJsonArray } from '../utils/json.js';

const SOLUTION_SYSTEM_PROMPT = `You are a research assistant helping solution architects understand enterprise software landscapes. Always respond with valid JSON.`;

export async function fetchCompanySolutions(companyName) {
  const trimmedName = companyName?.trim();
  if (!trimmedName) {
    throw new Error('Company name is required.');
  }

  const messages = [
    {
      role: 'system',
      content: SOLUTION_SYSTEM_PROMPT,
    },
    {
      role: 'user',
      content: `Identify the top enterprise software solutions or SaaS platforms likely used by ${trimmedName}. Focus on connectivity-relevant platforms such as ERP, CRM, HRIS, supply chain, analytics, data lake, or iPaaS. Return a JSON array of up to 10 objects with the schema { "name": string, "logoUrl": string | null }. Ensure logo URLs are direct image links (prefer SVG or PNG) from official brand libraries or well-known logo CDNs. If a trustworthy logo URL is unavailable, set "logoUrl" to null.`,
    },
  ];

  const response = await createPerplexityChatCompletion(messages, {
    temperature: 0.2,
    top_p: 0.7,
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Perplexity returned an empty response.');
  }

  const rawSolutions = extractFirstJsonArray(content).slice(0, 10);

  return rawSolutions
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name.trim() : null,
      logoUrl:
        typeof item.logoUrl === 'string' && item.logoUrl.trim().length > 0
          ? item.logoUrl.trim()
          : null,
    }))
    .filter((item) => item.name);
}
