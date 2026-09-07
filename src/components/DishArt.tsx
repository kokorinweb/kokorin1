import type { CSSProperties } from "react";
import type { DishArt as DishArtData, MenuItem, Wrap } from "@/lib/menu";

/**
 * Векторная графика блюда — то, что показываем, пока нет фотографии.
 *
 * Форму задаёт `art.kind`, цвета — `art.colors`. Ни одного сетевого запроса,
 * ни одного «серого прямоугольника»: карточка выглядит законченной сразу.
 * Как только у блюда появляется `image`, DishMedia ниже рисует фото вместо этого.
 */

const RICE = "#F2EBDE";
const RICE_SHADE = "#DCD2C0";
const NORI = "#1E2420";
const NORI_LIGHT = "#2C352E";

/** Маленький детерминированный «разброс», чтобы карточки не были клонами. */
function jitter(seed: string, index: number, amplitude: number): number {
  let hash = 2166136261;
  const key = `${seed}:${index}`;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (((hash >>> 0) % 1000) / 1000 - 0.5) * 2 * amplitude;
}

type Props = {
  art: DishArtData;
  seed: string;
  className?: string;
  style?: CSSProperties;
};

export function DishArt({ art, seed, className, style }: Props) {
  const [fill, accent, topping] = art.colors;
  const gradId = `g-${seed}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="26%" r="78%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id={`s-${seed}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Подложка-«тарелка»: общая для всех форм, держит композицию. */}
      <circle cx="100" cy="102" r="82" fill="rgba(255,255,255,0.035)" />
      <circle cx="100" cy="102" r="82" fill={`url(#${gradId})`} />

      <g filter={`url(#s-${seed})`}>
        <Shape
          kind={art.kind}
          fill={fill}
          accent={accent}
          topping={topping}
          wrap={art.wrap ?? "nori"}
          seed={seed}
        />
      </g>
    </svg>
  );
}

function Shape({
  kind,
  fill,
  accent,
  topping,
  wrap,
  seed,
}: {
  kind: DishArtData["kind"];
  fill: string;
  accent: string;
  topping: string;
  wrap: Wrap;
  seed: string;
}) {
  switch (kind) {
    case "maki":
      return <Maki colors={[fill, accent, topping]} wrap={wrap} seed={seed} />;
    case "nigiri":
      return <Nigiri fill={fill} accent={accent} />;
    case "gunkan":
      return <Gunkan fill={fill} accent={accent} />;
    case "sashimi":
      return <Sashimi fill={fill} accent={accent} seed={seed} />;
    case "board":
      return <Board colors={[fill, accent, topping]} wrap={wrap} seed={seed} />;
    case "bowl":
      return <Bowl fill={fill} accent={accent} topping={topping} />;
    case "plate":
      return <Plate fill={fill} accent={accent} topping={topping} seed={seed} />;
    case "glass":
      return <Glass fill={fill} accent={accent} topping={topping} />;
    case "sweet":
      return <Sweet fill={fill} accent={accent} topping={topping} seed={seed} />;
    default:
      return null;
  }
}

/** Один ролл в разрезе, вид сверху: обёртка, рис, сегменты начинки, кунжут. */
function Roll({
  cx,
  cy,
  r,
  colors,
  wrap,
  seed,
  index,
}: {
  cx: number;
  cy: number;
  r: number;
  colors: [string, string, string];
  wrap: Wrap;
  seed: string;
  index: number;
}) {
  const [fill, accent, garnish] = colors;
  const clipId = `c-${seed}-${index}`;
  const inner = r * 0.64;

  // Начинка — не одно пятно, а несколько сегментов: так разрез читается как ролл,
  // а не как яичница. Одна большая заливка в центре — главная ошибка таких иллюстраций.
  const blobs = [
    { dx: -0.3, dy: -0.22, rr: 0.62, color: fill },
    { dx: 0.32, dy: -0.12, rr: 0.5, color: accent },
    { dx: 0.02, dy: 0.36, rr: 0.52, color: garnish },
    { dx: -0.04, dy: 0.04, rr: 0.32, color: fill },
  ];

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={inner} />
        </clipPath>
      </defs>

      {/* Обёртка: нори или ломтики рыбы снаружи, как у Филадельфии */}
      <circle cx={cx} cy={cy} r={r} fill={wrap === "fish" ? fill : NORI} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={wrap === "fish" ? accent : NORI_LIGHT}
        strokeWidth={r * 0.07}
      />
      {wrap === "fish"
        ? [0, 1, 2, 3, 4].map((slice) => {
            const angle = (slice / 5) * Math.PI * 2 + 0.4;
            return (
              <line
                key={slice}
                x1={cx + Math.cos(angle) * r * 0.99}
                y1={cy + Math.sin(angle) * r * 0.99}
                x2={cx + Math.cos(angle) * r * 0.82}
                y2={cy + Math.sin(angle) * r * 0.82}
                stroke={accent}
                strokeWidth={r * 0.1}
                strokeLinecap="round"
                opacity="0.9"
              />
            );
          })
        : null}

      {/* Рис */}
      <circle cx={cx} cy={cy} r={r * 0.86} fill={RICE} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={RICE_SHADE} strokeWidth={r * 0.045} />

      {/* Кунжут: мелочь, без которой рис выглядит пластиковым */}
      {wrap === "nori"
        ? [0, 1, 2, 3, 4, 5].map((dot) => {
            const angle = (dot / 6) * Math.PI * 2 + jitter(seed, dot + 30, 0.5);
            return (
              <circle
                key={dot}
                cx={cx + Math.cos(angle) * r * 0.76}
                cy={cy + Math.sin(angle) * r * 0.76}
                r={r * 0.045}
                fill={RICE_SHADE}
              />
            );
          })
        : null}

      {/* Начинка */}
      <circle cx={cx} cy={cy} r={inner} fill={NORI_LIGHT} />
      <g clipPath={`url(#${clipId})`}>
        {blobs.map((blob, blobIndex) => (
          <circle
            key={blobIndex}
            cx={cx + inner * blob.dx}
            cy={cy + inner * blob.dy}
            r={inner * blob.rr}
            fill={blob.color}
          />
        ))}
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={inner}
        fill="none"
        stroke="rgba(0,0,0,0.28)"
        strokeWidth={r * 0.03}
      />
    </g>
  );
}

function Maki({
  colors,
  wrap,
  seed,
}: {
  colors: [string, string, string];
  wrap: Wrap;
  seed: string;
}) {
  return (
    <g>
      <Roll
        cx={70 + jitter(seed, 1, 3)}
        cy={122}
        r={36}
        colors={colors}
        wrap={wrap}
        seed={seed}
        index={0}
      />
      <Roll
        cx={126}
        cy={84 + jitter(seed, 2, 4)}
        r={45}
        colors={colors}
        wrap={wrap}
        seed={seed}
        index={1}
      />
      {/* Веточка микрозелени: композиция перестаёт быть «двумя кругами» */}
      <path
        d="M48 156 q24 -16 48 -7"
        stroke="#5E8C4A"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="44" cy="158" r="4" fill="#5E8C4A" opacity="0.9" />
    </g>
  );
}

function Nigiri({ fill, accent }: { fill: string; accent: string }) {
  return (
    <g>
      {/* Рисовая подушка */}
      <path
        d="M46 128 q6 -26 54 -26 t54 26 q0 16 -54 16 t-54 -16 z"
        fill={RICE}
      />
      <path d="M46 128 q54 18 108 0 q0 12 -54 12 t-54 -12 z" fill={RICE_SHADE} />
      {/* Ломтик рыбы, задрапированный сверху */}
      <path
        d="M40 106 q60 -44 120 0 q-6 16 -60 16 t-60 -16 z"
        fill={fill}
      />
      <path d="M62 96 q38 -18 76 0" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M70 106 q30 -12 60 0" stroke={accent} strokeWidth="4" fill="none" opacity="0.7" strokeLinecap="round" />
    </g>
  );
}

function Gunkan({ fill, accent }: { fill: string; accent: string }) {
  const roe = [
    [86, 84], [100, 79], [114, 84], [93, 92], [107, 92], [100, 100], [79, 92], [121, 92],
  ];
  return (
    <g>
      <rect x="52" y="86" width="96" height="52" rx="10" fill={NORI} />
      <rect x="58" y="92" width="84" height="42" rx="8" fill={RICE} opacity="0.35" />
      <ellipse cx="100" cy="90" rx="48" ry="14" fill={RICE} />
      {roe.map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y - 2}
          r={index % 3 === 0 ? 8 : 6.5}
          fill={index % 2 === 0 ? fill : accent}
        />
      ))}
    </g>
  );
}

function Sashimi({ fill, accent, seed }: { fill: string; accent: string; seed: string }) {
  return (
    <g>
      {/* Тарелка: без неё ломтики висят в воздухе */}
      <ellipse cx="100" cy="126" rx="76" ry="36" fill="#191921" />
      <ellipse cx="100" cy="123" rx="66" ry="29" fill="#22222c" />
      {/* Стружка дайкона под рыбой */}
      <path
        d="M46 122 q26 -12 54 -8 M50 130 q28 -10 56 -6"
        stroke={RICE}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      {[0, 1, 2].map((index) => {
        const x = 46 + index * 26;
        const y = 118 - index * 12;
        return (
          <g key={index} transform={`translate(${x} ${y}) rotate(${-10 + jitter(seed, index, 6)})`}>
            <rect width="76" height="28" rx="13" fill={fill} />
            <path d="M10 11 q28 -8 56 0" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M12 19 q26 -6 52 0" stroke={accent} strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
          </g>
        );
      })}
      {/* Васаби и имбирь сбоку */}
      <circle cx="156" cy="132" r="9" fill="#5E8C4A" />
      <ellipse cx="42" cy="140" rx="12" ry="6" fill="#E8B9C8" opacity="0.9" />
    </g>
  );
}

function Board({
  colors,
  wrap,
  seed,
}: {
  colors: [string, string, string];
  wrap: Wrap;
  seed: string;
}) {
  const positions = [
    [66, 74], [100, 68], [134, 74],
    [66, 116], [100, 122], [134, 116],
  ];
  return (
    <g>
      <rect x="24" y="42" width="152" height="116" rx="10" fill="#171a18" />
      <rect x="30" y="48" width="140" height="104" rx="7" fill="#20241f" />
      {positions.map(([cx, cy], index) => (
        <Roll
          key={index}
          cx={cx}
          cy={cy + jitter(seed, index, 2)}
          r={19}
          colors={index % 2 === 0 ? colors : [colors[1], colors[2], colors[0]]}
          wrap={index % 3 === 0 ? "fish" : wrap}
          seed={seed}
          index={index + 10}
        />
      ))}
    </g>
  );
}

function Bowl({ fill, accent, topping }: { fill: string; accent: string; topping: string }) {
  return (
    <g>
      <path d="M40 92 h120 a60 60 0 0 1 -120 0 z" fill="#1c1c22" />
      <path d="M46 96 h108 a54 54 0 0 1 -108 0 z" fill={fill} />
      <ellipse cx="100" cy="93" rx="60" ry="11" fill={accent} opacity="0.85" />
      <ellipse cx="100" cy="93" rx="60" ry="11" fill="none" stroke="#0a0a0c" strokeWidth="2" opacity="0.25" />
      <circle cx="82" cy="92" r="9" fill={topping} />
      <circle cx="112" cy="95" r="7" fill={topping} opacity="0.8" />
      <path d="M92 86 q12 -8 26 -2" stroke={RICE} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Палочки */}
      <path d="M132 46 l30 44" stroke="#8a6b45" strokeWidth="5" strokeLinecap="round" />
      <path d="M142 42 l28 46" stroke="#7a5c39" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function Plate({
  fill,
  accent,
  topping,
  seed,
}: {
  fill: string;
  accent: string;
  topping: string;
  seed: string;
}) {
  return (
    <g>
      <ellipse cx="100" cy="118" rx="72" ry="34" fill="#191921" />
      <ellipse cx="100" cy="115" rx="62" ry="28" fill="#22222c" />
      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(${64 + index * 30} ${104 + jitter(seed, index, 5)})`}>
          <ellipse cx="0" cy="0" rx="19" ry="14" fill={index === 1 ? accent : fill} />
          <ellipse cx="-4" cy="-4" rx="9" ry="6" fill="#fff" opacity="0.18" />
        </g>
      ))}
      <path d="M62 128 q38 12 76 -2" stroke={topping} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
    </g>
  );
}

function Glass({ fill, accent, topping }: { fill: string; accent: string; topping: string }) {
  return (
    <g>
      <path d="M74 46 h52 l-6 96 a20 20 0 0 1 -40 0 z" fill="rgba(255,255,255,0.08)" />
      <path d="M78 78 h44 l-4 64 a16 16 0 0 1 -36 0 z" fill={fill} />
      <ellipse cx="100" cy="78" rx="22" ry="6" fill={accent} />
      <path d="M84 52 q16 6 32 0" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
      <ellipse cx="100" cy="158" rx="30" ry="8" fill={topping} opacity="0.25" />
    </g>
  );
}

function Sweet({
  fill,
  accent,
  topping,
  seed,
}: {
  fill: string;
  accent: string;
  topping: string;
  seed: string;
}) {
  const items = [
    { cx: 70, cy: 118, color: fill },
    { cx: 104, cy: 106, color: accent },
    { cx: 134, cy: 122, color: topping },
  ];
  return (
    <g>
      <ellipse cx="100" cy="140" rx="70" ry="22" fill="#191921" />
      {items.map((item, index) => (
        <g key={index} transform={`translate(0 ${jitter(seed, index, 3)})`}>
          <circle cx={item.cx} cy={item.cy} r={26} fill={item.color} />
          <ellipse cx={item.cx - 8} cy={item.cy - 10} rx="9" ry="6" fill="#fff" opacity="0.28" />
        </g>
      ))}
    </g>
  );
}

/**
 * Единая точка вывода «картинки блюда».
 * Есть фото — показываем фото, нет — вектор. Компоненты витрины не знают разницы.
 */
export function DishMedia({
  item,
  className,
  sizes,
}: {
  item: MenuItem;
  className?: string;
  sizes?: string;
}) {
  if (item.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        className={`h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }
  return <DishArt art={item.art} seed={item.id} className={`h-full w-full ${className ?? ""}`} />;
}
