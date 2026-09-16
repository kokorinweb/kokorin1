/* =============================================================
   ДОЛЬКА — сценарий страницы
   Вся хореография собрана здесь: прелоадер, инерционный скролл,
   слайдер вкусов в герое, пиннинг манифеста, горизонтальная лента,
   соковыжималка. При prefers-reduced-motion движение выключается,
   а страница остаётся полностью читаемой и рабочей.
   ============================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Линейка вкусов — один источник правды для героя, банки и пузырьков. */
  var SLIDES = [
    { a: 'Яркий.',  b: 'Цитрус',   flav: '#F2901E', top: '#FBC02D', bot: '#8FBF3A', tint: '#FEF1DC', fruit: 'f-orange', cap: 'ЦИТРУС' },
    { a: 'Свежий.', b: 'Киви',     flav: '#5BA83C', top: '#B6D94F', bot: '#2E7D45', tint: '#E9F4E0', fruit: 'f-kiwi',   cap: 'КИВИ' },
    { a: 'Спелая.', b: 'Ягода',    flav: '#E0507A', top: '#F5789F', bot: '#7A2A6B', tint: '#FCE7EE', fruit: 'f-berry',  cap: 'ЯГОДА' },
    { a: 'Тёмный.', b: 'Виноград', flav: '#7B4FA8', top: '#A97FD1', bot: '#3F2A6B', tint: '#EFE7F7', fruit: 'f-grape',  cap: 'ВИНОГРАД' },
    { a: 'Жаркий.', b: 'Тропик',   flav: '#EFA81B', top: '#FFD147', bot: '#E4622A', tint: '#FDF0D3', fruit: 'f-mango',  cap: 'ТРОПИК' }
  ];

  /* ---------- 1. Инерционный скролл ---------- */

  var lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined' && hasGSAP) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.1 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMobnav();
    scrollToTarget(target);
  });

  /* ---------- 2. Разбивка заголовков на буквы ---------- */

  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var frag = document.createDocumentFragment();
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = text[i] === ' ' ? 'ch ch--sp' : 'ch';
      s.textContent = text[i] === ' ' ? ' ' : text[i];
      frag.appendChild(s);
      out.push(s);
    }
    el.appendChild(frag);
    el.setAttribute('aria-label', text);
    return out;
  }

  var heroChars = [];
  $$('[data-split]').forEach(function (el) {
    var chars = splitChars(el);
    if (el.closest('.hero__title')) heroChars = heroChars.concat(chars);
  });

  /* ---------- 3. Слайдер вкусов в герое ---------- */

  var heroSection = $('#hero');
  var heroBlock   = $('.hero__block');
  var titleA = $('.hero__titleA'), titleB = $('.hero__titleB');
  var heroNum = $('#heroNum'), heroNumBar = $('#heroNumBar');
  var canFlavor = $('#canFlavor');
  var dots = $$('.dot');
  var fruitA = $('.hero__fruit--1 use'), fruitC = $('.hero__fruit--3 use'), fruitD = $('.hero__fruit--4 use');
  var slide = 0, slideTimer = null;

  function paintSlide(i) {
    var s = SLIDES[i];
    if (heroSection) {
      heroSection.style.setProperty('--flav', s.flav);
      heroSection.style.setProperty('--flavTop', s.top);
      heroSection.style.setProperty('--flavBot', s.bot);
      heroSection.style.setProperty('--tint', s.tint);
    }
    if (heroNum) heroNum.textContent = '0' + (i + 1);
    if (heroNumBar) heroNumBar.style.transform = 'scaleX(' + ((i + 1) / SLIDES.length).toFixed(3) + ')';
    if (canFlavor) canFlavor.textContent = s.cap;
    if (fruitA) fruitA.setAttribute('href', '#' + s.fruit);
    if (fruitC) fruitC.setAttribute('href', '#' + SLIDES[(i + 1) % SLIDES.length].fruit);
    if (fruitD) fruitD.setAttribute('href', '#' + SLIDES[(i + 2) % SLIDES.length].fruit);
    dots.forEach(function (d, n) {
      d.classList.toggle('is-on', n === i);
      d.setAttribute('aria-selected', String(n === i));
    });
  }

  function setSlide(i, animate) {
    i = (i + SLIDES.length) % SLIDES.length;
    slide = i;
    var s = SLIDES[i];
    paintSlide(i);
    if (!titleA || !titleB) return;
    titleA.textContent = s.a;
    titleB.textContent = s.b;
    var chars = splitChars(titleA).concat(splitChars(titleB));
    if (animate && hasGSAP && !reduced) {
      gsap.from(chars, { yPercent: 70, opacity: 0, duration: .6, stagger: .028, ease: 'expo.out' });
    }
  }

  function startSlides() {
    if (reduced || slideTimer) return;
    slideTimer = setInterval(function () { setSlide(slide + 1, true); }, 6200);
  }
  function stopSlides() { clearInterval(slideTimer); slideTimer = null; }

  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      stopSlides();
      setSlide(Number(d.dataset.slide), true);
      startSlides();
    });
  });
  if (heroBlock) {
    heroBlock.addEventListener('pointerenter', stopSlides);
    heroBlock.addEventListener('pointerleave', startSlides);
    heroBlock.addEventListener('focusin', stopSlides);
  }
  paintSlide(0);

  /* ---------- 4. Прелоадер ---------- */

  var head = $('#head'), progress = $('#headProgress');
  if (head && !reduced) head.classList.add('is-intro');
  var preloader = $('#preloader');

  function runIntro() {
    if (!hasGSAP || reduced) { startSlides(); return; }
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(heroChars, { yPercent: 110, opacity: 0, duration: 1, stagger: .03 }, 0)
      .from('.hero__stage', { y: 60, opacity: 0, duration: 1.1 }, .1)
      .from('.hero__count, .hero__aside > *, .hero__dots', { y: 22, opacity: 0, duration: .7, stagger: .07 }, .35)
      .from('.marquee--hero', { opacity: 0, duration: .6 }, .5);
    if (head) gsap.delayedCall(.25, function () { head.classList.remove('is-intro'); });
    gsap.delayedCall(1.6, startSlides);
  }

  function killPreloader() {
    if (!preloader) { runIntro(); return; }
    preloader.classList.add('is-done');
    if (!hasGSAP || reduced) { preloader.style.display = 'none'; runIntro(); return; }
    gsap.to(preloader, {
      yPercent: -100, duration: .9, ease: 'expo.inOut',
      onComplete: function () { preloader.style.display = 'none'; ScrollTrigger.refresh(); }
    });
    runIntro();
  }

  if (preloader && !reduced && hasGSAP) {
    var num = $('#preloaderNum'), fill = $('#preloaderFill'), counter = { v: 0 };
    gsap.to(counter, {
      v: 100, duration: 1.15, ease: 'power2.inOut',
      onUpdate: function () {
        var v = Math.round(counter.v);
        if (num) num.textContent = v < 10 ? '0' + v : String(v);
        if (fill) fill.style.width = v + '%';
      },
      onComplete: function () { gsap.delayedCall(.12, killPreloader); }
    });
  } else if (preloader) {
    preloader.style.display = 'none';
    runIntro();
  }

  /* ---------- 5. Шапка ---------- */

  var lastY = 0;
  var nativeProgress = !reduced && CSS.supports && CSS.supports('animation-timeline: scroll()');

  var maxScroll = 0;
  function measureScroll() { maxScroll = document.documentElement.scrollHeight - window.innerHeight; }
  measureScroll();
  window.addEventListener('resize', measureScroll);
  if (hasGSAP && window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', measureScroll);

  function onScrollHead() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (progress && !nativeProgress) {
      progress.style.transform = 'scaleX(' + (maxScroll > 0 ? y / maxScroll : 0) + ')';
    }
    if (head) {
      if (y > 260 && y > lastY + 4) head.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 120) head.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScrollHead, { passive: true });
  onScrollHead();

  var burger = $('#burger'), mobnav = $('#mobnav');
  function closeMobnav() {
    if (!mobnav || mobnav.hidden) return;
    mobnav.hidden = true;
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && mobnav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mobnav.hidden = open;
      if (!open && hasGSAP && !reduced) {
        gsap.from(mobnav.children, { y: 16, opacity: 0, duration: .4, stagger: .05, ease: 'power2.out' });
      }
    });
  }

  /* ---------- 6. Пузырьки газа в герое ---------- */

  var canvas = $('#bubbles');
  if (canvas && !reduced) {
    var ctx = canvas.getContext('2d');
    var bubbles = [], raf = null, W = 0, H = 0, dpr = 1;

    function flavRGB() {
      var hex = (SLIDES[slide].flav || '#F2901E').replace('#', '');
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
    function sizeCanvas() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(38, W / 34));
      bubbles = [];
      for (var i = 0; i < n; i++) bubbles.push(newBubble(true));
    }
    function newBubble(anywhere) {
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : H + 20,
        r: 3 + Math.random() * 12, s: .18 + Math.random() * .6,
        a: .07 + Math.random() * .16, w: Math.random() * Math.PI * 2
      };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var c = flavRGB();
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        b.y -= b.s; b.w += .018;
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(b.w) * 10, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + b.a + ')';
        ctx.fill();
        if (b.y + b.r < -10) bubbles[i] = newBubble(false);
      }
      raf = requestAnimationFrame(draw);
    }
    var onScreen = true;
    function start() { if (!raf && onScreen && !document.hidden) draw(); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    sizeCanvas();
    start();
    window.addEventListener('resize', sizeCanvas);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        onScreen ? start() : stop();
      }, { rootMargin: '120px' }).observe(canvas);
    }
  }

  /* ---------- 7. Банка в герое: наклон и параллакс ---------- */

  var heroCan = $('#heroCan');
  if (heroCan && hasGSAP && !reduced) {
    gsap.to(heroCan, {
      y: -60, rotate: 4, scale: .94, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 }
    });
    if (window.matchMedia('(pointer:fine)').matches && heroBlock) {
      var tiltX = gsap.quickTo(heroCan, 'rotateY', { duration: .7, ease: 'power3' });
      var tiltY = gsap.quickTo(heroCan, 'rotateX', { duration: .7, ease: 'power3' });
      gsap.set(heroCan, { transformPerspective: 900 });
      heroBlock.addEventListener('pointermove', function (e) {
        var r = this.getBoundingClientRect();
        tiltX(((e.clientX - r.left) / r.width - .5) * 16);
        tiltY(((e.clientY - r.top) / r.height - .5) * -12);
      });
    }
    gsap.to('.hero__glow', {
      yPercent: 14, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- 8. Бегущие строки ---------- */

  $$('[data-marquee]').forEach(function (track) {
    track.innerHTML = track.innerHTML + track.innerHTML;
    if (!hasGSAP || reduced) return;
    var dir = Number(track.dataset.dir || 1);
    var dur = track.closest('.marquee--says') ? 52 : 30;
    if (dir > 0) gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: dur, ease: 'none', repeat: -1 });
    else gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: dur, ease: 'none', repeat: -1 });
  });

  /* ---------- 9. Манифест: пин + скраб ---------- */

  var beats = $$('.manifest__beat');
  var mCan = $('#manifestCan');
  var mSet = mCan && hasGSAP ? gsap.quickSetter(mCan, 'css') : null;
  var mRail = $('#manifestRail');
  var curBeat = 0;

  function setBeat(i) {
    if (i === curBeat) return;
    curBeat = i;
    if (!hasGSAP || reduced) {
      beats.forEach(function (b, n) { b.classList.toggle('is-on', n === i); });
      return;
    }
    /* каждый бит получает явную цель, иначе быстрый скролл оставляет два текста поверх друг друга */
    beats.forEach(function (b, n) {
      var on = n === i;
      b.classList.toggle('is-on', on);
      gsap.to(b, {
        opacity: on ? 1 : 0,
        y: on ? 0 : (n < i ? -20 : 20),
        duration: on ? .45 : .28,
        ease: on ? 'power2.out' : 'power2.in',
        overwrite: 'auto'
      });
    });
  }

  if (beats.length && hasGSAP && !reduced) {
    ScrollTrigger.create({
      trigger: '.manifest__stage', start: 'top top', end: '+=260%',
      pin: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: function (self) {
        var p = self.progress;
        if (mRail) mRail.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        setBeat(Math.min(beats.length - 1, Math.floor(p * beats.length * 0.999)));
        if (mSet) mSet({ rotate: -10 + p * 20, yPercent: -6 + p * 12, scale: .92 + p * .14 });
      }
    });
  }

  /* ---------- 10. Вкусы: горизонтальная лента ---------- */

  var fTrack = $('#flavorsTrack');
  var fSection = $('.flavors');
  var panels = fTrack ? $$('.flav', fTrack) : [];

  if (fTrack && panels.length && hasGSAP && !reduced) {
    var tints = panels.map(function (p) { return p.style.getPropertyValue('--tint').trim() || '#FEF1DC'; });
    var curFlav = -1;
    var distance = function () { return Math.max(0, fTrack.scrollWidth - window.innerWidth); };

    gsap.to(fTrack, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '#flavorsPin', start: 'top top',
        end: function () { return '+=' + (distance() + window.innerHeight * 0.5); },
        pin: true, scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var i = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
          if (i !== curFlav) { curFlav = i; fSection.style.setProperty('--tint', tints[i]); }
        }
      }
    });
    fSection.style.setProperty('--tint', tints[0]);
  }

  /* ---------- 11. Счётчики фактов ---------- */

  function formatNum(v, dec) {
    return (dec ? v.toFixed(dec) : String(Math.round(v))).replace('.', ',');
  }

  $$('.fact__val').forEach(function (el) {
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.dec || '0', 10);
    if (isNaN(target)) return;
    if (!hasGSAP || reduced) { el.textContent = formatNum(target, dec); return; }
    el.textContent = formatNum(0, dec);
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.4, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: function () { el.textContent = formatNum(obj.v, dec); }
    });
  });

  /* ---------- 12. Соковыжималка ---------- */

  (function juicer() {
    var unit = $('.mach__body');
    if (!unit) return;
    var status = $('#machStatus'), lamp = $('#machLamp'), go = $('#machGo');
    var jet = $('#machJet'), liquid = $('#glassLiquid');
    var syrups = $$('.syr');
    var busy = false;
    var current = { name: 'Цитрус', color: '#F2901E' };

    function say(t) { if (status) status.textContent = t; }

    syrups.forEach(function (b) {
      b.addEventListener('click', function () {
        if (busy) return;
        syrups.forEach(function (o) { o.classList.remove('is-on'); o.setAttribute('aria-pressed', 'false'); });
        b.classList.add('is-on'); b.setAttribute('aria-pressed', 'true');
        current = { name: b.dataset.syrup, color: b.dataset.color };
        unit.style.setProperty('--flav', current.color);
        say(current.name + ' выбран. Жмите «Налить»');
      });
    });
    unit.style.setProperty('--flav', current.color);

    if (go) go.addEventListener('click', function () {
      if (busy) return;
      busy = true; go.disabled = true;
      if (lamp) lamp.classList.add('is-on');
      say('Наливается: ' + current.name);

      if (!hasGSAP || reduced) {
        if (liquid) liquid.style.height = '76%';
        done();
        return;
      }
      gsap.timeline({ onComplete: done })
        .to(jet, { height: 66, duration: .2, ease: 'power2.out' })
        .to(liquid, { height: '76%', duration: 1.5, ease: 'power1.inOut' }, 0)
        .to(jet, { height: 0, duration: .18, ease: 'power2.in' }, '-=0.12')
        .fromTo('.glass', { y: 0 }, { y: -3, duration: .09, repeat: 3, yoyo: true }, '-=0.3');

      function done() {
        say('Готово: ' + current.name + ', 0,33 л');
        setTimeout(reset, 3400);
      }
    });

    function reset() {
      if (!hasGSAP || reduced) { if (liquid) liquid.style.height = '0%'; }
      else gsap.to(liquid, { height: '0%', duration: .7, ease: 'power2.in' });
      if (lamp) lamp.classList.remove('is-on');
      if (go) go.disabled = false;
      busy = false;
      say('Выберите фрукт');
    }
  })();

  /* ---------- 13. Обратный отсчёт ---------- */

  (function countdown() {
    var box = $('#countdown');
    if (!box) return;
    var cells = {
      d: $('[data-cd="d"]', box), h: $('[data-cd="h"]', box),
      m: $('[data-cd="m"]', box), s: $('[data-cd="s"]', box)
    };
    var now = new Date(), year = now.getFullYear();
    var target = new Date(year, 11, 31, 23, 59, 59);
    if (target <= now) target = new Date(year + 1, 11, 31, 23, 59, 59);

    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function tick() {
      var s = Math.floor(Math.max(0, target - new Date()) / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
      cells.m.textContent = pad(Math.floor(s % 3600 / 60));
      cells.s.textContent = pad(s % 60);
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- 14. Формы ---------- */

  var codeform = $('#codeform');
  if (codeform) {
    var input = $('#code'), msg = $('#codemsg');
    input.addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      msg.textContent = ''; msg.className = 'codeform__msg';
    });
    codeform.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = input.value.replace(/-/g, '');
      if (raw.length !== 6) {
        msg.textContent = 'В коде шесть знаков, сейчас ' + raw.length + '. Проверьте язычок.';
        msg.className = 'codeform__msg is-err';
        if (hasGSAP && !reduced) gsap.fromTo(input, { x: -7 }, { x: 0, duration: .5, ease: 'elastic.out(1,0.3)' });
        return;
      }
      msg.textContent = 'Код ' + raw + ' принят. Он в очереди на ближайший розыгрыш.';
      msg.className = 'codeform__msg is-ok';
      input.value = '';
      if (hasGSAP && !reduced) gsap.fromTo(msg, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .4 });
    });
  }

  var sub = $('#sub');
  if (sub) {
    sub.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = $('#subname'), telEl = $('#subtel'), m = $('#submsg');
      var digits = telEl.value.replace(/\D/g, '');
      if (!nameEl.value.trim()) {
        m.textContent = 'Напишите имя — иначе не будем знать, к кому обращаться.';
        m.className = 'sub__msg is-err'; nameEl.focus(); return;
      }
      if (digits.length < 10) {
        m.textContent = 'В номере не хватает цифр: нужно минимум десять.';
        m.className = 'sub__msg is-err'; telEl.focus(); return;
      }
      m.textContent = 'Заявка принята. Перезвоним в рабочее время, обычно в тот же день.';
      m.className = 'sub__msg';
      sub.reset();
    });
  }

  /* ---------- 15. Аккордеон вопросов ---------- */

  var refreshT = null;
  function refreshSoon() {
    clearTimeout(refreshT);
    refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 220);
  }

  $$('.qa').forEach(function (qa) {
    var body = $('.qa__body', qa), summary = $('summary', qa);
    if (!body || !summary || !hasGSAP || reduced) return;
    body.style.height = '0px';
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (qa.hasAttribute('open')) {
        gsap.to(body, { height: 0, duration: .35, ease: 'power2.inOut',
          onComplete: function () { qa.removeAttribute('open'); refreshSoon(); } });
      } else {
        qa.setAttribute('open', '');
        gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: .4, ease: 'power2.out',
          onComplete: refreshSoon });
      }
    });
  });

  /* ---------- 16. Появление блоков при скролле ---------- */

  if (hasGSAP && !reduced) {
    [
      '.facts .sec__head', '.fact', '.mach .sec__head', '.mach__body', '.mach__side',
      '.promo .sec__head', '.step', '.promo__panel', '.prize', '.says__head', '.say',
      '.faq .sec__head', '.qa', '.fin__cols > *'
    ].forEach(function (sel) {
      $$(sel).forEach(function (el) {
        if (el.closest('.marquee')) return; /* бегущие строки живут своей анимацией */
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) return; /* уже в кадре — оставляем как есть */
        gsap.from(el, {
          opacity: 0, y: 30, duration: .75, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
      });
    });

    var finChars = $$('.fin__type .ch');
    if (finChars.length) {
      gsap.from(finChars, {
        yPercent: 110, opacity: 0, duration: .8, stagger: .022, ease: 'expo.out',
        scrollTrigger: { trigger: '.fin__type', start: 'top 85%', once: true }
      });
    }

    gsap.to('.foot__mark', {
      yPercent: -12, ease: 'none',
      scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  /* ---------- 17. Пересчёт после загрузки шрифтов ---------- */

  if (hasGSAP && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener('load', function () { if (hasGSAP) ScrollTrigger.refresh(); });
})();
