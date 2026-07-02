export default function PoweredByWeltBrave({ className = "" }) {
  return (
    <a
      href="https://weltbrave.com"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      <div className="flex items-center space-x-3 rounded-2xl border border-[#E33C09]/10 bg-[#303030]/50 px-4 py-3 whitespace-nowrap backdrop-blur-sm transition-colors hover:bg-[#303030]/70">
        <span className="text-sm text-[#A9A9A9]">Powered by</span>
        <div className="inline-flex items-center space-x-2 font-bold">
          <span className="text-[#E33C09]">
            Welt<span className="text-[#E0E0E0]">Brave</span>
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
