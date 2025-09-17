import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function MeshGlyph() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="w-10 h-10"
      fill="none"
      strokeWidth="2"
      stroke="currentColor"
    >
      <circle cx="24" cy="24" r="20" stroke="#6A0DAD" opacity="0.4" />
      <path
        d="M10 18c6 4 12 4 18 0s12-4 18 0"
        stroke="#0098DB"
        strokeLinecap="round"
      />
      <path
        d="M10 30c6-4 12-4 18 0s12 4 18 0"
        stroke="#6A0DAD"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="4" fill="#0098DB" stroke="none" />
    </svg>
  );
}

function AgentCard({ agent, isGenerating }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl border border-purple-100 shadow-lg overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="text-solacePurple shrink-0">
          <MeshGlyph />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-solacePurple truncate">
              {agent.agentName}
            </h3>
            {isGenerating && (
              <span className="text-xs text-solaceBlue animate-pulse">Drafting...</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {agent.description}
          </p>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">
            {agent.solutions.join(' • ')}
          </p>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-solaceBlue hover:text-solacePurple transition"
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
