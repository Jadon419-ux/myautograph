function Doodle({ type, className = "", style }) {
  const common = {
    className,
    style,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 21s-7-4.35-9.5-8.5C.9 8.9 2.4 5 5.6 5c1.8 0 3.2 1 4.4 2.3C11.2 6 12.6 5 14.4 5c3.2 0 4.7 3.9 3.1 7.5C19 16.65 12 21 12 21z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2.5l2.9 6.1 6.6.6-5 4.5 1.5 6.5L12 16.8l-6 3.4 1.5-6.5-5-4.5 6.6-.6L12 2.5z" />
        </svg>
      );
    case "smiley":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="9" cy="10" r="0.8" fill="currentColor" />
          <circle cx="15" cy="10" r="0.8" fill="currentColor" />
          <path d="M8 14.5c1.4 1.8 6.6 1.8 8 0" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path d="M7 18a4 4 0 010-8 5.2 5.2 0 019.9-1.6A4 4 0 0117.5 16H7z" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <ellipse cx="6.5" cy="18" rx="2.7" ry="2" />
          <path d="M9.2 18V5l6.3 1.8v6.4" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      );
    case "planet":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.5" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3" transform="rotate(-18 12 12)" />
        </svg>
      );
    case "bubble":
      return (
        <svg {...common}>
          <path d="M4 5h16v10H10l-4 4v-4H4V5z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
          <path d="M3.5 9.5h17M8 3v3M16 3v3" />
          <text x="12" y="16.5" fontSize="6.5" stroke="none" fill="currentColor" textAnchor="middle">
            24
          </text>
        </svg>
      );
    case "wave":
      return (
        <svg {...common}>
          <path d="M2 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
        </svg>
      );
    default:
      return null;
  }
}

const DOODLES = [
  { type: "heart", top: "6%", left: "23%", size: 20, rot: -8, tone: "light" },
  { type: "smiley", top: "16%", left: "29%", size: 26, rot: 6, tone: "light" },
  { type: "star", top: "13%", left: "17%", size: 18, rot: 10, tone: "light" },
  { type: "cloud", top: "22%", left: "66%", size: 30, rot: 0, tone: "dark" },
  { type: "note", top: "14%", left: "88%", size: 22, rot: -6, tone: "dark" },
  { type: "heart", top: "16%", left: "81%", size: 16, rot: 12, tone: "light" },
  { type: "calendar", top: "34%", left: "15%", size: 30, rot: -4, tone: "dark" },
  { type: "planet", top: "40%", left: "3%", size: 34, rot: 0, tone: "light" },
  { type: "star", top: "56%", left: "24%", size: 20, rot: 8, tone: "dark" },
  { type: "smiley", top: "64%", left: "10%", size: 22, rot: -4, tone: "dark" },
  { type: "plus", top: "24%", left: "40%", size: 14, rot: 0, tone: "dark" },
  { type: "bolt", top: "62%", left: "74%", size: 24, rot: 6, tone: "dark" },
  { type: "bubble", top: "70%", left: "90%", size: 28, rot: -6, tone: "light" },
  { type: "star", top: "3%", left: "48%", size: 16, rot: 0, tone: "dark" },
  { type: "wave", top: "80%", left: "48%", size: 26, rot: 0, tone: "dark" },
  { type: "heart", top: "88%", left: "13%", size: 18, rot: -10, tone: "dark" },
  { type: "star", top: "92%", left: "5%", size: 16, rot: 4, tone: "dark" },
  { type: "plus", top: "88%", left: "76%", size: 14, rot: 0, tone: "dark" },
  { type: "note", top: "90%", left: "63%", size: 20, rot: 8, tone: "dark" },
  { type: "cloud", top: "5%", left: "6%", size: 24, rot: 0, tone: "light" },
];

export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#F7F4E6]" />

      <div className="absolute -top-28 -left-28 h-72 w-72 rounded-[60%_40%_70%_30%/60%_30%_70%_40%] bg-gradient-to-br from-brand-green to-emerald-300 opacity-90 sm:h-96 sm:w-96" />
      <div className="absolute -top-32 -right-32 h-80 w-[26rem] rounded-[35%_65%_30%_70%/50%_60%_40%_50%] bg-gradient-to-bl from-brand-green via-emerald-400 to-emerald-300 opacity-95 sm:h-[26rem] sm:w-[34rem]" />
      <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-[50%_50%_60%_40%/40%_60%_40%_60%] bg-gradient-to-tr from-emerald-300 to-brand-green opacity-70" />
      <div className="absolute -bottom-28 -right-20 h-64 w-64 rounded-[55%_45%_45%_55%/55%_45%_55%_45%] bg-gradient-to-tl from-brand-green to-emerald-300 opacity-90 sm:h-80 sm:w-80" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="none" fill="none">
        <path
          d="M1050 0C1000 90 1150 160 1120 260C1090 360 980 380 1010 480"
          stroke="white"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
        <path
          d="M0 40C60 110 180 90 160 190C140 290 40 300 70 380"
          stroke="white"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
      </svg>

      {DOODLES.map((d, i) => (
        <Doodle
          key={i}
          type={d.type}
          className={d.tone === "light" ? "absolute text-white/50" : "absolute text-brand-green/25"}
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            transform: `rotate(${d.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
