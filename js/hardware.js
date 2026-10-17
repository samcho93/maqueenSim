/* 시뮬레이션 시계 + micro:bit / 마퀸 하드웨어 상태 */
(function () {
  const A = MQ.assets;

  class StopSignal extends Error { constructor() { super('stopped'); this.isStop = true; } }
  MQ.StopSignal = StopSignal;

  // ---------- 시뮬레이션 시계 ----------
  const clock = {
    now: 0, // ms (시뮬레이션 시간)
    waiters: [],
    seq: 0, // sleep 호출 횟수 (프로그램이 다음 대기에 도달했는지 확인용)
    sleep(ms) {
      ms = Math.max(0, Number(ms) || 0);
      this.seq++;
      return new Promise((resolve, reject) => {
        this.waiters.push({ t: this.now + ms, resolve, reject });
      });
    },
    // 기한이 지난 대기자를 깨움. 깨운 수 반환
    release() {
      if (!this.waiters.length) return 0;
      let n = 0;
      const keep = [];
      for (const w of this.waiters) {
        if (w.t <= this.now + 1e-6) { w.resolve(); n++; } else keep.push(w);
      }
      this.waiters = keep;
      return n;
    },
    nextDue() { let m = Infinity; for (const w of this.waiters) m = Math.min(m, w.t); return m; },
    cancelAll() {
      const ws = this.waiters; this.waiters = [];
      ws.forEach((w) => w.reject(new StopSignal()));
    },
  };
  MQ.clock = clock;

  // ---------- 사운드 ----------
  const sound = {
    ctx: null, osc: null, gain: null, muted: false, volume: 0.06, freq: 0,
    ensure() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },
    start(freq) {
      this.freq = freq;
      if (this.muted || !freq || !this.ensure()) { this.stopOsc(); return; }
      if (!this.osc) {
        this.osc = this.ctx.createOscillator();
        this.osc.type = 'square';
        this.gain = this.ctx.createGain();
        this.gain.gain.value = this.volume;
        this.osc.connect(this.gain).connect(this.ctx.destination);
        this.osc.start();
      }
      this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    },
    stopOsc() {
      if (this.osc) { try { this.osc.stop(); } catch (e) { /* noop */ } this.osc.disconnect(); this.osc = null; }
    },
    stop() { this.freq = 0; this.stopOsc(); },
  };
  MQ.sound = sound;

  // ---------- 하드웨어 ----------
  const hw = {
    listeners: {},
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => f(...a)); },
    robot: null, // MQ.Robot

    reset() {
      this.leds = new Array(25).fill(0);
      this.brightness = 255;
      this.motors = [{ dir: 0, speed: 0 }, { dir: 0, speed: 0 }];
      this.servos = [90, 90];
      this.redLeds = [0, 0];
      this.pixels = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
      this.pixelBrightness = 255;
      this.pins = {};
      this.presses = { A: 0, B: 0, AB: 0, LOGO: 0 };
      this.wasPressed = { A: false, B: false, AB: false, LOGO: false };
      this.gestureFlag = {};
      this.irCode = -1; this.irNew = false;
      this.displayToken = 0;
      this.melodyToken = 0;
      this.tempo = { ticks: 4, bpm: 120 };
      this.music = { freq: 0 };
      this.i2cPtr = null;
      // V5 전용 상태
      this.v5 = {
        lights: [0, 1].map(() => ({ color: 8, blinkNum: 0, blinkGrade: 1, blinkT0: 0, gradGrade: 0 })),
        patrol: false, patrolLast: 0, patrolT: 0, batteryType: 1, inited: false,
      };
      sound.stop();
    },
    // 로봇 모델 (v4 / v5)
    model: 'v4',
    setModel(m) {
      this.model = m === 'v5' ? 'v5' : 'v4';
      if (this.robot) this.robot.model = this.model;
      this.emit('model', this.model);
    },
    init() {
      this.buttons = { A: false, B: false, LOGO: false };
      this.env = { light: 128, temp: 22, ax: 0, ay: 0, az: -1024 };
      this.reset();
    },

    // ----- 디스플레이 -----
    setLeds(arr) { for (let i = 0; i < 25; i++) this.leds[i] = arr[i] | 0; },
    clearLeds() { this.leds.fill(0); },
    setPixel(x, y, v) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x > 4 || y > 4) return;
      this.leds[y * 5 + x] = Math.max(0, Math.min(255, v | 0));
    },
    getPixel(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x > 4 || y > 4) return 0; return this.leds[y * 5 + x]; },
    newDisplayJob() { return ++this.displayToken; },
    // 텍스트 스크롤 (interval ms/열)
    async scrollText(text, interval, token) {
      const cols = A.textColumns(text);
      for (let off = 0; off + 5 <= cols.length; off++) {
        if (token !== this.displayToken) return;
        const leds = [];
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) leds.push(cols[off + x][y] ? 255 : 0);
        this.setLeds(leds);
        await clock.sleep(interval);
      }
    },
    showChar(ch) { this.setLeds(A.charLeds(ch)); },

    // ----- 버튼 -----
    pressButton(name, down) {
      if (name === 'AB') { this.pressButton('A', down); this.pressButton('B', down); return; }
      const was = this.buttons[name];
      this.buttons[name] = down;
      if (was && !down) { // 클릭 = 눌렀다 뗌
        this.presses[name]++; this.wasPressed[name] = true;
        const other = name === 'A' ? 'B' : name === 'B' ? 'A' : null;
        if (other && this.buttons[other]) { this._abPending = true; }
        if (this._abPending && !this.buttons.A && !this.buttons.B) {
          this._abPending = false; this.presses.AB++; this.wasPressed.AB = true; this.emit('button', 'AB');
        } else if (!this._abPending) this.emit('button', name);
      }
      if (!was && down && name === 'LOGO') this.emit('logo', 'pressed');
    },
    clickButton(name) {
      if (name === 'AB') {
        this.buttons.A = this.buttons.B = false;
        this.presses.AB++; this.wasPressed.AB = true;
        this.presses.A++; this.presses.B++;
        this.emit('button', 'AB');
        return;
      }
      this.pressButton(name, true); this.pressButton(name, false);
    },
    shake() { this.gestureFlag.shake = true; this.gestureNow = 'shake'; this._gestureT = clock.now; this.emit('gesture', 'shake'); },
    currentGesture() {
      if (this.gestureNow && clock.now - this._gestureT < 300) return this.gestureNow;
      const { ax, ay, az } = this.env;
      if (ay < -500) return 'up';
      if (ay > 500) return 'down';
      if (ax < -500) return 'left';
      if (ax > 500) return 'right';
      if (az > 500) return 'face down';
      return 'face up';
    },

    // ----- 마퀸 -----
    setMotor(idx, dir, speed) {
      speed = Math.max(0, Math.min(255, Math.round(Number(speed) || 0)));
      dir = dir ? 1 : 0;
      if (idx === 0 || idx === 2) this.motors[0] = { dir, speed };
      if (idx === 1 || idx === 2) this.motors[1] = { dir, speed };
    },
    setServo(idx, angle) { this.servos[idx] = Math.max(0, Math.min(180, Math.round(Number(angle) || 0))); },
    // ----- I2C (주소 0x10 마퀸 보드) -----
    i2cWrite(addr, bytes) {
      bytes = Array.from(bytes || []).map((b) => b & 0xff);
      if (addr !== 0x10) { this.emit('warn', `I2C 주소 0x${(addr | 0).toString(16)} 에는 장치가 없습니다.`); return; }
      if (!bytes.length) return;
      const reg = bytes[0];
      if (bytes.length === 1) { this.i2cPtr = reg; return; } // 읽기용 레지스터 지정
      const v = bytes[1];
      const L = this.v5.lights;
      switch (reg) {
        case 0x00: if (bytes.length >= 3) this.setMotor(0, bytes[1], bytes[2]); break;
        case 0x02: if (bytes.length >= 3) this.setMotor(1, bytes[1], bytes[2]); break;
        case 0x14: this.setServo(0, v); break;          // S1 (20)
        case 0x15: this.setServo(1, v); break;          // S2 (21)
        case 11: L[0].color = v; L[0].blinkNum = 0; L[0].gradGrade = 0; break;   // RGB_L
        case 12: L[1].color = v; L[1].blinkNum = 0; L[1].gradGrade = 0; break;   // RGB_R
        case 13: L[0].blinkNum = v; L[0].blinkT0 = clock.now; L[0].gradGrade = 0; break;
        case 14: L[0].blinkGrade = Math.max(1, v); break;
        case 15: L[1].blinkNum = v; L[1].blinkT0 = clock.now; L[1].gradGrade = 0; break;
        case 16: L[1].blinkGrade = Math.max(1, v); break;
        case 17: L[0].gradGrade = v; L[0].blinkNum = 0; break;
        case 18: L[1].gradGrade = v; L[1].blinkNum = 0; break;
        case 45: this.v5.batteryType = v; break;        // BATTERY_SET
        case 70: this.v5.inited = true; break;          // MY_SYS_INIT (0x46)
        case 71: this.setPatrol(!!v); break;            // LINE_WALKING
        default: break;
      }
      this.i2cPtr = null;
    },
    i2cRegs() {
      const r = this.robot, isV5 = this.model === 'v5';
      const ver = isV5 ? 'MaqueenV5.0' : 'MaqueenV4.0';
      const m = {};
      const put16 = (reg, val) => { val = Math.max(0, Math.min(65535, Math.round(val))); m[reg] = (val >> 8) & 255; m[reg + 1] = val & 255; };
      // 29: 라인센서 상태 비트 (L=bit2, M=bit1, R=bit0)
      if (r) {
        const s = isV5 ? [r.lineSensor(0), r.lineSensor(1), r.lineSensor(2)] : [r.lineSensor(0), 0, r.lineSensor(1)];
        m[29] = (s[0] << 2) | (s[1] << 1) | s[2];
        const adc = (i) => (r.lineOffsets().length > i ? Math.round(((255 - r.lineLum(i)) / 255) * 1023) : 0);
        if (isV5) { put16(32, adc(0)); put16(34, adc(1)); put16(36, adc(2)); put16(30, adc(0)); put16(38, adc(2)); }
      }
      put16(41, this.lightValue(0)); put16(43, this.lightValue(1));
      m[46] = this.battery();
      m[50] = ver.length;
      for (let i = 0; i < ver.length; i++) m[51 + i] = ver.charCodeAt(i);
      m[71] = this.v5.patrol ? 1 : 0;
      return m;
    },
    i2cRead(addr, n) {
      if (addr !== 0x10) return new Array(n).fill(0);
      const m = this.i2cRegs();
      let ptr = this.i2cPtr;
      if (ptr === null || ptr === undefined) ptr = 51; // 레지스터 미지정 시 버전 문자열
      const out = [];
      for (let i = 0; i < n; i++) out.push(m[ptr + i] | 0);
      return out;
    },
    // V5: 광센서(0~1023), 배터리(0~100)
    lightValue(side) {
      const base = (this.env.light / 255) * 1023;
      const h = this.robot ? Math.sin(this.robot.th + (side ? 0.6 : -0.6)) * 25 : 0;
      return Math.max(0, Math.min(1023, Math.round(base + h + (Math.random() - 0.5) * 6)));
    },
    battery() {
      const used = this.robot ? this.robot.odo / 600 : 0; // 주행거리에 따라 천천히 감소
      const base = this.v5.batteryType === 0 ? 92 : 88;
      return Math.max(0, Math.min(100, Math.round(base - used)));
    },
    // V5 RGB 자동차 조명의 현재 색 [r,g,b] (0~255)
    carLightRGB(i) {
      const C = { 1: [255, 0, 0], 2: [0, 255, 0], 3: [255, 255, 0], 4: [0, 0, 255], 5: [255, 0, 255], 6: [0, 255, 255], 7: [255, 255, 255], 8: [0, 0, 0] };
      const L = this.v5.lights[i];
      if (L.gradGrade > 0) {
        const period = 6000 / L.gradGrade, h = ((clock.now % period) / period) * 360;
        const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)))); };
        return [f(5), f(3), f(1)];
      }
      const c = C[L.color] || C[8];
      if (L.blinkNum > 0) {
        const half = 600 / L.blinkGrade, t = clock.now - L.blinkT0, k = Math.floor(t / half);
        if (k >= L.blinkNum * 2) { L.blinkNum = 0; return c; }
        return k % 2 ? [0, 0, 0] : c;
      }
      return c;
    },
    // V5 내장 라인 트레이싱(펌웨어)
    setPatrol(on) {
      this.v5.patrol = on;
      if (!on) this.setMotor(2, 0, 0);
    },
    patrolStep() {
      const r = this.robot;
      if (!r || this.model !== 'v5' || !this.v5.patrol) return;
      if (clock.now - this.v5.patrolT < 10) return;
      this.v5.patrolT = clock.now;
      const L = r.lineSensor(0), M = r.lineSensor(1), R = r.lineSensor(2);
      const sp = 90, P = this.v5;
      if (M && !L && !R) { this.setMotor(2, 0, sp); P.patrolLast = 0; }
      else if (L && !R) { this.setMotor(0, 0, M ? 40 : 0); this.setMotor(1, 0, sp); P.patrolLast = 1; }
      else if (R && !L) { this.setMotor(0, 0, sp); this.setMotor(1, 0, M ? 40 : 0); P.patrolLast = 2; }
      else if (L && R) { this.setMotor(2, 0, sp); }
      else if (P.patrolLast === 1) { this.setMotor(0, 1, 60); this.setMotor(1, 0, 60); }
      else if (P.patrolLast === 2) { this.setMotor(0, 0, 60); this.setMotor(1, 1, 60); }
      else this.setMotor(2, 0, 60);
    },
    ultrasonic() { return this.robot ? this.robot.ultrasonicCm() : 500; },
    lineSensor(side) { return this.robot ? this.robot.lineLR(side) : 0; }, // V4 P13/P14 (V5 에서는 L/R 센서)

    // ----- 핀 -----
    digitalWrite(pin, v) {
      v = v ? 1 : 0;
      this.pins[pin] = v;
      if (pin === 8 && this.model === 'v4') this.redLeds[0] = v;
      else if (pin === 12 && this.model === 'v4') this.redLeds[1] = v;
      else if (pin === 1 && v === 0) this._trigT = clock.now;
    },
    digitalRead(pin) {
      if (pin === 13) return this.lineSensor(0);
      if (pin === 14) return this.lineSensor(1);
      if (pin === 5) return this.buttons.A ? 0 : 1;
      if (pin === 11) return this.buttons.B ? 0 : 1;
      return this.pins[pin] || 0;
    },
    analogWrite(pin, v) {
      v = Math.max(0, Math.min(1023, v | 0));
      this.pins[pin] = v;
      if (pin === 8) this.redLeds[0] = v / 1023;
      if (pin === 12) this.redLeds[1] = v / 1023;
      if (pin === 0) { if (v > 0 && this.music.freq) sound.start(this.music.freq); else if (!v) sound.stop(); }
    },
    analogRead(pin) {
      if (pin === 13) return this.lineSensor(0) ? 80 : 900;
      if (pin === 14) return this.lineSensor(1) ? 80 : 900;
      const v = this.pins[pin];
      return typeof v === 'number' ? (v > 1 ? v : v * 1023) : 0;
    },
    // 초음파 echo 펄스 길이(us). 감지 실패 시 -1
    pulseIn(pin, level, timeoutUs) {
      if (pin !== 2 || !this.robot) return -1;
      const d = this.robot.ultrasonicRaw();
      if (d < 0) return -1;
      const us = Math.round((d + (Math.random() - 0.5) * 0.4) * 58);
      if (timeoutUs && us > timeoutUs) return -1;
      return us;
    },

    // ----- 네오픽셀 (P15) -----
    showPixels(pin, arr) {
      if (pin !== 15) return;
      for (let i = 0; i < 4; i++) {
        const c = arr[i] || [0, 0, 0];
        this.pixels[i] = [c[0] | 0, c[1] | 0, c[2] | 0];
      }
    },

    // ----- 소리 -----
    async tone(freq, ms) {
      this.music.freq = freq;
      sound.start(freq);
      try { await clock.sleep(ms); } finally {
        this.music.freq = 0; sound.stop();
      }
    },
    ringTone(freq) { this.music.freq = freq; if (freq > 0) sound.start(freq); else sound.stop(); },
    stopSound() { this.melodyToken++; this.music.freq = 0; sound.stop(); },
    tickMs() { return 60000 / this.tempo.bpm / this.tempo.ticks; },
    async playNotes(notes, loop) {
      const token = ++this.melodyToken;
      do {
        for (const n of notes) {
          if (token !== this.melodyToken) return;
          const ms = n.ticks * this.tickMs();
          if (n.freq) {
            this.music.freq = n.freq; sound.start(n.freq);
            await clock.sleep(ms * 0.9);
            if (token !== this.melodyToken) return;
            this.music.freq = 0; sound.stop();
            await clock.sleep(ms * 0.1);
          } else await clock.sleep(ms);
        }
      } while (loop && token === this.melodyToken);
    },

    // ----- IR -----
    irReceive(code) { this.irCode = code; this.irNew = true; this.emit('ir', code); },

    // ----- 환경 -----
    compass() { return this.robot ? this.robot.compass() : 0; },
    accel(axis) {
      const { ax, ay, az } = this.env;
      const j = () => Math.round((Math.random() - 0.5) * 8);
      if (axis === 'x') return ax + j();
      if (axis === 'y') return ay + j();
      if (axis === 'z') return az + j();
      return Math.round(Math.hypot(ax, ay, az));
    },
    serialWrite(text) { this.emit('serial', String(text)); },
  };

  // IR 리모컨 키 코드 (DFRobot 리모컨)
  MQ.IR_KEYS = [
    ['전원', 0], ['VOL+', 1], ['FUNC', 2],
    ['|◀◀', 4], ['▶||', 5], ['▶▶|', 6],
    ['▼', 8], ['VOL-', 9], ['▲', 10],
    ['0', 12], ['EQ', 13], ['ST', 14],
    ['1', 16], ['2', 17], ['3', 18],
    ['4', 20], ['5', 21], ['6', 22],
    ['7', 24], ['8', 25], ['9', 26],
  ];

  hw.init();
  MQ.hw = hw;
})();
