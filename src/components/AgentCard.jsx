import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function MeshGlyph() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="w-10 h-10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="23" fill="#08C68B" opacity="0.9" />
      <path
        d="M12 18c4 4 9 4 13 0s9-4 13 0"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M12 30c4-4 9-4 13 0s9 4 13 0"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="24" cy="24" r="6" fill="#FFFFFF" opacity="0.9" />
      <path
        d="M21.5 24c0-1.38 1.02-2.5 2.5-2.5 1.3 0 2.3.78 2.46 1.94h-1.4c-.12-.34-.5-.56-1.06-.56-.73 0-1.18.43-1.18 1.12 0 .66.47 1.12 1.18 1.12.54 0 .94-.22 1.06-.56h1.4c-.16 1.14-1.16 1.94-2.46 1.94-1.48 0-2.5-1.12-2.5-2.5Z"
        fill="#08C68B"
      />
    </svg>
  );
}

function AgentCard({ agent, isGenerating }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-purple-100 bg-white/95 backdrop-blur shadow-lg overflow-hidden">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-solaceGreen/10 p-2 text-solaceGreen">
            <MeshGlyph />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-solacePurple truncate">
                {agent.agentName}
              </h3>
              {isGenerating && (
                <span className="text-xs text-solaceBlue animate-pulse">Drafting...</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
            <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">
              {agent.solutions.join(' • ')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-solaceGreen/10 px-3 py-2 text-sm font-medium text-solaceGreen">
          <span>Potential ROI (12m)</span>
          <span className="text-right font-semibold">{agent.roiEstimate || 'Estimating...'}</span>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-solaceBlue hover:text-solacePurple transition"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? 'Hide Agent Prompt' : 'Show Agent Prompt'}
          <span>{isExpanded ? '−' : '+'}</span>
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="px-4 pb-4 text-sm text-gray-700 whitespace-pre-line"
            >
              {agent.draftPrompt}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AgentCard;
