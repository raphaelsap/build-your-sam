import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function SolutionReviewPanel({
  company,
  solutions,
  selectedIds,
  onToggleSelection,
  onUpdateSolution,
  onRemoveSolution,
  onAddSolution,
  onConfirm,
  onCancel,
}) {
  const [newSolution, setNewSolution] = useState({ name: '', logoUrl: '' });
  const selectionCount = selectedIds.length;
  const canAddMore = solutions.length < 10;
  const canConfirm = selectionCount >= 5 && selectionCount <= 10;

  const helperText = useMemo(() => {
    if (selectionCount < 5) return `Select at least five platforms (currently ${selectionCount}).`;
    if (selectionCount > 10) return 'Limit your selection to 10 platforms max.';
    return `${selectionCount} platforms selected.`;
  }, [selectionCount]);

  const handleAdd = (event) => {
    event.preventDefault();
    const trimmedName = newSolution.name.trim();
    const trimmedLogo = newSolution.logoUrl.trim();
    if (!trimmedName || !canAddMore) {
      return;
    }
    onAddSolution({ name: trimmedName, logoUrl: trimmedLogo || null });
    setNewSolution({ name: '', logoUrl: '' });
  };

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl rounded-3xl border border-solaceGreen/30 bg-white/95 p-6 shadow-mesh backdrop-blur"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-2xl font-semibold text-solaceGreen">
            Curate {company ? `${company}'s` : 'your'} integration estate
          </h2>
          <p className="text-sm text-gray-600">
            Select at least five enterprise platforms Solace Agent Mesh should orchestrate. You can adjust names or reference logos before visualising the mesh.
          </p>
        </div>

        <AnimatePresence>
          <motion.ul
            className="grid gap-4 sm:grid-cols-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {solutions.map((solution) => {
              const isSelected = selectedIds.includes(solution.id);
              return (
                <li
                  key={solution.id}
                  className={`rounded-2xl border p-4 shadow-sm transition ${
                    isSelected
                      ? 'border-solaceGreen bg-solaceGreen/10'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 text-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection(solution.id)}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-solaceGreen focus:ring-solaceGreen"
                      />
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={solution.name}
                          onChange={(event) => onUpdateSolution(solution.id, {
                            ...solution,
                            name: event.target.value,
                          })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 focus:border-solaceGreen focus:outline-none focus:ring-2 focus:ring-solaceGreen/40"
                          placeholder="Solution name"
                        />
                        <input
                          type="url"
                          value={solution.logoUrl || ''}
                          onChange={(event) => onUpdateSolution(solution.id, {
                            ...solution,
                            logoUrl: event.target.value,
                          })}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 focus:border-solaceGreen focus:outline-none focus:ring-2 focus:ring-solaceGreen/40"
                          placeholder="Logo URL (optional)"
                        />
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => onRemoveSolution(solution.id)}
                      className="rounded-xl border border-transparent px-3 py-2 text-xs font-medium text-gray-400 hover:border-gray-200 hover:text-gray-600"
                      aria-label={`Remove ${solution.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>

        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 rounded-2xl border border-dashed border-solaceGreen/40 bg-solaceGreen/5 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newSolution.name}
              onChange={(event) => setNewSolution((prev) => ({ ...prev, name: event.target.value }))}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-solaceGreen focus:outline-none focus:ring-2 focus:ring-solaceGreen/40"
              placeholder="Add another solution"
              disabled={!canAddMore}
              required
            />
            <input
              type="url"
              value={newSolution.logoUrl}
              onChange={(event) => setNewSolution((prev) => ({ ...prev, logoUrl: event.target.value }))}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-solaceGreen focus:outline-none focus:ring-2 focus:ring-solaceGreen/40"
              placeholder="Logo URL (optional)"
              disabled={!canAddMore}
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-solaceGreen to-[#0DAE74] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50"
              disabled={!canAddMore}
            >
              Add
            </button>
          </div>
          {!canAddMore && (
            <p className="text-xs text-gray-500">
              You have reached the maximum of 10 solutions.
            </p>
          )}
        </form>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-gray-600">{helperText}</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-solaceGreen px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#0DAE74] disabled:opacity-60 disabled:shadow-none"
              disabled={!canConfirm}
            >
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SolutionReviewPanel;
