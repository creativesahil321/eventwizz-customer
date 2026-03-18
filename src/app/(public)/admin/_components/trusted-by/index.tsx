/* Professional venue wordmark logos as inline SVG — looks clean on any theme */
const PARTNERS = [
  {
    name: "The Blazing Donkey",
    svg: (
      <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
        <text x="80" y="22" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fill="#8B2500" fontWeight="700" letterSpacing="1">THE</text>
        <text x="80" y="40" textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fill="#1a1a1a" fontWeight="800" letterSpacing="0.5">BLAZING</text>
        <text x="80" y="55" textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fill="#1a1a1a" fontWeight="800" letterSpacing="0.5">DONKEY</text>
      </svg>
    ),
  },
  {
    name: "The Merry Fiddlers",
    svg: (
      <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
        <circle cx="80" cy="22" r="10" fill="none" stroke="#2d5a27" strokeWidth="1.5" />
        <text x="80" y="26" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="#2d5a27" fontWeight="700">♪</text>
        <text x="80" y="42" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fill="#1a1a1a" fontWeight="800" letterSpacing="0.5">THE MERRY</text>
        <text x="80" y="56" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fill="#1a1a1a" fontWeight="800" letterSpacing="0.5">FIDDLERS</text>
      </svg>
    ),
  },
  {
    name: "Theydon Oak",
    svg: (
      <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
        <path d="M80 8 Q85 2 90 8 Q96 4 96 10 Q100 10 100 16 Q100 22 94 22 L66 22 Q60 22 60 16 Q60 10 64 10 Q64 4 70 8 Q75 2 80 8Z" fill="#2d5a27" opacity="0.85" />
        <text x="80" y="38" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill="#1a1a1a" fontWeight="800" letterSpacing="1">THEYDON</text>
        <text x="80" y="54" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill="#2d5a27" fontWeight="800" letterSpacing="2">OAK</text>
      </svg>
    ),
  },
  {
    name: "HAM Hideaway",
    svg: (
      <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
        <rect x="52" y="6" width="56" height="26" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
        <text x="80" y="24" textAnchor="middle" fontFamily="Georgia, serif" fontSize="18" fill="#1a1a1a" fontWeight="900" letterSpacing="3">HAM</text>
        <text x="80" y="50" textAnchor="middle" fontFamily="'Arial Narrow', Arial, sans-serif" fontSize="10" fill="#666" fontWeight="600" letterSpacing="3">HIDEAWAY</text>
      </svg>
    ),
  },
  {
    name: "SB Venues",
    svg: (
      <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
        <circle cx="80" cy="22" r="16" fill="#1a1a1a" />
        <text x="80" y="28" textAnchor="middle" fontFamily="Georgia, serif" fontSize="16" fill="white" fontWeight="900" letterSpacing="1">SB</text>
        <text x="80" y="50" textAnchor="middle" fontFamily="'Arial Narrow', Arial, sans-serif" fontSize="10" fill="#444" fontWeight="600" letterSpacing="3">VENUES</text>
      </svg>
    ),
  },
  {
    name: "Three Rivers Golf & Country Club",
    svg: (
      <svg viewBox="0 0 160 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-14">
        <path d="M54 28 Q80 10 106 28" stroke="#1a6b3a" strokeWidth="1.5" fill="none" />
        <path d="M58 32 Q80 16 102 32" stroke="#1a6b3a" strokeWidth="1.2" fill="none" opacity="0.6" />
        <path d="M62 36 Q80 22 98 36" stroke="#1a6b3a" strokeWidth="1" fill="none" opacity="0.4" />
        <text x="80" y="50" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fill="#1a1a1a" fontWeight="700" letterSpacing="0.5">THREE RIVERS G&amp;CC</text>
      </svg>
    ),
  },
];

export default function TrustedBy() {
  return (
    <section className="py-16 bg-[color:var(--color-background)]">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
          Trusted By
        </h2>
        <p className="text-[color:var(--color-text-dimmed)] mb-10 max-w-lg mx-auto">
          Don&apos;t just take our word for it. We&apos;re trusted by venues and
          businesses across the UK.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="bg-white rounded-xl p-4 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 min-h-[90px] border border-gray-100"
            >
              {partner.svg}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
