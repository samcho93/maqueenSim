/* MakeCode(JavaScript) 실행기: 사용자 코드를 async 로 변환 후 시뮬레이션 API 로 실행 */
(function () {
  const A = MQ.assets, hw = MQ.hw, clock = MQ.clock;

  // ---------- 코드 변환 ----------
  function stripTypes(src) {
    return src
      .replace(/(\b(?:let|const|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$.]*(?:\[\])*(?=\s*[=;,\n])/g, '$1')
      .replace(/([A-Za-z_$][\w$]*)\s*:\s*(?:number|string|boolean|any|void|Image|neopixel\.Strip)(?:\[\])*(?=\s*[,)=])/g, '$1')
      .replace(/\)\s*:\s*(?:number|string|boolean|any|void)(?:\[\])*\s*(?=\{)/g, ') ');
  }

  function transform(src) {
    const ast = acorn.parse(stripTypes(src), { ecmaVersion: 2022, sourceType: 'script', allowAwaitOutsideFunction: true, locations: true });
    const yieldStmt = () => ({ type: 'ExpressionStatement', expression: { type: 'AwaitExpression', argument: { type: 'CallExpression', callee: { type: 'Identifier', name: '__y' }, arguments: [], optional: false } } });
    function visit(node, parent) {
      if (!node || typeof node.type !== 'string') return node;
      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'start' || k === 'end') continue;
        const v = node[k];
        if (Array.isArray(v)) node[k] = v.map((c) => (c && typeof c.type === 'string' ? visit(c, node) : c));
        else if (v && typeof v.type === 'string') node[k] = visit(v, node);
      }
      switch (node.type) {
        case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
          if (!(parent && parent.type === 'MethodDefinition' && (parent.kind !== 'method')) && !node.generator) node.async = true;
          return node;
        case 'CallExpression':
          if (node.optional) return node;
          if (node.callee.type === 'Super') return node;
          return { type: 'AwaitExpression', argument: node };
        case 'WhileStatement': case 'DoWhileStatement': case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
          const body = node.body.type === 'BlockStatement' ? node.body.body : [node.body];
          node.body = { type: 'BlockStatement', body: [yieldStmt(), ...body] };
          return node;
        }
        default: return node;
      }
    }
    visit(ast, null);
    return astring.generate(ast);
  }

  // ---------- 실행 컨텍스트 ----------
  let ctx = null;
  function check() { if (!ctx || ctx.stopped) throw new MQ.StopSignal(); }
  let lastYield = 0;
  const chan = new MessageChannel();
  const pending = [];
  chan.port1.onmessage = () => { const f = pending.shift(); f && f(); };
  function macrotask() { return new Promise((r) => { pending.push(r); chan.port2.postMessage(0); }); }
  async function __y() {
    check();
    const now = performance.now();
    if (now - lastYield > 12) { lastYield = performance.now(); await macrotask(); check(); }
  }
  async function pause(ms) { check(); await clock.sleep(ms); check(); }

  function spawn(fn, args) {
    if (!ctx || ctx.stopped) return;
    const c = ctx;
    Promise.resolve().then(() => fn(...(args || []))).catch((e) => c.onError(e));
  }

  // ---------- 열거형 ----------
  const E = {
    Button: { A: 'A', B: 'B', AB: 'AB' },
    TouchPin: { P0: 0, P1: 1, P2: 2 },
    Gesture: { Shake: 'shake', LogoUp: 'up', LogoDown: 'down', ScreenUp: 'face up', ScreenDown: 'face down', TiltLeft: 'left', TiltRight: 'right', FreeFall: 'freefall' },
    Dimension: { X: 'x', Y: 'y', Z: 'z', Strength: 's' },
    DigitalPin: {}, AnalogPin: {},
    ArrowNames: { North: 0, NorthEast: 1, East: 2, SouthEast: 3, South: 4, SouthWest: 5, West: 6, NorthWest: 7 },
    IconNames: {},
    Note: A.NOTES,
    BeatFraction: { Whole: 1, Half: 2, Quarter: 4, Eighth: 8, Sixteenth: 16, Double: 32, Breve: 64 },
    Melodies: {},
    MelodyOptions: { Once: 1, Forever: 2, OnceInBackground: 4, ForeverInBackground: 8 },
    MelodyStopOptions: { All: 3, Background: 2, Foreground: 1 },
    NeoPixelMode: { RGB: 1, RGBW: 2, RGB_RGB: 3 },
    NeoPixelColors: { Red: 0xff0000, Orange: 0xffa500, Yellow: 0xffff00, Green: 0x00ff00, Blue: 0x0000ff, Indigo: 0x4b0082, Violet: 0x8a2be2, Purple: 0xff00ff, White: 0xffffff, Black: 0x000000 },
    PingUnit: { Centimeters: 0, MicroSeconds: 1, Inches: 2 },
    SerialPin: { P0: 0, P1: 1, P2: 2, USB_TX: 100, USB_RX: 101 },
    BaudRate: { BaudRate115200: 115200, BaudRate9600: 9600 },
  };
  for (let i = 0; i <= 20; i++) { E.DigitalPin['P' + i] = i; E.AnalogPin['P' + i] = i; }
  Object.keys(A.MAKECODE_ICON).forEach((k) => (E.IconNames[k] = k));
  Object.keys(A.MAKECODE_MELODY).forEach((k) => (E.Melodies[k] = k));

  // ---------- micro:bit API ----------
  function ledsFromString(s) {
    const t = String(s).replace(/[^.#]/g, '');
    const out = [];
    for (let i = 0; i < 25; i++) out.push(t[i] === '#' ? 255 : 0);
    return out;
  }
  async function showText(text, interval) {
    check();
    text = String(text);
    const job = hw.newDisplayJob();
    if (text.length === 1) { hw.showChar(text); await pause(interval * 5); return; }
    await hw.scrollText(text, interval, job);
    check();
  }
  const basic = {
    showNumber: (n, interval = 150) => showText(fmtNum(n), interval),
    showString: (s, interval = 150) => showText(s, interval),
    showIcon: async (name, interval = 600) => { hw.newDisplayJob(); hw.setLeds(A.patternToLeds(A.ICONS[A.MAKECODE_ICON[name]] || A.ICONS.HEART)); await pause(interval); },
    showLeds: async (s, interval = 400) => { hw.newDisplayJob(); hw.setLeds(ledsFromString(s)); await pause(interval); },
    showArrow: async (dir, interval = 600) => { hw.newDisplayJob(); hw.setLeds(A.patternToLeds(A.ICONS['ARROW_' + A.ARROWS[dir & 7]])); await pause(interval); },
    clearScreen: () => { hw.newDisplayJob(); hw.clearLeds(); },
    pause: (ms) => pause(ms),
    forever: (fn) => { check(); ctx.forevers.push(fn); if (ctx.mainDone) startForever(fn); },
    showValue: (n, v) => showText(n + ':' + v, 150),
  };
  function fmtNum(n) { n = Number(n); return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); }
  function startForever(fn) {
    const c = ctx;
    (async () => {
      while (!c.stopped) {
        await fn();
        await pause(20);
      }
    })().catch((e) => c.onError(e));
  }
  const input = {
    onButtonPressed: (btn, fn) => { ctx.handlers.button[btn] = fn; },
    buttonIsPressed: (btn) => (btn === 'AB' ? hw.buttons.A && hw.buttons.B : !!hw.buttons[btn]),
    onGesture: (g, fn) => { ctx.handlers.gesture[g] = fn; },
    isGesture: (g) => hw.currentGesture() === g,
    onLogoEvent: (ev, fn) => { ctx.handlers.logo = fn; },
    logoIsPressed: () => !!hw.buttons.LOGO,
    onPinPressed: () => {},
    acceleration: (d) => hw.accel(d),
    lightLevel: () => hw.env.light | 0,
    temperature: () => Math.round(hw.env.temp),
    compassHeading: () => hw.compass(),
    magneticForce: () => 40,
    rotation: (r) => 0,
    runningTime: () => Math.round(clock.now),
    runningTimeMicros: () => Math.round(clock.now * 1000),
    soundLevel: () => 0,
    calibrateCompass: () => {},
  };
  const led = {
    plot: (x, y) => hw.setPixel(x, y, 255),
    unplot: (x, y) => hw.setPixel(x, y, 0),
    plotBrightness: (x, y, b) => hw.setPixel(x, y, b),
    point: (x, y) => hw.getPixel(x, y) > 0,
    pointBrightness: (x, y) => hw.getPixel(x, y),
    toggle: (x, y) => hw.setPixel(x, y, hw.getPixel(x, y) ? 0 : 255),
    brightness: () => hw.brightness,
    setBrightness: (b) => { hw.brightness = Math.max(0, Math.min(255, b | 0)); },
    plotBarGraph: (v, high) => {
      const n = high > 0 ? Math.round((Math.max(0, v) / high) * 25) : 0;
      const arr = [];
      for (let y = 4; y >= 0; y--) for (let x = 0; x < 5; x++) arr[y * 5 + x] = (4 - y) * 5 + x < n ? 255 : 0;
      hw.setLeds(arr);
    },
    enable: () => {},
    stopAnimation: () => hw.newDisplayJob(),
  };
  const music = {
    playTone: async (freq, ms) => { check(); await hw.tone(freq, ms); check(); },
    ringTone: (freq) => hw.ringTone(freq),
    rest: (ms) => { hw.ringTone(0); return pause(ms); },
    beat: (frac = 1) => {
      const b = 60000 / hw.tempo.bpm;
      return { 1: b, 2: b / 2, 4: b / 4, 8: b / 8, 16: b / 16, 32: b * 2, 64: b * 4 }[frac] || b;
    },
    tempo: () => hw.tempo.bpm,
    setTempo: (bpm) => { hw.tempo.bpm = Math.max(1, bpm); },
    changeTempoBy: (d) => { hw.tempo.bpm = Math.max(1, hw.tempo.bpm + d); },
    builtInMelody: (m) => A.MELODIES[A.MAKECODE_MELODY[m]] || [],
    startMelody: (notes, opt = 1) => {
      const p = hw.playNotes(A.parseMelody(notes), opt === 2 || opt === 8);
      if (opt === 1 || opt === 2) return p.then(check);
    },
    beginMelody: (notes, opt) => music.startMelody(notes, opt),
    playMelody: async (str, bpm) => { const old = hw.tempo.bpm; hw.tempo.bpm = bpm || old; hw.tempo.ticks = 4; await hw.playNotes(A.parseMakeCodeMelody(str)); hw.tempo.bpm = old; check(); },
    stopAllSounds: () => hw.stopSound(),
    stopMelody: () => hw.stopSound(),
    setVolume: () => {},
    playSoundEffect: () => {},
  };
  const pins = {
    digitalWritePin: (p, v) => hw.digitalWrite(p, v),
    digitalReadPin: (p) => hw.digitalRead(p),
    analogWritePin: (p, v) => hw.analogWrite(p, v),
    analogReadPin: (p) => hw.analogRead(p),
    analogSetPeriod: () => {},
    servoWritePin: (p, a) => hw.pins[p] = a,
    setPull: () => {},
    pulseIn: (p, v) => hw.pulseIn(p, v),
    i2cWriteNumber: (addr, n) => hw.i2cWrite(addr, [n & 0xff]),
    i2cWriteBuffer: (addr, buf) => hw.i2cWrite(addr, buf),
    i2cReadNumber: (addr) => hw.i2cRead(addr, 1)[0],
    i2cReadBuffer: (addr, n) => hw.i2cRead(addr, n),
    createBuffer: (n) => new Array(n).fill(0),
    map: (v, fl, fh, tl, th) => ((v - fl) * (th - tl)) / (fh - fl) + tl,
    onPulsed: () => {},
  };
  const serial = {
    writeLine: (s) => hw.serialWrite(String(s) + '\n'),
    writeString: (s) => hw.serialWrite(String(s)),
    writeNumber: (n) => hw.serialWrite(fmtNum(n)),
    writeValue: (name, v) => hw.serialWrite(`${name}:${fmtNum(v)}\n`),
    writeNumbers: (arr) => hw.serialWrite(arr.join(',') + '\n'),
    redirectToUSB: () => {}, redirect: () => {}, setBaudRate: () => {},
    readLine: () => '', readString: () => '', onDataReceived: () => {},
  };
  const control = {
    waitMicros: (us) => pause(us / 1000),
    reset: () => { throw new MQ.StopSignal(); },
    millis: () => Math.round(clock.now),
    inBackground: (fn) => spawn(fn),
    runInParallel: (fn) => spawn(fn),
    deviceSerialNumber: () => 20240101,
    raiseEvent: () => {}, onEvent: () => {},
  };
  // Math.randomRange / randint
  const randint = (a, b) => Math.floor(Math.random() * (Math.max(a, b) - Math.min(a, b) + 1)) + Math.min(a, b);
  const MathX = Object.create(Math);
  MathX.randomRange = randint;
  MathX.randomBoolean = () => Math.random() < 0.5;
  MathX.idiv = (a, b) => Math.trunc(a / b);
  MathX.constrain = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  MathX.map = pins.map;

  // ---------- maqueen 확장 ----------
  const maqueen = {
    Motors: { M1: 0, M2: 1, All: 2 },
    Dir: { CW: 0, CCW: 1 },
    Patrol: { PatrolLeft: 13, PatrolRight: 14 },
    LED: { LEDLeft: 8, LEDRight: 12 },
    LEDswitch: { turnOn: 1, turnOff: 0 },
    Servos: { S1: 0, S2: 1 },
    motorRun: (m, dir, speed) => hw.setMotor(m, dir, speed),
    motorStop: (m) => hw.setMotor(m, 0, 0),
    Ultrasonic: () => hw.ultrasonic(),
    sensor: () => hw.ultrasonic(),
    readPatrol: (p) => (p === 13 ? hw.lineSensor(0) : p === 14 ? hw.lineSensor(1) : -1),
    writeLED: (l, s) => hw.digitalWrite(l, s),
    servoRun: (s, a) => hw.setServo(s, a),
    IR_read: () => hw.irCode,
    IR_callbackUser: (fn) => { ctx.handlers.ir = fn; },
    IR_read_version: () => 'MAQUEEN_V4_SIM',
  };
  // ---------- neopixel 확장 ----------
  class Strip {
    constructor(pin, n) { this.pin = pin; this.n = n; this.buf = new Array(n).fill(0); this.br = 255; this.start = 0; }
    _out() {
      const arr = this.buf.map((c) => [((c >> 16) & 255) * this.br / 255, ((c >> 8) & 255) * this.br / 255, (c & 255) * this.br / 255]);
      hw.showPixels(this.pin, arr);
    }
    showColor(c) { this.buf.fill(c); this._out(); }
    setPixelColor(i, c) { if (i >= 0 && i < this.n) this.buf[i | 0] = c; }
    show() { this._out(); }
    clear() { this.buf.fill(0); }
    setBrightness(b) { this.br = Math.max(0, Math.min(255, b | 0)); }
    showRainbow(h1 = 1, h2 = 360) {
      for (let i = 0; i < this.n; i++) this.buf[i] = neopixel.hsl(h1 + ((h2 - h1) * i) / this.n, 100, 50);
      this._out();
    }
    rotate(o = 1) { const n = this.n; o = ((o % n) + n) % n; this.buf = this.buf.slice(n - o).concat(this.buf.slice(0, n - o)); }
    shift(o = 1) { for (let k = 0; k < o; k++) { this.buf.pop(); this.buf.unshift(0); } }
    length() { return this.n; }
    range(start, len) { const s = new Strip(this.pin, len); const parent = this; s.setPixelColor = (i, c) => parent.setPixelColor(start + i, c); s.show = () => parent.show(); s.showColor = (c) => { for (let i = 0; i < len; i++) parent.setPixelColor(start + i, c); parent.show(); }; return s; }
    showBarGraph(v, high) { const k = Math.round((v / high) * this.n); for (let i = 0; i < this.n; i++) this.buf[i] = i < k ? 0x00ff00 : 0; this._out(); }
    easeBrightness() {}
    setMatrixWidth() {}
  }
  const neopixel = {
    create: (pin, n) => new Strip(pin, n),
    colors: (c) => c,
    rgb: (r, g, b) => ((r & 255) << 16) | ((g & 255) << 8) | (b & 255),
    hsl: (h, s, l) => {
      h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
      const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
      const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
      return (f(0) << 16) | (f(8) << 8) | f(4);
    },
  };

  const consoleX = { log: (...a) => hw.serialWrite(a.join(' ') + '\n'), logValue: (n, v) => serial.writeValue(n, v) };

  const API = Object.assign({ basic, input, led, music, pins, serial, control, maqueen, neopixel, randint, Math: MathX, console: consoleX, __y }, E);

  function dispatch(kind, key) {
    if (!ctx || ctx.stopped) return;
    let fn;
    if (kind === 'button') fn = ctx.handlers.button[key];
    else if (kind === 'gesture') fn = ctx.handlers.gesture[key];
    else if (kind === 'ir') fn = ctx.handlers.ir;
    else if (kind === 'logo') fn = ctx.handlers.logo;
    if (fn) spawn(fn, kind === 'ir' ? [key] : []);
  }
  hw.on('button', (b) => dispatch('button', b));
  hw.on('gesture', (g) => dispatch('gesture', g));
  hw.on('ir', (c) => dispatch('ir', c));
  hw.on('logo', () => dispatch('logo'));

  MQ.jsrt = {
    transform,
    run(code, { onError, onDone }) {
      let compiled;
      try { compiled = transform(code); } catch (e) {
        const msg = e.loc ? `문법 오류 (${e.loc.line}번째 줄): ${e.message.replace(/\s*\(\d+:\d+\)$/, '')}` : String(e.message || e);
        onError(new Error(msg)); return null;
      }
      const c = {
        stopped: false, forevers: [], mainDone: false,
        handlers: { button: {}, gesture: {}, ir: null, logo: null },
        onError: (e) => {
          if (e && e.isStop) return;
          if (c.stopped) return;
          onError(e);
        },
      };
      ctx = c;
      const names = Object.keys(API);
      let fn;
      try {
        fn = new Function(...names, '"use strict";\nreturn (async () => {\n' + compiled + '\n});')(...names.map((n) => API[n]));
      } catch (e) { onError(e); return null; }
      fn().then(() => {
        c.mainDone = true;
        if (!c.stopped) c.forevers.forEach(startForever);
        onDone && onDone();
      }).catch((e) => c.onError(e));
      return {
        stop() { c.stopped = true; if (ctx === c) ctx = null; },
      };
    },
  };
})();
