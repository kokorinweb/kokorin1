/* =============================================================
   СИФОН — сценарий страницы
   Всё движение собрано здесь: прелоадер, инерционный скролл,
   пиннинг манифеста, горизонтальная лента вкусов, автомат.
   При prefers-reduced-motion вся хореография выключается,
   а страница остаётся полностью читаемой и рабочей.
   ============================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. Инерционный скролл ---------- */

  var lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined' && hasGSAP) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
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
    if (el.classList.contains('hero__title')) heroChars = chars;
  });

  /* ---------- 3. Прелоадер ---------- */

  var head = $('#head'), progress = $('#headProgress');
  if (head && !reduced) head.classList.add('is-intro');
  var preloader = $('#preloader');

  function runIntro() {
    if (!hasGSAP || reduced) return;
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(heroChars, { yPercent: 118, duration: 1.1, stagger: 0.055 }, 0)
      .from('.hero__bottle', { y: 90, opacity: 0, duration: 1.2 }, 0.15)
      .from('.hero__eyebrow, .hero__aside > *', { y: 22, opacity: 0, duration: .8, stagger: .08 }, 0.4)
      .from('.marquee--hero', { yPercent: 100, duration: .9 }, 0.35);
    /* шапка выезжает своим CSS-переходом: смешивать её класс-transform с твином нельзя */
    if (head) gsap.delayedCall(.25, function () { head.classList.remove('is-intro'); });
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
    var num = $('#preloaderNum'), fill = $('#preloaderFill');
    var counter = { v: 0 };
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

  /* ---------- 4. Шапка ---------- */

  var lastY = 0;

  function onScrollHead() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
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

  /* ---------- 5. Пузырьки в герое ---------- */

  var canvas = $('#bubbles');
  if (canvas && !reduced) {
    var ctx = canvas.getContext('2d');
    var bubbles = [], raf = null, W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function sizeCanvas() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(70, W / 22));
      bubbles = [];
      for (var i = 0; i < n; i++) bubbles.push(newBubble(true));
    }
    function newBubble(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 20,
        r: 1.5 + Math.random() * 5,
        s: 0.25 + Math.random() * 0.9,
        a: 0.12 + Math.random() * 0.4,
        w: Math.random() * Math.PI * 2
      };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        b.y -= b.s; b.w += 0.02;
        var x = b.x + Math.sin(b.w) * 9;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(241,231,208,' + b.a + ')';
        ctx.fill();
        if (b.y + b.r < -10) bubbles[i] = newBubble(false);
      }
      raf = requestAnimationFrame(draw);
    }
    sizeCanvas();
    draw();
    window.addEventListener('resize', sizeCanvas);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) draw();
    });
  }

  /* ---------- 6. Бутылка в герое: наклон и параллакс ---------- */

  var heroBottle = $('#heroBottle');
  if (heroBottle && hasGSAP && !reduced) {
    gsap.to(heroBottle, {
      y: -70, rotate: 5, scale: .9, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 }
    });
    if (window.matchMedia('(pointer:fine)').matches) {
      var tiltX = gsap.quickTo(heroBottle, 'rotateY', { duration: .7, ease: 'power3' });
      var tiltY = gsap.quickTo(heroBottle, 'rotateX', { duration: .7, ease: 'power3' });
      gsap.set(heroBottle, { transformPerspective: 900 });
      $('.hero').addEventListener('pointermove', function (e) {
        var r = this.getBoundingClientRect();
        tiltX(((e.clientX - r.left) / r.width - .5) * 16);
        tiltY((((e.clientY - r.top) / r.height - .5) * -12));
      });
    }
    gsap.to('.hero__glow', {
      yPercent: 16, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- 7. Бегущие строки ---------- */

  $$('[data-marquee]').forEach(function (track) {
    track.innerHTML = track.innerHTML + track.innerHTML;
    if (!hasGSAP || reduced) return;
    var dir = Number(track.dataset.dir || 1);
    var slow = track.closest('.marquee--says');
    var dur = slow ? 52 : 28;
    if (dir > 0) gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, duration: dur, ease: 'none', repeat: -1 });
    else gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: dur, ease: 'none', repeat: -1 });
  });

  /* ---------- 8. Манифест: пин + скраб ---------- */

  var beats = $$('.manifest__beat');
  var mBottle = $('#manifestBottle');
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
      trigger: '.manifest__stage',
      start: 'top top',
      end: '+=260%',
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        var p = self.progress;
        if (mRail) mRail.style.width = (p * 100).toFixed(2) + '%';
        setBeat(Math.min(beats.length - 1, Math.floor(p * beats.length * 0.999)));
        if (mBottle) {
          gsap.set(mBottle, {
            rotate: -14 + p * 28,
            yPercent: -8 + p * 16,
            scale: 0.9 + p * 0.18
          });
        }
      }
    });
  }

  /* ---------- 9. Вкусы: горизонтальная лента ---------- */

  var fTrack = $('#flavorsTrack');
  var fSection = $('.flavors');
  var panels = fTrack ? $$('.flav', fTrack) : [];

  if (fTrack && panels.length && hasGSAP && !reduced) {
    var colors = panels.map(function (p) { return p.style.getPropertyValue('--flav').trim() || '#2E8B57'; });
    var curFlav = -1;

    var distance = function () {
      return Math.max(0, fTrack.scrollWidth - window.innerWidth);
    };

    gsap.to(fTrack, {
      x: function () { return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '#flavorsPin',
        start: 'top top',
        end: function () { return '+=' + (distance() + window.innerHeight * 0.5); },
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          var i = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
          if (i !== curFlav) {
            curFlav = i;
            fSection.style.setProperty('--flav', colors[i]);
          }
        }
      }
    });
    fSection.style.setProperty('--flav', colors[0]);
  }

  /* ---------- 10. Счётчики фактов ---------- */

  function formatNum(v, dec) {
    var s = dec ? v.toFixed(dec) : String(Math.round(v));
    return s.replace('.', ',');
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

  /* ---------- 11. Автомат газированной воды ---------- */

  (function machine() {
    var unit = $('.mach__body');
    if (!unit) return;
    var status = $('#machStatus');
    var lamp = $('#machLamp');
    var coin = $('#coin');
    var go = $('#machGo');
    var jet = $('#machJet');
    var liquid = $('#glassLiquid');
    var syrups = $$('.syr');
    var paid = false, busy = false;
    var current = { name: 'Тархун', color: '#2E8B57' };

    function say(t) { if (status) status.textContent = t; }

    function price() { return current.name === 'Без сиропа' ? '1 КОПЕЙКА' : '3 КОПЕЙКИ'; }

    syrups.forEach(function (b) {
      b.addEventListener('click', function () {
        if (busy) return;
        syrups.forEach(function (o) { o.classList.remove('is-on'); o.setAttribute('aria-pressed', 'false'); });
        b.classList.add('is-on'); b.setAttribute('aria-pressed', 'true');
        current = { name: b.dataset.syrup, color: b.dataset.color };
        unit.style.setProperty('--flav', current.color);
        say(paid ? 'СИРОП: ' + current.name.toUpperCase() : 'ОПУСТИТЕ МОНЕТУ');
      });
    });
    unit.style.setProperty('--flav', current.color);

    if (coin) coin.addEventListener('click', function () {
      if (paid || busy) return;
      paid = true;
      coin.classList.add('is-spent');
      if (lamp) lamp.classList.add('is-on');
      if (go) go.disabled = false;
      say('ПРИНЯТО · ' + price() + ' · НАЖМИТЕ «НАЛИТЬ»');
    });

    if (go) go.addEventListener('click', function () {
      if (!paid || busy) return;
      busy = true; go.disabled = true;
      say('НАЛИВАЕТСЯ ' + current.name.toUpperCase());

      if (!hasGSAP || reduced) {
        if (liquid) liquid.style.height = '78%';
        if (jet) jet.style.height = '0px';
        done();
        return;
      }
      var tl = gsap.timeline({ onComplete: done });
      tl.to(jet, { height: 74, duration: .2, ease: 'power2.out' })
        .to(liquid, { height: '78%', duration: 1.5, ease: 'power1.inOut' }, 0)
        .to(jet, { height: 0, duration: .18, ease: 'power2.in' }, '-=0.12')
        .fromTo('.glass', { y: 0 }, { y: -3, duration: .09, repeat: 3, yoyo: true }, '-=0.3');

      function done() {
        say('ГОТОВО · СДАЧИ НЕТ');
        setTimeout(reset, 3600);
      }
    });

    function reset() {
      if (!hasGSAP || reduced) {
        if (liquid) liquid.style.height = '0%';
      } else {
        gsap.to(liquid, { height: '0%', duration: .7, ease: 'power2.in' });
      }
      if (lamp) lamp.classList.remove('is-on');
      if (coin) coin.classList.remove('is-spent');
      paid = false; busy = false;
      say('ОПУСТИТЕ МОНЕТУ');
    }
  })();

  /* ---------- 12. Обратный отсчёт ---------- */

  (function countdown() {
    var box = $('#countdown');
    if (!box) return;
    var cells = {
      d: $('[data-cd="d"]', box), h: $('[data-cd="h"]', box),
      m: $('[data-cd="m"]', box), s: $('[data-cd="s"]', box)
    };
    var now = new Date();
    var year = now.getFullYear();
    var target = new Date(year, 11, 31, 23, 59, 59);
    if (target <= now) target = new Date(year + 1, 11, 31, 23, 59, 59);

    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function tick() {
      var diff = Math.max(0, target - new Date());
      var s = Math.floor(diff / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
      cells.m.textContent = pad(Math.floor(s % 3600 / 60));
      cells.s.textContent = pad(s % 60);
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- 13. Форма кода и подписка ---------- */

  var codeform = $('#codeform');
  if (codeform) {
    var input = $('#code'), msg = $('#codemsg');
    input.addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      msg.textContent = '';
      msg.className = 'codeform__msg';
    });
    codeform.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = input.value.replace(/-/g, '');
      if (raw.length !== 6) {
        msg.textContent = 'В коде шесть знаков, сейчас ' + raw.length + '. Проверьте крышку.';
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
      var mail = $('#mail'), m = $('#submsg');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
        m.textContent = 'Похоже, в адресе опечатка.';
        return;
      }
      m.textContent = 'Записали. Напишем один раз — когда шестой сироп поедет в розлив.';
      mail.value = '';
    });
  }

  /* ---------- 14. Аккордеон вопросов ---------- */

  $$('.qa').forEach(function (qa) {
    var body = $('.qa__body', qa);
    var summary = $('summary', qa);
    if (!body || !summary) return;
    if (!hasGSAP || reduced) return;
    body.style.height = '0px';
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var open = qa.hasAttribute('open');
      if (open) {
        gsap.to(body, { height: 0, duration: .35, ease: 'power2.inOut',
          onComplete: function () { qa.removeAttribute('open'); ScrollTrigger.refresh(); } });
      } else {
        qa.setAttribute('open', '');
        gsap.fromTo(body, { height: 0 }, { height: 'auto', duration: .4, ease: 'power2.out',
          onComplete: function () { ScrollTrigger.refresh(); } });
      }
    });
  });

  /* ---------- 15. Появление блоков при скролле ---------- */

  if (hasGSAP && !reduced) {
    var revealSelectors = [
      '.facts .sec__head', '.fact', '.mach .sec__head', '.mach__body', '.mach__side',
      '.promo .sec__head', '.step', '.promo__panel', '.prize',
      '.faq .sec__head', '.qa', '.fin__cols > *'
    ];
    revealSelectors.forEach(function (sel) {
      $$(sel).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92) return; /* уже в кадре — оставляем как есть */
        gsap.from(el, {
          opacity: 0, y: 30, duration: .75, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
      });
    });

    /* финальная типографика раскрывается побуквенно */
    var finChars = $$('.fin__type .ch');
    if (finChars.length) {
      gsap.from(finChars, {
        yPercent: 110, opacity: 0, duration: .8, stagger: .022, ease: 'expo.out',
        scrollTrigger: { trigger: '.fin__type', start: 'top 85%', once: true }
      });
    }

    gsap.to('.foot__mark', {
      yPercent: -14, ease: 'none',
      scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  /* ---------- 16. Пересчёт после загрузки шрифтов ---------- */

  if (hasGSAP && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener('load', function () { if (hasGSAP) ScrollTrigger.refresh(); });
})();
