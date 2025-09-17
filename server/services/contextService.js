import { createPerplexityChatCompletion } from '../clients/perplexityClient.js';
import { extractFirstJsonObject } from '../utils/json.js';

const CONTEXT_SYSTEM_PROMPT = `You are an enterprise integration analyst. Always respond with concise JSON that can be rendered in dashboards.`;

export async function fetchEnterpriseContext(companyName) {
  const cleanName = companyName?.trim();
  if (!cleanName) {
    throw new Error('Company name is required to discover enterprise context.');
  }

  const messages = [
    { role: 'system', content: CONTEXT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `For ${cleanName}, identify cross-platform integration insights that a Solace Agent Mesh demo should highlight.
Return JSON with shape {
  "synergyInsights": string[] (<=3),
  "industryComparisons": string[] (<=3),
  "priorityHeatmap": [{ "pair": string, "value": number (0-100), "rationale": string }]
}.
Guidelines:
- Draw on public benchmarks via Perplexity (e.g., "80% of regional peers integrate CRM + ERP via event streams").
- Focus on platforms such as SAP, Salesforce, ServiceNow, Workday, Snowflake, Jira, Slack.
- Ensure "pair" is formatted like "SAP + Salesforce" and reflects regional considerations (APAC, EMEA, Americas, etc.).
- "value" indicates estimated strategic impact for a Solace agent linking that pair.`,
    },
  ];

  try {
    const response = await createPerplexityChatCompletion(messages, {
      temperature: 0.35,
      top_p: 0.75,
    });
    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Perplexity returned an empty enterprise context response.');
    }

    const parsed = extractFirstJsonObject(content);
    return {
      synergyInsights: Array.isArray(parsed.synergyInsights)
        ? parsed.synergyInsights.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [],
      industryComparisons: Array.isArray(parsed.industryComparisons)
        ? parsed.industryComparisons.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [],
      priorityHeatmap: Array.isArray(parsed.priorityHeatmap)
        ? parsed.priorityHeatmap
            .map((entry) => ({
              pair: typeof entry.pair === 'string' ? entry.pair.trim() : '',
              value: Number.isFinite(entry.value) ? Math.max(0, Math.min(100, Number(entry.value))) : 0,
              rationale: typeof entry.rationale === 'string' ? entry.rationale.trim() : '',
            }))
            .filter((entry) => entry.pair)
        : [],
    };
  } catch (error) {
    return {
      synergyInsights: [],
      industryComparisons: [],
      priorityHeatmap: [],
      error: error.message,
    };
  }
}
