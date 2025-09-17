import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import fs from 'fs';

import { config } from './config.js';
import { fetchCompanySolutions } from './services/solutionService.js';
import { generateAgentConcept } from './services/agentService.js';
import { discoverCustomerPriorities } from './services/priorityService.js';
import { fetchEnterpriseContext } from './services/contextService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/solutions', async (req, res) => {
  const { company } = req.query;
  try {
    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'Query parameter "company" is required.' });
    }

    const [solutions, priorities, context] = await Promise.all([
      fetchCompanySolutions(company),
      discoverCustomerPriorities(company),
      fetchEnterpriseContext(company),
    ]);

    res.json({
      company: company.trim(),
      solutions,
      priorities,
      context,
    });
  } catch (error) {
    console.error('Error fetching solutions or context:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch solutions.' });
  }
});

app.post('/api/agent', async (req, res) => {
  const { solutions, priorities } = req.body || {};
  try {
    const agent = await generateAgentConcept(solutions, priorities);
    res.json(agent);
  } catch (error) {
    console.error('Error generating agent concept:', error);
    res.status(500).json({ error: error.message || 'Failed to generate agent concept.' });
  }
});

const distPath = path.resolve(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn('Static assets not found. Build the client with `npm run build` to enable production mode.');
}

app.listen(config.port, () => {
  console.log(`Build Your Solace Agent Mesh server running on port ${config.port}`);
});
