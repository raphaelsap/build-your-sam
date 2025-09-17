function BottomPanel() {
  return (
    <div className="mt-10 w-full">
      <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur border border-purple-100 rounded-3xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-mesh">
        <div>
          <h4 className="text-lg font-semibold text-solacePurple">Want to see this live for your enterprise?</h4>
          <p className="text-sm text-gray-600 mt-1">
            Solace Agent Mesh connects your mission-critical systems in minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://solace.com/contact-us/"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-2xl bg-solacePurple text-white font-semibold shadow-lg hover:bg-[#5b0b96] transition"
          >
            Contact Solace
          </a>
          <a
            href="https://github.com/raphaelsap/build-your-sam"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-2xl border border-solaceBlue text-solaceBlue font-semibold hover:bg-solaceBlue hover:text-white transition"
          >
            ⭐ Star this Repo
          </a>
        </div>
      </div>
    </div>
  );
}

export default BottomPanel;
