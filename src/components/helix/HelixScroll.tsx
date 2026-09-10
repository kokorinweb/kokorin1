"use client";

import { useEffect, useRef, useState } from "react";
import { HELIX, HELIX_CAPTIONS } from "@/lib/helix";

/**
 * Скролл-скраб: прокрутка страницы перематывает секвенцию кадров на канвасе.
 *
 * Почему канвас, а не <video> с currentTime: перемотка видео на мобильном Safari
 * дёргается и отстаёт от пальца, а отрисовка заранее загруженных кадров идёт ровно.
 * Плата за это — 1.7 МБ картинок, которые грузятся один раз под прелоадером.
 */

/** Доля, на которую кадр догоняет реальную позицию скролла за тик. Ниже — плавнее и вязче. */
const SMOOTHING = 0.15;
/** Сколько картинок тянем одновременно: больше — быстрее, но браузер начинает захлёбываться. */
const CONCURRENCY = 12;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

export function HelixScroll() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);

  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  // Прелоад кадров с ограничением параллелизма.
  useEffect(() => {
    let cancelled = false;
    const frames: (HTMLImageElement | null)[] = new Array(HELIX.frameCount).fill(null);
    framesRef.current = frames;

    let next = 0;
    let done = 0;

    function pump() {
      if (cancelled) return;
      const index = next++;
      if (index >= HELIX.frameCount) return;

      const image = new Image();
      image.decoding = "async";

      const settle = () => {
        done += 1;
        if (cancelled) return;
        setLoaded(done);
        if (done === HELIX.frameCount) setReady(true);
        pump();
      };

      image.onload = () => {
        frames[index] = image;
        settle();
      };
      // Битый кадр не должен вешать всю сцену — просто останется дыркой, её закроет сосед.
      image.onerror = settle;
      image.src = HELIX.src(index);
    }

    for (let i = 0; i < CONCURRENCY; i += 1) pump();
    return () => {
      cancelled = true;
    };
  }, []);

  // Пока грузимся — держим страницу на месте, чтобы нельзя было проскроллить пустой экран.
  useEffect(() => {
    if (ready) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const runway = runwayRef.current;
    const canvas = canvasRef.current;
    if (!runway || !canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let smoothed = -1;
    let frame = 0;
    let running = false;

    const nearestFrame = (index: number): HTMLImageElement | null => {
      const frames = framesRef.current;
      const direct = frames[index];
      if (direct) return direct;
      // Кадр ещё не догрузился — берём ближайший готовый, чтобы не мигать чёрным.
      for (let offset = 1; offset < frames.length; offset += 1) {
        const before = frames[index - offset];
        if (before) return before;
        const after = frames[index + offset];
        if (after) return after;
      }
      return null;
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      smoothed = -1;
    };

    const drawFrame = (progress: number) => {
      const index = Math.round(clamp01(progress) * (HELIX.frameCount - 1));
      const image = nearestFrame(index);

      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);
      if (!image) return;

      // Вписываем по ширине, но не даём кадру раздуться сильнее, чем нужно для заполнения:
      // на широких экранах это cover, на вертикальном телефоне — полоса на чёрном, что
      // незаметно, потому что фон ролика тоже чёрный.
      const cover = Math.max(width / image.width, height / image.height);
      const scale = Math.min(cover, (width / image.width) * 1.35);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      context.drawImage(
        image,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    };

    const paintOverlays = (progress: number) => {
      let active = 0;

      HELIX_CAPTIONS.forEach((caption, index) => {
        const element = captionsRef.current[index];
        if (!element) return;

        const local = (progress - caption.from) / (caption.to - caption.from);
        // Появление быстрее, чем уход: так надпись успевает прочитаться до смены кадра.
        const opacity =
          local < 0.24 ? clamp01(local / 0.24) : clamp01((1 - local) / 0.26);

        if (opacity > 0.35) active = index;

        if (opacity < 0.01) {
          element.style.visibility = "hidden";
          element.style.opacity = "0";
          return;
        }

        const drift = reduced ? 0 : (0.4 - clamp01(local)) * 64;
        element.style.visibility = "visible";
        element.style.opacity = opacity.toFixed(3);
        element.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0)`;
        element.style.filter = opacity > 0.99 ? "none" : `blur(${((1 - opacity) * 8).toFixed(2)}px)`;
      });

      if (chapterRef.current) {
        chapterRef.current.textContent = String(active + 1).padStart(2, "0");
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${clamp01(progress).toFixed(4)})`;
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = (1 - clamp01(progress / 0.035)).toFixed(3);
      }
    };

    const tick = () => {
      const rect = runway.getBoundingClientRect();
      // Именно высота залипающего экрана, а не innerHeight: на мобильных они расходятся
      // из-за прячущейся панели браузера, и последние кадры не доигрывали.
      const travel = rect.height - (stageRef.current?.clientHeight ?? window.innerHeight);
      const target = travel <= 0 ? 0 : clamp01(-rect.top / travel);

      if (smoothed < 0 || reduced) {
        smoothed = target;
      } else {
        smoothed += (target - smoothed) * SMOOTHING;
        // Добиваем хвост вручную: иначе экспонента вечно ползёт и жжёт кадры впустую.
        if (Math.abs(target - smoothed) < 0.0003) smoothed = target;
      }

      drawFrame(smoothed);
      paintOverlays(smoothed);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    resize();
    start();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Сцена ушла с экрана — незачем крутить rAF и греть батарею.
    const visibility = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    visibility.observe(runway);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
    };
  }, [ready]);

  const percent = Math.round((loaded / HELIX.frameCount) * 100);

  return (
    <>
      <div className="helix-loader" data-done={ready ? "true" : "false"} aria-hidden={ready}>
        <div className="helix-loader__mark">NUCLEA</div>
        <div className="helix-loader__count tabular-nums">{percent}%</div>
        <div className="helix-loader__track">
          <div className="helix-loader__fill" style={{ transform: `scaleX(${percent / 100})` }} />
        </div>
        <p className="helix-loader__note">Загружаем последовательность · {HELIX.frameCount} кадров</p>
      </div>

      <section
        ref={runwayRef}
        className="helix-runway"
        style={{ height: `${HELIX.runwayScreens * 100}svh` }}
        aria-label="Скролл-сцена: двойная спираль ДНК"
      >
        <div ref={stageRef} className="helix-stage">
          <canvas ref={canvasRef} className="helix-canvas" />
          <header className="hx-nav">
            <div className="hx-nav__mark">NUCLEA</div>
            <div className="hx-nav__meta">Геномная лаборатория</div>
          </header>
          <div className="helix-vignette" aria-hidden />
          <div className="helix-grain" aria-hidden />

          <div className="helix-captions">
            {HELIX_CAPTIONS.map((caption, index) => (
              <div
                key={caption.title}
                ref={(node) => {
                  captionsRef.current[index] = node;
                }}
                className="helix-caption"
                data-place={caption.place}
              >
                {caption.kicker && <p className="helix-caption__kicker">{caption.kicker}</p>}
                <h2 className="helix-caption__title">{caption.title}</h2>
                <p className="helix-caption__body">{caption.body}</p>
              </div>
            ))}
          </div>

          <div className="helix-hud" aria-hidden>
            <span ref={chapterRef}>01</span>
            <span className="helix-hud__slash">/</span>
            <span>{String(HELIX_CAPTIONS.length).padStart(2, "0")}</span>
          </div>

          <div ref={hintRef} className="helix-hint" aria-hidden>
            <span>Прокрутите</span>
            <i />
          </div>

          <div className="helix-progress" aria-hidden>
            <div ref={barRef} className="helix-progress__bar" />
          </div>
        </div>
      </section>
    </>
  );
}
