/* 마퀸 로봇 물리 모델 + 센서 (단위 cm, 초) */
(function () {
  const R = {
    // 기하 치수 (DFRobot Maqueen ROB0148 기준 근사치)
    TRACK: 7.2,          // 바퀴 간격
    WHEEL_R: 2.15,       // 바퀴 반지름 (Ø43mm)
    BODY_R: 4.6,         // 충돌 반경
    BODY_OFS: 1.0,       // 차축 기준 몸체 중심 전방 오프셋
    LINE_X: 3.6, LINE_Y: 0.9, // 라인센서 위치 (전방, 좌우)
    US_X: 4.8, US_H: 4.2, // 초음파 센서 위치/높이
    MAXV: 28,            // 속도 255 일 때 바퀴 선속도 (cm/s)
    DEADZONE: 20,        // 이 값 미만 PWM 에서는 바퀴가 돌지 않음
    TAU: 0.07,           // 모터 응답 시정수
    US_MAX: 400,
  };

  class Robot {
    constructor() {
      this.x = 0; this.y = 0; this.th = 0;
      this.vl = 0; this.vr = 0;
      this.wheelAngL = 0; this.wheelAngR = 0;
      this.map = null;
      this.floorData = null;
      this.bumping = false;
      this.odo = 0;
    }
    setMap(map, floorPixels) {
      this.map = map;
      this.floorData = floorPixels; // {data, w, h, scale}
      this.resetPose();
    }
    resetPose() {
      const s = this.map.start;
      this.x = s.x; this.y = s.y; this.th = (s.a * Math.PI) / 180;
      this.vl = this.vr = 0; this.odo = 0;
    }
    setPose(x, y, th) {
      this.x = x; this.y = y; if (th !== undefined) this.th = th;
      this.vl = this.vr = 0;
      this.collide();
    }
    targetSpeed(m) {
      const sp = Math.max(0, Math.min(255, m.speed | 0));
      if (sp < R.DEADZONE) return 0;
      return (m.dir ? -1 : 1) * (sp / 255) * R.MAXV;
    }
    step(dt, motors) {
      const k = 1 - Math.exp(-dt / R.TAU);
      this.vl += (this.targetSpeed(motors[0]) - this.vl) * k;
      this.vr += (this.targetSpeed(motors[1]) - this.vr) * k;
      const v = (this.vl + this.vr) / 2;
      const w = (this.vl - this.vr) / R.TRACK;
      const thMid = this.th + (w * dt) / 2;
      const ox = this.x, oy = this.y;
      this.x += Math.cos(thMid) * v * dt;
      this.y += Math.sin(thMid) * v * dt;
      this.th += w * dt;
      if (this.th > Math.PI) this.th -= Math.PI * 2;
      if (this.th < -Math.PI) this.th += Math.PI * 2;
      this.wheelAngL += (this.vl / R.WHEEL_R) * dt;
      this.wheelAngR += (this.vr / R.WHEEL_R) * dt;
      this.bumping = this.collide();
      this.odo += Math.hypot(this.x - ox, this.y - oy);
    }
    // 장애물/경계 충돌 처리 (원 vs 박스/원기둥)
    collide() {
      const map = this.map;
      if (!map) return false;
      let hit = false;
      const fx = Math.cos(this.th), fy = Math.sin(this.th);
      for (let iter = 0; iter < 3; iter++) {
        let cx = this.x + fx * R.BODY_OFS, cy = this.y + fy * R.BODY_OFS;
        let moved = false;
        const push = (dx, dy) => { this.x += dx; this.y += dy; cx += dx; cy += dy; moved = true; hit = true; };
        // 맵 경계
        const r = R.BODY_R;
        if (cx < r) push(r - cx, 0);
        if (cy < r) push(0, r - cy);
        if (cx > map.w - r) push(map.w - r - cx, 0);
        if (cy > map.h - r) push(0, map.h - r - cy);
        for (const o of map.obstacles) {
          if (o.t === 'cyl') {
            const dx = cx - o.x, dy = cy - o.y, d = Math.hypot(dx, dy), min = o.r + r;
            if (d < min && d > 1e-6) push((dx / d) * (min - d), (dy / d) * (min - d));
          } else {
            const a = ((o.rot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
            const lx = (cx - o.x) * ca + (cy - o.y) * sa, ly = -(cx - o.x) * sa + (cy - o.y) * ca;
            const hw = o.w / 2, hd = o.d / 2;
            const qx = Math.max(-hw, Math.min(hw, lx)), qy = Math.max(-hd, Math.min(hd, ly));
            let dx = lx - qx, dy = ly - qy, d = Math.hypot(dx, dy);
            if (d < r) {
              let nx, ny, pen;
              if (d > 1e-6) { nx = dx / d; ny = dy / d; pen = r - d; }
              else { // 중심이 상자 내부
                const px = hw - Math.abs(lx), py = hd - Math.abs(ly);
                if (px < py) { nx = Math.sign(lx) || 1; ny = 0; pen = px + r; } else { nx = 0; ny = Math.sign(ly) || 1; pen = py + r; }
              }
              push((nx * ca - ny * sa) * pen, (nx * sa + ny * ca) * pen);
            }
          }
        }
        if (!moved) break;
      }
      return hit;
    }
    // 로컬 좌표(전방 fx, 우측 ry) -> 월드
    toWorld(fx, ry) {
      const c = Math.cos(this.th), s = Math.sin(this.th);
      return [this.x + c * fx - s * ry, this.y + s * fx + c * ry];
    }
    // 바닥 밝기(0~255)
    floorLum(x, y) {
      const f = this.floorData;
      if (!f) return 255;
      const px = Math.floor(x * f.scale), py = Math.floor(y * f.scale);
      if (px < 0 || py < 0 || px >= f.w || py >= f.h) return 0; // 바닥 밖 = 반사 없음
      // 센서 시야(약 3x3 px) 평균
      let sum = 0, n = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const qx = Math.min(f.w - 1, Math.max(0, px + ox)), qy = Math.min(f.h - 1, Math.max(0, py + oy));
        const i = (qy * f.w + qx) * 4;
        sum += f.data[i] * 0.299 + f.data[i + 1] * 0.587 + f.data[i + 2] * 0.114; n++;
      }
      return sum / n;
    }
    // 라인센서: 검은색(반사 없음)=1, 흰색=0
    lineSensor(side) {
      const [x, y] = this.toWorld(R.LINE_X, side === 0 ? -R.LINE_Y : R.LINE_Y);
      return this.floorLum(x, y) < 100 ? 1 : 0;
    }
    lineSensorPos(side) { return this.toWorld(R.LINE_X, side === 0 ? -R.LINE_Y : R.LINE_Y); }
    // 초음파: 전방 ±15° 원뿔 안에서 가장 가까운 물체까지 거리(cm). 감지 실패 시 -1
    ultrasonicRaw() {
      const [sx, sy] = this.toWorld(R.US_X, 0);
      let best = Infinity, bestAng = 0;
      const N = 9, spread = (15 * Math.PI) / 180;
      for (let i = 0; i < N; i++) {
        const a = this.th - spread + (2 * spread * i) / (N - 1);
        const d = this.castRay(sx, sy, Math.cos(a), Math.sin(a));
        // 중심에서 벗어난 빔은 약간 덜 민감
        const w = Math.abs(i - (N - 1) / 2) / ((N - 1) / 2);
        if (d < best && (w < 0.8 || d < 150)) { best = d; bestAng = a; }
      }
      this.lastUs = { sx, sy, d: best, ang: bestAng };
      return best <= R.US_MAX ? best : -1;
    }
    castRay(ox, oy, dx, dy) {
      const map = this.map;
      let t = Infinity;
      const H = R.US_H;
      // 경계 벽 (높이가 센서보다 높을 때만)
      if (map.border >= H) {
        if (dx > 1e-9) t = Math.min(t, (map.w - ox) / dx);
        if (dx < -1e-9) t = Math.min(t, -ox / dx);
        if (dy > 1e-9) t = Math.min(t, (map.h - oy) / dy);
        if (dy < -1e-9) t = Math.min(t, -oy / dy);
      }
      for (const o of map.obstacles) {
        if (o.h < H - 1.5) continue;
        if (o.t === 'cyl') {
          const fx = ox - o.x, fy = oy - o.y;
          const b = fx * dx + fy * dy, c = fx * fx + fy * fy - o.r * o.r;
          const disc = b * b - c;
          if (disc >= 0) {
            const s = -b - Math.sqrt(disc);
            if (s > 0 && s < t) t = s;
          }
        } else {
          const a = ((o.rot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
          const lx = (ox - o.x) * ca + (oy - o.y) * sa, ly = -(ox - o.x) * sa + (oy - o.y) * ca;
          const ldx = dx * ca + dy * sa, ldy = -dx * sa + dy * ca;
          let t0 = -Infinity, t1 = Infinity;
          const slab = (p, d, h) => {
            if (Math.abs(d) < 1e-9) return Math.abs(p) <= h;
            let a1 = (-h - p) / d, a2 = (h - p) / d;
            if (a1 > a2) [a1, a2] = [a2, a1];
            t0 = Math.max(t0, a1); t1 = Math.min(t1, a2);
            return t0 <= t1;
          };
          if (slab(lx, ldx, o.w / 2) && slab(ly, ldy, o.d / 2) && t1 > 0) {
            const s = t0 > 0 ? t0 : 0;
            if (s < t) t = s;
          }
        }
      }
      return t;
    }
    // 마퀸 확장(MakeCode) 방식의 거리값(cm, 정수). 감지 실패 시 500
    ultrasonicCm() {
      const d = this.ultrasonicRaw();
      if (d < 0) return 500;
      const noisy = d + (Math.random() - 0.5) * 0.4;
      return Math.max(2, Math.round(noisy));
    }
    // 나침반 방향(0=북, 90=동)
    compass() {
      let deg = (this.th * 180) / Math.PI + 90;
      deg = ((deg % 360) + 360) % 360;
      return Math.round(deg);
    }
  }

  MQ.ROBOT = R;
  MQ.Robot = Robot;
})();
