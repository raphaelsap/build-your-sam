import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CompanySearch from './components/CompanySearch.jsx';
import SolutionGraph from './components/SolutionGraph.jsx';
import AgentCard from './components/AgentCard.jsx';
import BottomPanel from './components/BottomPanel.jsx';
import BackgroundMesh from './components/BackgroundMesh.jsx';
import SolutionReviewPanel from './components/SolutionReviewPanel.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

const LOGO_MAP = {
  sap: 'https://cdn.simpleicons.org/sap/0FAAFF',
  'sap s/4hana': 'https://cdn.simpleicons.org/sap/0FAAFF',
  salesforce: 'https://cdn.simpleicons.org/salesforce/00A1E0',
  'salesforce crm': 'https://cdn.simpleicons.org/salesforce/00A1E0',
  workday: 'https://cdn.simpleicons.org/workday/FF6319',
  servicenow: 'https://cdn.simpleicons.org/servicenow/4CAF50',
  snowflake: 'https://cdn.simpleicons.org/snowflake/29B5E8',
  oracle: 'https://cdn.simpleicons.org/oracle/F80000',
  netsuite: 'https://cdn.simpleicons.org/oracle/F80000',
  dynamics: 'https://cdn.simpleicons.org/microsoft/0078D4',
  slack: 'https://cdn.simpleicons.org/slack/4A154B',
  jira: 'https://cdn.simpleicons.org/jira/0052CC',
  shopify: 'https://cdn.simpleicons.org/shopify/96BF48',
  zoom: 'https://cdn.simpleicons.org/zoom/0B5CFF',
  tableau: 'https://cdn.simpleicons.org/tableau/E97627',
  mulesoft: 'https://cdn.simpleicons.org/mulesoft/009ADA',
  'google cloud': 'https://cdn.simpleicons.org/googlecloud/4285F4',
};

const LOGO_ALIASES = {
  'sap s4hana': 'sap',
  'sap hana': 'sap',
  'sap cloud platform': 'sap',
  'sap erp': 'sap',
  'sap ecc': 'sap',
  'salesforce service cloud': 'salesforce',
  'salesforce marketing cloud': 'salesforce',
  'salesforce commerce cloud': 'salesforce',
  'salesforce crm': 'salesforce',
  'servicenow itsm': 'servicenow',
  'service now': 'servicenow',
  'microsoft dynamics 365': 'dynamics',
  'dynamics 365': 'dynamics',
  'google workspace': 'google cloud',
  'google cloud platform': 'google cloud',
  'jira service management': 'jira',
  'atlassian jira': 'jira',
  'slack enterprise': 'slack',
  'oracle fusion': 'oracle',
  'oracle cloud': 'oracle',
  'workday hcm': 'workday',
};



const VENDOR_AGENT_TEMPLATES = [
  {
    vendor: 'SAP',
    keywords: ['sap'],
    agentName: 'SAP Standard Agent',
    description: 'SAP’s packaged integration agent streams S/4HANA events directly into Solace Mesh.',
    draftPrompt:
      'You operate the SAP Standard Agent for the enterprise. Relay S/4HANA business events (orders, shipments, inventory signals) into the Solace Agent Mesh so downstream agents stay synchronized while SAP keeps its native automations.',
    roiEstimate: 'Bundled with SAP event enablement—focus on faster deployments.',
  },
  {
    vendor: 'Salesforce',
    keywords: ['salesforce'],
    agentName: 'Salesforce Standard Agent',
    description: 'Salesforce’s packaged agent streams CRM changes into the mesh for cross-cloud playbooks.',
    draftPrompt:
      'You manage the Salesforce Standard Agent. Capture opportunity, service, and marketing events from Salesforce and publish them into the Solace Agent Mesh while respecting Salesforce guardrails and rate limits.',
    roiEstimate: 'Salesforce event relays accelerate revenue orchestration.',
  },
];

const VALUE_KEYWORDS = [
  { label: 'Customer Experience Gains', test: /(customer|experience|service|engagement|journey)/i },
  { label: 'Operational Efficiency', test: /(operation|process|automation|latency|throughput|workflow)/i },
  { label: 'Revenue Intelligence', test: /(revenue|sales|pipeline|forecast|upsell|quote)/i },
  { label: 'Compliance & Resilience', test: /(compliance|risk|resilien|audit|governance)/i },
];

const MAX_AGENTS = 10;
const MESSAGES_PER_AGENT = 5_500_000;

function toTitleCase(value = '') {
  return value
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function getLogoUrl(name, existingUrl) {
  const trimmed = (name || '').trim();
  if (!trimmed) return existingUrl?.trim() || null;
  if (existingUrl?.trim()) return existingUrl.trim();
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const aliasKey = LOGO_ALIASES[normalized] || normalized;
  if (LOGO_MAP[aliasKey]) {
    return LOGO_MAP[aliasKey];
  }
  const condensed = aliasKey.replace(/\s+/g, '');
  if (LOGO_MAP[condensed]) {
    return LOGO_MAP[condensed];
  }
  return null;
}

function buildVendorAgents(solutions) {
  return VENDOR_AGENT_TEMPLATES.flatMap((template) => {
    const matched = solutions.filter((solution) =>
      template.keywords.some((kw) => solution.name.toLowerCase().includes(kw)),
    );
    if (!matched.length) {
      return [];
    }
    const attachedSolutions = matched.map((item) => item.name);
    return [
      {
        id: `vendor-${template.vendor.toLowerCase()}`,
        key: `vendor-${template.vendor.toLowerCase()}`,
        solutions: attachedSolutions,
        agentName: template.agentName,
        description: template.description,
        draftPrompt: template.draftPrompt,
        roiEstimate: template.roiEstimate,
        context: 'Vendor-supplied agent package',
        isPending: false,
      },
    ];
  });
}

function formatNumber(value) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function App() {
  const [companyQuery, setCompanyQuery] = useState('');
  const [customerPriorities, setCustomerPriorities] = useState('');
  const [discoveredPriorities, setDiscoveredPriorities] = useState({ summary: '', items: [] });
  const [activeCompany, setActiveCompany] = useState('');
  const [solutions, setSolutions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);
  const [error, setError] = useState('');
  const [candidateSolutions, setCandidateSolutions] = useState([]);
  const [selectedSolutionIds, setSelectedSolutionIds] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [enterpriseContext, setEnterpriseContext] = useState({
    synergyInsights: [],
    industryComparisons: [],
    priorityHeatmap: [],
  });

  const resetExperience = useCallback(() => {
    setAgents([]);
    setError('');
    setSolutions([]);
    setCandidateSolutions([]);
    setSelectedSolutionIds([]);
    setIsReviewing(false);
    setCustomerPriorities('');
    setDiscoveredPriorities({ summary: '', items: [] });
    setEnterpriseContext({ synergyInsights: [], industryComparisons: [], priorityHeatmap: [] });
  }, []);

  const handleFetchSolutions = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmedQuery = companyQuery.trim();
      if (!trimmedQuery) {
        setError('Please enter a company name to explore.');
        return;
      }
      setLoadingSolutions(true);
      resetExperience();

      try {
        const response = await fetch(`/api/solutions?company=${encodeURIComponent(trimmedQuery)}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to fetch enterprise solutions.');
        }
        const baseList = Array.isArray(payload.solutions) ? payload.solutions : [];
        const timestamp = Date.now();
        const enriched = baseList.slice(0, 10).map((item, index) => {
          const name = item?.name?.trim() || `Solution ${index + 1}`;
          return {
            id: `auto-${timestamp}-${index}`,
            name,
            logoUrl: getLogoUrl(name, item?.logoUrl),
          };
        });

        const rawPriorityItems = Array.isArray(payload?.priorities?.priorities)
          ? payload.priorities.priorities
              .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
              .filter(Boolean)
              .slice(0, 3)
          : [];
        const prioritySummary =
          typeof payload?.priorities?.summary === 'string'
            ? payload.priorities.summary.trim()
            : '';
        const normalizedPriorities = prioritySummary || rawPriorityItems.join('\n');
        const normalizedCompany = toTitleCase(payload.company || trimmedQuery);

        setCandidateSolutions(enriched);
        setSelectedSolutionIds(enriched.map((item) => item.id));
        setActiveCompany(normalizedCompany);
        setDiscoveredPriorities({ summary: prioritySummary, items: rawPriorityItems });
        setCustomerPriorities(normalizedPriorities);
        setEnterpriseContext(payload.context || { synergyInsights: [], industryComparisons: [], priorityHeatmap: [] });
        setIsReviewing(true);
      } catch (err) {
        setSolutions([]);
        setError(err.message || 'Something went wrong while contacting the server.');
      } finally {
        setLoadingSolutions(false);
      }
    },
    [companyQuery, resetExperience],
  );

  const handleGenerateAgent = useCallback(
    async (selectedSolutions, options = {}) => {
      const trimmed = Array.from(
        new Set(
          (selectedSolutions || [])
            .map((name) => (name ? String(name).trim() : ''))
            .filter(Boolean),
        ),
      );

      if (trimmed.length < 2) {
        setError('Select at least two solutions to form an agent concept.');
        return;
      }

      if (trimmed.length > 3) {
        trimmed.splice(3);
      }

      const key = trimmed.slice().sort().join('|');
      const hasFinishedAgent = agents.some((agent) => agent.key === key && !agent.isPending);
      if (hasFinishedAgent && !options.allowDuplicate) {
        return;
      }

      const placeholder = {
        id: `pending-${key}`,
        key,
        solutions: trimmed,
        agentName: 'Designing Agent Mesh...',
        description: 'Drafting a Solace agent tailored to this connection.',
        draftPrompt: 'Generating prompt...',
        roiEstimate: 'Estimating ROI...',
        isPending: true,
      };

      setAgents((prev) => {
        const withoutExisting = prev.filter((agent) => agent.key !== key);
        const updated = [...withoutExisting, placeholder];
        return updated.slice(-MAX_AGENTS);
      });
      if (!options.silent) {
        setError('');
      }

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solutions: trimmed, priorities: customerPriorities }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to generate agent concept.');
        }
        const agent = {
          id: `${key}-${Date.now()}`,
          key,
          solutions: trimmed,
          agentName: payload.agentName,
          description: payload.description,
          draftPrompt: payload.draftPrompt,
          context: payload.context,
          roiEstimate: payload.roiEstimate,
          isPending: false,
        };
        setAgents((prev) => {
          const withoutPlaceholder = prev.filter((item) => item.key !== key);
          const updated = [...withoutPlaceholder, agent];
          return updated.slice(-MAX_AGENTS);
        });
      } catch (err) {
        setAgents((prev) => prev.filter((item) => item.key !== key));
        if (!options.silent) {
          setError(err.message || 'Unable to craft the agent concept.');
        }
      }
    },
    [agents, customerPriorities],
  );

  const handleAutoGenerate = useCallback(
    async (combos) => {
      for (const combo of combos) {
        // Run sequentially to avoid hammering the APIs
        // eslint-disable-next-line no-await-in-loop
        await handleGenerateAgent(combo, { silent: true });
      }
    },
    [handleGenerateAgent],
  );

  const hasPriorities = Boolean(customerPriorities.trim());
  const prioritiesBlurb = hasPriorities
    ? customerPriorities.trim()
    : discoveredPriorities.summary || discoveredPriorities.items.join(' • ') ||
      "Add this year's priorities above so agents focus on what matters most.";

  const meshSubtitle = useMemo(() => {
    if (loadingSolutions) {
      return 'Hang tight while we discover the platforms powering this enterprise.';
    }
    if (isReviewing) {
      return 'Confirm the platforms you want to weave together or add your own before visualising the mesh.';
    }
    if (solutions.length) {
      const priorityNote = hasPriorities
        ? ' We will tailor agents to your stated priorities.'
        : '';
      return `We discovered ${solutions.length} connected platforms for ${activeCompany}. Drag across any 2-3 to see Solace Agents emerge.${priorityNote}`;
    }
    return 'Visualize how Solace Agents weave your enterprise systems together.';
  }, [loadingSolutions, isReviewing, solutions.length, activeCompany, hasPriorities]);

  const derivedPriorityItems = useMemo(() => {
    if (discoveredPriorities.items.length) {
      return discoveredPriorities.items;
    }
    if (customerPriorities.trim()) {
      return customerPriorities
        .split(/\n|;|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);
    }
    return [];
  }, [discoveredPriorities, customerPriorities]);

  const metrics = useMemo(() => {
    const confirmedAgents = agents.filter((agent) => !agent.isPending);
    const totalAgents = confirmedAgents.length;
    const totalMessages = totalAgents * MESSAGES_PER_AGENT;
    const uniqueSolutions = new Set(confirmedAgents.flatMap((agent) => agent.solutions)).size;

    const qualitativeBenefits = confirmedAgents
      .map((agent) => agent.description)
      .filter(Boolean)
      .slice(0, 3);

    const valueCounts = VALUE_KEYWORDS.map((entry) => ({ ...entry, count: 0 }));
    confirmedAgents.forEach((agent) => {
      const corpus = `${agent.description} ${agent.draftPrompt || ''}`;
      valueCounts.forEach((entry) => {
        if (entry.test.test(corpus)) {
          entry.count += 1;
        }
      });
    });
    const valueLevers = valueCounts
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((entry) => entry.label)
      .slice(0, 3);

    if (!valueLevers.length) {
      valueLevers.push('Faster cross-platform orchestration', 'Improved decision latency');
    }

    const baseScore = totalAgents * 14 + uniqueSolutions * 6 + (enterpriseContext.priorityHeatmap?.length || 0) * 5;
    const meshScore = Math.max(5, Math.min(100, Math.round(baseScore)));

    return {
      totalAgents,
      formattedMessages: formatNumber(totalMessages),
      valueLevers,
      qualitativeBenefits,
      meshScore,
    };
  }, [agents, enterpriseContext]);

  const handleExportAnalysis = useCallback(async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const title = activeCompany ? `Solace Agent Mesh Analysis for ${activeCompany}` : 'Solace Agent Mesh Analysis';

    const sections = [];
    sections.push(`# ${title}`);
    if (customerPriorities.trim()) {
      sections.push('## Regional Priorities');
      sections.push(customerPriorities.trim());
    }
    if (enterpriseContext.synergyInsights?.length) {
      sections.push('## Synergy Agents to Spotlight');
      enterpriseContext.synergyInsights.forEach((item) => sections.push(`- ${item}`));
    }
    if (enterpriseContext.industryComparisons?.length) {
      sections.push('## Industry Benchmarks');
      enterpriseContext.industryComparisons.forEach((item) => sections.push(`- ${item}`));
    }
    if (enterpriseContext.priorityHeatmap?.length) {
      sections.push('## Priority Heatmap (Strategic Impact)');
      enterpriseContext.priorityHeatmap.forEach((entry) => {
        sections.push(`- ${entry.pair}: ${entry.value}/100 — ${entry.rationale}`);
      });
    }
    if (solutions.length) {
      sections.push('## Connected Platforms');
      solutions.forEach((solution) => sections.push(`- ${solution.name}`));
    }
    if (agents.length) {
      sections.push('## Agents in Focus');
      agents.forEach((agent) => {
        sections.push(`- ${agent.agentName}: ${agent.description}`);
      });
    }
    sections.push('## Mesh Metrics');
    sections.push(`- Mesh Maturity Score: ${metrics.meshScore}`);
    sections.push(`- Estimated Event Throughput: ${metrics.formattedMessages} messages/year`);
    if (metrics.valueLevers.length) {
      sections.push(`- Value Levers: ${metrics.valueLevers.join(', ')}`);
    }
    if (metrics.qualitativeBenefits.length) {
      sections.push('## Business Benefits');
      metrics.qualitativeBenefits.forEach((benefit) => sections.push(`- ${benefit}`));
    }
    sections.push('---');
    sections.push('Developed by the Solace Agent Mesh demo team.');

    doc.setFont('courier', 'normal');
    doc.setFontSize(12);
    const maxWidth = 500;
    let cursorY = 60;

    sections.forEach((section) => {
      const textLines = doc.splitTextToSize(section, maxWidth);
      textLines.forEach((line) => {
        if (cursorY > 780) {
          doc.addPage();
          cursorY = 60;
        }
        doc.text(line, 50, cursorY);
        cursorY += 18;
      });
      cursorY += 6;
    });

    const fileName = activeCompany
      ? `solace-agent-mesh-${activeCompany.replace(/\s+/g, '-').toLowerCase()}.pdf`
      : 'solace-agent-mesh-analysis.pdf';
    doc.save(fileName);
  }, [activeCompany, customerPriorities, enterpriseContext, solutions, agents, metrics.meshScore, metrics.formattedMessages, metrics.valueLevers, metrics.qualitativeBenefits]);

  const handleToggleSelection = useCallback((id) => {
    setSelectedSolutionIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((value) => value !== id);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleUpdateSolution = useCallback((id, nextValue) => {
    setCandidateSolutions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...nextValue } : item)),
    );
  }, []);

  const handleRemoveSolution = useCallback((id) => {
    setCandidateSolutions((prev) => prev.filter((item) => item.id !== id));
    setSelectedSolutionIds((prev) => prev.filter((value) => value !== id));
  }, []);

  const handleAddSolution = useCallback((solution) => {
    setCandidateSolutions((prev) => {
      if (prev.length >= 10) {
        return prev;
      }
      const id = `custom-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const entry = {
        id,
        name: solution.name,
        logoUrl: getLogoUrl(solution.name, solution.logoUrl),
      };
      setSelectedSolutionIds((prevSelected) => [...prevSelected, id]);
      return [...prev, entry];
    });
  }, []);

  const handleConfirmSolutions = useCallback(() => {
    const selected = candidateSolutions.filter((item) => selectedSolutionIds.includes(item.id));
    if (selected.length < 5) {
      setError(`Select at least five platforms (currently ${selected.length}).`);
      return;
    }
    const cleaned = selected
      .slice(0, 10)
      .map((item) => ({
        name: item.name.trim(),
        logoUrl: getLogoUrl(item.name, item.logoUrl),
      }))
      .filter((item) => item.name);

    if (cleaned.length < 5) {
      setError('Provide valid names for at least five solutions.');
      return;
    }

    const vendorAgents = buildVendorAgents(cleaned);

    setSolutions(cleaned);
    setIsReviewing(false);
    setAgents(vendorAgents);
    setError('');
  }, [candidateSolutions, selectedSolutionIds]);

  const handleCancelReview = useCallback(() => {
    setCandidateSolutions([]);
    setSelectedSolutionIds([]);
    setIsReviewing(false);
    setActiveCompany('');
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-white text-gray-900">
      <BackgroundMesh />
      <LoadingOverlay
        isVisible={loadingSolutions}
        message="Discovering enterprise platforms and priorities with Perplexity."
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="pt-12 pb-6">
          <div className="mx-auto w-full max-w-6xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <p className="uppercase text-xs tracking-[0.45em] text-solaceGreen">Solace Agent Mesh</p>
              <h1 className="mt-4 text-4xl font-semibold text-solaceGreen sm:text-5xl">
                Build Your Solace Agent Mesh
              </h1>
              <p className="mt-4 text-base text-gray-600 sm:text-lg">
                {meshSubtitle}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
              className="mt-8 rounded-3xl border border-solaceGreen/30 bg-white/90 p-6 shadow-mesh backdrop-blur"
            >
              <CompanySearch
                company={companyQuery}
                priorities={customerPriorities}
                onCompanyChange={setCompanyQuery}
                onPrioritiesChange={setCustomerPriorities}
                onSubmit={handleFetchSolutions}
                isLoading={loadingSolutions}
              />
              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </motion.div>
          </div>
        </header>

        <main className="flex-1 w-full pb-12">
          <div className="flex h-full w-full flex-col gap-8 px-4 sm:px-6">
            {isReviewing ? (
              <SolutionReviewPanel
                company={activeCompany}
                solutions={candidateSolutions}
                selectedIds={selectedSolutionIds}
                onToggleSelection={handleToggleSelection}
                onUpdateSolution={handleUpdateSolution}
                onRemoveSolution={handleRemoveSolution}
                onAddSolution={handleAddSolution}
                onConfirm={handleConfirmSolutions}
                onCancel={handleCancelReview}
              />
            ) : solutions.length ? (
              <motion.div
                key="graph"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="w-full rounded-3xl border border-solaceGreen/25 bg-white/85 p-4 shadow-mesh backdrop-blur"
              >
                <div className="mb-4 rounded-2xl border border-solaceGreen/30 bg-solaceGreen/10 px-4 py-3 text-sm text-gray-700">
                  <strong className="text-solaceGreen">Solace orchestrates the mesh.</strong> Each platform keeps its native agents while Solace weaves them together for enterprise choreography.
                </div>
                {(enterpriseContext.synergyInsights?.length || enterpriseContext.industryComparisons?.length) && (
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    {enterpriseContext.synergyInsights?.length ? (
                      <div className="rounded-2xl border border-solaceGreen/20 bg-white/90 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-solaceGreen">Synergy Agents to Spotlight</h3>
                        <ul className="mt-2 space-y-1 text-sm text-gray-600">
                          {enterpriseContext.synergyInsights.map((item, index) => (
                            <li key={`synergy-${index}`} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-solaceGreen" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {enterpriseContext.industryComparisons?.length ? (
                      <div className="rounded-2xl border border-solaceGreen/20 bg-white/90 p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-solaceGreen">Industry Benchmarks</h3>
                        <ul className="mt-2 space-y-1 text-sm text-gray-600">
                          {enterpriseContext.industryComparisons.map((item, index) => (
                            <li key={`benchmark-${index}`} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-solaceGreen" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
                  <aside className="w-full lg:w-1/3">
                    <div className="flex h-full flex-col rounded-2xl border border-solaceGreen/30 bg-white/95 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-solaceGreen">Agents in Focus</h2>
                        <span className="inline-flex items-center justify-center rounded-full bg-solaceGreen/10 px-3 py-1 text-xs font-semibold text-solaceGreen">
                          {agents.filter((agent) => !agent.isPending).length}/{MAX_AGENTS}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 leading-relaxed">{prioritiesBlurb}</p>
                      <p className="mt-1 text-xs text-gray-500">Solace routes events between these agents so Salesforce, SAP, and others can retain their local automations.</p>
                      <div className="mt-4 flex-1 overflow-y-auto pr-1" style={{ maxHeight: '85vh' }}>
                        <div className="flex flex-col gap-4">
                          {agents.length ? (
                            agents
                              .slice(-MAX_AGENTS)
                              .reverse()
                              .map((agent) => (
                                <AgentCard key={agent.id} agent={agent} isGenerating={agent.isPending} />
                              ))
                          ) : (
                            <div className="rounded-xl border border-dashed border-solaceGreen/40 bg-solaceGreen/5 p-4 text-sm text-gray-500">
                              Connect two solutions to mint your first agent.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="relative flex-1 lg:min-h-[80vh]">
                    <div className="relative h-[65vh] min-h-[420px] w-full rounded-3xl bg-white/92 p-4">
                      <SolutionGraph
                        solutions={solutions}
                        agents={agents.slice(-MAX_AGENTS)}
                        heatmap={enterpriseContext.priorityHeatmap || []}
                        onSelectionComplete={handleGenerateAgent}
                        onAutoGenerate={handleAutoGenerate}
                        className="rounded-3xl"
                      />
                    </div>
                    <p className="mt-6 text-center text-sm text-gray-500">
                      Connect nodes to co-create agents and watch their event paths pulse across the mesh.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="rounded-3xl border border-dashed border-solaceGreen/30 bg-white/70 px-6 py-16 text-center text-gray-500 backdrop-blur"
              >
                <p>Enter a company to surface its enterprise mesh and the priorities Solace Agents will amplify.</p>
              </motion.div>
            )}

            {solutions.length > 0 && (
              <div className="w-full rounded-3xl border border-solaceGreen/20 bg-white/90 px-6 py-5 shadow-sm">
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Mesh Maturity Score</p>
                    <p className="mt-1 text-3xl font-semibold text-solaceGreen">{metrics.meshScore}</p>
                    <p className="text-xs text-gray-500">Higher scores indicate richer cross-agent collaboration.</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Event Throughput</p>
                    <p className="mt-1 text-2xl font-semibold text-solaceGreen">
                      {metrics.formattedMessages} messages/year
                    </p>
                    <p className="text-xs text-gray-500">Assuming {formatNumber(MESSAGES_PER_AGENT)} per agent</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Value Levers</p>
                    <ul className="mt-1 space-y-1 text-sm text-gray-600">
                      {metrics.valueLevers.map((lever, index) => (
                        <li key={`${lever}-${index}`} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-solaceGreen" />
                          <span>{lever}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Business Benefits</p>
                    {metrics.qualitativeBenefits.length ? (
                      <ul className="mt-1 space-y-1 text-sm text-gray-600">
                        {metrics.qualitativeBenefits.map((benefit, index) => (
                          <li key={`${benefit}-${index}`} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-solaceGreen" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-gray-600">Generate agents to surface tailored benefit statements.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {solutions.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-2xl border border-solaceGreen px-5 py-3 text-sm font-semibold text-solaceGreen hover:bg-solaceGreen hover:text-white transition"
                  onClick={handleExportAnalysis}
                >
                  Export Mesh Analysis (PDF)
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="px-4 pb-12 sm:px-6">
          <BottomPanel />
          <p className="mt-6 text-xs text-gray-400 text-center">Developed by the Solace Agent Mesh demo team.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
