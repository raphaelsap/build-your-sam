import { createPerplexityChatCompletion } from '../clients/perplexityClient.js';
import { extractFirstJsonObject } from '../utils/json.js';

const PRIORITY_SYSTEM_PROMPT = `You are an industry analyst who understands enterprise roadmaps and business priorities. Always answer with JSON.`;

export async function discoverCustomerPriorities(companyName) {
  const cleanName = companyName?.trim();
  if (!cleanName) {
    throw new Error('Company name is required to discover priorities.');
  }

  const messages = [
    { role: 'system', content: PRIORITY_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `For ${cleanName}, outline the top three executive priorities for the next 12 months that would motivate investment in connected digital operations. Return JSON with the shape { "priorities": string[<=3], "summary": string (<=80 words) }. Focus on measurable imperatives (e.g., latency reduction, margin protection, customer experience) and avoid generic statements.`,
    },
  ];

  try {
    const response = await createPerplexityChatCompletion(messages, {
      temperature: 0.25,
      top_p: 0.6,
    });

    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Perplexity returned an empty priorities response.');
    }

    const parsed = extractFirstJsonObject(content);
    const priorities = Array.isArray(parsed.priorities)
      ? parsed.priorities
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    return {
      priorities,
      summary:
        typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : priorities.join('; '),
    };
  } catch (error) {
    return {
      priorities: [],
      summary: '',
      error: error.message,
    };
  }
}
