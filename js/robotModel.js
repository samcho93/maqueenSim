/* 마퀸(ROB0148) 3D 모델 — 실물 사진 기준 재질/형상. 좌표: +x 전방, +y 위, +z 로봇 오른쪽 (단위 cm) */
(function () {
  const R = MQ.ROBOT;

  function canvasTex(w, h, draw, opts) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    if (opts && opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    return t;
  }
  const std = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0 }, o || {}));
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);

  // ---------- 공용 재질 ----------
  function materials() {
    return {
      chrome: std(0xdfe3e8, { metalness: 1, roughness: 0.18 }),
      steel: std(0xb8bec6, { metalness: 0.9, roughness: 0.35 }),
      gold: std(0xd9b44a, { metalness: 1, roughness: 0.28 }),
      blackPlastic: std(0x16171a, { roughness: 0.6 }),
      whitePlastic: phys({ color: 0xf3f3f0, roughness: 0.42, clearcoat: 0.2 }),
      rubber: std(0x1a1a1c, { roughness: 0.92 }),
    };
  }

  // ---------- PCB 외곽 (위에서 본 2D: sx=x, sy=-z) ----------
  const PCB = { minX: -3.7, maxX: 5.2, minY: -4.0, maxY: 4.0 };
  function pcbShape() {
    const s = new THREE.Shape();
    const pts = [
      [-3.0, -3.05], [2.25, -3.05], [2.6, -3.95], [4.0, -3.95], [5.15, -2.5], [5.15, 2.5], [4.0, 3.95], [2.6, 3.95], [2.25, 3.05], [-3.0, 3.05],
    ];
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    // 둥근 뒤쪽
    s.quadraticCurveTo(-3.7, 3.05, -3.7, 2.2);
    s.lineTo(-3.7, -2.2);
    s.quadraticCurveTo(-3.7, -3.05, -3.0, -3.05);
    return s;
  }
  function pcbTexture(ver) {
    const W = PCB.maxX - PCB.minX, H = PCB.maxY - PCB.minY, S = 140; // px/cm
    return canvasTex(Math.round(W * S), Math.round(H * S), (g, cw, ch) => {
      // 로봇 좌표 (x, z) -> 캔버스 px
      const P = (x, z) => [(x - PCB.minX) * S, (1 - (-z - PCB.minY) / H) * ch];
      g.fillStyle = '#121416'; g.fillRect(0, 0, cw, ch);
      // 동박 패턴(희미한 배선)
      g.strokeStyle = 'rgba(60,70,80,0.35)'; g.lineWidth = 6;
      for (let i = 0; i < 26; i++) {
        const x0 = -3 + Math.random() * 7.5, z0 = -3 + Math.random() * 6;
        g.beginPath(); g.moveTo(...P(x0, z0)); g.lineTo(...P(x0 + (Math.random() - 0.5) * 3, z0)); g.lineTo(...P(x0 + (Math.random() - 0.5) * 3, z0 + (Math.random() - 0.5) * 3)); g.stroke();
      }
      // 비아
      g.fillStyle = 'rgba(160,140,90,0.55)';
      for (let i = 0; i < 70; i++) { const [px, py] = P(-3.2 + Math.random() * 8, -3 + Math.random() * 6); g.beginPath(); g.arc(px, py, 4, 0, 7); g.fill(); }
      // 실크 인쇄
      const text = (t, x, z, size, rot, color, bold) => {
        const [px, py] = P(x, z);
        g.save(); g.translate(px, py); g.rotate(rot || 0);
        g.fillStyle = color || '#f2f2f2'; g.font = `${bold ? 'bold ' : ''}${size * S}px Arial, sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 0); g.restore();
      };
      const box = (x, z, w, d) => { const [a, b] = P(x - w / 2, z - d / 2); const [c2, d2] = P(x + w / 2, z + d / 2); g.strokeStyle = '#e8e8e8'; g.lineWidth = 5; g.strokeRect(Math.min(a, c2), Math.min(b, d2), Math.abs(c2 - a), Math.abs(d2 - b)); };
      const pad = (x, z, r) => { const [px, py] = P(x, z); g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(px, py, r * S, 0, 7); g.fill(); g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(px, py, r * S * 0.45, 0, 7); g.fill(); };
      // 앞쪽 외곽 실크 라인
      g.strokeStyle = 'rgba(235,235,235,0.9)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(...P(2.7, -3.75)); g.lineTo(...P(3.95, -3.75)); g.lineTo(...P(4.95, -2.45)); g.lineTo(...P(4.95, 2.45)); g.lineTo(...P(3.95, 3.75)); g.lineTo(...P(2.7, 3.75)); g.stroke();
      // 로고/모델명 (뒤쪽, 배터리 홀더 옆에 비스듬히 보이는 부분)
      text('DFRobot', -3.25, 0, 0.42, -Math.PI / 2, '#f2f2f2', true);
      text(`micro:Maqueen ${ver}`, 1.75, 0, 0.24, 0, '#f2f2f2');
      // 부품 라벨
      text(ver === 'V5.0' ? 'RGB-L' : 'P8', 3.55, -3.2, 0.26, 0, '#f2f2f2', true);
      text(ver === 'V5.0' ? 'RGB-R' : 'P12', 3.55, 3.2, 0.26, 0, '#f2f2f2', true);
      text('RGB P15', 4.55, -1.6, 0.2, Math.PI / 2, '#f2f2f2');
      text('P13', 4.75, -0.65, 0.18, 0, '#f2f2f2');
      text('P14', 4.75, 0.65, 0.18, 0, '#f2f2f2');
      text('SR04', 3.25, -1.25, 0.2, 0, '#f2f2f2');
      text('IR P16', 2.9, 1.55, 0.18, 0, '#f2f2f2');
      text('S1', 2.4, -3.5, 0.2, 0, '#f2f2f2', true);
      text('S2', 2.4, 3.5, 0.2, 0, '#f2f2f2', true);
      text('GND VCC', 1.95, -2.75, 0.14, 0, '#d0d0d0');
      text('GND VCC', 1.95, 2.75, 0.14, 0, '#d0d0d0');
      text('Power', -0.4, 2.7, 0.18, 0, '#f2f2f2');
      // 부품 실크 박스
      box(3.25, 0, 0.7, 1.6); box(4.45, -0.9, 0.55, 0.8); box(4.45, 0.9, 0.55, 0.8); box(2.9, 2.1, 0.8, 0.8);
      // 나사 패드
      pad(3.9, -2.9, 0.32); pad(3.9, 2.9, 0.32); pad(-2.9, -2.35, 0.32); pad(-2.9, 2.35, 0.32); pad(1.2, 0, 0.18);
    });
  }

  function microbitFront() {
    const S = 120; // px/cm  (보드 5.2 x 4.2)
    return canvasTex(Math.round(5.2 * S), Math.round(4.2 * S), (g, w, h) => {
      g.fillStyle = '#17181a'; g.fillRect(0, 0, w, h);
      // 상단 모서리 파란 장식
      g.fillStyle = '#1f6fd6';
      [[0.05, 0], [0.13, 0], [0.21, 0]].forEach(([fx]) => { g.beginPath(); g.moveTo(fx * w, 0); g.lineTo(fx * w + 0.35 * S, 0); g.lineTo(fx * w, 0.45 * S); g.closePath(); g.fill(); });
      g.beginPath(); g.moveTo(w, 0.95 * S); g.lineTo(w, 1.5 * S); g.lineTo(w - 0.4 * S, 1.5 * S); g.closePath(); g.fill();
      // 로고 (터치)
      g.strokeStyle = '#d9b44a'; g.lineWidth = 0.09 * S;
      const lx = w / 2, ly = 0.45 * S;
      g.beginPath(); g.ellipse(lx, ly, 0.42 * S, 0.22 * S, 0, 0, 7); g.stroke();
      g.fillStyle = '#d9b44a'; g.beginPath(); g.arc(lx - 0.17 * S, ly, 0.06 * S, 0, 7); g.arc(lx + 0.17 * S, ly, 0.06 * S, 0, 7); g.fill();
      // 버튼 라벨
      g.fillStyle = '#e8e8e8'; g.font = `bold ${0.32 * S}px Arial`; g.textAlign = 'center';
      g.fillText('A', 0.5 * S, 1.45 * S); g.fillText('B', w - 0.5 * S, 1.45 * S);
      // 엣지 커넥터 (금색 핑거 + 큰 링)
      const ey = h - 0.85 * S;
      g.fillStyle = '#d9b44a';
      for (let i = 0; i < 25; i++) g.fillRect((0.25 + i * 0.19) * S, ey + 0.25 * S, 0.11 * S, 0.6 * S);
      const rings = [['0', 0.55], ['1', 1.6], ['2', 2.6], ['3V', 3.6], ['GND', 4.65]];
      rings.forEach(([lab, x]) => {
        g.fillStyle = '#d9b44a'; g.beginPath(); g.arc(x * S, ey + 0.32 * S, 0.33 * S, 0, 7); g.fill();
        g.fillStyle = '#17181a'; g.beginPath(); g.arc(x * S, ey + 0.32 * S, 0.17 * S, 0, 7); g.fill();
        g.fillStyle = '#e8e8e8'; g.font = `bold ${0.2 * S}px Arial`; g.fillText(lab, x * S, ey - 0.1 * S);
      });
    });
  }
  function microbitBack() {
    const S = 100;
    return canvasTex(520, 420, (g, w, h) => {
      g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2b2d31'; g.fillRect(1.6 * S, 1.2 * S, 0.9 * S, 0.9 * S); g.fillRect(2.9 * S, 1.4 * S, 0.6 * S, 0.6 * S);
      g.fillStyle = '#d9b44a'; for (let i = 0; i < 25; i++) g.fillRect((0.25 + i * 0.19) * S, h - 0.6 * S, 0.11 * S, 0.6 * S);
      g.fillStyle = '#9aa0a8'; g.font = `${0.22 * S}px Arial`; g.textAlign = 'center'; g.fillText('micro:bit', w / 2, 0.8 * S);
    });
  }
  function hcsr04Tex() {
    const S = 120; // 4.5 x 2.0
    return canvasTex(Math.round(4.5 * S), Math.round(2.0 * S), (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#2457b8'); grd.addColorStop(1, '#1b4699');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.font = `bold ${0.26 * S}px Arial`; g.textAlign = 'center';
      g.fillText('HC-SR04', w / 2, 0.42 * S);
      g.font = `bold ${0.3 * S}px Arial`; g.fillText('T', 0.35 * S, 1.75 * S); g.fillText('R', w - 0.35 * S, 1.75 * S);
      g.font = `${0.15 * S}px Arial`; g.fillText('Vcc Trig Echo Gnd', w / 2, 1.88 * S);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.strokeRect(0.08 * S, 0.08 * S, w - 0.16 * S, h - 0.16 * S);
    });
  }
  function meshTex() {
    return canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1e1f22';
      for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < w; x += 6) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
    });
  }
  function treadTex() {
    return canvasTex(512, 64, (g, w, h) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#202020'; g.lineWidth = 7;
      for (let x = -40; x < w + 40; x += 18) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 14, h / 2); g.lineTo(x, h); g.stroke(); }
    }, { repeat: [1, 1] });
  }

  // ---------- 바퀴 ----------
  function buildWheel(M, tread) {
    const wg = new THREE.Group(); // 축 = z
    const Rw = R.WHEEL_R, Wd = 0.9;
    // 타이어 (Lathe 프로파일, y축 기준 → z축으로 회전)
    const prof = [];
    const rIn = Rw - 0.55;
    prof.push(new THREE.Vector2(rIn, -Wd / 2));
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(Rw - 0.18 + Math.cos(a) * 0.18, -Wd / 2 + 0.18 + Math.sin(a) * 0.18)); }
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(Rw - 0.18 + Math.cos(a) * 0.18, Wd / 2 - 0.18 + Math.sin(a) * 0.18)); }
    prof.push(new THREE.Vector2(rIn, Wd / 2));
    const tireGeo = new THREE.LatheGeometry(prof, 48);
    const tireMat = std(0x1c1c1e, { roughness: 0.9, bumpMap: tread, bumpScale: 0.06 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2; tire.castShadow = true;
    wg.add(tire);
    // 흰색 휠 (림 + 스포크 + 허브)
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(rIn + 0.02, rIn + 0.02, Wd * 0.92, 40, 1, true), M.whitePlastic);
    rim.rotation.x = Math.PI / 2; wg.add(rim);
    const lip = new THREE.Mesh(new THREE.RingGeometry(rIn - 0.22, rIn + 0.02, 40), M.whitePlastic);
    lip.position.z = Wd * 0.46; wg.add(lip);
    const lipB = lip.clone(); lipB.position.z = -Wd * 0.46; lipB.rotation.y = Math.PI; wg.add(lipB);
    const dish = new THREE.Mesh(new THREE.CircleGeometry(rIn - 0.2, 40), std(0xe6e6e2, { roughness: 0.5 }));
    dish.position.z = -0.05; wg.add(dish);
    const dishB = dish.clone(); dishB.rotation.y = Math.PI; dishB.position.z = -0.1; wg.add(dishB);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(rIn - 0.35, 0.22, 0.25), M.whitePlastic);
      const a = (i / 6) * Math.PI * 2;
      sp.position.set(Math.cos(a) * (rIn - 0.35) / 2 + Math.cos(a) * 0.3, Math.sin(a) * (rIn - 0.35) / 2 + Math.sin(a) * 0.3, Wd * 0.3);
      sp.rotation.z = a; wg.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, Wd * 0.75, 20), M.whitePlastic);
    hub.rotation.x = Math.PI / 2; wg.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, Wd * 0.8, 12), M.steel);
    cap.rotation.x = Math.PI / 2; wg.add(cap);
    return wg;
  }

  function header(M, n, colors, pitch) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), std(colors ? colors[i] : 0x111111, { roughness: 0.5 }));
      base.position.set(0, 0.125, (i - (n - 1) / 2) * (pitch || 0.254)); g.add(base);
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.6, 0.064), M.gold);
      pin.position.set(0, 0.45, base.position.z); g.add(pin);
    }
    return g;
  }
  function screw(M) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 20), M.steel);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.07), std(0x555a60, { metalness: 0.6 }));
    slot.position.y = 0.08; const cross = slot.clone(); cross.rotation.y = Math.PI / 2;
    s.add(slot, cross); return s;
  }

  // ---------- 조립 ----------
  function buildRobot(glowTex) {
    const g = new THREE.Group();
    const parts = {};
    const M = materials();
    const T = 0.16, TOP = 2.35 + T; // PCB 상면 높이

    // 메인 PCB
    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape(), { depth: T, bevelEnabled: false, curveSegments: 12 });
    pcbGeo.rotateX(-Math.PI / 2);
    const W = PCB.maxX - PCB.minX, H = PCB.maxY - PCB.minY;
    const mkTex = (v) => { const t = pcbTexture(v); t.repeat.set(1 / W, 1 / H); t.offset.set(-PCB.minX / W, -PCB.minY / H); return t; };
    parts.pcbTex = { v4: mkTex('V4.0'), v5: mkTex('V5.0') };
    const pcbTop = phys({ map: parts.pcbTex.v4, roughness: 0.38, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    parts.pcbMat = pcbTop;
    const pcbEdge = std(0x2b2a22, { roughness: 0.7 });
    const pcb = new THREE.Mesh(pcbGeo, [pcbTop, pcbEdge]);
    pcb.position.y = 2.35; pcb.castShadow = true; pcb.receiveShadow = true;
    g.add(pcb);

    // 하부: 모터 브래킷, N20 모터, 흰색 볼 캐스터
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 5.0), std(0x1d1e21, { roughness: 0.7 }));
    bracket.position.set(-0.1, 1.75, 0); bracket.castShadow = true; g.add(bracket);
    [-1, 1].forEach((s) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16), M.steel);
      m.rotation.z = Math.PI / 2; m.position.set(-1.0, R.WHEEL_R, s * 2.2); g.add(m);
      const gear = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.9), M.gold);
      gear.position.set(0.2, R.WHEEL_R, s * 2.55); g.add(gear);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 10), M.steel);
      axle.rotation.x = Math.PI / 2; axle.position.set(0, R.WHEEL_R, s * 3.1); g.add(axle);
    });
    const casterBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 2.2), M.whitePlastic);
    casterBody.position.set(3.9, 1.45, 0); casterBody.castShadow = true; g.add(casterBody);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), M.chrome);
    ball.position.set(3.9, 0.55, 0); g.add(ball);

    // 바퀴
    const tread = treadTex();
    parts.wheels = [-1, 1].map((s) => {
      const wg = buildWheel(M, tread);
      wg.position.set(0, R.WHEEL_R, s * (R.TRACK / 2));
      g.add(wg); return wg;
    });

    // 나사
    [[3.9, -2.9], [3.9, 2.9], [-2.9, -2.35], [-2.9, 2.35]].forEach(([x, z]) => { const sc = screw(M); sc.position.set(x, TOP + 0.08, z); g.add(sc); });

    // 라인 센서 (하부) + 상단 표시 LED
    parts.lineLeds = []; parts.lineSens = [];
    [-1, 0, 1].forEach((s) => {
      const sens = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.45), M.blackPlastic);
      sens.position.set(R.LINE_X + 0.8, 2.15, s * R.LINE_Y); g.add(sens);
      const ind = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.16), new THREE.MeshBasicMaterial({ color: 0x0a2a55 }));
      ind.position.set(4.45, TOP + 0.05, s * 0.9); g.add(ind);
      parts.lineLeds.push(ind); parts.lineSens.push(sens);
    });

    // 초음파 센서 HC-SR04 (4핀 헤더에 세로로 장착, 정면 = +x)
    const us = new THREE.Group();
    const usTex = hcsr04Tex();
    const usSide = std(0x1b4699, { roughness: 0.5 });
    const usPcb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.0, 4.5), [phys({ map: usTex, roughness: 0.35, clearcoat: 0.5 }), usSide, usSide, usSide, usSide, usSide]);
    us.add(usPcb);
    const mt = meshTex();
    [-1, 1].forEach((s) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 40, 1, true), M.chrome);
      can.rotation.z = Math.PI / 2; can.position.set(0.68, 0, s * 1.3); us.add(can);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 40), M.chrome);
      ring.rotation.y = Math.PI / 2; ring.position.set(1.28, 0, s * 1.3); us.add(ring);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), std(0x3a3c40, { map: mt, roughness: 0.95 }));
      face.rotation.y = Math.PI / 2; face.position.set(1.22, 0, s * 1.3); us.add(face);
    });
    const crystal = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.6, 4, 12), M.chrome);
    crystal.rotation.x = Math.PI / 2; crystal.position.set(0.25, 0.68, 0); us.add(crystal);
    us.position.set(R.US_X - 0.75, R.US_H, 0);
    us.traverse((o) => { o.castShadow = true; });
    g.add(us);
    const usHdr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 1.1), M.blackPlastic);
    usHdr.position.set(R.US_X - 0.95, TOP + 0.5, 0); g.add(usHdr);

    // 빨간 5mm LED (P8 왼쪽, P12 오른쪽)
    parts.redLeds = [];
    [-1, 1].forEach((s) => {
      const led = new THREE.Group();
      const mat = phys({ color: 0xc81414, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.92, emissive: 0x000000, clearcoat: 1 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.55, 20), mat);
      body.position.y = 0.33; led.add(body);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      dome.position.y = 0.6; led.add(dome);
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 20), mat);
      flange.position.y = 0.08; led.add(flange);
      led.position.set(3.9, TOP, s * 3.35);
      g.add(led);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2020, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(2.4, 2.4, 1); glow.position.set(3.9, TOP + 0.5, s * 3.35); glow.visible = false; g.add(glow);
      parts.redLeds.push({ led: { material: mat }, glow, group: led });
    });
    // V5: RGB 자동차 조명 (빨간 LED 자리)
    parts.carLights = [-1, 1].map((s) => {
      const grp = new THREE.Group();
      const pkg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), M.whitePlastic); pkg.position.y = 0.15; grp.add(pkg);
      const lensMat = phys({ color: 0xf4f4f4, roughness: 0.25, clearcoat: 1, emissive: 0x000000 });
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lensMat); lens.position.y = 0.3; grp.add(lens);
      grp.position.set(3.9, TOP, s * 3.35); grp.visible = false; g.add(grp);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(3, 3, 1); glow.position.set(3.95, TOP + 0.45, s * 3.35); glow.visible = false; g.add(glow);
      return { group: grp, lensMat, glow };
    });

    // RGB LED 4개 (상면 모서리 흰색 5050 패키지)
    parts.rgb = [];
    [[4.35, -3.1], [-2.4, -2.75], [-2.4, 2.75], [4.35, 3.1]].forEach(([x, z]) => {
      const pkg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.5), M.whitePlastic);
      pkg.position.set(x, TOP + 0.075, z); g.add(pkg);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshBasicMaterial({ color: 0x777766 }));
      lens.rotation.x = -Math.PI / 2; lens.position.set(x, TOP + 0.155, z); g.add(lens);
      parts.rgb.push(lens);
    });
    const underGlow = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0x000000 }));
    underGlow.rotation.x = -Math.PI / 2; underGlow.position.set(R.BODY_OFS, 0.06, 0); g.add(underGlow);
    parts.underGlow = underGlow;

    // 서보 포트 S1/S2 (노랑-빨강-검정 3핀 헤더) + 서보 혼 표시
    parts.servoHorns = [];
    [-1, 1].forEach((s) => {
      const h = header(M, 3, [0xf2c200, 0xd32f2f, 0x111111]);
      h.rotation.y = Math.PI / 2; h.position.set(2.55, TOP, s * 3.1); g.add(h);
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.9), M.whitePlastic);
      horn.position.set(2.55, TOP + 0.85, s * 3.1); g.add(horn);
      parts.servoHorns.push(horn);
    });
    // I2C/전원 헤더, IR 수신기, 전원 스위치
    const ir = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.5), std(0x0d0d0d, { roughness: 0.3 }));
    ir.position.set(2.9, TOP + 0.28, 2.1); g.add(ir);
    const irDome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), std(0x0d0d0d, { roughness: 0.2 }));
    irDome.position.set(3.15, TOP + 0.33, 2.1); g.add(irDome);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.4), M.blackPlastic);
    sw.position.set(-0.4, TOP + 0.18, 2.35); g.add(sw);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.2), M.whitePlastic);
    knob.position.set(-0.25, TOP + 0.45, 2.35); g.add(knob);

    // 배터리 홀더 (AAA x3, 뒤쪽)
    const holder = new THREE.Group();
    const hm = std(0x121315, { roughness: 0.55 });
    const hBase = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.2, 5.3), hm); hBase.position.y = 0.1; holder.add(hBase);
    [-1.85, 1.85].forEach((x) => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.15, 5.3), hm); w.position.set(x, 0.58, 0); holder.add(w); });
    [-2.6, 2.6].forEach((z) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.15, 0.15), hm); w.position.set(0, 0.58, z); holder.add(w);
    });
    [-1.15, 0, 1.15].forEach((x) => { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 5.1), hm); rib.position.set(x + 0.57, 0.3, 0); holder.add(rib); });
    const cellMat = phys({ color: 0x2c2f35, roughness: 0.3, metalness: 0.3, clearcoat: 0.6 });
    const bandMat = phys({ color: 0xc89b3c, roughness: 0.3, metalness: 0.6, clearcoat: 0.6 });
    [-1.15, 0, 1.15].forEach((x, i) => {
      const dir = i % 2 ? -1 : 1;
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 4.45, 24), cellMat);
      cell.rotation.x = Math.PI / 2; cell.position.set(x, 0.78, 0); cell.castShadow = true; holder.add(cell);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.525, 0.525, 1.3, 24), bandMat);
      band.rotation.x = Math.PI / 2; band.position.set(x, 0.78, dir * 1.55); holder.add(band);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), M.chrome);
      cap.rotation.x = Math.PI / 2; cap.position.set(x, 0.78, dir * 2.27); holder.add(cap);
      const spring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 16), M.steel);
      spring.position.set(x, 0.78, -dir * 2.45); holder.add(spring);
    });
    [[0.1, 0xd32f2f], [-0.1, 0x111111]].forEach(([dx, c]) => {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), std(c, { roughness: 0.4 }));
      wire.rotation.z = Math.PI / 2; wire.position.set(2.25, 0.25, 2.2 + dx); holder.add(wire);
    });
    holder.position.set(-1.6, TOP, 0);
    holder.traverse((o) => { o.castShadow = true; });
    g.add(holder);

    // micro:bit 슬롯 + 보드 (LED 면이 전방)
    const slot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 5.7), std(0x0f0f10, { roughness: 0.5 }));
    slot.position.set(2.0, TOP + 0.45, 0); slot.castShadow = true; g.add(slot);
    const mb = new THREE.Group();
    const frontTex = microbitFront(), backTex = microbitBack();
    const side = std(0x17181a, { roughness: 0.5 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.2, 5.2), [
      phys({ map: frontTex, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }), // +x (전면)
      phys({ map: backTex, roughness: 0.4, clearcoat: 0.4 }), side, side, side, side]);
    board.castShadow = true; mb.add(board);
    parts.mbLeds = [];
    const ledGeo = new THREE.BoxGeometry(0.06, 0.26, 0.14);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const led = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x2a0606 }));
      led.position.set(0.08, 0.95 - y * 0.42, 0.84 - x * 0.42);
      mb.add(led); parts.mbLeds.push(led);
    }
    [['A', 2.0], ['B', -2.0]].forEach(([n, z]) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.6), M.steel);
      base.position.set(0.1, 0.55, z); mb.add(base);
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16), std(0x3d2b1f, { roughness: 0.6 }));
      btn.rotation.z = Math.PI / 2; btn.position.set(0.25, 0.55, z); mb.add(btn);
      parts['btn' + n] = btn;
    });
    const usb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.75), M.steel);
    usb.position.set(-0.15, 2.0, 0.3); mb.add(usb);
    const jst = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.8), M.whitePlastic);
    jst.position.set(-0.25, 1.85, 1.6); mb.add(jst);
    mb.position.set(2.0, TOP + 0.9 + 1.55, 0);
    g.add(mb);

    return { group: g, parts };
  }

  MQ.buildRobotModel = buildRobot;
})();
