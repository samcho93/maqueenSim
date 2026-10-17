/* 주행 공간(맵) 정의. 단위: cm, 좌표계: x→오른쪽(동), y→아래(남), 각도: 0°=동쪽, 90°=남쪽 */
(function () {
  const LINE_W = 2.5; // 검은 테이프 폭(cm)

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 바닥 그리기 도우미 ----------
  function gridFloor(ctx, w, h, base) {
    ctx.fillStyle = base || '#dfe4ea';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 0.25;
    ctx.strokeStyle = 'rgba(80,90,110,0.18)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += 10) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(80,90,110,0.32)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += 50) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }
  function whiteFloor(ctx, w, h) {
    ctx.fillStyle = '#f7f7f2';
    ctx.fillRect(0, 0, w, h);
    // 아주 옅은 격자(눈금 참고용, 센서에는 영향 없음)
    ctx.lineWidth = 0.15;
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += 10) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }
  function strokePath(ctx, pts, closed, join) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = LINE_W;
    ctx.lineJoin = join || 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (closed) ctx.closePath();
    ctx.stroke();
  }
  function label(ctx, text, x, y, color, size) {
    ctx.fillStyle = color || 'rgba(0,0,0,0.35)';
    ctx.font = `bold ${size || 6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }
  function sample(fn, n) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(fn((i / n) * Math.PI * 2));
    return pts;
  }
  // 닫힌 Catmull-Rom 스플라인
  function spline(ctrl, perSeg) {
    const pts = [];
    const n = ctrl.length;
    for (let i = 0; i < n; i++) {
      const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (let k = 0; k < perSeg; k++) {
        const t = k / perSeg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return pts;
  }
  // 경로 위 출발 위치: 센서가 선 위에 오도록 로봇을 배치
  function startOnPath(pts, i) {
    const a = pts[i || 0], b = pts[((i || 0) + 2) % pts.length];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const back = 3.6;
    return { x: a[0] - Math.cos(ang) * back, y: a[1] - Math.sin(ang) * back, a: (ang * 180) / Math.PI };
  }

  // ---------- 미로 생성 ----------
  function makeMaze(cols, rows, cell, seed, wallH) {
    const R = rng(seed);
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    // walls: right[r][c], bottom[r][c]
    const right = Array.from({ length: rows }, () => Array(cols).fill(true));
    const bottom = Array.from({ length: rows }, () => Array(cols).fill(true));
    const stack = [[0, 0]];
    visited[0][0] = true;
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const nb = [];
      if (r > 0 && !visited[r - 1][c]) nb.push([r - 1, c, 'u']);
      if (r < rows - 1 && !visited[r + 1][c]) nb.push([r + 1, c, 'd']);
      if (c > 0 && !visited[r][c - 1]) nb.push([r, c - 1, 'l']);
      if (c < cols - 1 && !visited[r][c + 1]) nb.push([r, c + 1, 'r']);
      if (!nb.length) { stack.pop(); continue; }
      const [nr, nc, d] = nb[Math.floor(R() * nb.length)];
      if (d === 'u') bottom[nr][nc] = false;
      if (d === 'd') bottom[r][c] = false;
      if (d === 'l') right[nr][nc] = false;
      if (d === 'r') right[r][c] = false;
      visited[nr][nc] = true;
      stack.push([nr, nc]);
    }
    const T = 2, obs = [], col = '#c9a26b';
    const W = cols * cell, H = rows * cell;
    // 가로 벽(셀 아래쪽) - 연속 구간 병합
    for (let r = 0; r < rows - 1; r++) {
      let start = -1;
      for (let c = 0; c <= cols; c++) {
        const on = c < cols && bottom[r][c];
        if (on && start < 0) start = c;
        if (!on && start >= 0) {
          obs.push({ t: 'box', x: ((start + c) / 2) * cell, y: (r + 1) * cell, w: (c - start) * cell + T, d: T, h: wallH, c: col });
          start = -1;
        }
      }
    }
    for (let c = 0; c < cols - 1; c++) {
      let start = -1;
      for (let r = 0; r <= rows; r++) {
        const on = r < rows && right[r][c];
        if (on && start < 0) start = r;
        if (!on && start >= 0) {
          obs.push({ t: 'box', x: (c + 1) * cell, y: ((start + r) / 2) * cell, w: T, d: (r - start) * cell + T, h: wallH, c: col });
          start = -1;
        }
      }
    }
    return { obs, W, H };
  }

  const maps = [];

  // ===== 공간 =====
  maps.push({
    id: 'open', group: 'space', name: '개활지 (넓은 공간)', w: 400, h: 400, border: 15,
    start: { x: 200, y: 260, a: -90 }, obstacles: [],
    desc: '아무것도 없는 넓은 공간입니다. 모터, LED, 소리 등 기본 동작 실습에 적합합니다.',
    floor(ctx, w, h) { gridFloor(ctx, w, h); label(ctx, 'OPEN FIELD', 200, 200, 'rgba(0,0,0,0.08)', 22); },
  });

  maps.push({
    id: 'obstacles', group: 'space', name: '장애물 공간', w: 400, h: 400, border: 15,
    start: { x: 200, y: 360, a: -90 },
    desc: '상자와 원기둥 장애물이 흩어진 공간입니다. 초음파 센서로 장애물 회피를 실습해 보세요.',
    obstacles: [
      { t: 'box', x: 200, y: 260, w: 40, d: 20, h: 18, c: '#e67e22' },
      { t: 'cyl', x: 110, y: 300, r: 12, h: 25, c: '#3498db' },
      { t: 'cyl', x: 300, y: 310, r: 10, h: 25, c: '#9b59b6' },
      { t: 'box', x: 90, y: 170, w: 30, d: 30, h: 20, rot: 30, c: '#e74c3c' },
      { t: 'box', x: 310, y: 180, w: 50, d: 18, h: 18, rot: -20, c: '#16a085' },
      { t: 'cyl', x: 200, y: 150, r: 15, h: 30, c: '#f1c40f' },
      { t: 'box', x: 200, y: 60, w: 70, d: 16, h: 18, c: '#2c3e50' },
      { t: 'cyl', x: 70, y: 70, r: 10, h: 25, c: '#27ae60' },
      { t: 'cyl', x: 330, y: 70, r: 12, h: 25, c: '#d35400' },
      { t: 'box', x: 120, y: 240, w: 18, d: 40, h: 18, c: '#8e44ad' },
      { t: 'box', x: 280, y: 250, w: 18, d: 30, h: 18, rot: 15, c: '#c0392b' },
      { t: 'cyl', x: 360, y: 250, r: 8, h: 25, c: '#2980b9' },
      { t: 'cyl', x: 40, y: 240, r: 8, h: 25, c: '#2980b9' },
    ],
    floor(ctx, w, h) { gridFloor(ctx, w, h); },
  });

  maps.push({
    id: 'rooms', group: 'space', name: '격벽 공간 (방과 통로)', w: 400, h: 300, border: 20,
    start: { x: 60, y: 250, a: -90 },
    desc: '격벽으로 나뉜 세 개의 방이 통로로 연결되어 있습니다. 벽 따라가기를 실습해 보세요.',
    obstacles: [
      { t: 'box', x: 135, y: 100, w: 4, d: 200, h: 20, c: '#bdc3c7' },
      { t: 'box', x: 270, y: 200, w: 4, d: 200, h: 20, c: '#bdc3c7' },
      { t: 'box', x: 60, y: 120, w: 70, d: 4, h: 20, c: '#bdc3c7' },
      { t: 'box', x: 205, y: 160, w: 60, d: 4, h: 20, c: '#bdc3c7' },
      { t: 'box', x: 340, y: 150, w: 60, d: 4, h: 20, c: '#bdc3c7' },
      { t: 'cyl', x: 200, y: 60, r: 10, h: 25, c: '#e67e22' },
      { t: 'box', x: 340, y: 60, w: 30, d: 30, h: 18, c: '#16a085' },
    ],
    floor(ctx, w, h) {
      gridFloor(ctx, w, h, '#e6dfd3');
      ctx.fillStyle = 'rgba(46,204,113,0.35)';
      ctx.fillRect(340, 10, 50, 40);
      label(ctx, 'GOAL', 365, 30, 'rgba(0,90,30,0.6)', 8);
      label(ctx, 'ROOM A', 65, 200, 'rgba(0,0,0,0.12)', 10);
      label(ctx, 'ROOM B', 205, 240, 'rgba(0,0,0,0.12)', 10);
      label(ctx, 'ROOM C', 335, 250, 'rgba(0,0,0,0.12)', 10);
    },
  });

  (function () {
    const cell = 40;
    const { obs, W, H } = makeMaze(7, 7, cell, 7, 18);
    maps.push({
      id: 'maze', group: 'space', name: '미로 (7×7)', w: W, h: H, border: 18,
      start: { x: cell / 2, y: cell / 2, a: 90 }, obstacles: obs,
      desc: '셀 크기 40cm의 미로입니다. 오른손(왼손) 법칙으로 출구(녹색)를 찾아보세요.',
      goal: { x: W - cell / 2, y: H - cell / 2, r: 15 },
      floor(ctx, w, h) {
        gridFloor(ctx, w, h, '#ece6da');
        ctx.fillStyle = 'rgba(52,152,219,0.35)';
        ctx.fillRect(2, 2, cell - 4, cell - 4);
        ctx.fillStyle = 'rgba(46,204,113,0.55)';
        ctx.fillRect(w - cell + 2, h - cell + 2, cell - 4, cell - 4);
        label(ctx, 'START', cell / 2, cell - 7, 'rgba(0,40,90,0.6)', 5);
        label(ctx, 'GOAL', w - cell / 2, h - cell / 2, 'rgba(0,90,30,0.7)', 7);
      },
    });
  })();

  (function () {
    const cell = 35;
    const { obs, W, H } = makeMaze(10, 10, cell, 2024, 18);
    maps.push({
      id: 'maze_big', group: 'space', name: '미로 (10×10, 어려움)', w: W, h: H, border: 18,
      start: { x: cell / 2, y: cell / 2, a: 90 }, obstacles: obs,
      desc: '셀 크기 35cm의 큰 미로입니다. 회전 정확도와 벽 거리 제어가 중요합니다.',
      floor(ctx, w, h) {
        gridFloor(ctx, w, h, '#ece6da');
        ctx.fillStyle = 'rgba(52,152,219,0.35)';
        ctx.fillRect(2, 2, cell - 4, cell - 4);
        ctx.fillStyle = 'rgba(46,204,113,0.55)';
        ctx.fillRect(w - cell + 2, h - cell + 2, cell - 4, cell - 4);
        label(ctx, 'GOAL', w - cell / 2, h - cell / 2, 'rgba(0,90,30,0.7)', 6);
      },
    });
  })();

  maps.push({
    id: 'corridor', group: 'space', name: 'ㄹ자 복도', w: 300, h: 300, border: 18,
    start: { x: 30, y: 270, a: -90 },
    desc: '좁은 복도가 지그재그로 이어진 공간입니다. 벽과의 거리를 유지하며 주행해 보세요.',
    obstacles: [
      { t: 'box', x: 120, y: 60, w: 4, d: 240, h: 20, c: '#95a5a6' },
      { t: 'box', x: 180, y: 240, w: 4, d: 240, h: 20, c: '#95a5a6' },
      { t: 'box', x: 60, y: 240, w: 4, d: 120, h: 20, c: '#95a5a6' },
      { t: 'box', x: 240, y: 60, w: 4, d: 120, h: 20, c: '#95a5a6' },
    ],
    floor(ctx, w, h) {
      gridFloor(ctx, w, h, '#e3e8e1');
      ctx.fillStyle = 'rgba(46,204,113,0.45)';
      ctx.fillRect(250, 250, 45, 45);
      label(ctx, 'GOAL', 272, 272, 'rgba(0,90,30,0.7)', 7);
    },
  });

  // ===== 라인트레이싱 =====
  function lineMap(id, name, w, h, pts, closed, desc, extra) {
    const m = Object.assign({
      id, group: 'line', name, w, h, border: 2, obstacles: [], desc,
      start: startOnPath(pts, 0),
      floor(ctx) { whiteFloor(ctx, w, h); strokePath(ctx, pts, closed, (extra && extra.join) || 'round'); if (extra && extra.deco) extra.deco(ctx); },
    }, extra || {});
    maps.push(m);
  }

  {
    const pts = sample((t) => [150 + 110 * Math.cos(t + Math.PI / 2), 110 + 70 * Math.sin(t + Math.PI / 2)], 360);
    lineMap('line_oval', '라인: 타원 트랙', 300, 220, pts, true, '가장 기본적인 타원형 라인 트랙입니다.');
  }
  {
    const pts = sample((t) => {
      const s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
      return [160 + (130 * c) / d, 110 + (130 * s * c) / d];
    }, 600);
    lineMap('line_eight', '라인: 8자 트랙 (교차로)', 320, 220, pts, true, '가운데에서 선이 교차하는 8자 트랙입니다. 교차로에서 직진해야 합니다.');
  }
  {
    const pts = [];
    const x0 = 40, y0 = 40, x1 = 260, y1 = 190;
    const edge = (ax, ay, bx, by, n) => { for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]); };
    edge(150, y1, x1, y1, 50); edge(x1, y1, x1, y0, 60); edge(x1, y0, x0, y0, 100); edge(x0, y0, x0, y1, 60); edge(x0, y1, 150, y1, 50);
    lineMap('line_square', '라인: 사각 트랙 (직각 코너)', 300, 230, pts, true, '90° 직각 코너가 있는 사각형 트랙입니다. 급회전 처리가 필요합니다.', { join: 'miter' });
  }
  {
    const ctrl = [[60, 170], [110, 190], [190, 175], [260, 195], [320, 160], [330, 90], [280, 40], [220, 70], [170, 40], [110, 60], [60, 40], [35, 100]];
    const pts = spline(ctrl, 30);
    lineMap('line_curve', '라인: 곡선 트랙', 370, 230, pts, true, '부드러운 곡선이 이어지는 트랙입니다. 속도 조절에 주의하세요.');
  }
  {
    const pts = sample((t) => {
      const r = 85 + 18 * Math.sin(6 * t);
      return [170 + 1.3 * r * Math.cos(t), 120 + r * Math.sin(t)];
    }, 720);
    lineMap('line_wave', '라인: 물결 트랙', 340, 240, pts, true, '반지름이 계속 바뀌는 물결 모양 트랙입니다.');
  }
  {
    const ctrl = [];
    const raw = [[40, 200], [340, 200], [340, 40], [300, 40], [270, 70], [240, 40], [210, 70], [180, 40], [150, 70], [120, 40], [40, 40]];
    // 직선 보간 (지그재그는 날카로운 코너 유지)
    for (let i = 0; i < raw.length; i++) {
      const a = raw[i], b = raw[(i + 1) % raw.length];
      const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
      for (let k = 0; k < n; k++) ctrl.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    lineMap('line_zigzag', '라인: 지그재그 트랙 (어려움)', 380, 240, ctrl, true, '예각 코너가 반복되는 고난도 트랙입니다.', { join: 'miter', start: { x: 60, y: 200, a: 0 } });
  }
  {
    const pts = sample((t) => [150 + 110 * Math.cos(t + Math.PI / 2), 110 + 70 * Math.sin(t + Math.PI / 2)], 360);
    lineMap('line_obstacle', '라인 + 장애물', 300, 220, pts, true, '타원 트랙 위에 장애물이 놓여 있습니다. 라인을 따라가다 장애물 앞에서 멈추거나 피해 보세요.', {
      obstacles: [{ t: 'box', x: 150, y: 40, w: 12, d: 20, h: 15, c: '#e74c3c' }, { t: 'cyl', x: 40, y: 110, r: 7, h: 20, c: '#f39c12' }],
    });
  }
  {
    // 스모 경기장: 흰 원판 + 검은 테두리, 바깥은 어두운 바닥
    const R = 75, cx = 100, cy = 100;
    maps.push({
      id: 'sumo', group: 'line', name: '스모 링 (가장자리 감지)', w: 200, h: 200, border: 2,
      start: { x: 100, y: 120, a: -90 },
      desc: '흰 원판 가장자리에 검은 테두리가 있습니다. 라인 센서로 테두리를 감지해 링 밖으로 나가지 않도록 하세요.',
      obstacles: [{ t: 'cyl', x: 70, y: 70, r: 6, h: 15, c: '#e74c3c' }, { t: 'cyl', x: 135, y: 85, r: 6, h: 15, c: '#3498db' }],
      floor(ctx, w, h) {
        ctx.fillStyle = '#2d3436'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f5f5f0'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke();
      },
    });
  }
  {
    // 격자 도로 (교차로 카운트)
    maps.push({
      id: 'line_grid', group: 'line', name: '라인: 격자 도로 (교차로)', w: 300, h: 300, border: 2,
      start: { x: 50, y: 276, a: -90 },
      desc: '가로·세로 선이 만나는 교차로가 많은 맵입니다. 교차로를 세거나 원하는 위치로 이동해 보세요.',
      obstacles: [],
      floor(ctx, w, h) {
        whiteFloor(ctx, w, h);
        for (let i = 0; i < 5; i++) {
          strokePath(ctx, [[50 + i * 50, 30], [50 + i * 50, 270]], false);
          strokePath(ctx, [[30, 50 + i * 50], [270, 50 + i * 50]], false);
        }
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) label(ctx, `${i},${j}`, 58 + i * 50, 44 + j * 50, 'rgba(0,0,0,0.25)', 4);
      },
    });
  }

  // 장애물 높이 기본값
  maps.forEach((m) => m.obstacles.forEach((o) => { if (!o.h) o.h = 15; }));

  MQ.maps = maps;
  MQ.getMap = (id) => maps.find((m) => m.id === id) || maps[0];
  MQ.LINE_W = LINE_W;
})();
