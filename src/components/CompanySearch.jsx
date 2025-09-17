function CompanySearch({ company, onChange, onSubmit, isLoading }) {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full flex flex-col gap-4"
    >
      <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        Enter a company name
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 rounded-2xl border border-gray-200 px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-solaceBlue focus:border-transparent shadow-sm transition"
          value={company}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g., L'Oréal"
          required
        />
        <button
          type="submit"
          className="px-6 py-4 rounded-2xl text-white font-semibold bg-gradient-to-r from-solacePurple to-solaceBlue shadow-lg hover:shadow-xl transition"
          disabled={isLoading}
        >
          {isLoading ? 'Discovering...' : 'Visualize Mesh'}
        </button>
      </div>
      <p className="text-sm text-gray-500">
        We will map the enterprise apps that power this company and show how Solace Agents can weave them together.
      </p>
    </form>
  );
}

export default CompanySearch;
