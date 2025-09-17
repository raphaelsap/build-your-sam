function CompanySearch({ company, priorities, onCompanyChange, onPrioritiesChange, onSubmit, isLoading }) {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full flex flex-col gap-4"
    >
      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Please enter the name of your organization
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 rounded-2xl border border-gray-200 px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-solaceGreen focus:border-transparent shadow-sm transition"
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          placeholder="e.g., JP Morgan Chase"
          required
        />
        <button
          type="submit"
          className="px-6 py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-solaceGreen to-[#0DAE74] shadow-lg hover:shadow-xl transition"
          disabled={isLoading}
        >
          {isLoading ? 'Discovering...' : 'Visualize Mesh'}
        </button>
      </div>

      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Your priorities for this year (auto-discovered, editable)
      </label>
      <textarea
        className="min-h-[110px] rounded-2xl border border-gray-200 px-5 py-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-solaceGreen/70 focus:border-transparent shadow-sm transition"
        value={priorities}
        onChange={(event) => onPrioritiesChange(event.target.value)}
        placeholder="We will attempt to pre-populate this from Perplexity. You can refine as needed."
      />

      <p className="text-sm text-gray-500">
        We surface executive priorities with Perplexity AI, so every agent pitch aligns with what matters most right now.
      </p>
    </form>
  );
}

export default CompanySearch;
