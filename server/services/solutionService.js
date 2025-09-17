import { createPerplexityChatCompletion } from '../clients/perplexityClient.js';
import { extractFirstJsonArray } from '../utils/json.js';

const SOLUTION_SYSTEM_PROMPT = `You are a research assistant helping solution architects understand enterprise software landscapes. Always respond with valid JSON.`;

const FALLBACK_SOLUTIONS = [
  { name: 'SAP S/4HANA', logoUrl: LOGO_MAP_PLACEHOLDER('sap') },
  { name: 'Salesforce CRM', logoUrl: LOGO_MAP_PLACEHOLDER('salesforce') },
  { name: 'ServiceNow ITSM', logoUrl: LOGO_MAP_PLACEHOLDER('servicenow') },
  { name: 'Workday HCM', logoUrl: LOGO_MAP_PLACEHOLDER('workday') },
  { name: 'Snowflake Data Cloud', logoUrl: LOGO_MAP_PLACEHOLDER('snowflake') },
  { name: 'Slack', logoUrl: LOGO_MAP_PLACEHOLDER('slack') },
  { name: 'Jira Software', logoUrl: LOGO_MAP_PLACEHOLDER('jira') },
  { name: 'Oracle Fusion ERP', logoUrl: LOGO_MAP_PLACEHOLDER('oracle') },
  { name: 'MuleSoft Anypoint', logoUrl: LOGO_MAP_PLACEHOLDER('mulesoft') },
  { name: 'Google Cloud Platform', logoUrl: LOGO_MAP_PLACEHOLDER('google cloud') },
];

function LOGO_MAP_PLACEHOLDER(key) {
  const map = {
    sap: 'https://cdn.simpleicons.org/sap/0FAAFF',
    salesforce: 'https://cdn.simpleicons.org/salesforce/00A1E0',
    servicenow: 'https://cdn.simpleicons.org/servicenow/4CAF50',
    workday: 'https://cdn.simpleicons.org/workday/FF6319',
    snowflake: 'https://cdn.simpleicons.org/snowflake/29B5E8',
    slack: 'https://cdn.simpleicons.org/slack/4A154B',
    jira: 'https://cdn.simpleicons.org/jira/0052CC',
    oracle: 'https://cdn.simpleicons.org/oracle/F80000',
    mulesoft: 'https://cdn.simpleicons.org/mulesoft/009ADA',
    'google cloud': 'https://cdn.simpleicons.org/googlecloud/4285F4',
  };
  return map[key] || null;
}

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
      content: `Identify the top enterprise software solutions or SaaS platforms most likely used by ${trimmedName}. Optimise for systems that integrate cleanly with Solace Agent Mesh (e.g., SAP S/4HANA, Salesforce, ServiceNow, Workday, Snowflake, Slack, Jira, MuleSoft, Google Cloud). Return a JSON array of up to 10 objects with the schema { "name": string, "logoUrl": string | null }. Ensure logo URLs are direct image links (prefer SVG or PNG) from official brand libraries or well-known logo CDNs. If a trustworthy logo URL is unavailable, set "logoUrl" to null.`,
    },
  ];

  try {
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
  } catch (error) {
    const isNetworkIssue =
      error.message?.includes('ENOTFOUND') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('getaddrinfo');
    if (isNetworkIssue) {
      return FALLBACK_SOLUTIONS;
    }
    throw new Error(`Perplexity request failed: ${error.message}`);
  }
}
