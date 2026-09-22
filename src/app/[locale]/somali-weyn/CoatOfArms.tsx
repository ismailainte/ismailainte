const GOLD = "#e5a52c";
const GOLD_DARK = "#a86f18";
const SHIELD_BLUE = "#4189dd";
const LEAF = "#1f7a3a";
const LEAF_DARK = "#14572a";

/** Five-pointed star centred on (cx, cy). */
const starPath = (cx: number, cy: number, outer: number) => {
  const inner = outer * 0.382;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return `M${points.join("L")}Z`;
};

/** Stylised leopard supporter, rampant, drawn facing right towards the shield. */
function Leopard({ facing }: { facing: 1 | -1 }) {
  return (
    <g transform={facing === 1 ? "translate(-15 4)" : "translate(215 4) scale(-1 1)"}>
      <g fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.5" strokeLinejoin="round">
        {/* tail, curling away from the shield */}
        <path d="M30 142 C16 136 6 118 9 98 C10 89 20 88 20 96 C18 112 24 128 36 134 Z" />
        {/* hind quarters and haunch */}
        <path d="M30 118 C18 126 16 146 22 162 L48 162 C44 148 46 132 54 122 Z" />
        {/* hind paw */}
        <path d="M20 158 C18 166 20 172 26 173 L48 173 C50 167 48 160 46 158 Z" />
        {/* torso rising to the chest */}
        <path d="M52 76 C42 88 34 104 32 124 L54 128 C54 110 58 94 66 84 Z" />
        {/* outer foreleg, hanging */}
        <path d="M48 88 C43 110 42 140 45 166 L57 166 C56 140 56 112 60 92 Z" />
        {/* inner foreleg, reaching the shield */}
        <path d="M62 80 C69 86 74 96 76 108 L65 112 C62 101 58 93 52 88 Z" />
        {/* neck */}
        <path d="M50 72 C50 62 56 56 64 56 L70 76 Z" />
        {/* ears */}
        <path d="M47 53 L42 39 L57 48 Z" />
        <path d="M69 48 L75 36 L79 51 Z" />
        {/* head */}
        <circle cx="61" cy="62" r="14" />
        {/* muzzle */}
        <path d="M70 60 C79 58 83 62 83 66 C83 70 78 73 71 71 Z" />
      </g>
      <g fill={GOLD_DARK}>
        <circle cx="41" cy="106" r="2" />
        <circle cx="37" cy="124" r="2" />
        <circle cx="47" cy="94" r="2" />
        <circle cx="30" cy="140" r="2" />
        <circle cx="34" cy="152" r="2" />
        <circle cx="50" cy="132" r="2" />
      </g>
      <circle cx="66" cy="60" r="2.4" fill="#2b2b2b" />
      <path d="M74 66 L79 66" stroke="#2b2b2b" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

/**
 * Simplified rendering of the emblem of the Federal Republic of Somalia:
 * a crowned blue shield charged with a white star, supported by two leopards
 * over crossed spears, palm fronds and a ribbon.
 */
export function CoatOfArms() {
  return (
    <g>
      {/* crossed spears behind the shield */}
      <g stroke={GOLD_DARK} strokeWidth="3" strokeLinecap="round">
        <path d="M70 178 L132 52" />
        <path d="M130 178 L68 52" />
      </g>
      <g fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.2">
        <path d="M132 44 L137 58 L126 57 Z" />
        <path d="M68 44 L74 57 L63 58 Z" />
      </g>

      <Leopard facing={1} />
      <Leopard facing={-1} />

      {/* crown */}
      <g fill={GOLD} stroke={GOLD_DARK} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M76 40 L76 16 L87 27 L94 10 L106 10 L113 27 L124 16 L124 40 Z" />
        <rect x="74" y="39" width="52" height="8" rx="3" />
      </g>
      <g fill="#ffffff" stroke={GOLD_DARK} strokeWidth="1">
        <circle cx="76" cy="14" r="3.2" />
        <circle cx="100" cy="7" r="3.2" />
        <circle cx="124" cy="14" r="3.2" />
      </g>

      {/* shield */}
      <path
        d="M72 50 L128 50 L128 112 C128 137 111 151 100 157 C89 151 72 137 72 112 Z"
        fill={SHIELD_BLUE}
        stroke="#ffffff"
        strokeWidth="3"
      />
      <path d={starPath(100, 97, 25)} fill="#ffffff" />

      {/* palm fronds */}
      <g fill={LEAF} stroke={LEAF_DARK} strokeWidth="1.2">
        <path d="M98 158 C80 161 62 171 51 185 C68 187 86 181 98 171 Z" />
        <path d="M102 158 C120 161 138 171 149 185 C132 187 114 181 102 171 Z" />
      </g>

      {/* ribbon */}
      <g fill="#ffffff" stroke="#8d8d8d" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M46 187 C72 179 128 179 154 187 C128 197 72 197 46 187 Z" />
        <path d="M46 187 L34 195 L46 197 Z" />
        <path d="M154 187 L166 195 L154 197 Z" />
      </g>
      <path
        d="M58 189 C76 185 124 185 142 189"
        stroke="#8d8d8d"
        strokeWidth="1"
        fill="none"
      />
    </g>
  );
}
