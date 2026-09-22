import { MAP_HEIGHT, MAP_WIDTH, SOMALI_WEYN } from "./mapGeometry";
import { FRAME } from "./mapView";

export function MapDefs() {
  return (
    <defs>
      <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="0.45">
        <stop offset="0" stopColor="#8fc0e8" />
        <stop offset="0.45" stopColor="#7cb4e2" />
        <stop offset="1" stopColor="#6aa7dc" />
      </linearGradient>

      <linearGradient id="legend-bathymetry" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#eef6fc" />
        <stop offset="1" stopColor="#3f8fd0" />
      </linearGradient>

      <linearGradient id="legend-elevation" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#6fbf62" />
        <stop offset="0.35" stopColor="#a8cf6b" />
        <stop offset="0.6" stopColor="#d6cc7c" />
        <stop offset="0.82" stopColor="#c6a878" />
        <stop offset="1" stopColor="#a98a6b" />
      </linearGradient>

      {/* Green lowlands in the south and along the coast, rising to tan highlands
          towards the north-west, matching the reference relief. */}
      <linearGradient id="relief" gradientUnits="userSpaceOnUse" x1="700" y1="1150" x2="520" y2="170">
        <stop offset="0" stopColor="#6cb95c" />
        <stop offset="0.42" stopColor="#84c566" />
        <stop offset="0.66" stopColor="#b3d073" />
        <stop offset="0.84" stopColor="#dccf87" />
        <stop offset="1" stopColor="#c8a878" />
      </linearGradient>

      <linearGradient id="relief-neighbour" x1="0.75" y1="0.9" x2="0.05" y2="0.1">
        <stop offset="0" stopColor="#cfd0b2" />
        <stop offset="0.45" stopColor="#d5cdae" />
        <stop offset="1" stopColor="#c9bda2" />
      </linearGradient>

      <radialGradient id="highland" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#b08f61" stopOpacity="0.6" />
        <stop offset="1" stopColor="#b08f61" stopOpacity="0" />
      </radialGradient>

      <filter id="shelf-blur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" />
      </filter>

      <filter id="relief-shade" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="7" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.22" intercept="0" />
        </feComponentTransfer>
        <feComposite operator="in" in2="SourceGraphic" />
      </filter>

      <clipPath id="map-clip">
        <rect x={FRAME} y={FRAME} width={MAP_WIDTH - FRAME * 2} height={MAP_HEIGHT - FRAME * 2} />
      </clipPath>

      {/* Everything except Soomaali Weyn: a full-frame rectangle with the union
          punched out by the even-odd rule. */}
      <clipPath id="outside-weyn">
        <path d={`M0 0H${MAP_WIDTH}V${MAP_HEIGHT}H0Z${SOMALI_WEYN}`} clipRule="evenodd" />
      </clipPath>

      <clipPath id="weyn-clip">
        <path d={SOMALI_WEYN} clipRule="evenodd" />
      </clipPath>
    </defs>
  );
}
