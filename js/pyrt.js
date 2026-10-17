/* MicroPython 실행기 (Skulpt 기반) + micro:bit / maqueen 모듈 */
(function () {
  const A = MQ.assets, hw = MQ.hw, clock = MQ.clock;
  let ctx = null;
  function check() { if (!ctx || ctx.stopped) throw new MQ.StopSignal(); }
  const sleep = async (ms) => { check(); await clock.sleep(ms); check(); };

  // ---------- 파이썬에서 호출되는 네이티브 함수 ----------
  const api = {
    sleep: (ms) => sleep(ms),
    running_time: () => Math.round(clock.now),
    ticks_us: () => Math.round(clock.now * 1000),
    // display
    show_leds: (arr) => { hw.newDisplayJob(); hw.setLeds(arr.map((v) => Math.round((v * 255) / 9))); },
    show_char: (ch) => { hw.newDisplayJob(); hw.showChar(ch); },
    scroll: (text, delay, wait, loop) => {
      const job = hw.newDisplayJob();
      const run = async () => { do { await hw.scrollText(text, delay, job); } while (loop && job === hw.displayToken && ctx && !ctx.stopped); };
      if (wait) return run().then(check);
      run().catch(() => {});
    },
    clear: () => { hw.newDisplayJob(); hw.clearLeds(); },
    set_pixel: (x, y, v) => hw.setPixel(x, y, Math.round((v * 255) / 9)),
    get_pixel: (x, y) => Math.round((hw.getPixel(x, y) * 9) / 255),
    get_leds: () => hw.leds.map((v) => Math.round((v * 9) / 255)),
    light_level: () => hw.env.light | 0,
    // 버튼
    btn_is: (n) => !!hw.buttons[n],
    btn_was: (n) => { const w = hw.wasPressed[n]; hw.wasPressed[n] = false; return w; },
    btn_presses: (n) => { const c = hw.presses[n]; hw.presses[n] = 0; return c; },
    // 핀
    dw: (p, v) => hw.digitalWrite(p, v),
    dr: (p) => hw.digitalRead(p),
    aw: (p, v) => hw.analogWrite(p, v),
    ar: (p) => hw.analogRead(p),
    touch: (p) => (p === 'logo' ? !!hw.buttons.LOGO : false),
    pulse_in: (p, level, timeout) => hw.pulseIn(p, level, timeout),
    // 센서
    temperature: () => Math.round(hw.env.temp),
    accel: (axis) => hw.accel(axis),
    gesture: () => hw.currentGesture(),
    was_gesture: (g) => { const v = !!hw.gestureFlag[g]; hw.gestureFlag[g] = false; return v; },
    heading: () => hw.compass(),
    // i2c
    i2c_w: (addr, buf) => hw.i2cWrite(addr, buf),
    i2c_r: (addr, n) => hw.i2cRead(addr, n),
    // 음악
    pitch: (freq, dur, wait) => {
      if (dur < 0) { hw.ringTone(freq); return; }
      const p = hw.tone(freq, dur);
      if (wait) return p.then(check);
    },
    melody: (notes, wait, loop) => {
      const p = hw.playNotes(A.parseMelody(notes), loop);
      if (wait && !loop) return p.then(check);
    },
    music_stop: () => hw.stopSound(),
    set_tempo: (ticks, bpm) => { hw.tempo = { ticks, bpm }; },
    get_tempo: () => [hw.tempo.ticks, hw.tempo.bpm],
    // 네오픽셀
    np_show: (pin, arr) => hw.showPixels(pin, arr),
    // IR
    ir_read: () => hw.irCode,
    ir_new: () => { const v = hw.irNew; hw.irNew = false; return v; },
    // 마퀸 직접 접근(빠른 경로)
    us: () => hw.ultrasonic(),
    serial: (s) => hw.serialWrite(s),
  };

  function nativeModule(name) {
    /* eslint-disable no-undef */
    var mod = {};
    mod.hwcall = new Sk.builtin.func(function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) { return Sk.ffi.remapToJs(a); });
      var fname = args.shift();
      var f = MQ.pyApi[fname];
      if (!f) throw new Sk.builtin.NameError('unknown hw call ' + fname);
      var r = f.apply(null, args);
      var conv = function (v) { return v === undefined || v === null ? Sk.builtin.none.none$ : Sk.ffi.remapToPy(v); };
      if (r && typeof r.then === 'function') {
        return Sk.misceval.promiseToSuspension(r.then(conv, function (e) {
          if (e && e.isStop) throw new (Sk.builtin.SystemExit || Sk.builtin.Exception)('stopped');
          throw e;
        }));
      }
      return conv(r);
    });
    return mod;
  }
  MQ.pyApi = api;

  // ---------- 파이썬 모듈 소스 ----------
  function imageConsts() {
    const lines = [];
    Object.entries(A.ICONS).forEach(([k, v]) => lines.push(`Image.${k} = Image('${v.split(',').map((r) => r.replace(/1/g, '9')).join(':')}')`));
    lines.push('Image.ALL_ARROWS = [Image.ARROW_N, Image.ARROW_NE, Image.ARROW_E, Image.ARROW_SE, Image.ARROW_S, Image.ARROW_SW, Image.ARROW_W, Image.ARROW_NW]');
    return lines.join('\n');
  }

  const MICROBIT_PY = `
import _hw
_c = _hw.hwcall

class Image:
    def __init__(self, *args):
        if len(args) == 0:
            self._w = 5; self._h = 5; self._p = [0] * 25
        elif isinstance(args[0], str):
            rows = [r for r in args[0].replace('\\n', ':').split(':') if r != '']
            self._h = len(rows)
            self._w = max([len(r) for r in rows]) if rows else 0
            self._p = []
            for r in rows:
                for i in range(self._w):
                    self._p.append(int(r[i]) if i < len(r) else 0)
        else:
            self._w = args[0]; self._h = args[1]
            if len(args) > 2:
                self._p = list(args[2])
            else:
                self._p = [0] * (self._w * self._h)
    def width(self): return self._w
    def height(self): return self._h
    def get_pixel(self, x, y): return self._p[y * self._w + x]
    def set_pixel(self, x, y, v):
        self._p[y * self._w + x] = v
    def copy(self): return Image(self._w, self._h, list(self._p))
    def invert(self): return Image(self._w, self._h, [9 - v for v in self._p])
    def fill(self, v):
        self._p = [v] * (self._w * self._h)
    def _shift(self, dx, dy):
        img = Image(self._w, self._h)
        for y in range(self._h):
            for x in range(self._w):
                sx = x + dx; sy = y + dy
                if 0 <= sx < self._w and 0 <= sy < self._h:
                    img._p[y * self._w + x] = self._p[sy * self._w + sx]
        return img
    def shift_left(self, n): return self._shift(n, 0)
    def shift_right(self, n): return self._shift(-n, 0)
    def shift_up(self, n): return self._shift(0, n)
    def shift_down(self, n): return self._shift(0, -n)
    def _leds(self):
        out = []
        for y in range(5):
            for x in range(5):
                out.append(self._p[y * self._w + x] if x < self._w and y < self._h else 0)
        return out
    def __add__(self, other):
        return Image(self._w, self._h, [min(9, a + b) for a, b in zip(self._p, other._p)])
    def __mul__(self, k):
        return Image(self._w, self._h, [min(9, int(a * k)) for a in self._p])
    def __repr__(self):
        rows = []
        for y in range(self._h):
            rows.append(''.join([str(self._p[y * self._w + x]) for x in range(self._w)]))
        return "Image('" + ':'.join(rows) + ":')"

${imageConsts()}

class _Display:
    def show(self, v, delay=400, wait=True, loop=False, clear=False):
        while True:
            if isinstance(v, Image):
                _c('show_leds', v._leds())
            elif isinstance(v, (int, float, str)):
                s = str(v)
                if len(s) == 1:
                    _c('show_char', s)
                else:
                    for ch in s:
                        _c('show_char', ch)
                        _c('sleep', delay)
            else:
                for item in v:
                    if isinstance(item, Image):
                        _c('show_leds', item._leds())
                    else:
                        _c('show_char', str(item))
                    _c('sleep', delay)
            if not loop:
                break
        if clear:
            _c('sleep', delay)
            _c('clear')
    def scroll(self, v, delay=150, wait=True, loop=False, monospace=False):
        _c('scroll', str(v), delay, wait, loop)
    def clear(self): _c('clear')
    def set_pixel(self, x, y, v): _c('set_pixel', x, y, v)
    def get_pixel(self, x, y): return _c('get_pixel', x, y)
    def on(self): pass
    def off(self): pass
    def is_on(self): return True
    def read_light_level(self): return _c('light_level')

display = _Display()

class _Button:
    def __init__(self, n): self._n = n
    def is_pressed(self): return _c('btn_is', self._n)
    def was_pressed(self): return _c('btn_was', self._n)
    def get_presses(self): return _c('btn_presses', self._n)

button_a = _Button('A')
button_b = _Button('B')

class MicroBitPin:
    NO_PULL = 0
    PULL_UP = 1
    PULL_DOWN = 2
    def __init__(self, n): self._n = n
    def write_digital(self, v): _c('dw', self._n, v)
    def read_digital(self): return _c('dr', self._n)
    def write_analog(self, v): _c('aw', self._n, v)
    def read_analog(self): return _c('ar', self._n)
    def set_analog_period(self, ms): pass
    def set_analog_period_microseconds(self, us): pass
    def is_touched(self): return _c('touch', self._n)
    def set_pull(self, p): pass
    def get_pull(self): return 0

${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20].map((i) => `pin${i} = MicroBitPin(${i})`).join('\n')}
pin_logo = MicroBitPin('logo')

def sleep(ms): _c('sleep', ms)
def running_time(): return _c('running_time')
def temperature(): return _c('temperature')
def panic(n=0): raise RuntimeError('panic ' + str(n))
def reset(): raise SystemExit('reset')

class _Accel:
    def get_x(self): return _c('accel', 'x')
    def get_y(self): return _c('accel', 'y')
    def get_z(self): return _c('accel', 'z')
    def get_values(self): return (self.get_x(), self.get_y(), self.get_z())
    def get_strength(self): return _c('accel', 's')
    def current_gesture(self): return _c('gesture')
    def is_gesture(self, g): return _c('gesture') == g
    def was_gesture(self, g): return _c('was_gesture', g)
    def get_gestures(self): return ()
accelerometer = _Accel()

class _Compass:
    def heading(self): return _c('heading')
    def calibrate(self): pass
    def is_calibrated(self): return True
    def clear_calibration(self): pass
    def get_field_strength(self): return 40000
    def get_x(self): return 0
    def get_y(self): return 0
    def get_z(self): return 0
compass = _Compass()

class _I2C:
    def init(self, freq=100000, sda=None, scl=None): pass
    def scan(self): return [16]
    def write(self, addr, buf, repeat=False): _c('i2c_w', addr, list(buf))
    def read(self, addr, n, repeat=False): return bytes(_c('i2c_r', addr, n))
i2c = _I2C()

class _Uart:
    def init(self, baudrate=9600, bits=8, parity=None, stop=1, tx=None, rx=None): pass
    def write(self, s): _c('serial', str(s))
    def any(self): return False
    def read(self, n=None): return None
    def readline(self): return None
uart = _Uart()

class _Speaker:
    def on(self): pass
    def off(self): pass
speaker = _Speaker()
`;

  const MUSIC_PY = () => `
import _hw
_c = _hw.hwcall
${Object.entries(A.MELODIES).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n')}
def play(music, pin=None, wait=True, loop=False):
    if isinstance(music, str):
        music = [music]
    _c('melody', list(music), wait, loop)
def pitch(frequency, duration=-1, pin=None, wait=True):
    _c('pitch', frequency, duration, wait)
def stop(pin=None):
    _c('music_stop')
def set_tempo(ticks=4, bpm=120):
    _c('set_tempo', ticks, bpm)
def get_tempo():
    return tuple(_c('get_tempo'))
def reset():
    _c('set_tempo', 4, 120)
`;

  const NEOPIXEL_PY = `
import _hw
class NeoPixel:
    def __init__(self, pin, n, bpp=3):
        self._pin = pin
        self.n = n
        self._buf = [(0, 0, 0)] * n
    def __setitem__(self, i, c):
        self._buf[i] = tuple(c)
    def __getitem__(self, i):
        return self._buf[i]
    def __len__(self):
        return self.n
    def show(self):
        _hw.hwcall('np_show', self._pin._n, [list(c) for c in self._buf])
    def clear(self):
        self._buf = [(0, 0, 0)] * self.n
        self.show()
    def fill(self, c):
        self._buf = [tuple(c)] * self.n
    def write(self):
        self.show()
`;

  const TIME_PY = `
import _hw
_c = _hw.hwcall
def sleep(s): _c('sleep', s * 1000)
def sleep_ms(ms): _c('sleep', ms)
def sleep_us(us): _c('sleep', us / 1000)
def ticks_ms(): return _c('running_time')
def ticks_us(): return _c('ticks_us')
def ticks_add(a, b): return a + b
def ticks_diff(a, b): return a - b
def time(): return _c('running_time') // 1000
def time_ns(): return _c('ticks_us') * 1000
def monotonic(): return _c('running_time') / 1000
`;

  const MACHINE_PY = `
import _hw
def time_pulse_us(pin, pulse_level, timeout_us=1000000):
    return _hw.hwcall('pulse_in', pin._n, pulse_level, timeout_us)
def freq(): return 64000000
def reset(): raise SystemExit('reset')
def unique_id(): return b'MQSIM'
`;

  const MAQUEEN_PY = `
# 마퀸(Maqueen) 제어 라이브러리 - 실제 하드웨어와 동일한 I2C/핀 방식으로 동작합니다.
from microbit import i2c, pin1, pin2, pin8, pin12, pin13, pin14, pin15
import machine
import utime
import _hw

I2C_ADDR = 0x10
M1 = 0          # 왼쪽 모터
M2 = 1          # 오른쪽 모터
ALL = 2
LEFT = 0
RIGHT = 1
CW = 0          # 전진 방향
CCW = 1         # 후진 방향
FORWARD = 0
BACKWARD = 1
S1 = 0
S2 = 1
ON = 1
OFF = 0

def motor_run(motor, direction, speed):
    speed = max(0, min(255, int(speed)))
    if motor == M1 or motor == ALL:
        i2c.write(I2C_ADDR, bytearray([0x00, direction, speed]))
    if motor == M2 or motor == ALL:
        i2c.write(I2C_ADDR, bytearray([0x02, direction, speed]))

def motor_stop(motor=ALL):
    motor_run(motor, CW, 0)

def forward(speed=150):
    motor_run(ALL, CW, speed)

def backward(speed=150):
    motor_run(ALL, CCW, speed)

def turn_left(speed=100):
    motor_run(M1, CCW, speed)
    motor_run(M2, CW, speed)

def turn_right(speed=100):
    motor_run(M1, CW, speed)
    motor_run(M2, CCW, speed)

def stop():
    motor_stop(ALL)

def ultrasonic():
    # 트리거(P1)에 10us 펄스 -> 에코(P2) 펄스 길이로 거리 계산
    pin1.write_digital(1)
    utime.sleep_us(10)
    pin1.write_digital(0)
    t = machine.time_pulse_us(pin2, 1, 30000)
    if t < 0:
        return 500
    return int(t / 58)

def read_patrol(side):
    if side == LEFT:
        return pin13.read_digital()
    return pin14.read_digital()

def line_left():
    return pin13.read_digital()

def line_right():
    return pin14.read_digital()

def write_led(side, state):
    if side == LEFT:
        pin8.write_digital(state)
    else:
        pin12.write_digital(state)

def servo_run(servo, angle):
    angle = max(0, min(180, int(angle)))
    i2c.write(I2C_ADDR, bytearray([0x14 if servo == S1 else 0x15, angle]))

def ir_read():
    return _hw.hwcall('ir_read')

def ir_available():
    return _hw.hwcall('ir_new')
`;

  function files() {
    return {
      'src/lib/microbit.py': MICROBIT_PY,
      'src/lib/microbit/__init__.py': MICROBIT_PY,
      'src/lib/music.py': MUSIC_PY(),
      'src/lib/neopixel.py': NEOPIXEL_PY,
      'src/lib/utime.py': TIME_PY,
      'src/lib/time.py': TIME_PY,
      'src/lib/machine.py': MACHINE_PY,
      'src/lib/maqueen.py': MAQUEEN_PY,
      'src/lib/_hw.js': 'var $builtinmodule = ' + nativeModule.toString().replace(/^function nativeModule/, 'function'),
    };
  }

  let installed = false;
  function install() {
    if (installed) return;
    installed = true;
    const f = files();
    const bf = (Sk.builtinFiles = Sk.builtinFiles || { files: {} });
    delete bf.files['src/lib/time.js'];
    Object.assign(bf.files, f);
  }

  function readFile(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) throw new Error("File not found: '" + x + "'");
    return Sk.builtinFiles.files[x];
  }

  function fmtError(e) {
    if (e instanceof Sk.builtin.BaseException) {
      let s = e.toString();
      if (e.traceback && e.traceback.length) {
        const tb = e.traceback[0];
        if (tb && tb.lineno && !/line \d+/.test(s)) s += ` (${tb.lineno}번째 줄)`;
      }
      return s;
    }
    return String((e && e.message) || e);
  }

  MQ.pyrt = {
    run(code, { onError, onDone }) {
      install();
      const c = { stopped: false };
      ctx = c;
      Sk.configure({
        output: (t) => hw.serialWrite(t),
        read: readFile,
        __future__: Sk.python3,
        yieldLimit: 12,
        execLimit: null,
        killableWhile: true,
        killableFor: true,
      });
      if (!Sk.builtins.bytearray) Sk.builtins.bytearray = Sk.builtins.list;
      Sk.inputfun = () => '';
      const handler = { '*': () => (c.stopped ? Promise.reject(new MQ.StopSignal()) : null) };
      Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, code, true), handler)
        .then(() => { if (!c.stopped) onDone && onDone(); })
        .catch((e) => {
          if (c.stopped) return;
          if (e && e.isStop) return;
          onError(new Error(fmtError(e)));
        });
      return { stop() { c.stopped = true; if (ctx === c) ctx = null; } };
    },
  };
})();
