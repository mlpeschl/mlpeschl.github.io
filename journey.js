// "Conference journey" strip: a pixel trainer cycles along an Amsterdam canal, chased by
// a robot dog and a retro robot, past soft landmarks (one per conference paper), slowing down
// until it stops where "now" is:
// at a conference (within a week of its dates), part-way between two, or just past the
// last one. Past/present/upcoming all follow from the dates, so nothing needs updating;
// to add a conference, append it to STOPS with its dates. Logos are drawn in LOGOS.
// Preview another day with ?date=YYYY-MM-DD in the URL.
// Each stop is also a button that filters the paper list below the scene to that
// conference's paper (papers are matched by their data-stop attribute, e.g. "iclr-2025").
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
    st.id = `${st.name.toLowerCase()}-${st.year}`;
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

  // ---------- 8-bit trainer on a bike, chased by two robots ----------
  // The green-cap trainer pedals away on a road bike while a Unitree Go2 style robot
  // dog and a classic boxy 8-bit robot tag along behind. Each is a separate pixel sprite
  // (26px tall) with a dark outline, so the robots can trail at their own pace. Frames 0-3
  // are the pedal / trot / run cycle; frame 4 is standing still.
  const RIDER_PALETTE = {
    K: '#26262e', W: '#46b85a', w: '#2f8a42', G: '#2a7a3a', g: '#dff5da', N: '#6b4a2e',
    S: '#f8d0a8', s: '#d49c74', E: '#1e1e26', B: '#3c3c46', O: '#f08a34', o: '#c8641c',
    V: '#4caf50', v: '#2f7d36', P: '#4a4a58', p: '#34343f', Q: '#e04444',
    F: '#e04848', f: '#f6f6f6', T: '#34343e', R: '#c8d0dc',
    H: '#a9afb9', h: '#767c86', J: '#dde1e7', M: '#474b53', Z: '#e04444', z: '#ffe25a',
    L: '#e6e8ec', l: '#aeb3bd', D: '#44474f', d: '#72767f', Y: '#5fd0ff', y: '#2f6f8f',
  };
  const RIDER_W = 24, RIDER_H = 26, HUMAN_W = 14, GO2_W = 27;
  const MAGE_CX = 12;       // the bike's center (what stops at a conference), in pixels
  const HUMAN_CX = 7, GO2_CX = 14;
  const MAGE_SCALE = 0.65;

  const SPRITES = (() => {
    const blank = (w) => Array.from({ length: RIDER_H }, () => Array(w).fill('.'));
    const put = (g, x, y, c) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && y >= 0 && x < g[0].length && y < g.length) g[y][x] = c;
    };
    const line = (g, [x0, y0], [x1, y1], c, thick) => {
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1;
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
        put(g, x, y, c);
        if (thick) put(g, x + 1, y, c);
      }
    };
    const stamp = (g, rows, dx, dy) => rows.forEach((r, y) => [...r].forEach((c, x) => {
      if (c !== '.') put(g, x + dx, y + dy, c);
    }));
    const outline = (g) => g.map((r, y) => r.map((c, x) => {
      if (c !== '.') return c;
      const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => (g[y + dy] || [])[x + dx] > '.');
      return near ? 'K' : '.';
    }));
    const wheel = (g, [cx, cy], spin, r0 = 3.3, r1 = 4.5) => {
      for (let y = 0; y < g.length; y++) {
        for (let x = 0; x < g[0].length; x++) {
          const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - spin;
          if (d >= r0 && d <= r1) g[y][x] = 'T';
          else if (d < r0 * 0.4) g[y][x] = 'R';
          else if (d < r0 && (Math.abs(d * Math.sin(a)) < 0.55 || Math.abs(d * Math.cos(a)) < 0.55)) g[y][x] = 'R';
        }
      }
    };
    // knee for a hip-to-pedal leg (two-bone IK, knee forward)
    const knee = ([hx, hy], [px, py], l1, l2) => {
      const dx = px - hx, dy = py - hy, d = Math.hypot(dx, dy);
      const a = Math.min(l1, (l1 * l1 - l2 * l2 + d * d) / (2 * d));
      const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      return [hx + (a * dx) / d + (h * dy) / d, hy + (a * dy) / d - (h * dx) / d];
    };
    const along = ([x, y], angle, len) => [x + len * Math.sin(angle), y + len * Math.cos(angle)];

    // rider: grown-up proportions (small head, taller torso)
    const HEAD = [
      '..WWWW...',
      '.WWgWWW..',
      '.NwwwwwGG',
      '.NNSSSS..',
      '.NSSSSES.',
      '..sSSSS..',
      '...ss....',
    ];
    const TORSO = [
      '..BBBO..',
      '.VVBBBOO',
      'VVvBBBBO',
      'VvvBBBBB',
      '.vBBBBBB',
      '..BBBBB.',
      '..PPPPP.',
    ];
    const BX = 0;
    const rear = [BX + 5, 21], front = [BX + 19, 21], crank = [BX + 11, 21], seat = [BX + 9, 17];
    const headTop = [BX + 17, 16], headLow = [BX + 16.5, 18], bar = [BX + 19.5, 16], drop = [BX + 19.5, 18];
    const hip = [BX + 10, 17.2];

    // classic 8-bit robot: boxy silver head with an antenna, a glowing eye and a mouth
    // grille, a box body with a chest light, and stiff straight limbs that march without
    // bending. Far-side limbs are a shade darker. Angles are measured from straight down.
    const RUN = [
      { legs: [0.35, -0.35], arms: [-0.45, 0.45] },
      { legs: [0.15, -0.15], arms: [-0.2, 0.2] },
      { legs: [-0.35, 0.35], arms: [0.45, -0.45] },
      { legs: [-0.15, 0.15], arms: [0.2, -0.2] },
    ];
    const STAND = { legs: [0, 0], arms: [0.05, -0.05] };
    const BOT_HEAD = [
      '....Z..',
      '....h..',
      '.HHHHHH',
      'JHHHzzH',
      'HHHHzzH',
      'HHHhhhH',
      '.HHHHHH',
    ];
    const BOT_BODY = [
      'HHHHHH',
      'HhhhhH',
      'HhZJhH',
      'HhhhhH',
      'HHHHHH',
      '.hhhh.',
    ];
    function humanoid(g, pose) {
      const hip = [6, 16.5], shoulder = [6, 10];
      pose.legs.forEach((a, i) => {
        const top = [hip[0] + (i ? 0.5 : -0.5), hip[1]], ft = along(top, a, 7.5), c = i ? 'H' : 'h';
        line(g, top, ft, c, true);
        line(g, [ft[0] - 0.5, ft[1] + 0.5], [ft[0] + 2, ft[1] + 0.5], 'M', true);
      });
      stamp(g, BOT_BODY, 3, 10);
      pose.arms.forEach((a, i) => {
        const hand = along(shoulder, a, 5.5), c = i ? 'H' : 'h';
        line(g, [shoulder[0] + (i ? 2 : -2), shoulder[1]], [hand[0] + (i ? 2 : -2), hand[1]], c);
        put(g, hand[0] + (i ? 2 : -2), hand[1] + 0.5, 'J');
      });
      put(g, 6, 9, 'h');
      stamp(g, BOT_HEAD, 3, 2);
    }

    // quadruped (Go2 style): light shell, darker belly, hip motors, dark head with a camera
    // light and LiDAR bump; legs bend backward at the knee and trot on small feet
    const GO2 = [
      '...LLLLLLLLLLLLLL......',
      '..LLLLLLLLLLLLLLLLLDDD.',
      '.LLLLLLLLLLLLLLLLLLDDDY',
      '.lllllllllllllllllLDDD.',
      '..lllDDDlllllllDDDllDD.',
      '....DDD.......DDD..DD..',
    ];
    const GO2_HIPS = [[9, 16.5], [19, 16.5]];  // rear, front
    const GROUND = 25;
    // trot: diagonal pairs (near rear + far front, near front + far rear) step together;
    // each foot slides back while planted, then lifts and swings forward
    const STEP = [[2, 0], [0, 0], [-2, 0], [0, -1.5]];
    const kneeBack = ([hx, hy], [fx, fy]) => {
      const [kx, ky] = knee([-hx, hy], [-fx, fy], 4.8, 4.8);
      return [-kx, ky];
    };

    const merge = (back, fore) => {
      const out = outline(fore);
      return back.map((r, y) => r.map((c, x) => (out[y][x] !== '.' ? out[y][x] : c)).join(''));
    };

    const human = [0, 1, 2, 3, 4].map((k) => {
      const fore = blank(HUMAN_W);
      humanoid(fore, k < 4 ? RUN[k] : STAND);
      return merge(blank(HUMAN_W), fore);
    });

    const go2 = [0, 1, 2, 3, 4].map((k) => {
      const moving = k < 4;
      const leg = (g, hip, phase, thigh, shin) => {
        const [dx, dy] = moving ? STEP[phase % 4] : [0, 0];
        const foot = [hip[0] + dx, GROUND + dy], kn = kneeBack(hip, foot);
        line(g, hip, kn, thigh, true);
        line(g, kn, foot, shin);
        line(g, [foot[0] - 0.5, foot[1]], [foot[0] + 0.5, foot[1]], 'D', true);
      };
      const fore = blank(GO2_W);
      const far = ([x, y]) => [x + 1, y];
      leg(fore, far(GO2_HIPS[0]), k + 2, 'd', 'd');   // far rear (pair B)
      leg(fore, far(GO2_HIPS[1]), k, 'd', 'd');       // far front (pair A)
      stamp(fore, GO2, 3, 11);
      put(fore, 25, 13, k % 4 < 2 ? 'Y' : 'y');
      leg(fore, GO2_HIPS[0], k, 'l', 'D');            // near rear (pair A)
      leg(fore, GO2_HIPS[1], k + 2, 'l', 'D');        // near front (pair B)
      return merge(blank(GO2_W), fore);
    });

    const bike = [0, 1, 2, 3, 4].map((k) => {
      const moving = k < 4, spin = moving ? (k * Math.PI) / 8 : 0;
      const theta = Math.PI / 4 + ((moving ? k : 0) * Math.PI) / 2;
      const pedal = [crank[0] + 2.1 * Math.cos(theta), crank[1] + 2.1 * Math.sin(theta)];
      const pedalFar = [2 * crank[0] - pedal[0], 2 * crank[1] - pedal[1]];

      const back = blank(RIDER_W);
      wheel(back, rear, spin);
      wheel(back, front, spin);

      // far leg, bike frame, rider, near leg
      const fore = blank(RIDER_W);
      const kneeFar = knee(hip, pedalFar, 3.2, 3.4);
      line(fore, hip, kneeFar, 'p', true);
      line(fore, kneeFar, pedalFar, 's', true);
      line(fore, pedalFar, [pedalFar[0] + 1, pedalFar[1]], 'Q', true);
      [[rear, crank], [rear, seat], [seat, crank], [seat, headTop], [crank, headLow], [headTop, headLow],
        [headLow, front], [headTop, bar], [bar, drop]].forEach(([a, b]) => line(fore, a, b, 'F'));
      put(fore, BX + 13, 19, 'f');
      put(fore, BX + 14, 19, 'f');
      stamp(fore, TORSO, BX + 6, 11);
      stamp(fore, HEAD, BX + 8, 4);
      line(fore, [BX + 12.5, 13], [BX + 18.5, 16], 'S', true);
      put(fore, BX + 12, 12, 'O');
      put(fore, BX + 13, 12, 'o');
      const kneeNear = knee(hip, pedal, 3.2, 3.4);
      line(fore, hip, kneeNear, 'P', true);
      line(fore, kneeNear, pedal, 'S', true);
      line(fore, pedal, [pedal[0] + 1, pedal[1]], 'Q', true);
      return merge(back, fore);
    });

    return { bike, human, go2 };
  })();

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

  // a graphics card, about 10 x 3.6 units before scaling: metallic shroud with a silver
  // trim and green accent, two fans with curved blades, a power connector on top, the green
  // PCB edge with gold PCIe contacts underneath, and a silver bracket with vents and ports
  function fanBlades(cx, cy) {
    let d = '';
    for (let i = 0; i < 7; i++) {
      const a = (i * 2 * Math.PI) / 7, p = (r, t) => `${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
      d += `M${p(0.4, a)}Q${p(0.85, a + 0.35)} ${p(1.05, a + 0.9)}`;
    }
    return d;
  }
  function gpuCard(parent, scale) {
    const g = el('g', { transform: `scale(${scale})` }, parent);
    el('rect', { x: 0.9, y: 2.6, width: 8.7, height: 0.55, class: 'j-gpu-pcb' }, g);
    el('rect', { x: 3.1, y: 3.1, width: 4.2, height: 0.5, class: 'j-gpu-pcie' }, g);
    el('rect', { x: 7.5, y: -0.35, width: 1.3, height: 0.45, rx: 0.1, class: 'j-gpu-dark' }, g);
    el('rect', { x: 0.8, width: 9, height: 2.8, rx: 0.45, class: 'j-gpu-body' }, g);
    el('rect', { x: 1.3, y: 0.16, width: 8, height: 0.2, rx: 0.1, class: 'j-gpu-stripe' }, g);
    el('rect', { y: -0.1, width: 0.8, height: 3.7, class: 'j-gpu-bracket' }, g);
    [0.4, 1.1, 1.8].forEach((y) => el('rect', { x: 0.2, y, width: 0.4, height: 0.35, class: 'j-gpu-dark' }, g));
    el('rect', { x: 0.25, y: 2.5, width: 0.3, height: 0.7, class: 'j-gpu-dark' }, g);
    [3.25, 6.95].forEach((cx) => {
      el('circle', { cx, cy: 1.4, r: 1.2, class: 'j-gpu-fan' }, g);
      el('path', { d: fanBlades(cx, 1.4), class: 'j-gpu-blade' }, g);
      el('circle', { cx, cy: 1.4, r: 0.36, class: 'j-gpu-hub' }, g);
    });
    return g;
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
        target = xs[xs.length - 1] + Math.min(10, W - xs[xs.length - 1] - 10);
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
    const shroud = el('linearGradient', { id: 'j-gpu-shroud', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#4a4e57' }, shroud);
    el('stop', { offset: 1, 'stop-color': '#1d1f24' }, shroud);
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
    // a canal barge shipping GPUs: two rows of graphics cards on deck, a cabin at the back
    const boat = el('g', {}, card);
    [[2, -3.5], [11.8, -3.5], [21.6, -3.5], [6.9, -7], [16.7, -7]].forEach(([x, y]) =>
      gpuCard(el('g', { transform: `translate(${x} ${y})` }, boat), 0.95));
    el('rect', { x: 32, y: -4.6, width: 7, height: 4.6, rx: 0.6, fill: '#efe4d0' }, boat);
    [33.4, 36].forEach((x) => el('rect', { x, y: -3.6, width: 1.5, height: 1.3, fill: '#98bdd3' }, boat));
    el('path', { d: 'M0 0H41L38 4.2H3Z', fill: '#34503f' }, boat);
    el('rect', { x: 1, y: 0.5, width: 39, height: 0.35, fill: '#76b900' }, boat);
    const boatY = CARD_H - 4.6;

    // stop markers on the bike path
    const pads = STOPS.map((stop, i) => el('rect', {
      x: xs[i] - 2.5, y: FEET - 0.6, width: 5, height: 1.2, rx: 0.6,
      class: stop.upcoming ? 'j-pad j-upcoming' : 'j-pad',
    }, card));

    // labels under the card: name, then year (on a pill that lights up on hover or when
    // selected), plus a NOW badge for the present stop
    let badge = null;
    const labels = STOPS.map((stop, i) => {
      const lower = stagger && i % 2 === 1;
      const nameY = CARD_H + 1.5 + font * 1.3 + (lower ? font * 3.2 : 0);
      const label = el('g', { class: 'j-label' }, svg);
      const pw = Math.max(stop.name.length, 4) * font + font * 1.4, ph = font * 3.1;
      el('rect', { x: xs[i] - pw / 2, y: nameY - font * 1.35, width: pw, height: ph, rx: font * 0.6, class: 'j-pill' }, label);
      el('text', { x: xs[i], y: nameY, 'font-size': font, class: 'j-name', 'text-anchor': 'middle' }, label)
        .textContent = stop.name;
      el('text', { x: xs[i], y: nameY + font * 1.5, 'font-size': font, class: 'j-year', 'text-anchor': 'middle' }, label)
        .textContent = stop.year;
      if (i === present) {
        const bw = font * 2.9, bh = font * 1.25, by = nameY + font * 2.1;
        badge = el('g', { class: 'j-badge' }, svg);
        el('rect', { x: xs[i] - bw / 2, y: by, width: bw, height: bh, rx: bh / 2 }, badge);
        el('text', {
          x: xs[i], y: by + bh * 0.5 + font * 0.3, 'font-size': font * 0.65, 'text-anchor': 'middle',
        }, badge).textContent = 'NOW';
      }
      return label;
    });

    // A mover is one animated sprite: it shows the cycle frame for the distance travelled
    // (one step per `stride`), or the standing frame when it hasn't moved.
    function mover(frameRows, cx, stride) {
      const g = el('g', {}, card);
      const frames = frameRows.map((rows) => sprite(rows, RIDER_PALETTE, g));
      let last = null;
      return (x) => {
        const moving = last !== null && Math.abs(x - last) > 0.01;
        const k = moving ? ((Math.floor(x / stride) % 4) + 4) % 4 : 4;
        frames.forEach((f, i) => { f.style.display = i === k ? '' : 'none'; });
        const tx = (x - cx * MAGE_SCALE).toFixed(2), ty = (FEET - (RIDER_H - 0.5) * MAGE_SCALE).toFixed(2);
        g.setAttribute('transform', `translate(${tx} ${ty}) scale(${MAGE_SCALE})`);
        last = x;
      };
    }
    // robots tag along behind, a little slower: the robot dog close, the retro robot further back
    const BOTS = [
      { gap: 34, lag: 1100, place: mover(SPRITES.human, HUMAN_CX, 2.6) },
      { gap: 18, lag: 450, place: mover(SPRITES.go2, GO2_CX, 1.6) },
    ];
    const placeBike = mover(SPRITES.bike, MAGE_CX, 1.4);

    // invisible hit areas make each stop (logo, path marker and label) a button
    const half = xs.length > 1 ? (xs[1] - xs[0]) / 2 : W / 2;
    const hits = STOPS.map((stop, i) => {
      const hit = el('rect', {
        x: xs[i] - half, y: HILL_TOP - 20, width: half * 2, height: H - (HILL_TOP - 20),
        class: 'j-hit', tabindex: 0, role: 'button', 'aria-pressed': 'false',
        'aria-label': `${stop.name} ${stop.year}: show paper`,
      }, svg);
      const hover = (on) => [logos[i], labels[i]].forEach((e) => e.classList.toggle('j-hover', on));
      hit.addEventListener('mouseenter', () => hover(true));
      hit.addEventListener('mouseleave', () => hover(false));
      hit.addEventListener('focus', () => hover(true));
      hit.addEventListener('blur', () => hover(false));
      hit.addEventListener('click', () => selectStop(stop.id));
      hit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectStop(stop.id); }
      });
      return hit;
    });
    markStops = (id) => STOPS.forEach((stop, i) => {
      const on = stop.id === id;
      logos[i].classList.toggle('j-selected', on);
      labels[i].classList.toggle('j-selected', on);
      hits[i].setAttribute('aria-pressed', String(on));
    });
    markStops(selected);

    root.appendChild(svg);

    function place(x) {
      placeBike(x);
      BOTS.forEach((b) => b.place(x - b.gap));
    }

    function scenery(now) {
      clouds.forEach((c) => {
        const cx = ((c.x + (now / 1000) * c.speed) % (W + 30)) - 15;
        c.g.setAttribute('transform', `translate(${cx.toFixed(2)} ${c.y})`);
      });
      const bx = ((W * 0.3 + (now / 1000) * 1.6) % (W + 50)) - 45;
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
    const A = -((RIDER_W - MAGE_CX) * MAGE_SCALE + 2), B = target;
    const ease = (p) => 1 - Math.pow(1 - p, 2.6);
    // rAF timestamps can be slightly earlier than t0, so clamp to avoid a negative time
    const progress = (now, lag) => Math.min(1, Math.max(0, now - t0 - DELAY - lag) / RIDE);
    place(A);
    const t0 = performance.now();

    function tick(now) {
      const p = progress(now, 0);
      const x = A + (B - A) * ease(p);
      const near = xs.findIndex((sx) => Math.abs(sx - x) < 4);
      placeBike(x);
      // each robot follows the bike's path a little later, so it trails and then catches up
      BOTS.forEach((b) => b.place(A + (B - A) * ease(progress(now, b.lag)) - b.gap));
      highlight(p >= 1 ? present : near, p >= 1);
      scenery(now);
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
  }

  // ---------- paper filter ----------
  // Clicking a stop shows only that conference's paper (clicking it again, or "Show all",
  // shows everything). The "coming soon" card only appears for its own stop.
  let selected = null;
  let markStops = () => {};
  const papers = [...document.querySelectorAll('.paper')];
  const filterHint = document.querySelector('.paper-filter-hint');
  const filterActive = document.querySelector('.paper-filter-active');
  const filterName = document.querySelector('.paper-filter-name');
  const filterClear = document.querySelector('.paper-filter-clear');

  function applyFilter() {
    papers.forEach((paper) => {
      const soon = paper.classList.contains('paper-soon');
      const match = selected !== null && paper.dataset.stop === selected;
      paper.classList.toggle('is-hidden', selected ? !match : soon);
      paper.classList.toggle('is-match', match && !soon);
    });
    const stop = STOPS.find((st) => st.id === selected);
    if (filterHint) filterHint.hidden = !!stop;
    if (filterActive) filterActive.hidden = !stop;
    if (filterName && stop) filterName.textContent = `${stop.name} ${stop.year}`;
    markStops(selected);
  }

  function selectStop(id) {
    selected = selected === id ? null : id;
    applyFilter();
  }

  if (filterClear) filterClear.addEventListener('click', () => { selected = null; applyFilter(); });

  const render = () => build(narrowQuery.matches ? LAYOUTS.narrow : LAYOUTS.wide);
  narrowQuery.addEventListener('change', render);
  render();
})();
