export default function PoweredByWeltBrave({ className = "" }) {
  return (
    <a
      href="https://weltbrave.com"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <div className="flex items-center space-x-3 rounded-2xl border border-[#E33C09]/70 bg-gradient-to-r from-[#2a1c14] to-[#3a2116] px-4 py-3 whitespace-nowrap shadow-[0_6px_24px_-6px_rgba(232,83,31,0.65)] backdrop-blur-sm transition-all hover:border-[#ff8a4c] hover:shadow-[0_8px_30px_-6px_rgba(255,138,76,0.85)]">
        <span className="text-sm font-medium text-[#f3e7d8]">Powered by</span>
        <div className="inline-flex items-center space-x-2 font-bold">
          <span className="text-[#ff7a34]">
            Welt<span className="text-white">Brave</span>
          </span>
          <img
            src="https://imagedelivery.net/R-q2Rr5YYY3Q3Z63Izst-Q/WeltBrave/logo/public"
            alt="WeltBrave Logo"
            className="h-5 w-5 rounded-sm"
          />
        </div>
      </div>
    </a>
  );
}
