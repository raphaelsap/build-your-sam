import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 3001,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY || '',
  perplexityModel: process.env.PERPLEXITY_MODEL || 'pplx-70b-online',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  nodeEnv: process.env.NODE_ENV || 'development',
};
