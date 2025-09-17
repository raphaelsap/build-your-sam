import OpenAI from 'openai';
import { config } from '../config.js';

const openAiClient = config.openAiApiKey
  ? new OpenAI({ apiKey: config.openAiApiKey })
  : null;

export async function createOpenAiChatCompletion(messages, options = {}) {
  if (!openAiClient) {
    throw new Error('OpenAI API key is not configured. Set OPENAI_API_KEY in your environment.');
  }

  try {
    const response = await openAiClient.chat.completions.create({
      model: config.openAiModel,
      messages,
      ...options,
    });

    return response;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown OpenAI error';
    throw new Error(`OpenAI request failed: ${errorMessage}`);
  }
}
