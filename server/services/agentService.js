import { createPerplexityChatCompletion } from '../clients/perplexityClient.js';
import { createOpenAiChatCompletion } from '../clients/openAiClient.js';
import { extractFirstJsonObject } from '../utils/json.js';
import { config } from '../config.js';

const CONTEXT_SYSTEM_PROMPT = `You are an integration strategist that researches enterprise systems and their data flows. Provide crisp, factual insights.`;
const AGENT_SYSTEM_PROMPT = `You are a product marketer for Solace Agent Mesh. Craft compelling but concise agent concepts. Always respond using JSON.`;

async function buildIntegrationContext(solutionNames, prioritiesText) {
  const prioritiesLine = prioritiesText
    ? `Focus on the customer's stated annual priorities: ${prioritiesText}.`
    : 'No explicit customer priorities were provided; infer typical goals for these platforms.';

  const userInstructions = `Provide a tight 140-word briefing on why connecting ${solutionNames.join(
    ', ',
  )} unlocks value. ${prioritiesLine} Highlight the personas served, key data exchanged, latency or reliability concerns, and the north-star business outcome. Format your answer as markdown with two sections: "Opportunities" (bulleted) and "Observability Signals" (bulleted).`;

  try {
    const response = await createPerplexityChatCompletion(
      [
        { role: 'system', content: CONTEXT_SYSTEM_PROMPT },
        { role: 'user', content: userInstructions },
      ],
      { temperature: 0.35, top_p: 0.7 },
    );

    return response?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    return '';
  }
}

async function craftAgentConcept(solutionNames, context, prioritiesText) {
  const solutionList = solutionNames.join(' + ');
  const priorityCue = prioritiesText
    ? `Priorities to honor: ${prioritiesText}. Anchor on these outcomes.`
    : 'No explicit priorities; emphasise the most material business outcome.';

  const coreInstructions = `Design a Solace Agent Mesh concept that orchestrates ${solutionList}. Use the research context below to stay grounded.

[Context]\n${context || 'No additional context available.'}\n
${priorityCue}

Return a JSON object with keys: agentName (string, 4 words max), description (string, <=40 words), roiEstimate (string summarising 12-month ROI in dollars or percentage, <=25 words), draftPrompt (string, 120-180 words written in second person, with clear goals, data sources, guardrails, and success metrics).`;

  if (config.openAiApiKey) {
    const response = await createOpenAiChatCompletion(
      [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: coreInstructions },
      ],
      { temperature: 0.55 },
    );
    const content = response?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }
    return extractFirstJsonObject(content);
  }

  const fallbackResponse = await createPerplexityChatCompletion(
    [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      { role: 'user', content: coreInstructions },
    ],
    { temperature: 0.5, top_p: 0.75 },
  );

  const fallbackContent = fallbackResponse?.choices?.[0]?.message?.content?.trim();
  if (!fallbackContent) {
    throw new Error('Perplexity fallback returned an empty response.');
  }
  return extractFirstJsonObject(fallbackContent);
}

export async function generateAgentConcept(solutionNames, prioritiesText = '') {
  if (!Array.isArray(solutionNames) || solutionNames.length < 2 || solutionNames.length > 3) {
    throw new Error('Provide a list of 2 or 3 solution names.');
  }

  const trimmed = solutionNames.map((item) => String(item).trim()).filter(Boolean);
  if (trimmed.length < 2) {
    throw new Error('Each solution name must be a non-empty string.');
  }

  const context = await buildIntegrationContext(trimmed, prioritiesText?.trim() || '');
  const agentDraft = await craftAgentConcept(trimmed, context, prioritiesText?.trim() || '');

  return {
    agentName: agentDraft.agentName?.trim() || 'Hybrid Integration Agent',
    description: agentDraft.description?.trim() ||
      `Coordinates ${trimmed.join(' and ')} with Solace Agent Mesh to streamline enterprise flows.`,
    draftPrompt: agentDraft.draftPrompt?.trim() || 'Provide a comprehensive agent prompt here.',
    roiEstimate: agentDraft.roiEstimate?.trim() || 'ROI TBD – refine with customer benchmarks.',
    context,
    solutions: trimmed,
  };
}
