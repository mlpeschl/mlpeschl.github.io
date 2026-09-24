// "Conference journey" strip: a pixel mage cycles along an Amsterdam canal past soft
// landmarks, one per conference paper, slowing down until it stops where "now" is:
// at a conference (within a week of its dates), part-way between two, or just past the
// last one. Past/present/upcoming all follow from the dates, so nothing needs updating;
// to add a conference, append it to STOPS with its dates. Logos are drawn in LOGOS.
// Preview another day with ?date=YYYY-MM-DD in the URL.
(function () {
  const STOPS = [
    { name: 'AAMAS', year: 2022, logo: 'scales', start: '2022-05-09', end: '2022-05-13' },     // MORAL
    { name: 'ICLR', year: 2023, logo: 'graph', start: '2023-05-01', end: '2023-05-05' },       // GFlowNet scheduling
    { name: 'ICLR', year: 2025, logo: 'antenna', start: '2025-04-24', end: '2025-04-28' },     // WiGATr
    { name: 'CoRL', year: 2025, logo: 'arm', start: '2025-09-27', end: '2025-09-30' },         // Oat-VLA
    { name: 'ICLR', year: 2026, logo: 'thought', start: '2026-04-23', end: '2026-04-27' },     // Hybrid Training
    { name: 'IROS', year: 2026, logo: 'code', start: '2026-09-27', end: '2026-10-01' },        // From Code to Action
    { name: 'NeurIPS', year: 2026, logo: 'quadruped', start: '2026-12-06', end: '2026-12-12' }, // quadruped robots
  ];

  // Where are we today? Each conference counts as "now" from a week before to a week after.
  const DAY = 864e5, SLACK = 7 * DAY;
  const parseDay = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).getTime(); };
  const override = new URLSearchParams(location.search).get('date');
  const today = override && /^\d{4}-\d{2}-\d{2}$/.test(override) ? parseDay(override) : Date.now();
  STOPS.forEach((st) => {
    st.from = parseDay(st.start) - SLACK;
    st.to = parseDay(st.end) + DAY + SLACK;
    st.upcoming = today < st.from;
  });
  const PRESENT = STOPS.findIndex((st) => today >= st.from && today < st.to);

  // Phones get a narrower canvas (so everything is drawn bigger), larger labels,
  // and labels staggered over two rows so they don't collide.
  const LAYOUTS = {
    wide: { W: 200, margin: 18, font: 3.5, stagger: false },
    narrow: { W: 150, margin: 12, font: 5, stagger: true },
  };

  // vertical layout of the scene card (shared by both layouts)
  const CARD_H = 62;
  const STREET = 44;      // top of the sidewalk; houses stand here
  const BIKE_PATH = 44.9; // top of the red bike path
  const FEET = 46.4;      // where the bike's wheels touch the path
  const QUAY = 47;        // quay edge, water starts just below
  const HILL_TOP = 30;    // logos stand on distant hills peaking here

  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // small seeded RNG so the houses look the same on every visit
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- pixel mage ----------
  const MAGE_PALETTE = {
    H: '#3b2a63', h: '#6a52b8', B: '#d9a441', K: '#141414', Y: '#ffd84a',
    R: '#2d3a80', r: '#1d2657', G: '#7a5230', S: '#8b5a2b', O: '#7fe3ff', F: '#1a1a1a',
  };

  const MAGE_BODY = [
    '........H.......',
    '.......HH.......',
    '.......HhH......',
    '......HHhH......',
    '......HHhHH.....',
    '.....HHHhHH..O..',
    '.....BBBBBB.OOO.',
    '..HHHHHHHHHH.O..',
    '....KKKKKK...S..',
    '....KKKYKY...S..',
    '....KKKKKK...S..',
    '...RRRRRRRR..S..',
    '..RRRRRRRRRRGG..',
    '..RrRRRRRRRR....',
    '...RRRRRRRR.....',
  ];
  // Seated on a Dutch step-through bike, in sprite units; the staff doubles as a headlight.
  const BIKE = {
    rear: [3.2, 19.6], front: [13.3, 19.6], wheel: 2.6, crank: [7.6, 19.4], crankLen: 1.7,
    hip: [7.2, 14.6], thigh: 3, shin: 3.3,
  };
  const RIDER_H = BIKE.rear[1] + BIKE.wheel;
  const MAGE_CX = 8;        // visual center column of the rider
  const MAGE_SCALE = 0.75;

  // Render string-art rows as SVG rects, merging horizontal runs of the same color.
  function sprite(rows, palette, parent) {
    const g = el('g', { class: 'j-pixels' }, parent);
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (!palette[c]) { x++; continue; }
        let end = x;
        while (end < row.length && row[end] === c) end++;
        el('rect', { x, y, width: end - x, height: 1, fill: palette[c] }, g);
        x = end;
      }
    });
    return g;
  }

  // ---------- soft line logos (drawn in a 14 x 16 box) ----------
  const LOGOS = {
    scales(g) {
      el('path', { d: 'M7 2.5V14.5M4 15.2H10M1.5 4.5H12.5M1.5 4.5L0 9M1.5 4.5L3 9M12.5 4.5L11 9M12.5 4.5L14 9' }, g);
      el('path', { d: 'M0 9Q1.5 11.5 3 9ZM11 9Q12.5 11.5 14 9Z', class: 'j-fill' }, g);
      el('circle', { cx: 7, cy: 2.2, r: 1, class: 'j-fill' }, g);
    },
    graph(g) {
      el('path', { d: 'M7 2.5L3 8M7 2.5L11 8M3 8L7 13.5M11 8L7 13.5M3 8H11' }, g);
      [[7, 2.5], [3, 8], [11, 8], [7, 13.5]].forEach(([cx, cy]) =>
        el('circle', { cx, cy, r: 1.6, class: 'j-fill' }, g));
    },
    antenna(g) {
      el('path', { d: 'M7 6L4 16M7 6L10 16M5.2 12.2H8.8M4.6 14.2H9.4' }, g);
      el('path', { d: 'M4.9 2.9A3 3 0 0 0 4.9 7.1M9.1 2.9A3 3 0 0 1 9.1 7.1M3.1 1.1A5.5 5.5 0 0 0 3.1 8.9M10.9 1.1A5.5 5.5 0 0 1 10.9 8.9' }, g);
      el('circle', { cx: 7, cy: 5, r: 1.1, class: 'j-fill' }, g);
    },
    arm(g) {
      el('path', { d: 'M3.5 14L4 7.5L10 4.5L11 8M9 8.2H13M9.3 8.2V10.6M12.7 8.2V10.6M7.5 15.2H14' }, g);
      el('rect', { x: 1, y: 14, width: 5, height: 2, rx: 0.6, class: 'j-fill' }, g);
      el('circle', { cx: 4, cy: 7.5, r: 1.2, class: 'j-fill' }, g);
      el('circle', { cx: 10, cy: 4.5, r: 1, class: 'j-fill' }, g);
      el('rect', { x: 10, y: 11.8, width: 2, height: 2, rx: 0.3, class: 'j-fill' }, g);
    },
    thought(g) {
      el('rect', { x: 0.5, y: 1, width: 13, height: 8.5, rx: 4.2 }, g);
      [4, 7, 10].forEach((cx) => el('circle', { cx, cy: 5.25, r: 0.8, class: 'j-fill' }, g));
      el('circle', { cx: 3.2, cy: 12, r: 1.2 }, g);
      el('circle', { cx: 1.3, cy: 14.6, r: 0.7 }, g);
    },
    code(g) {
      el('path', { d: 'M4.2 4L1 8.5L4.2 13M9.8 4L13 8.5L9.8 13M8.4 3L5.6 14' }, g);
    },
    quadruped(g) {
      // robot dog mid-stride, side view; far-side legs faded for depth
      el('path', { d: 'M4.4 8L3.8 11.6L5.4 15M10.2 8L9 11.6L8.8 15', opacity: 0.45 }, g);
      el('path', { d: 'M3 8L1.8 11.6L1.4 15M9.2 8L8.6 11.6L10.4 15' }, g);
      el('rect', { x: 1.2, y: 5.4, width: 9.6, height: 3, rx: 1.2, class: 'j-fill' }, g);
      el('rect', { x: 11.3, y: 4.3, width: 2.7, height: 2.3, rx: 0.8, class: 'j-fill' }, g);
    },
  };

  // ---------- Amsterdam canal houses ----------
  const HOUSE_COLORS = ['#c9745f', '#e1b85e', '#86aba2', '#a9b9d9', '#eadbc6', '#9a7c9c', '#dba08c', '#6f8c99'];
  const GABLES = ['step', 'bell', 'neck', 'tri'];

  function gablePath(type, x, w, top, g) {
    const s = w / 7;
    switch (type) {
      case 'step':
        return `M${x} ${top}V${top - g / 3}H${x + s}V${top - 2 * g / 3}H${x + 2 * s}V${top - g}` +
          `H${x + 5 * s}V${top - 2 * g / 3}H${x + 6 * s}V${top - g / 3}H${x + w}V${top}Z`;
      case 'bell':
        return `M${x} ${top}C${x} ${top - g * 0.5} ${x + w * 0.3} ${top - g * 0.45} ${x + w * 0.3} ${top - g * 0.8}` +
          `Q${x + w / 2} ${top - g * 1.15} ${x + w * 0.7} ${top - g * 0.8}` +
          `C${x + w * 0.7} ${top - g * 0.45} ${x + w} ${top - g * 0.5} ${x + w} ${top}Z`;
      case 'neck':
        return `M${x} ${top}L${x + w * 0.25} ${top - g * 0.35}V${top - g * 0.85}L${x + w / 2} ${top - g * 1.08}` +
          `L${x + w * 0.75} ${top - g * 0.85}V${top - g * 0.35}L${x + w} ${top}Z`;
      default:
        return `M${x} ${top}L${x + w / 2} ${top - g}L${x + w} ${top}Z`;
    }
  }

  function house(parent, x, w, rand) {
    const bodyH = 12 + rand() * 6, gableH = 3 + rand() * 2.5;
    const top = STREET - bodyH;
    const color = HOUSE_COLORS[Math.floor(rand() * HOUSE_COLORS.length)];
    const g = el('g', {}, parent);
    el('rect', { x, y: top, width: w, height: bodyH, fill: color }, g);
    el('path', { d: gablePath(GABLES[Math.floor(rand() * GABLES.length)], x, w, top, gableH), fill: color }, g);
    el('rect', { x, y: top - 0.2, width: w, height: 0.45, fill: '#fff', opacity: 0.55 }, g);
    // windows, a gable window and a door
    const winW = Math.min(1.2, w * 0.2);
    for (let y = top + 1.4; y < STREET - 4.6; y += 2.9) {
      [0.3, 0.7].forEach((fx) => el('rect', {
        x: x + w * fx - winW / 2, y, width: winW, height: 1.7, rx: 0.2,
        fill: rand() < 0.18 ? '#ffd98a' : '#fbf4e4',
      }, g));
    }
    el('rect', { x: x + w / 2 - 0.5, y: top - gableH * 0.62, width: 1, height: 1.3, rx: 0.2, fill: '#fbf4e4' }, g);
    el('rect', {
      x: x + w * (rand() < 0.5 ? 0.3 : 0.7) - 0.7, y: STREET - 3, width: 1.4, height: 3, rx: 0.3, fill: '#4b3b3b',
    }, g);
  }

  // fill [a, b] with a centered cluster of houses
  function houseRow(parent, a, b, rand) {
    const widths = [];
    let total = 0;
    while (true) {
      const w = 4.6 + rand() * 1.8;
      if (total + w > b - a) break;
      widths.push(w);
      total += w;
    }
    let x = a + (b - a - total) / 2;
    widths.forEach((w) => { house(parent, x, w, rand); x += w; });
  }

  function cloud(parent, s) {
    const g = el('g', { class: 'j-cloud' }, parent);
    [[0, 0, 6, 2.4], [-3.2, 0.6, 3.6, 1.8], [3.6, 0.7, 4, 1.9], [0.6, -1.5, 3.6, 2.2]].forEach(([cx, cy, rx, ry]) =>
      el('ellipse', { cx: cx * s, cy: cy * s, rx: rx * s, ry: ry * s }, g));
    return g;
  }

  // ---------- scene ----------
  const root = document.getElementById('journey');
  if (!root) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrowQuery = window.matchMedia('(max-width: 600px)');
  let frameId = null;

  function build({ W, margin, font, stagger }) {
    cancelAnimationFrame(frameId);
    root.textContent = '';

    const rows = stagger ? 2 : 1;
    const H = CARD_H + 3 + font * 3.2 * rows + font * 1.8;
    const xs = STOPS.map((_, i) =>
      STOPS.length === 1 ? W / 2 : Math.round(margin + (i * (W - 2 * margin)) / (STOPS.length - 1)));
    const present = PRESENT;

    // resting spot: at the present conference, part-way to the next one, or just past the last
    let target = xs[0];
    if (present >= 0) {
      target = xs[present];
    } else {
      const next = STOPS.findIndex((st) => st.upcoming);
      if (next < 0) {
        target = xs[xs.length - 1] + Math.min(10, W - xs[xs.length - 1] - 7);
      } else if (next > 0) {
        const prev = STOPS[next - 1], f = (today - prev.to) / (STOPS[next].from - prev.to);
        target = xs[next - 1] + (xs[next] - xs[next - 1]) * (0.2 + 0.6 * Math.min(1, Math.max(0, f)));
      }
    }

    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': 'Conferences with accepted papers: ' + STOPS.map((s) => `${s.name} ${s.year}`).join(', '),
    });

    const defs = el('defs', {}, svg);
    const sky = el('linearGradient', { id: 'j-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#cfe3f6' }, sky);
    el('stop', { offset: 0.75, 'stop-color': '#f7e9dc' }, sky);
    const water = el('linearGradient', { id: 'j-water', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#b9d4e4' }, water);
    el('stop', { offset: 1, 'stop-color': '#98bdd3' }, water);
    const hill = el('linearGradient', { id: 'j-hill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#e6e1f4' }, hill);
    el('stop', { offset: 1, 'stop-color': '#d4d8ee' }, hill);
    const sun = el('radialGradient', { id: 'j-sun' }, defs);
    el('stop', { offset: 0, 'stop-color': '#fff4d6', 'stop-opacity': 1 }, sun);
    el('stop', { offset: 0.3, 'stop-color': '#ffe6b0', 'stop-opacity': 0.8 }, sun);
    el('stop', { offset: 1, 'stop-color': '#ffe6b0', 'stop-opacity': 0 }, sun);
    const halo = el('radialGradient', { id: 'j-halo' }, defs);
    el('stop', { offset: 0, 'stop-color': '#ffd98a', 'stop-opacity': 0.9 }, halo);
    el('stop', { offset: 1, 'stop-color': '#ffd98a', 'stop-opacity': 0 }, halo);
    const cardClip = el('clipPath', { id: 'j-card' }, defs);
    el('rect', { width: W, height: CARD_H, rx: 4 }, cardClip);
    const waterClip = el('clipPath', { id: 'j-water-clip' }, defs);
    el('rect', { y: QUAY + 1, width: W, height: CARD_H - QUAY - 1 }, waterClip);
    const soften = el('filter', { id: 'j-soften', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
    el('feGaussianBlur', { stdDeviation: 0.35 }, soften);

    const card = el('g', { 'clip-path': 'url(#j-card)' }, svg);
    el('rect', { width: W, height: CARD_H, fill: 'url(#j-sky)' }, card);
    el('circle', { cx: W * 0.84, cy: 15, r: 16, fill: 'url(#j-sun)' }, card);

    const clouds = [
      { s: 1.1, y: 9, speed: 1.6, x: W * 0.12 },
      { s: 0.75, y: 16, speed: 1.0, x: W * 0.55 },
      { s: 0.9, y: 6, speed: 1.3, x: W * 0.85 },
    ].map((c) => Object.assign(c, { g: cloud(card, c.s) }));

    // landscape (hills, logos, houses) — drawn once and mirrored into the canal
    const land = el('g', {}, card);
    const pts = [[0, HILL_TOP + 7]];
    xs.forEach((x, i) => {
      pts.push([x, HILL_TOP]);
      if (i < xs.length - 1) pts.push([(x + xs[i + 1]) / 2, HILL_TOP + 7]);
    });
    pts.push([W, HILL_TOP + 7]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      d += `C${(x0 + x1) / 2} ${y0} ${(x0 + x1) / 2} ${y1} ${x1} ${y1}`;
    }
    el('path', { d: d + `V${STREET + 1}H0Z`, fill: 'url(#j-hill)' }, land);

    const haloEl = present < 0 ? null
      : el('circle', { cx: xs[present], cy: HILL_TOP - 8.8, r: 13, fill: 'url(#j-halo)', class: 'j-halo' }, land);
    const logos = STOPS.map((stop, i) => {
      const outer = el('g', { transform: `translate(${xs[i] - 7.7} ${HILL_TOP - 17.6}) scale(1.1)` }, land);
      const g = el('g', { class: 'j-logo' + (stop.upcoming ? ' j-upcoming' : '') }, outer);
      (LOGOS[stop.logo] || (() => {}))(g);
      return g;
    });

    const rand = rng(7);
    houseRow(land, 1, xs[0] - 7, rand);
    for (let i = 0; i < xs.length - 1; i++) houseRow(land, xs[i] + 6, xs[i + 1] - 6, rand);
    houseRow(land, xs[xs.length - 1] + 7, W - 1, rand);

    // sidewalk, red bike path, quay and canal with reflections, shimmer and a boat
    el('rect', { y: STREET, width: W, height: BIKE_PATH - STREET, fill: '#e9dfcf' }, card);
    el('rect', { y: BIKE_PATH, width: W, height: QUAY - BIKE_PATH, fill: '#c98a76' }, card);
    for (let x = 1; x < W; x += 4) {
      el('rect', { x, y: (BIKE_PATH + QUAY) / 2 - 0.12, width: 2, height: 0.25, fill: '#fff', opacity: 0.7 }, card);
    }
    el('rect', { y: QUAY, width: W, height: 1, fill: '#b8a48b' }, card);
    el('rect', { y: QUAY + 1, width: W, height: CARD_H - QUAY - 1, fill: 'url(#j-water)' }, card);
    const reflection = land.cloneNode(true);
    reflection.setAttribute('transform', `translate(0 ${2 * QUAY + 1}) scale(1 -1)`);
    const reflWrap = el('g', { 'clip-path': 'url(#j-water-clip)', opacity: 0.28, filter: 'url(#j-soften)' }, card);
    reflWrap.appendChild(reflection);
    const shimmerRand = rng(3);
    for (let i = 0; i < Math.round(W / 9); i++) {
      el('rect', {
        x: shimmerRand() * W, y: QUAY + 3 + shimmerRand() * (CARD_H - QUAY - 5),
        width: 2 + shimmerRand() * 5, height: 0.35, rx: 0.2, class: 'j-shimmer',
        style: `animation-delay:${(-shimmerRand() * 4).toFixed(2)}s`,
      }, card);
    }
    const boat = el('g', {}, card);
    el('path', { d: 'M0 0H14L12.5 2.2H1.5Z', fill: '#4f6f60' }, boat);
    el('rect', { x: 3, y: -2.2, width: 7, height: 2.2, rx: 0.5, fill: '#efe4d0' }, boat);
    [4.2, 6.2, 8.2].forEach((x) => el('rect', { x, y: -1.6, width: 1, height: 0.9, fill: '#98bdd3' }, boat));
    const boatY = QUAY + 8.5;

    // stop markers on the bike path
    const pads = STOPS.map((stop, i) => el('rect', {
      x: xs[i] - 2.5, y: FEET - 0.6, width: 5, height: 1.2, rx: 0.6,
      class: stop.upcoming ? 'j-pad j-upcoming' : 'j-pad',
    }, card));

    // labels under the card: name, then year, plus a NOW badge for the present stop
    let badge = null;
    STOPS.forEach((stop, i) => {
      const lower = stagger && i % 2 === 1;
      const nameY = CARD_H + 1.5 + font * 1.3 + (lower ? font * 3.2 : 0);
      el('text', { x: xs[i], y: nameY, 'font-size': font, class: 'j-name', 'text-anchor': 'middle' }, svg)
        .textContent = stop.name;
      el('text', { x: xs[i], y: nameY + font * 1.5, 'font-size': font, class: 'j-year', 'text-anchor': 'middle' }, svg)
        .textContent = stop.year;
      if (i === present) {
        const bw = font * 2.9, bh = font * 1.25, by = nameY + font * 2.1;
        badge = el('g', { class: 'j-badge' }, svg);
        el('rect', { x: xs[i] - bw / 2, y: by, width: bw, height: bh, rx: bh / 2 }, badge);
        el('text', {
          x: xs[i], y: by + bh * 0.5 + font * 0.3, 'font-size': font * 0.65, 'text-anchor': 'middle',
        }, badge).textContent = 'NOW';
      }
    });

    // the mage on its bike
    const actor = el('g', {}, card);
    const mage = el('g', {}, actor);
    el('circle', { cx: 13.5, cy: 6.5, r: 3, class: 'j-glow' }, mage);
    const legStyle = { fill: 'none', 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const farLeg = el('path', Object.assign({ stroke: '#1d2657' }, legStyle), mage);
    const farBoot = el('circle', { r: 0.7, fill: '#1a1a1a' }, mage);
    const frameStyle = { fill: 'none', stroke: '#2b2b2b', 'stroke-width': 0.6, 'stroke-linecap': 'round' };
    const wheels = [BIKE.rear, BIKE.front].map(() => {
      const w = el('g', {}, mage);
      el('circle', Object.assign({ r: BIKE.wheel }, frameStyle), w);
      el('path', Object.assign({ d: 'M-2.6 0H2.6M0 -2.6V2.6M-1.84 -1.84L1.84 1.84M-1.84 1.84L1.84 -1.84' },
        frameStyle, { 'stroke-width': 0.2 }), w);
      return w;
    });
    // step-through frame: stays, seat tube, curved down tube, fork, stem and saddle
    el('path', Object.assign({
      d: 'M3.2 19.6L7.6 19.4L6.2 15.4L3.2 19.6M7.6 19.4Q9.6 16.4 11.9 15.8L12.4 13.4L13.2 13M11.9 15.8L13.3 19.6',
    }, frameStyle), mage);
    el('path', Object.assign({ d: 'M5.2 15.3H7.2' }, frameStyle, { 'stroke-width': 0.9 }), mage);
    const crank = el('path', Object.assign({}, frameStyle, { 'stroke-width': 0.4 }), mage);
    sprite(MAGE_BODY, MAGE_PALETTE, mage);
    const nearLeg = el('path', Object.assign({ stroke: '#2d3a80' }, legStyle), mage);
    const nearBoot = el('circle', { r: 0.7, fill: '#1a1a1a' }, mage);

    // hip -> knee -> pedal (two-bone IK, knee pointing forward)
    function legPath([hx, hy], [px, py]) {
      const dx = px - hx, dy = py - hy, d = Math.hypot(dx, dy);
      const a = Math.min(BIKE.thigh, (BIKE.thigh ** 2 - BIKE.shin ** 2 + d * d) / (2 * d));
      const h = Math.sqrt(Math.max(0, BIKE.thigh ** 2 - a * a));
      const kx = hx + (a * dx) / d + (h * dy) / d, ky = hy + (a * dy) / d - (h * dx) / d;
      return `M${hx} ${hy}L${kx.toFixed(2)} ${ky.toFixed(2)}L${px.toFixed(2)} ${py.toFixed(2)}`;
    }

    // pedal and roll the wheels for a given distance travelled
    function pose(dist) {
      const theta = dist / 1.1;
      const [cx, cy] = BIKE.crank;
      const near = [cx + BIKE.crankLen * Math.cos(theta), cy + BIKE.crankLen * Math.sin(theta)];
      const far = [2 * cx - near[0], 2 * cy - near[1]];
      crank.setAttribute('d', `M${far[0].toFixed(2)} ${far[1].toFixed(2)}L${near[0].toFixed(2)} ${near[1].toFixed(2)}`);
      nearLeg.setAttribute('d', legPath(BIKE.hip, near));
      farLeg.setAttribute('d', legPath(BIKE.hip, far));
      nearBoot.setAttribute('cx', near[0].toFixed(2));
      nearBoot.setAttribute('cy', near[1].toFixed(2));
      farBoot.setAttribute('cx', far[0].toFixed(2));
      farBoot.setAttribute('cy', far[1].toFixed(2));
      const spin = ((dist / BIKE.wheel) * 180) / Math.PI;
      [BIKE.rear, BIKE.front].forEach(([hx, hy], i) =>
        wheels[i].setAttribute('transform', `translate(${hx} ${hy}) rotate(${spin.toFixed(1)})`));
    }

    root.appendChild(svg);

    function place(x) {
      const tx = (x - MAGE_CX * MAGE_SCALE).toFixed(2);
      const ty = (FEET - RIDER_H * MAGE_SCALE).toFixed(2);
      actor.setAttribute('transform', `translate(${tx} ${ty}) scale(${MAGE_SCALE})`);
      pose(x - xs[0]);
    }

    function scenery(now) {
      clouds.forEach((c) => {
        const cx = ((c.x + (now / 1000) * c.speed) % (W + 30)) - 15;
        c.g.setAttribute('transform', `translate(${cx.toFixed(2)} ${c.y})`);
      });
      const bx = ((W * 0.3 + (now / 1000) * 2.2) % (W + 30)) - 20;
      boat.setAttribute('transform', `translate(${bx.toFixed(2)} ${boatY})`);
    }

    // light up the logo being passed; once arrived, mark the present stop (if any)
    function highlight(at, arrived) {
      logos.forEach((g, i) => g.classList.toggle('j-active', i === at));
      [haloEl, badge, pads[present]].forEach((e) => e && e.classList.toggle('j-on', arrived));
    }

    if (reducedMotion) {
      place(target);
      highlight(present, true);
      scenery(0);
      return;
    }

    // one ride in from off-screen left to today's spot, already moving and slowing
    // down all the way
    const DELAY = 300, RIDE = 10000;
    const A = -12, B = target;
    const ease = (p) => 1 - Math.pow(1 - p, 2.6);
    place(A);
    const t0 = performance.now();

    function tick(now) {
      // rAF timestamps can be slightly earlier than t0, so clamp to avoid a negative time
      const p = Math.min(1, Math.max(0, now - t0 - DELAY) / RIDE);
      const x = A + (B - A) * ease(p);
      const near = xs.findIndex((sx) => Math.abs(sx - x) < 4);
      place(x);
      highlight(p >= 1 ? present : near, p >= 1);
      scenery(now);
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
  }

  const render = () => build(narrowQuery.matches ? LAYOUTS.narrow : LAYOUTS.wide);
  narrowQuery.addEventListener('change', render);
  render();
})();
