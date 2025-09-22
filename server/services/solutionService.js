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
    sap: 'https://upload.wikimedia.org/wikipedia/commons/5/59/SAP_2011_logo.svg',
    salesforce: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
    servicenow: 'https://upload.wikimedia.org/wikipedia/commons/0/05/ServiceNow_logo.svg',
    workday: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Workday_logo.svg',
    snowflake: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Snowflake_Logo.svg',
    slack: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
    jira: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Jira_%28Software%29_logo.svg',
    oracle: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg',
    mulesoft: 'https://upload.wikimedia.org/wikipedia/commons/6/60/MuleSoft_logo.svg',
    'google cloud': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Google_Cloud_logo.svg',
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
