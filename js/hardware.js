/* 시뮬레이션 시계 + micro:bit / 마퀸 하드웨어 상태 */
(function () {
  const A = MQ.assets;

  class StopSignal extends Error { constructor() { super('stopped'); this.isStop = true; } }
  MQ.StopSignal = StopSignal;

  // ---------- 시뮬레이션 시계 ----------
  const clock = {
    now: 0, // ms (시뮬레이션 시간)
    waiters: [],
    sleep(ms) {
      ms = Math.max(0, Number(ms) || 0);
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
      sound.stop();
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
    i2cWrite(addr, bytes) {
      bytes = Array.from(bytes || []).map((b) => b & 0xff);
      if (addr !== 0x10) { this.emit('warn', `I2C 주소 0x${addr.toString(16)} 에는 장치가 없습니다.`); return; }
      const reg = bytes[0];
      if (reg === 0x00 && bytes.length >= 3) this.setMotor(0, bytes[1], bytes[2]);
      else if (reg === 0x02 && bytes.length >= 3) this.setMotor(1, bytes[1], bytes[2]);
      else if (reg === 0x14 && bytes.length >= 2) this.setServo(0, bytes[1]);
      else if (reg === 0x15 && bytes.length >= 2) this.setServo(1, bytes[1]);
    },
    i2cRead(addr, n) {
      const ver = 'MAQUEEN_V4_SIM';
      const out = [];
      for (let i = 0; i < n; i++) out.push(i < ver.length ? ver.charCodeAt(i) : 0);
      return out;
    },
    ultrasonic() { return this.robot ? this.robot.ultrasonicCm() : 500; },
    lineSensor(side) { return this.robot ? this.robot.lineSensor(side) : 0; },

    // ----- 핀 -----
    digitalWrite(pin, v) {
      v = v ? 1 : 0;
      this.pins[pin] = v;
      if (pin === 8) this.redLeds[0] = v;
      else if (pin === 12) this.redLeds[1] = v;
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
