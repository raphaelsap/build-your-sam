import axios from 'axios';
import { config } from '../config.js';

const client = axios.create({
  baseURL: 'https://api.perplexity.ai',
  timeout: 45000,
});

export async function createPerplexityChatCompletion(messages, options = {}) {
  if (!config.perplexityApiKey) {
    throw new Error('Perplexity API key is not configured. Set PERPLEXITY_API_KEY in your environment.');
  }

  try {
    const response = await client.post(
      '/chat/completions',
      {
        model: config.perplexityModel,
        messages,
        ...options,
      },
      {
        headers: {
          Authorization: `Bearer ${config.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown Perplexity error';
    throw new Error(`Perplexity request failed: ${errorMessage}`);
  }
}
