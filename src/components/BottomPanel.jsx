function BottomPanel() {
  return (
    <div className="mt-10 w-full">
      <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur border border-solaceGreen/30 rounded-3xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-mesh">
        <div>
          <h4 className="text-lg font-semibold text-solaceGreen">Ready to orchestrate your own mesh?</h4>
          <p className="text-sm text-gray-600 mt-1">
            Solace Agent Mesh connects your mission-critical systems with real-time event streaming.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://solace.com/contact-us/"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-2xl bg-solaceGreen text-white font-semibold shadow-lg hover:bg-[#0DAE74] transition"
          >
            Contact Solace
          </a>
          <a
            href="https://solace.com/products/agent-mesh/"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-2xl border border-solaceGreen text-solaceGreen font-semibold hover:bg-solaceGreen hover:text-white transition"
          >
            Explore Solace Agent Mesh
          </a>
        </div>
      </div>
    </div>
  );
}

export default BottomPanel;
