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
    case "umbrella":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 0118 0z" />
          <path d="M12 12v7a2 2 0 01-4 0" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z" />
        </svg>
      );
    case "flower":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="12" cy="6" r="2.2" />
          <circle cx="12" cy="18" r="2.2" />
          <circle cx="6" cy="12" r="2.2" />
          <circle cx="18" cy="12" r="2.2" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
        </svg>
      );
    default:
      return null;
  }
}

const ICON_TYPES = [
  "heart",
  "star",
  "smiley",
  "cloud",
  "note",
  "plus",
  "bolt",
  "planet",
  "bubble",
  "calendar",
  "wave",
  "umbrella",
  "moon",
  "flower",
  "spark",
];

function makeDoodles() {
  const layout = [
    [6, 23], [16, 29], [13, 17], [22, 66], [14, 88], [16, 81], [34, 15], [40, 3],
    [56, 24], [64, 10], [24, 40], [62, 74], [70, 90], [3, 48], [80, 48], [88, 13],
    [92, 5], [88, 76], [90, 63], [5, 6], [9, 60], [11, 92], [28, 78], [45, 8],
    [50, 92], [72, 34], [78, 58], [33, 48], [58, 62], [20, 4], [4, 35], [96, 30],
    [95, 62], [42, 88], [66, 18], [30, 90], [83, 40], [18, 55], [48, 20], [60, 4],
  ];
  return layout.map(([top, left], i) => ({
    type: ICON_TYPES[i % ICON_TYPES.length],
    top: `${top}%`,
    left: `${left}%`,
    size: 14 + ((i * 7) % 20),
    rot: ((i * 37) % 40) - 20,
    tone: top < 30 && (left < 22 || left > 78) ? "light" : "dark",
    duration: 4 + (i % 5),
    delay: (i % 10) * 0.6,
    opacity: 0.28 + ((i % 4) * 0.06),
  }));
}

const DOODLES = makeDoodles();

export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#F7F4E6] dark:bg-[#121214]" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 280px at 0% 0%, #2E7D32 0%, #43A047 18%, rgba(67,160,71,0) 100%), " +
            "radial-gradient(circle 300px at 100% 0%, #2E7D32 0%, #4CAF50 20%, rgba(76,175,80,0) 100%), " +
            "radial-gradient(circle 170px at 0% 100%, #43A047 0%, rgba(67,160,71,0) 100%), " +
            "radial-gradient(circle 220px at 100% 100%, #2E7D32 0%, #43A047 16%, rgba(67,160,71,0) 100%)",
          backgroundRepeat: "no-repeat",
        }}
      />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="none" fill="none">
        <path
          d="M1050 0C1000 90 1150 160 1120 260C1090 360 980 380 1010 480"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="2"
        />
        <path
          d="M0 40C60 110 180 90 160 190C140 290 40 300 70 380"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="2"
        />
      </svg>

      {DOODLES.map((d, i) => (
        <Doodle
          key={i}
          type={d.type}
          className={`animate-doodle-twinkle absolute ${d.tone === "light" ? "text-white" : "text-brand-green"}`}
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            "--doodle-rot": `${d.rot}deg`,
            "--doodle-opacity": d.opacity,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
