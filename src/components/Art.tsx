/**
 * Вся графика сайта нарисована здесь, в SVG.
 *
 * Своих фотографий у компании в открытых источниках нет, а тянуть чужие с
 * фотостоков в демо — и юридически грязно, и выглядит как любой другой лендинг.
 * Поэтому разделы и герой-блок держатся на собственных иллюстрациях: они
 * ничего не весят, не ходят в сеть и не ломаются. Как подставить настоящие
 * фотографии, когда они появятся, описано в README и в `Photo`.
 */

const GRAIN_OPACITY = [0.35, 0.22, 0.3, 0.18, 0.26, 0.2];

/** Древесные волокна: несколько кривых с разным прогибом. */
function Grain({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const step = height / (GRAIN_OPACITY.length + 1);
  return (
    <g stroke="#7a4726" fill="none" strokeWidth="0.9" strokeLinecap="round">
      {GRAIN_OPACITY.map((opacity, index) => {
        const lineY = y + step * (index + 1);
        const bend = index % 2 === 0 ? 7 : -5;
        return (
          <path
            key={index}
            opacity={opacity}
            d={`M${x + 6} ${lineY} C ${x + width * 0.3} ${lineY + bend}, ${x + width * 0.62} ${lineY - bend}, ${x + width - 6} ${lineY}`}
          />
        );
      })}
    </g>
  );
}

/** Латунная ручка-рейлинг. */
function Handle({ x, y, length, vertical = true }: { x: number; y: number; length: number; vertical?: boolean }) {
  return (
    <rect
      x={x}
      y={y}
      width={vertical ? 4 : length}
      height={vertical ? length : 4}
      rx="2"
      fill="#b8892b"
    />
  );
}

/**
 * Герой-блок: веер образцов фасадов на латунном кольце — шпон, эмаль, стекло.
 * Ровно то, что мебельщик выкладывает на стол в начале разговора.
 */
export function MaterialsBoard({ className }: { className?: string }) {
  const swatches = [
    { angle: -13, fill: "url(#deepWood)", stroke: "#4a2a12", grain: true },
    { angle: -4.4, fill: "url(#veneer)", stroke: "#5f3719", grain: true },
    { angle: 4.4, fill: "url(#matte)", stroke: "#c8b9a2", grain: false },
    { angle: 13, fill: "url(#glassPane)", stroke: "#9fb2b0", grain: false },
  ];

  return (
    <svg
      viewBox="0 0 520 460"
      className={className}
      role="img"
      aria-label="Веер образцов мебельных фасадов: тёмный и светлый шпон, матовая эмаль и стекло"
    >
      <defs>
        <linearGradient id="veneer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bd8049" />
          <stop offset="100%" stopColor="#8a4f28" />
        </linearGradient>
        <linearGradient id="matte" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6f0e6" />
          <stop offset="100%" stopColor="#ded2c0" />
        </linearGradient>
        <linearGradient id="glassPane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dae4e3" stopOpacity="0.96" />
          <stop offset="55%" stopColor="#eef3f1" stopOpacity="0.78" />
          <stop offset="100%" stopColor="#c3d0cf" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id="deepWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5a3417" />
          <stop offset="100%" stopColor="#7d4a25" />
        </linearGradient>
      </defs>

      <ellipse cx="262" cy="428" rx="152" ry="15" fill="#7a4726" opacity="0.16" />

      {swatches.map((swatch) => (
        <g key={swatch.angle} transform={`rotate(${swatch.angle} 262 410)`}>
          <rect
            x="168"
            y="98"
            width="188"
            height="286"
            rx="12"
            fill={swatch.fill}
            stroke={swatch.stroke}
            strokeOpacity="0.5"
          />
          {swatch.grain && <Grain x={168} y={98} width={188} height={286} />}
          <Handle x={330} y={206} length={86} />
        </g>
      ))}

      {/* Блики на стеклянном образце — рисуем поверх, чтобы не тонули в веере. */}
      <g transform="rotate(13 262 410)">
        <path d="M196 376 L292 106" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="14" />
        <path d="M244 378 L318 170" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="7" />
      </g>

      {/* Кольцо, на которое образцы нанизаны. */}
      <circle cx="262" cy="410" r="15" fill="none" stroke="#b8892b" strokeWidth="6" />
      <circle cx="262" cy="410" r="5" fill="#f7f3ed" />
    </svg>
  );
}

const ART_LABELS: Record<string, string> = {
  kitchens: "Кухонный гарнитур: верхние шкафы, вытяжка и нижние тумбы",
  wardrobes: "Шкаф-купе с тремя дверями и зеркальной вставкой",
  cabinet: "Стеллаж с полками, коробами и книгами",
  glass: "Стеклянная перегородка с латунным профилем",
  panels: "Стена, отделанная вертикальными рейками, и бра",
};

function KitchenArt() {
  return (
    <>
      <rect x="24" y="36" width="150" height="82" rx="6" fill="#b57843" />
      <Grain x={24} y={36} width={150} height={82} />
      <rect x="248" y="36" width="128" height="82" rx="6" fill="#b57843" />
      <Grain x={248} y={36} width={128} height={82} />
      {/* Вытяжка: труба от самого верха и купол вровень с нижним краем шкафов. */}
      <rect x="196" y="36" width="30" height="40" rx="3" fill="#cbbba4" />
      <path d="M176 76 L246 76 L256 110 L166 110 Z" fill="#cbbba4" />
      <rect x="166" y="106" width="90" height="10" rx="4" fill="#8a4f28" />
      <Handle x={92} y={106} length={44} vertical={false} />
      <Handle x={292} y={106} length={44} vertical={false} />

      <rect x="24" y="166" width="352" height="12" rx="4" fill="#3a2e25" />
      <rect x="24" y="178" width="352" height="82" rx="6" fill="#8a4f28" />
      <Grain x={24} y={178} width={352} height={82} />
      <path d="M142 178 V260 M258 178 V260" stroke="#5f3719" strokeOpacity="0.5" strokeWidth="2" />
      <Handle x={66} y={196} length={40} vertical={false} />
      <Handle x={182} y={196} length={40} vertical={false} />
      <Handle x={298} y={196} length={40} vertical={false} />
      <rect x="24" y="260" width="352" height="6" rx="2" fill="#5f3719" opacity="0.35" />
    </>
  );
}

function WardrobeArt() {
  return (
    <>
      <rect x="40" y="24" width="320" height="248" rx="8" fill="#8a4f28" />
      <rect x="48" y="32" width="304" height="232" rx="4" fill="#a8683a" />
      <Grain x={48} y={32} width={101} height={232} />
      <rect x="149" y="32" width="101" height="232" fill="#d3ddda" opacity="0.92" />
      <path
        d="M158 264 L250 44 M188 264 L250 122"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="7"
      />
      <Grain x={250} y={32} width={102} height={232} />
      <path d="M149 32 V264 M250 32 V264" stroke="#5f3719" strokeOpacity="0.45" strokeWidth="2" />
      <Handle x={136} y={112} length={72} />
      <Handle x={258} y={112} length={72} />
      <rect x="40" y="272" width="320" height="8" rx="3" fill="#5f3719" opacity="0.4" />
    </>
  );
}

function CabinetArt() {
  return (
    <>
      <rect x="62" y="28" width="276" height="244" rx="8" fill="#a8683a" />
      <rect x="72" y="38" width="256" height="224" rx="4" fill="#f3ece1" />
      <path
        d="M72 112 H328 M72 186 H328"
        stroke="#c8b9a2"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Книги на верхней полке. */}
      {[0, 1, 2, 3, 4].map((index) => (
        <rect
          key={index}
          x={88 + index * 15}
          y={64 + (index % 2) * 6}
          width="10"
          height={index % 2 ? 42 : 48}
          rx="2"
          fill={index % 2 ? "#9c5f33" : "#5f3719"}
        />
      ))}
      {/* Короба на средней полке. */}
      <rect x="92" y="132" width="86" height="50" rx="5" fill="#cbbba4" />
      <Handle x={126} y={154} length={20} vertical={false} />
      <rect x="196" y="132" width="86" height="50" rx="5" fill="#b57843" />
      <Handle x={230} y={154} length={20} vertical={false} />
      {/* Ваза на нижней полке. */}
      <path d="M116 258 C 104 232, 112 214, 130 214 C 148 214, 156 232, 144 258 Z" fill="#8a4f28" />
      <rect x="214" y="212" width="94" height="46" rx="5" fill="#cbbba4" />
      <rect x="62" y="272" width="276" height="8" rx="3" fill="#5f3719" opacity="0.4" />
    </>
  );
}

function GlassArt() {
  return (
    <>
      <rect x="54" y="26" width="292" height="246" rx="6" fill="#b8892b" />
      <rect x="64" y="36" width="272" height="226" rx="3" fill="url(#panelGlass)" />
      <path
        d="M154 36 V262 M246 36 V262 M64 122 H336"
        stroke="#b8892b"
        strokeWidth="6"
      />
      <path d="M82 258 L162 40" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="12" />
      <path d="M128 258 L192 84" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="6" />
      <path d="M262 258 L326 84" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="8" />
      <Handle x={232} y={132} length={64} />
      <rect x="54" y="272" width="292" height="8" rx="3" fill="#5f3719" opacity="0.35" />
    </>
  );
}

function PanelsArt() {
  return (
    <>
      <rect x="26" y="22" width="348" height="240" rx="6" fill="#a8683a" />
      {Array.from({ length: 11 }, (_, index) => (
        <rect
          key={index}
          x={36 + index * 31}
          y="32"
          width={index % 3 === 0 ? 20 : 13}
          height="220"
          rx="5"
          fill="#8a4f28"
          opacity={index % 2 === 0 ? 0.9 : 0.55}
        />
      ))}
      {/* Бра: тёплое пятно света на рейках. */}
      <circle cx="292" cy="96" r="44" fill="#f5e2b4" opacity="0.4" />
      <circle cx="292" cy="96" r="18" fill="#f3ece1" />
      <rect x="288" y="114" width="8" height="34" rx="3" fill="#b8892b" />
      <rect x="26" y="262" width="348" height="10" rx="3" fill="#5f3719" opacity="0.4" />
    </>
  );
}

const ART_BY_ID: Record<string, () => React.JSX.Element> = {
  kitchens: KitchenArt,
  wardrobes: WardrobeArt,
  cabinet: CabinetArt,
  glass: GlassArt,
  panels: PanelsArt,
};

/** Иллюстрация раздела каталога. */
export function CategoryArt({ id, className }: { id: string; className?: string }) {
  const Shape = ART_BY_ID[id];
  if (!Shape) return null;

  return (
    <svg viewBox="0 0 400 290" className={className} role="img" aria-label={ART_LABELS[id]}>
      <defs>
        <linearGradient id="panelGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d9e3e2" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#eef3f1" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#c3d0cf" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <Shape />
    </svg>
  );
}
