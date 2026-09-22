"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Живое поле первого экрана.
 *
 * Это не имитация градиентами: высотное поле строится domain-warped FBM,
 * из него берутся нормали, и по ним считается иридескентное затенение с
 * френелевским краем. Поэтому масса читается как объём, а не как текстура.
 *
 * Поле реагирует на курсор (мягкий аттрактор искривляет варп) и на скролл
 * (масса уходит вглубь и гаснет). Без WebGL и при prefers-reduced-motion
 * показывается статичный кадр: композиция сохраняется, движения нет.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // -0.5..0.5, сглажен на CPU
uniform float uScroll;    // 0..1 прогресс ухода первого экрана
uniform float uIntro;     // 0..1 появление при загрузке

out vec4 outColor;

// --- шум -------------------------------------------------------------------

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  // Четыре октавы: объём с фактурой, но без мелкой ряби «бензиновой плёнки».
  for (int i = 0; i < 4; i++) {
    v += a * gnoise(p);
    p = rot * p * 2.02;
    a *= 0.48;
  }
  return v;
}

// --- высотное поле ---------------------------------------------------------
// Двойной domain warp: медленный дрейф даёт «дыхание» массы, курсор
// подмешивает локальное искривление.

float height(vec2 p, float t, vec2 ptr) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.18 * t)),
                fbm(p + vec2(4.3, 1.7) - vec2(0.13 * t, 0.0)));

  vec2 pull = p - ptr * 1.65;
  float grip = exp(-2.1 * dot(pull, pull));
  q += pull * grip * 0.55;

  vec2 r = vec2(fbm(p + 1.5 * q + vec2(1.7, 9.2) + 0.09 * t),
                fbm(p + 1.5 * q + vec2(8.3, 2.8) - 0.07 * t));

  return fbm(p + 1.85 * r);
}

// --- иридескентная развёртка ----------------------------------------------
// Явная лента по фирменным цветам, а не косинусная палитра: так акцентный
// лайм остаётся тем же лаймом, что и в интерфейсе.

vec3 iris(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.027, 0.027, 0.039);  // земля
  vec3 c1 = vec3(0.043, 0.149, 0.129);  // глубокая бирюза
  vec3 c2 = vec3(0.180, 0.902, 0.773);  // бирюза
  vec3 c3 = vec3(0.776, 0.949, 0.306);  // лайм (акцент интерфейса)
  vec3 c4 = vec3(1.000, 0.769, 0.420);  // тёплое ядро
  vec3 c5 = vec3(0.231, 0.420, 1.000);  // кобальт
  vec3 c6 = vec3(0.545, 0.361, 0.965);  // фиолет

  if (t < 0.18) return mix(c0, c1, smoothstep(0.0, 0.18, t));
  if (t < 0.38) return mix(c1, c2, smoothstep(0.18, 0.38, t));
  if (t < 0.56) return mix(c2, c3, smoothstep(0.38, 0.56, t));
  if (t < 0.68) return mix(c3, c4, smoothstep(0.56, 0.68, t));
  if (t < 0.84) return mix(c4, c5, smoothstep(0.68, 0.84, t));
  return mix(c5, c6, smoothstep(0.84, 1.0, t));
}

// Упорядоченный дизеринг: на почти чёрной земле банды видны сразу.
float dither(vec2 fragCoord) {
  return fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag - 0.5 * uRes) / min(uRes.x, uRes.y);

  float t = uTime;
  vec2 ptr = uPointer;

  // Масса уходит вглубь по мере скролла первого экрана.
  float depth = 1.0 - 0.28 * uScroll;
  vec2 p = uv * (1.28 / depth) + vec2(0.0, 0.18 * uScroll);

  float e = 0.010;
  float h  = height(p, t, ptr);
  float hx = height(p + vec2(e, 0.0), t, ptr);
  float hy = height(p + vec2(0.0, e), t, ptr);

  // Нормаль высотного поля — источник объёма.
  vec3 n = normalize(vec3((hx - h) / e, (hy - h) / e, 1.7));

  vec3 view = normalize(vec3(uv * 0.55, 1.0));
  vec3 key  = normalize(vec3(0.42 + ptr.x * 0.5, 0.72 + ptr.y * 0.4, 0.62));

  float diff  = max(dot(n, key), 0.0);
  float fres  = pow(1.0 - max(dot(n, view), 0.0), 1.7);
  float spec  = pow(max(dot(reflect(-key, n), view), 0.0), 36.0);

  // Ограничиваем массу овальной областью: получается объект, а не обои.
  vec2 mv = uv * vec2(0.84, 1.20) - vec2(ptr.x * 0.12, -0.04);
  float body = smoothstep(0.80, 0.08, length(mv));
  // Порог по высоте оставляет вокруг массы настоящую черноту, но не
  // съедает саму массу: нижняя граница идёт по типичному минимуму fbm.
  body *= smoothstep(-0.30, 0.10, h);

  // Место на ленте: высота задаёт основу, френель гонит край в холодную часть.
  float ramp = 0.07 + 0.30 * (h * 0.5 + 0.5) + 0.68 * fres - 0.06 * diff;
  vec3 col = iris(ramp) * body;

  col += vec3(0.86, 0.94, 1.0) * spec * body * 0.45;
  col += iris(0.78) * fres * fres * body * 0.14;

  // Земля страницы — та же, что в CSS, чтобы стыка не было видно.
  vec3 ground = vec3(0.027, 0.027, 0.039);
  col = mix(ground, col, clamp(body * 1.18, 0.0, 1.0));

  // Общее угасание к низу экрана, под контент.
  float vign = smoothstep(1.25, 0.10, length(uv * vec2(0.70, 1.0)));
  col *= 0.32 + 0.68 * vign;

  col *= uIntro;
  col *= 1.0 - 0.45 * uScroll;

  col += dither(frag) * (1.6 / 255.0);

  outColor = vec4(max(col, 0.0), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function IrisField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uScroll = gl.getUniformLocation(program, "uScroll");
    const uIntro = gl.getUniformLocation(program, "uIntro");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const pointer = { x: 0, y: 0 };
    const damped = { x: 0, y: 0 };
    let scroll = 0;
    let intro = 0;
    let raf = 0;
    let last = 0;
    let inView = true;
    let pageVisible = true;
    let running = true;

    const resize = () => {
      // Поле сильно размыто по своей природе, поэтому тянуть полный DPR
      // незачем: 1.35 визуально неотличим и заметно дешевле.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };

    const draw = (timeSeconds: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, timeSeconds);
      gl.uniform2f(uPointer, damped.x, damped.y);
      gl.uniform1f(uScroll, scroll);
      gl.uniform1f(uIntro, intro);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const readScroll = () => {
      const rect = canvas.getBoundingClientRect();
      const span = rect.height || window.innerHeight;
      scroll = Math.min(1, Math.max(0, -rect.top / span));
    };

    // Статичный кадр: композиция на месте, движения нет.
    if (reduce.matches) {
      resize();
      intro = 1;
      draw(7.5);
      setLive(true);
      const onResizeStatic = () => {
        resize();
        draw(7.5);
      };
      window.addEventListener("resize", onResizeStatic);
      return () => {
        window.removeEventListener("resize", onResizeStatic);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    }

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!inView || !pageVisible) {
        // Пауза не должна дать скачок времени при возврате.
        last = now;
        return;
      }

      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;

      // Экспоненциальное сглаживание: курсор ведёт массу, а не дёргает её.
      const k = 1 - Math.exp(-dt / 0.28);
      damped.x += (pointer.x - damped.x) * k;
      damped.y += (pointer.y - damped.y) * k;
      intro += (1 - intro) * (1 - Math.exp(-dt / 0.55));

      resize();
      readScroll();
      draw(now / 1000);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.y = 0.5 - (event.clientY - rect.top) / rect.height;
    };

    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    const onVisibility = () => {
      pageVisible = document.visibilityState === "visible";
    };

    // Ниже первого экрана поле не рисуем вовсе.
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    setLive(true);
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div className={className} aria-hidden="true">
      {/*
        Подложка видна, пока шейдер не встал, и остаётся единственным слоем,
        если WebGL недоступен. Она повторяет композицию поля, а не заменяет
        её плоским градиентом на весь экран.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 48% at 50% 40%, rgba(46,230,197,0.20), transparent 68%), radial-gradient(38% 34% at 62% 32%, rgba(198,242,78,0.16), transparent 70%), radial-gradient(46% 42% at 38% 56%, rgba(59,107,255,0.16), transparent 72%)",
          opacity: live ? 0 : 1,
          transition: "opacity 700ms var(--ease-out-expo)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: live ? 1 : 0, transition: "opacity 700ms var(--ease-out-expo)" }}
      />
    </div>
  );
}
