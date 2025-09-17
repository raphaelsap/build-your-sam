import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CompanySearch from './components/CompanySearch.jsx';
import SolutionGraph from './components/SolutionGraph.jsx';
import AgentCard from './components/AgentCard.jsx';
import BottomPanel from './components/BottomPanel.jsx';
import BackgroundMesh from './components/BackgroundMesh.jsx';
import SolutionReviewPanel from './components/SolutionReviewPanel.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

function App() {
  const [companyQuery, setCompanyQuery] = useState('');
  const [activeCompany, setActiveCompany] = useState('');
  const [solutions, setSolutions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);
  const [error, setError] = useState('');
  const [candidateSolutions, setCandidateSolutions] = useState([]);
  const [selectedSolutionIds, setSelectedSolutionIds] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);

  const resetExperience = useCallback(() => {
    setAgents([]);
    setError('');
    setSolutions([]);
    setCandidateSolutions([]);
    setSelectedSolutionIds([]);
    setIsReviewing(false);
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
        const enriched = baseList.slice(0, 10).map((item, index) => ({
          id: `auto-${timestamp}-${index}`,
          name: item?.name?.trim() || `Solution ${index + 1}`,
          logoUrl: item?.logoUrl?.trim() || '',
        }));

        setCandidateSolutions(enriched);
        setSelectedSolutionIds(enriched.map((item) => item.id));
        setActiveCompany(payload.company || trimmedQuery);
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
        isPending: true,
      };

      setAgents((prev) => {
        const withoutExisting = prev.filter((agent) => agent.key !== key);
        return [...withoutExisting, placeholder];
      });
      if (!options.silent) {
        setError('');
      }

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solutions: trimmed }),
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
          isPending: false,
        };
        setAgents((prev) => {
          const withoutPlaceholder = prev.filter((item) => item.key !== key);
          return [...withoutPlaceholder, agent];
        });
      } catch (err) {
        setAgents((prev) => prev.filter((item) => item.key !== key));
        if (!options.silent) {
          setError(err.message || 'Unable to craft the agent concept.');
        }
      }
    },
    [agents],
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

  const renderAgentCard = useCallback(
    (agent) => <AgentCard agent={agent} isGenerating={agent.isPending} />,
    [],
  );

  const meshSubtitle = useMemo(() => {
    if (loadingSolutions) {
      return 'Hang tight while we discover the platforms powering this enterprise.';
    }
    if (isReviewing) {
      return 'Confirm the platforms you want to weave together or add your own before visualising the mesh.';
    }
    if (solutions.length) {
      return `We discovered ${solutions.length} connected platforms for ${activeCompany}. Drag across any 2-3 to see Solace Agents emerge.`;
    }
    return 'Visualize how Solace Agents weave your enterprise systems together.';
  }, [loadingSolutions, isReviewing, solutions.length, activeCompany]);

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
        logoUrl: solution.logoUrl || '',
      };
      setSelectedSolutionIds((prevSelected) => [...prevSelected, id]);
      return [...prev, entry];
    });
  }, []);

  const handleConfirmSolutions = useCallback(() => {
    const selected = candidateSolutions.filter((item) => selectedSolutionIds.includes(item.id));
    if (selected.length < 2) {
      setError('Select at least two solutions to visualise the mesh.');
      return;
    }
    const cleaned = selected.slice(0, 10).map((item) => ({
      name: item.name.trim(),
      logoUrl: item.logoUrl?.trim() ? item.logoUrl.trim() : null,
    })).filter((item) => item.name);

    if (cleaned.length < 2) {
      setError('Provide valid names for at least two solutions.');
      return;
    }

    setSolutions(cleaned);
    setIsReviewing(false);
    setAgents([]);
    setError('');
  }, [candidateSolutions, selectedSolutionIds]);

  const handleCancelReview = useCallback(() => {
    setCandidateSolutions([]);
    setSelectedSolutionIds([]);
    setIsReviewing(false);
    setActiveCompany('');
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-gray-900">
      <BackgroundMesh />
      <LoadingOverlay
        isVisible={loadingSolutions}
        message="Discovering enterprise platforms via Perplexity."
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="pt-12 pb-6">
          <div className="mx-auto w-full max-w-5xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <p className="uppercase text-xs tracking-[0.45em] text-solaceBlue">Solace Agent Mesh</p>
              <h1 className="mt-4 text-4xl font-semibold text-solacePurple sm:text-5xl">
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
              className="mt-8 rounded-3xl border border-purple-100 bg-white/90 p-6 shadow-mesh backdrop-blur"
            >
              <CompanySearch
                company={companyQuery}
                onChange={setCompanyQuery}
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

        <main className="flex-1 px-6 pb-12">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-8">
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
                className="mx-auto w-full max-w-5xl rounded-3xl border border-purple-50 bg-white/85 p-4 shadow-mesh backdrop-blur"
              >
                <div className="relative h-[65vh] min-h-[420px] w-full">
                  <SolutionGraph
                    solutions={solutions}
                    agents={agents}
                    onSelectionComplete={handleGenerateAgent}
                    onAutoGenerate={handleAutoGenerate}
                    renderAgentCard={renderAgentCard}
                    className="rounded-3xl"
                  />
                </div>
                <p className="mt-6 text-center text-sm text-gray-500">
                  Drag across 2–3 nodes to weave a new agent. We will drop it where the mesh intersects.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="rounded-3xl border border-dashed border-purple-100 bg-white/70 px-6 py-16 text-center text-gray-500 backdrop-blur"
              >
                <p>Start by entering a company above. We will pull their enterprise stack using Perplexity AI.</p>
                <p className="mt-3">
                  Then drag across the solutions to see Solace Agent Mesh invent orchestrations tailored to them.
                </p>
              </motion.div>
            )}
          </div>
        </main>

        <footer className="px-6 pb-12">
          <BottomPanel />
        </footer>
      </div>
    </div>
  );
}

export default App;
