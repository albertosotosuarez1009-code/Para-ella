(() => {
  'use strict';

  const canvas = document.getElementById('space');
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TAU = Math.PI * 2;
  const FLAT = 0.46;                      
  const ARMS = 2;                         
  const TWIST = 3.4;                       
  const BASE_SPEED = reduce ? 0.02 : 0.085; 
  const BOOST_SPEED = reduce ? 0 : 0.5;

  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, maxR = 0, S = 1;
  let parts = [], stars = [], hazes = [];
  let rot = 0, boost = 0, last = 0, revealed = false;

  const C = {
    core:    [255, 242, 218],
    gold:    [255, 206, 150],
    ice:     [206, 226, 255],
    blue:    [138, 170, 255],
    violet:  [178, 142, 255],
    purple:  [136,  92, 230],
    magenta: [214, 110, 220],
    red:     [255, 104, 140],
    crimson: [224,  72, 104],
    faint:   [120, 104, 190],
    disc:    [120,  80, 200]
  };

  const spriteCache = new Map();

  function sprite(rgb) {
    const key = rgb[0] + ',' + rgb[1] + ',' + rgb[2];
    let c = spriteCache.get(key);
    if (c) return c;

    const size = 64;
    c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const [r, gg, b] = rgb;

    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0.00, `rgba(${r},${gg},${b},1)`);
    grd.addColorStop(0.14, `rgba(${r},${gg},${b},.85)`);
    grd.addColorStop(0.35, `rgba(${r},${gg},${b},.30)`);
    grd.addColorStop(0.65, `rgba(${r},${gg},${b},.07)`);
    grd.addColorStop(1.00, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);

    spriteCache.set(key, c);
    return c;
  }

  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }

  function buildScene() {
    maxR = Math.min(w, h) * 0.48;
    cx = w / 2;
    cy = h * 0.47;
    S = Math.max(0.72, Math.min(1.9, Math.min(w, h) / 900));

    const count = Math.min(1600, Math.max(560, Math.round((w * h) / 1250)));
    parts = new Array(count);

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let rn, ang, col, size, alpha;

      if (roll < 0.17) {
        rn = 0.26 * Math.pow(Math.random(), 1.6);
        ang = Math.random() * TAU;
        const r2 = Math.random();
        col = r2 < 0.45 ? C.core : r2 < 0.78 ? C.gold : C.violet;
        size = (5 + Math.random() * 10) * S;
        alpha = 0.20 + Math.random() * 0.34;

      } else if (roll < 0.86) {
        rn = 0.09 + 0.91 * Math.pow(Math.random(), 0.78);
        const arm = i % ARMS;
        const spread = gauss() * (0.085 + 0.30 * rn);
        ang = arm * Math.PI + TWIST * Math.pow(rn, 0.62) + spread;

        const r2 = Math.random();
        if (r2 < 0.055) {                 
          col = Math.random() < 0.5 ? C.red : C.crimson;
          size = (5 + Math.random() * 6) * S;
          alpha = 0.34 + Math.random() * 0.34;
        } else if (r2 < 0.34) {          
          col = C.blue;
          size = (2.4 + Math.random() * 3.2) * S;
          alpha = 0.16 + Math.random() * 0.34;
        } else if (r2 < 0.62) {        
          col = C.ice;
          size = (2.0 + Math.random() * 2.8) * S;
          alpha = 0.14 + Math.random() * 0.30;
        } else if (r2 < 0.86) {          
          col = C.violet;
          size = (2.6 + Math.random() * 3.4) * S;
          alpha = 0.14 + Math.random() * 0.30;
        } else {                       
          col = C.magenta;
          size = (2.6 + Math.random() * 3.6) * S;
          alpha = 0.12 + Math.random() * 0.26;
        }

      } else {
        rn = Math.pow(Math.random(), 0.55) * 1.15;
        ang = Math.random() * TAU;
        col = Math.random() < 0.6 ? C.faint : C.purple;
        size = (1.8 + Math.random() * 2.6) * S;
        alpha = 0.05 + Math.random() * 0.13;
      }

      parts[i] = {
        rn, ang,
        img: sprite(col),
        s: size,
        a: alpha,
        wob: 0.006 + Math.random() * 0.02,
        wsp: 0.25 + Math.random() * 0.9,
        wph: Math.random() * TAU,
        tsp: 0.4 + Math.random() * 2.2,
        tph: Math.random() * TAU
      };
    }

    hazes = [
      { ang: 0.35, r: 0.45, size: 1.55, col: [110, 60, 200], a: 0.16 },
      { ang: 3.00, r: 0.62, size: 1.20, col: [190, 50, 105], a: 0.11 },
      { ang: 5.20, r: 0.38, size: 1.10, col: [ 60, 95, 210], a: 0.12 },
      { ang: 1.75, r: 0.85, size: 1.45, col: [140, 80, 230], a: 0.09 },
      { ang: 4.30, r: 0.72, size: 1.05, col: [200, 70, 150], a: 0.08 }
    ];

    const starCount = Math.min(220, Math.round((w * h) / 9000));
    stars = new Array(starCount);
    for (let i = 0; i < starCount; i++) {
      stars[i] = {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.1 + 0.25,
        a: Math.random() * 0.45 + 0.08,
        tsp: 0.3 + Math.random() * 1.6,
        tph: Math.random() * TAU
      };
    }
  }

  function frame(now) {
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    boost = Math.max(0, boost - dt * 0.22);
    rot += (BASE_SPEED + boost * BOOST_SPEED) * dt;
    if (rot > TAU) rot -= TAU;

    const t = now / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    /* estrellas de fondo */
    ctx.fillStyle = '#cfc6ee';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const tw = 0.55 + 0.45 * Math.sin(t * s.tsp + s.tph);
      ctx.globalAlpha = s.a * tw;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }

    const disc = sprite(C.disc);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, FLAT + 0.12);
    ctx.globalAlpha = 0.20;
    ctx.drawImage(disc, -maxR * 0.85, -maxR * 0.85, maxR * 1.7, maxR * 1.7);
    ctx.restore();

    for (let i = 0; i < hazes.length; i++) {
      const hz = hazes[i];
      const a = hz.ang + rot * 0.9;
      const r = hz.r * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * FLAT;
      const size = maxR * hz.size;
      ctx.globalAlpha = hz.a;
      ctx.drawImage(sprite(hz.col), x - size / 2, y - size / 2, size, size);
    }

    const cg = maxR * 0.55;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(sprite(C.core), cx - cg / 2, cy - cg / 2, cg, cg);

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const a = p.ang + rot + p.wob * Math.sin(t * p.wsp + p.wph);
      const r = p.rn * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * FLAT;

      const tw = 0.76 + 0.24 * Math.sin(t * p.tsp + p.tph);
      const al = p.a * tw;
      if (al < 0.012) continue;

      const s = p.s * (0.88 + 0.12 * tw);
      ctx.globalAlpha = al > 1 ? 1 : al;
      ctx.drawImage(p.img, x - s * 0.5, y - s * 0.5, s, s);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildScene();
  }
  window.addEventListener('resize', resize);

  const core = document.getElementById('core');
  const letterWrap = document.getElementById('letterWrap');
  const letter = document.getElementById('letter');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('close');
  const bottomText = document.getElementById('bottomText');
  const accel = document.getElementById('accelerate');

  function revealLetter() {
    if (revealed) return;
    revealed = true;
    letterWrap.classList.add('visible');
    core.classList.add('hidden');
    bottomText.textContent = 'LA CARTA HA LLEGADO · ÁBRELA';
    letter.focus({ preventScroll: true });
  }

  core.addEventListener('click', revealLetter);

  letter.addEventListener('click', () => {
    overlay.classList.add('open');
    closeBtn.focus({ preventScroll: true });
  });

  function closeOverlay() {
    overlay.classList.remove('open');
    letter.focus({ preventScroll: true });
  }

  closeBtn.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
  });

  accel.addEventListener('click', () => {
    boost = 1;
    bottomText.textContent = 'LA GALAXIA GIRA MÁS RÁPIDO…';
    accel.disabled = true;
    accel.textContent = 'Acelerando…';
    setTimeout(() => {
      accel.disabled = false;
      accel.textContent = 'Acelerar la galaxia';
      bottomText.textContent = revealed
        ? 'LA CARTA HA LLEGADO · ÁBRELA'
        : 'TOCA EL CENTRO DE LA GALAXIA';
    }, 3200);
  });

  resize();
  requestAnimationFrame(frame);
})();