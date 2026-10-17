/* 예제 모음: 블록 DSL -> Blockly XML. JavaScript/MicroPython 은 블록에서 자동 생성 */
(function () {
  // ---------- DSL ----------
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function B(type, o) { return Object.assign({ type, f: {}, v: {}, s: {}, m: '' }, o || {}); }
  function link(list) {
    const arr = list.flat().filter(Boolean);
    for (let i = 0; i < arr.length - 1; i++) arr[i].next = arr[i + 1];
    return arr[0] || null;
  }
  function valXml(x) {
    if (typeof x === 'number') return `<shadow type="math_number"><field name="NUM">${x}</field></shadow>`;
    if (typeof x === 'string') return `<shadow type="text"><field name="TEXT">${esc(x)}</field></shadow>`;
    return xml(x);
  }
  function xml(b, pos) {
    if (!b) return '';
    let s = `<block type="${b.type}"${pos ? ` x="${pos[0]}" y="${pos[1]}"` : ''}>`;
    if (b.m) s += b.m;
    for (const [k, v] of Object.entries(b.f)) s += `<field name="${k}">${esc(v)}</field>`;
    for (const [k, v] of Object.entries(b.v)) if (v !== undefined && v !== null) s += `<value name="${k}">${valXml(v)}</value>`;
    for (const [k, v] of Object.entries(b.s)) { const first = link(Array.isArray(v) ? v : [v]); if (first) s += `<statement name="${k}">${xml(first)}</statement>`; }
    if (b.next) s += `<next>${xml(b.next)}</next>`;
    return s + '</block>';
  }
  function program(...tops) {
    let y = 20, x = 20;
    const parts = tops.filter(Boolean).map((t) => { const s = xml(t, [x, y]); y += 60 + estimate(t) * 26; return s; });
    return `<xml xmlns="https://developers.google.com/blockly/xml">${parts.join('')}</xml>`;
  }
  function estimate(b) { if (!b) return 0; let n = 1; Object.values(b.s).forEach((v) => (n += (Array.isArray(v) ? v.flat() : [v]).reduce((a, c) => a + estimate(c), 0))); return n + (b.next ? estimate(b.next) : 0); }

  const onStart = (...s) => B('mb_on_start', { s: { DO: s } });
  const forever = (...s) => B('mb_forever', { s: { DO: s } });
  const onButton = (btn, ...s) => B('mb_on_button', { f: { BTN: btn }, s: { DO: s } });
  const onShake = (...s) => B('mb_on_shake', { s: { DO: s } });
  const onIR = (...s) => B('mq_on_ir', { s: { DO: s } });
  const showNum = (n) => B('mb_show_number', { v: { NUM: n } });
  const showStr = (t) => B('mb_show_string', { v: { TEXT: t } });
  const icon = (n) => B('mb_show_icon', { f: { ICON: n } });
  const arrow = (d) => B('mb_show_arrow', { f: { DIR: String(d) } });
  const leds = (rows) => { const f = {}; rows.split(/\s+/).forEach((r, y) => [...r].forEach((c, x) => (f[`P${y}${x}`] = c === '#' ? 'TRUE' : 'FALSE'))); return B('mb_show_leds', { f }); };
  const clear = () => B('mb_clear');
  const pause = (ms) => B('mb_pause', { v: { MS: ms } });
  const plot = (x, y) => B('mb_plot', { v: { X: x, Y: y } });
  const unplot = (x, y) => B('mb_unplot', { v: { X: x, Y: y } });
  const motor = (m, dir, sp) => B('mq_motor_run', { f: { MOTOR: m, DIR: dir }, v: { SPEED: sp } });
  const fwd = (sp) => motor('All', 'CW', sp);
  const back = (sp) => motor('All', 'CCW', sp);
  const stop = (m) => B('mq_motor_stop', { f: { MOTOR: m || 'All' } });
  const us = () => B('mq_ultrasonic');
  const patrol = (side) => B('mq_read_patrol', { f: { SIDE: side === 'L' ? 'PatrolLeft' : 'PatrolRight' } });
  const redLed = (side, on) => B('mq_write_led', { f: { LED: side === 'L' ? 'LEDLeft' : 'LEDRight', STATE: on ? 'turnOn' : 'turnOff' } });
  const servo = (s, a) => B('mq_servo', { f: { SERVO: s }, v: { ANGLE: a } });
  const irVal = () => B('mq_ir_value');
  const rgbAll = (c) => B('mq_rgb_all', { f: { COLOR: c } });
  const rgbPix = (i, c) => B('mq_rgb_pixel', { f: { COLOR: c }, v: { IDX: i } });
  const rgbRainbow = () => B('mq_rgb_rainbow');
  const rgbClear = () => B('mq_rgb_clear');
  const rgbBright = (b) => B('mq_rgb_brightness', { v: { B: b } });
  const tone = (freq, beat) => B('mb_play_tone', { f: { NOTE: String(freq), BEAT: String(beat || 1) } });
  const freqTone = (f, ms) => B('mb_play_freq', { v: { FREQ: f, MS: ms } });
  const melody = (m, bg) => B('mb_melody', { f: { MELODY: m, MODE: bg ? 'bg' : 'once' } });
  const serialVal = (n, v) => B('mb_serial_value', { v: { NAME: n, VAL: v } });
  const serialLine = (t) => B('mb_serial_line', { v: { TEXT: t } });
  const num = (n) => B('math_number', { f: { NUM: n } });
  const txt = (t) => B('text', { f: { TEXT: t } });
  const cmp = (a, op, b) => B('logic_compare', { f: { OP: { '==': 'EQ', '!=': 'NEQ', '<': 'LT', '<=': 'LTE', '>': 'GT', '>=': 'GTE' }[op] }, v: { A: a, B: b } });
  const and = (a, b) => B('logic_operation', { f: { OP: 'AND' }, v: { A: a, B: b } });
  const or = (a, b) => B('logic_operation', { f: { OP: 'OR' }, v: { A: a, B: b } });
  const arith = (a, op, b) => B('math_arithmetic', { f: { OP: { '+': 'ADD', '-': 'MINUS', '*': 'MULTIPLY', '/': 'DIVIDE' }[op] }, v: { A: a, B: b } });
  const rand = (a, b) => B('math_random_int', { v: { FROM: a, TO: b } });
  const constrain = (val, lo, hi) => B('math_constrain', { v: { VALUE: val, LOW: lo, HIGH: hi } });
  const round = (val) => B('math_round', { f: { OP: 'ROUND' }, v: { NUM: val } });
  const getV = (n) => B('variables_get', { f: { VAR: n } });
  const setV = (n, val) => B('variables_set', { f: { VAR: n }, v: { VALUE: val } });
  const changeV = (n, by) => B('math_change', { f: { VAR: n }, v: { DELTA: by } });
  const repeat = (n, ...s) => B('controls_repeat_ext', { v: { TIMES: n }, s: { DO: s } });
  const whileDo = (cond, ...s) => B('controls_whileUntil', { f: { MODE: 'WHILE' }, v: { BOOL: cond }, s: { DO: s } });
  const forRange = (v, from, to, ...s) => B('controls_for', { f: { VAR: v }, v: { FROM: from, TO: to, BY: 1 }, s: { DO: s } });
  const btnPressed = (b) => B('mb_button_pressed', { f: { BTN: b } });
  // if / else if / else : ifs([cond, [stmts]], [cond, [stmts]], ..., [elseStmts]?)
  function ifs(...branches) {
    let elseBody = null;
    if (branches.length && !Array.isArray(branches[branches.length - 1][1]) && Array.isArray(branches[branches.length - 1])) {
      // 마지막 항목이 [stmts] 형태(조건 없음)면 else
    }
    const conds = [];
    branches.forEach((br) => { if (br.else) elseBody = br.else; else conds.push(br); });
    const b = B('controls_if', { m: `<mutation elseif="${conds.length - 1}" else="${elseBody ? 1 : 0}"></mutation>` });
    conds.forEach(([c, s], i) => { b.v['IF' + i] = c; b.s['DO' + i] = s; });
    if (elseBody) b.s.ELSE = elseBody;
    return b;
  }
  const ELSE = (...s) => ({ else: s });
  const defFn = (name, ...s) => B('procedures_defnoreturn', { f: { NAME: name }, s: { STACK: s } });
  const callFn = (name) => B('procedures_callnoreturn', { m: `<mutation name="${esc(name)}"></mutation>` });

  // 음 주파수
  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523 };
  const H = 2, Q = 4; // 박자 코드

  const ex = [];
  const add = (o) => ex.push(o);

  // =============== 기본: micro:bit ===============
  add({ id: 'heart', group: '기본 · micro:bit', name: '하트 깜박이기', map: 'open',
    desc: 'LED 스크린에 큰 하트와 작은 하트를 번갈아 표시합니다.',
    xml: program(forever(icon('HEART'), pause(300), icon('SMALL_HEART'), pause(300))) });
  add({ id: 'scroll', group: '기본 · micro:bit', name: '문자열 스크롤', map: 'open',
    desc: '시작하면 인사말을 흘려 보여 주고, 무한 반복으로 숫자를 출력합니다.',
    xml: program(onStart(showStr('Hello Maqueen!'), icon('HAPPY')), forever(showNum(2024), pause(500))) });
  add({ id: 'buttons', group: '기본 · micro:bit', name: '버튼 A/B 입력', map: 'open',
    desc: 'A 버튼은 웃는 얼굴, B 버튼은 슬픈 얼굴, A+B 버튼은 하트를 표시합니다. 시뮬레이터 아래의 micro:bit 버튼(또는 키보드 A/B)을 눌러 보세요.',
    xml: program(onButton('A', icon('HAPPY')), onButton('B', icon('SAD')), onButton('AB', icon('HEART'), showStr('A+B'))) });
  add({ id: 'counter', group: '기본 · micro:bit', name: '숫자 카운터 (변수)', map: 'open',
    desc: '변수를 사용해 A 버튼은 +1, B 버튼은 -1 을 하고 현재 값을 표시합니다.',
    xml: program(onStart(setV('count', 0), showNum(getV('count'))), onButton('A', changeV('count', 1), showNum(getV('count'))), onButton('B', changeV('count', -1), showNum(getV('count')))) });
  add({ id: 'ledplot', group: '기본 · micro:bit', name: 'LED 그리기와 점 이동', map: 'open',
    desc: 'LED 출력 블록으로 그림을 그리고, 반복문으로 점이 한 줄씩 지나가게 합니다.',
    xml: program(onStart(leds('.#.#. ##### ##### .###. ..#..'), pause(800), clear()),
      forever(forRange('y', 0, 4, forRange('x', 0, 4, plot(getV('x'), getV('y')), pause(60), unplot(getV('x'), getV('y')))))) });
  add({ id: 'music', group: '기본 · micro:bit', name: '음악 연주 (부저)', map: 'open',
    desc: '도레미파솔라시도를 연주하고, A 버튼을 누르면 생일 축하 멜로디를 연주합니다. (상단 소리 버튼이 켜져 있어야 들립니다)',
    xml: program(onStart(tone(N.C4, H), tone(N.D4, H), tone(N.E4, H), tone(N.F4, H), tone(N.G4, H), tone(N.A4, H), tone(N.B4, H), tone(N.C5, 1)), onButton('A', melody('BIRTHDAY'))) });
  add({ id: 'dice', group: '기본 · micro:bit', name: '흔들어 주사위', map: 'open',
    desc: '흔들기(시뮬레이터의 "흔들기" 버튼)를 하면 1~6 사이 난수를 표시합니다.',
    xml: program(onStart(showStr('Shake!')), onShake(setV('dice', rand(1, 6)), showNum(getV('dice')), freqTone(880, 100))) });
  add({ id: 'compass', group: '기본 · micro:bit', name: '나침반 (로봇 방향)', map: 'open',
    desc: '나침반 센서 값(로봇이 향한 방향)을 읽어 북쪽을 화살표로 표시합니다. 로봇을 Shift+드래그 하여 회전시켜 보세요.',
    xml: program(forever(setV('heading', B('mb_compass')), serialVal('heading', getV('heading')),
      ifs([or(cmp(getV('heading'), '<', 45), cmp(getV('heading'), '>', 315)), [arrow(0)]],
        [cmp(getV('heading'), '<', 135), [arrow(6)]],
        [cmp(getV('heading'), '<', 225), [arrow(4)]],
        ELSE(arrow(2))))) });
  add({ id: 'envsensor', group: '기본 · micro:bit', name: '빛 · 온도 센서 → 시리얼', map: 'open',
    desc: '빛 센서와 온도 센서 값을 시리얼로 출력합니다. 아래 "환경" 슬라이더를 조절해 보세요.',
    xml: program(forever(serialVal('light', B('mb_light_level')), serialVal('temp', B('mb_temperature')),
      ifs([cmp(B('mb_light_level'), '<', 60), [icon('ASLEEP')]], ELSE(icon('HAPPY'))), pause(500))) });

  // =============== 기본: 마퀸 부품 ===============
  add({ id: 'motor_basic', group: '기본 · 마퀸 부품', name: '모터: 전진과 후진', map: 'open',
    desc: '1초 전진 → 정지 → 1초 후진 → 정지를 반복합니다. 모터 속도는 0~255 입니다.',
    xml: program(forever(arrow(0), fwd(150), pause(1000), stop(), pause(500), arrow(4), back(150), pause(1000), stop(), pause(500))) });
  add({ id: 'motor_turn', group: '기본 · 마퀸 부품', name: '모터: 좌회전 · 우회전 · 제자리 회전', map: 'open',
    desc: '한쪽 바퀴만 돌리면 완만하게, 두 바퀴를 반대로 돌리면 제자리에서 회전합니다.',
    xml: program(onStart(
      showStr('L'), motor('M1', 'CW', 40), motor('M2', 'CW', 150), pause(1500), stop(), pause(300),
      showStr('R'), motor('M1', 'CW', 150), motor('M2', 'CW', 40), pause(1500), stop(), pause(300),
      showStr('S'), motor('M1', 'CW', 120), motor('M2', 'CCW', 120), pause(2000), stop(), icon('YES'))) });
  add({ id: 'motor_square', group: '기본 · 마퀸 부품', name: '모터: 정사각형 그리기', map: 'open',
    desc: '직진과 90° 회전을 4번 반복해 정사각형 경로를 그립니다. 주행 궤적(주황색 선)을 확인하세요.',
    xml: program(onStart(repeat(4, fwd(150), pause(2000), stop(), pause(200), motor('M1', 'CW', 80), motor('M2', 'CCW', 80), pause(644), stop(), pause(200)), icon('YES'))) });
  add({ id: 'redled', group: '기본 · 마퀸 부품', name: '빨간 LED 번갈아 깜박이기', map: 'open',
    desc: '앞쪽의 빨간 LED(P8 왼쪽, P12 오른쪽)를 번갈아 켭니다. 경찰차처럼!',
    xml: program(forever(redLed('L', true), redLed('R', false), pause(300), redLed('L', false), redLed('R', true), pause(300))) });
  add({ id: 'rgb', group: '기본 · 마퀸 부품', name: 'RGB LED 무지개', map: 'open',
    desc: '바닥의 RGB LED 4개(P15 네오픽셀)로 여러 색을 표시합니다.',
    xml: program(onStart(rgbBright(200)), forever(rgbAll('Red'), pause(500), rgbAll('Green'), pause(500), rgbAll('Blue'), pause(500),
      rgbRainbow(), pause(1000), forRange('i', 0, 3, rgbClear(), rgbPix(getV('i'), 'Yellow'), pause(250)))) });
  add({ id: 'servo', group: '기본 · 마퀸 부품', name: '서보모터 S1/S2 움직이기', map: 'open',
    desc: '서보 포트 S1, S2 의 각도를 0°~180° 로 바꿉니다. 로봇 뒤쪽의 흰색 서보 혼과 상태창을 확인하세요.',
    xml: program(forever(servo('S1', 0), servo('S2', 180), pause(800), servo('S1', 90), servo('S2', 90), pause(800), servo('S1', 180), servo('S2', 0), pause(800))) });
  add({ id: 'ultra', group: '기본 · 마퀸 부품', name: '초음파 센서 거리 측정', map: 'obstacles',
    desc: '초음파 센서로 앞 물체까지의 거리(cm)를 측정해 표시합니다. 로봇을 드래그해 장애물 앞에 놓아 보세요.',
    xml: program(forever(setV('distance', us()), serialVal('distance', getV('distance')), showNum(getV('distance')), pause(200))) });
  add({ id: 'linesensor', group: '기본 · 마퀸 부품', name: '라인 센서 값 확인', map: 'line_oval',
    desc: '라인 센서가 검은 선을 감지하면 1, 흰 바닥이면 0 입니다. 감지 결과를 빨간 LED 와 LED 스크린에 표시합니다. 로봇을 드래그해 선 위로 옮겨 보세요.',
    xml: program(forever(setV('L', patrol('L')), setV('R', patrol('R')),
      ifs([cmp(getV('L'), '==', 1), [redLed('L', true), plot(4, 2)]], ELSE(redLed('L', false), unplot(4, 2))),
      ifs([cmp(getV('R'), '==', 1), [redLed('R', true), plot(0, 2)]], ELSE(redLed('R', false), unplot(0, 2))),
      serialLine(B('text_join', { m: '<mutation items="4"></mutation>', v: { ADD0: 'L=', ADD1: getV('L'), ADD2: ' R=', ADD3: getV('R') } })), pause(200))) });
  add({ id: 'ir', group: '기본 · 마퀸 부품', name: 'IR 리모컨으로 조종', map: 'open',
    desc: '아래 IR 리모컨의 ▲(전진) ▼(후진) |◀◀(좌회전) ▶▶|(우회전) ▶||(정지) 버튼으로 로봇을 조종합니다.',
    xml: program(onStart(icon('HAPPY')), onIR(setV('code', irVal()), showNum(getV('code')),
      ifs([cmp(getV('code'), '==', 10), [fwd(150)]], [cmp(getV('code'), '==', 8), [back(150)]],
        [cmp(getV('code'), '==', 4), [motor('M1', 'CCW', 80), motor('M2', 'CW', 80)]],
        [cmp(getV('code'), '==', 6), [motor('M1', 'CW', 80), motor('M2', 'CCW', 80)]],
        [cmp(getV('code'), '==', 5), [stop()]]))) });
  add({ id: 'btn_drive', group: '기본 · 마퀸 부품', name: '버튼으로 출발 / 정지', map: 'open',
    desc: 'A 버튼을 누르면 출발, B 버튼을 누르면 정지합니다.',
    xml: program(onStart(icon('ASLEEP')), onButton('A', arrow(0), rgbAll('Green'), fwd(120)), onButton('B', icon('NO'), rgbAll('Red'), stop())) });

  // =============== 주행 응용 ===============
  add({ id: 'obstacle_stop', group: '주행 응용 (초음파)', name: '장애물 앞에서 정지', map: 'obstacles',
    desc: '앞으로 가다가 15cm 이내에 장애물이 있으면 멈추고 경고음을 냅니다. 장애물을 치우면(로봇을 옮기면) 다시 출발합니다.',
    xml: program(forever(ifs([cmp(us(), '<', 15), [stop(), redLed('L', true), redLed('R', true), rgbAll('Red'), freqTone(880, 100)]],
      ELSE(redLed('L', false), redLed('R', false), rgbAll('Green'), fwd(120))))) });
  add({ id: 'avoid', group: '주행 응용 (초음파)', name: '장애물 회피 주행', map: 'obstacles',
    desc: '전진하다 20cm 이내에 장애물이 나타나면 후진 후 무작위 방향으로 회전하여 피합니다.',
    xml: program(onStart(showStr('GO')), forever(setV('distance', us()),
      ifs([cmp(getV('distance'), '<', 20), [stop(), icon('SURPRISED'), back(100), pause(500),
        ifs([cmp(rand(0, 1), '==', 0), [motor('M1', 'CCW', 100), motor('M2', 'CW', 100)]], ELSE(motor('M1', 'CW', 100), motor('M2', 'CCW', 100))),
        pause(rand(300, 700)), stop()]], ELSE(icon('HAPPY'), fwd(140))))) });
  add({ id: 'explore', group: '주행 응용 (초음파)', name: '방 탐색 (벽 만나면 회전)', map: 'rooms',
    desc: '격벽 공간을 돌아다니며 벽을 만나면 오른쪽으로 회전합니다. 회전 각도를 조금씩 바꿔 여러 방을 탐색합니다.',
    xml: program(onStart(setV('turn', 500)), forever(
      ifs([cmp(us(), '<', 18), [stop(), back(100), pause(300), motor('M1', 'CW', 100), motor('M2', 'CCW', 100), pause(getV('turn')), stop(),
        changeV('turn', 120), ifs([cmp(getV('turn'), '>', 1100), [setV('turn', 450)]])]], ELSE(fwd(150))))) });
  add({ id: 'keep_dist', group: '주행 응용 (초음파)', name: '거리 유지하기 (비례 제어)', map: 'obstacles',
    desc: '앞 물체와 20cm 거리를 유지합니다. 멀면 전진, 가까우면 후진하며 오차에 비례해 속도를 조절합니다. 로봇을 드래그해 보세요.',
    xml: program(forever(setV('error', arith(us(), '-', 20)), setV('speed', constrain(arith(getV('error'), '*', 12), -200, 200)),
      ifs([cmp(getV('speed'), '>', 0), [fwd(getV('speed'))]], ELSE(back(arith(0, '-', getV('speed'))))), serialVal('error', getV('error')))) });
  add({ id: 'parking', group: '주행 응용 (초음파)', name: '거리 경보기 (소리 + 색)', map: 'obstacles',
    desc: '주차 센서처럼 물체가 가까울수록 빨간색, 멀수록 초록색으로 표시하고 경고음 간격을 줄입니다.',
    xml: program(forever(setV('d', us()),
      ifs([cmp(getV('d'), '<', 10), [rgbAll('Red'), freqTone(1000, 80), pause(40)]],
        [cmp(getV('d'), '<', 25), [rgbAll('Yellow'), freqTone(800, 80), pause(250)]],
        [cmp(getV('d'), '<', 50), [rgbAll('Green'), freqTone(600, 80), pause(600)]],
        ELSE(rgbClear(), pause(100))))) });
  add({ id: 'maze_right', group: '주행 응용 (초음파)', name: '미로 탈출 (오른손 법칙)', map: 'maze',
    desc: '한 칸(40cm) 단위로 움직이며 오른쪽 → 앞 → 왼쪽 → 뒤 순서로 길이 있는지 확인하는 오른손 법칙으로 미로를 탈출합니다. (시뮬레이션 속도를 4배로 올려 보세요)',
    xml: program(
      defFn('turn_right', motor('M1', 'CW', 80), motor('M2', 'CCW', 80), pause(644), stop(), pause(150)),
      defFn('turn_left', motor('M1', 'CCW', 80), motor('M2', 'CW', 80), pause(644), stop(), pause(150)),
      defFn('forward_cell', fwd(120), pause(3035), stop(), pause(150)),
      onStart(icon('HAPPY'), pause(500)),
      forever(
        callFn('turn_right'),
        ifs([cmp(us(), '>', 30), [arrow(2), callFn('forward_cell')]],
          ELSE(callFn('turn_left'),
            ifs([cmp(us(), '>', 30), [arrow(0), callFn('forward_cell')]],
              ELSE(callFn('turn_left'),
                ifs([cmp(us(), '>', 30), [arrow(6), callFn('forward_cell')]],
                  ELSE(arrow(4), callFn('turn_left'), callFn('forward_cell'))))))))) });
  add({ id: 'corridor_run', group: '주행 응용 (초음파)', name: '복도 주행 (벽 만나면 방향 탐색)', map: 'corridor',
    desc: '복도를 따라 전진하다 벽을 만나면 좌우를 둘러보고 더 넓은 쪽으로 회전합니다.',
    xml: program(forever(
      ifs([cmp(us(), '<', 20), [stop(), pause(200),
        motor('M1', 'CW', 80), motor('M2', 'CCW', 80), pause(644), stop(), pause(200), setV('right', us()),
        motor('M1', 'CCW', 80), motor('M2', 'CW', 80), pause(1288), stop(), pause(200), setV('left', us()),
        ifs([cmp(getV('right'), '>', getV('left')), [motor('M1', 'CW', 80), motor('M2', 'CCW', 80), pause(1288), stop()]])]],
      ELSE(fwd(150))))) });

  // =============== 라인트레이싱 ===============
  const LT_BASIC = (sp, slow) => forever(setV('L', patrol('L')), setV('R', patrol('R')),
    ifs([and(cmp(getV('L'), '==', 1), cmp(getV('R'), '==', 1)), [fwd(sp)]],
      [and(cmp(getV('L'), '==', 1), cmp(getV('R'), '==', 0)), [motor('M1', 'CW', slow), motor('M2', 'CW', sp)]],
      [and(cmp(getV('L'), '==', 0), cmp(getV('R'), '==', 1)), [motor('M1', 'CW', sp), motor('M2', 'CW', slow)]]));
  add({ id: 'line_basic', group: '라인트레이싱', name: '기본 라인트레이싱', map: 'line_oval',
    desc: '두 라인 센서가 모두 검은색이면 직진, 왼쪽만 검은색이면 좌회전, 오른쪽만 검은색이면 우회전합니다.',
    xml: program(onStart(icon('HAPPY')), LT_BASIC(100, 0)) });
  add({ id: 'line_smooth', group: '라인트레이싱', name: '부드러운 라인트레이싱', map: 'line_curve',
    desc: '회전할 때 안쪽 바퀴를 멈추지 않고 느리게 돌려 부드럽게 곡선을 따라갑니다. 선을 놓치면 마지막 방향으로 찾습니다.',
    xml: program(onStart(setV('last', 0)), forever(setV('L', patrol('L')), setV('R', patrol('R')),
      ifs([and(cmp(getV('L'), '==', 1), cmp(getV('R'), '==', 1)), [fwd(130), rgbAll('Green')]],
        [cmp(getV('L'), '==', 1), [motor('M1', 'CW', 30), motor('M2', 'CW', 130), setV('last', 1), rgbAll('Blue')]],
        [cmp(getV('R'), '==', 1), [motor('M1', 'CW', 130), motor('M2', 'CW', 30), setV('last', 2), rgbAll('Yellow')]],
        ELSE(rgbAll('Red'), ifs([cmp(getV('last'), '==', 1), [motor('M1', 'CCW', 60), motor('M2', 'CW', 90)]], ELSE(motor('M1', 'CW', 90), motor('M2', 'CCW', 60))))))) });
  add({ id: 'line_corner', group: '라인트레이싱', name: '직각 코너 라인트레이싱', map: 'line_square',
    desc: '직각 코너에서는 두 센서가 동시에 선을 벗어나 어느 쪽으로 꺾였는지 알 수 없습니다. 그래서 선을 잃으면 멈춘 뒤 왼쪽으로 약 90° 돌며 선을 찾고, 없으면 오른쪽으로 돌며 다시 찾습니다.',
    xml: program(forever(setV('L', patrol('L')), setV('R', patrol('R')),
      ifs([and(cmp(getV('L'), '==', 1), cmp(getV('R'), '==', 1)), [fwd(90), redLed('L', false), redLed('R', false)]],
        [cmp(getV('L'), '==', 1), [motor('M1', 'CW', 0), motor('M2', 'CW', 100)]],
        [cmp(getV('R'), '==', 1), [motor('M1', 'CW', 100), motor('M2', 'CW', 0)]],
        ELSE(stop(), redLed('L', true), setV('t', 0),
          whileDo(and(and(cmp(patrol('L'), '==', 0), cmp(patrol('R'), '==', 0)), cmp(getV('t'), '<', 32)),
            motor('M1', 'CCW', 60), motor('M2', 'CW', 60), pause(20), changeV('t', 1)),
          ifs([and(cmp(patrol('L'), '==', 0), cmp(patrol('R'), '==', 0)), [redLed('L', false), redLed('R', true), setV('t', 0),
            whileDo(and(and(cmp(patrol('L'), '==', 0), cmp(patrol('R'), '==', 0)), cmp(getV('t'), '<', 85)),
              motor('M1', 'CW', 60), motor('M2', 'CCW', 60), pause(20), changeV('t', 1))]]),
          stop())))) });
  add({ id: 'line_obstacle', group: '라인트레이싱', name: '라인트레이싱 + 장애물 정지', map: 'line_obstacle',
    desc: '라인을 따라가다 앞에 장애물이 12cm 이내로 가까워지면 멈추고 경고합니다. 장애물을 피해 로봇을 옮기면 다시 출발합니다.',
    xml: program(forever(
      ifs([cmp(us(), '<', 12), [stop(), icon('NO'), rgbAll('Red'), freqTone(700, 100), pause(200)]],
        ELSE(rgbAll('Green'), setV('L', patrol('L')), setV('R', patrol('R')),
          ifs([and(cmp(getV('L'), '==', 1), cmp(getV('R'), '==', 1)), [fwd(100)]],
            [cmp(getV('L'), '==', 1), [motor('M1', 'CW', 0), motor('M2', 'CW', 100)]],
            [cmp(getV('R'), '==', 1), [motor('M1', 'CW', 100), motor('M2', 'CW', 0)]])))) ) });
  add({ id: 'line_count', group: '라인트레이싱', name: '가로선 세며 이동하기', map: 'line_grid', pose: { x: 75, y: 285, a: -90 },
    desc: '세로선 사이를 똑바로 올라가며 라인 센서로 가로선을 지날 때마다 수를 셉니다. 3번째 선을 지나면 멈춥니다. (선 위에 올라탄 순간만 세도록 상태 변수를 사용합니다)',
    xml: program(onStart(setV('count', 0), setV('onLine', 0), showNum(0), fwd(80)), forever(
      ifs([or(cmp(patrol('L'), '==', 1), cmp(patrol('R'), '==', 1)), [
        ifs([cmp(getV('onLine'), '==', 0), [setV('onLine', 1), changeV('count', 1), freqTone(988, 60),
          ifs([cmp(getV('count'), '>=', 3), [pause(250), stop(), icon('YES')]], ELSE(showNum(getV('count'))))]])]],
        ELSE(setV('onLine', 0))))) });
  add({ id: 'line_eight', group: '라인트레이싱', name: '8자 트랙 주행', map: 'line_eight',
    desc: '교차로가 있는 8자 트랙을 기본 라인트레이싱으로 주행합니다. 교차로에서는 두 센서가 모두 검은색이 되어 직진합니다.',
    xml: program(LT_BASIC(90, 10)) });
  add({ id: 'sumo', group: '라인트레이싱', name: '스모: 링 밖으로 나가지 않기', map: 'sumo',
    desc: '흰 링 안을 돌아다니다 라인 센서가 검은 테두리를 감지하면 후진 후 회전합니다.',
    xml: program(forever(
      ifs([or(cmp(patrol('L'), '==', 1), cmp(patrol('R'), '==', 1)), [rgbAll('Red'), back(120), pause(500), motor('M1', 'CW', 100), motor('M2', 'CCW', 100), pause(rand(300, 900))]],
        ELSE(rgbAll('Blue'), fwd(110))))) });

  // =============== 마퀸 V4 확장 블록 ===============
  const ltEvent = (side, vi, ...st) => B('mq_lt_event', { f: { SIDE: side === 'L' ? 'PatrolLeft' : 'PatrolRight', VI: vi }, s: { DO: st } });
  add({ id: 'lt_event', group: '라인트레이싱', name: '라인 센서 이벤트로 주행 (V4)', map: 'line_oval',
    desc: '"라인 트레이싱 센서 ~ 가 ~ 일 때" 이벤트 블록만으로 라인을 따라갑니다. 센서가 검은 선(높음)을 감지할 때마다 해당 방향으로 회전합니다.',
    xml: program(onStart(fwd(80)),
      ltEvent('L', 'High', motor('M1', 'CW', 0), motor('M2', 'CW', 90)),
      ltEvent('R', 'High', motor('M1', 'CW', 90), motor('M2', 'CW', 0)),
      ltEvent('L', 'Low', ifs([cmp(patrol('R'), '==', 0), [fwd(80)]]))) });

  // =============== 마퀸 V5 ===============
  const G5 = '마퀸 V5';
  const v5init = () => B('mq5_init');
  const v5patrol = (on) => B('mq5_patrolling', { f: { ONOFF: on ? 'ON' : 'OFF' } });
  const v5motor = (m, dir, sp) => B('mq5_motor_run', { f: { MOTOR: m, DIR: dir }, v: { SPEED: sp } });
  const v5stop = () => B('mq5_motor_stop', { f: { MOTOR: 'All' } });
  const v5us = () => B('mq5_ultrasonic');
  const v5line = (k) => B('mq5_read_patrol', { f: { PATROL: k } });
  const v5adc = (k) => B('mq5_read_patrol_data', { f: { PATROL: k } });
  const v5rgb = (t, c) => B('mq5_rgb', { f: { TYPE: t, COLOR: c } });
  const v5blink = (t, n, g, c) => B('mq5_rgb_blink', { f: { TYPE: t, GRADE: String(g), COLOR: c }, v: { NUM: n } });
  const v5grad = (t, g) => B('mq5_rgb_change', { f: { TYPE: t, GRADE: String(g) } });
  const v5off = (t) => B('mq5_rgb_off', { f: { TYPE: t } });
  const v5light = (t) => B('mq5_light', { f: { TYPE: t } });
  const v5batt = () => B('mq5_battery', { f: { BATT: 'Alkaline' } });
  const v5ver = () => B('mq5_version');

  add({ id: 'v5_lights', group: G5, name: 'V5: RGB 자동차 조명', map: 'open', model: 'v5',
    desc: '마퀸 V5 의 앞쪽 RGB 자동차 조명을 여러 색으로 켜고, 깜박임과 그라데이션 효과를 보여 줍니다.',
    xml: program(onStart(v5init(), showStr(v5ver())), forever(
      v5rgb('All', 'Red'), pause(700), v5rgb('Left', 'Green'), v5rgb('Right', 'Blue'), pause(700),
      v5blink('All', 4, 3, 'Yellow'), pause(1800), v5grad('All', 3), pause(3000), v5off('All'), pause(500))) });
  add({ id: 'v5_auto_patrol', group: G5, name: 'V5: 내장 라인 트레이싱', map: 'line_curve', model: 'v5',
    desc: '"라인 트레이싱 켜기" 블록 하나로 보드에 내장된 자동 라인 트레이싱을 시작합니다. A 버튼은 시작, B 버튼은 정지입니다.',
    xml: program(onStart(v5init(), icon('HAPPY')), onButton('A', v5rgb('All', 'Green'), v5patrol(true)), onButton('B', v5patrol(false), v5rgb('All', 'Red'))) });
  add({ id: 'v5_line3', group: G5, name: 'V5: 3센서 라인트레이싱', map: 'line_curve', model: 'v5',
    desc: 'L · M · R 세 개의 라인 센서를 이용합니다. 가운데(M)만 검은색이면 직진, 왼쪽/오른쪽 센서가 선을 감지하면 그쪽으로 회전합니다.',
    xml: program(onStart(v5init(), setV('last', 0)), forever(setV('L', v5line('L')), setV('M', v5line('M')), setV('R', v5line('R')),
      ifs([cmp(getV('L'), '==', 1), [v5motor('M1', 'CW', 20), v5motor('M2', 'CW', 120), setV('last', 1), v5rgb('Left', 'Yellow'), v5rgb('Right', 'Black')]],
        [cmp(getV('R'), '==', 1), [v5motor('M1', 'CW', 120), v5motor('M2', 'CW', 20), setV('last', 2), v5rgb('Left', 'Black'), v5rgb('Right', 'Yellow')]],
        [cmp(getV('M'), '==', 1), [v5motor('All', 'CW', 130), v5rgb('All', 'Green')]],
        ELSE(v5rgb('All', 'Red'), ifs([cmp(getV('last'), '==', 1), [v5motor('M1', 'CCW', 60), v5motor('M2', 'CW', 60)]], ELSE(v5motor('M1', 'CW', 60), v5motor('M2', 'CCW', 60))))))) });
  add({ id: 'v5_adc', group: G5, name: 'V5: 라인 센서 ADC 값 보기', map: 'line_oval', model: 'v5',
    desc: '라인 센서의 상태(0/1)와 아날로그(ADC) 값을 시리얼로 출력합니다. 로봇을 드래그해 선 위아래로 옮기며 값의 변화를 관찰하세요.',
    xml: program(onStart(v5init()), forever(serialVal('L', v5adc('L')), serialVal('M', v5adc('M')), serialVal('R', v5adc('R')),
      setV('state', arith(arith(arith(v5line('L'), '*', 100), '+', arith(v5line('M'), '*', 10)), '+', v5line('R'))), showNum(getV('state')), pause(300))) });
  add({ id: 'v5_light', group: G5, name: 'V5: 어두우면 전조등 켜기', map: 'open', model: 'v5',
    desc: '광센서 값이 낮으면(어두우면) 흰색 전조등을 켜고, 밝으면 끕니다. 아래 "환경" 탭의 빛 슬라이더를 움직여 보세요.',
    xml: program(onStart(v5init()), forever(setV('light', v5light('Left')), serialVal('light', getV('light')),
      ifs([cmp(getV('light'), '<', 300), [v5rgb('All', 'White'), icon('ASLEEP')]], ELSE(v5off('All'), icon('HAPPY'))), pause(200))) });
  add({ id: 'v5_battery', group: G5, name: 'V5: 배터리 잔량 확인', map: 'open', model: 'v5',
    desc: '배터리 잔량(%)을 읽어 표시하고, 30% 미만이면 빨간색, 아니면 초록색 조명을 켭니다. 주행할수록 조금씩 줄어듭니다.',
    xml: program(onStart(v5init()), onButton('A', setV('batt', v5batt()), showNum(getV('batt')), ifs([cmp(getV('batt'), '<', 30), [v5rgb('All', 'Red')]], ELSE(v5rgb('All', 'Green')))),
      onButton('B', v5motor('All', 'CW', 150), pause(3000), v5stop())) });
  add({ id: 'v5_avoid', group: G5, name: 'V5: 장애물 회피 + 방향 조명', map: 'obstacles', model: 'v5',
    desc: '초음파 센서로 장애물을 피하며, 회전하는 쪽 조명을 노란색으로 깜박입니다.',
    xml: program(onStart(v5init()), forever(
      ifs([cmp(v5us(), '<', 20), [v5stop(), v5motor('All', 'CCW', 100), pause(400),
        ifs([cmp(rand(0, 1), '==', 0), [v5blink('Left', 3, 4, 'Yellow'), v5motor('M1', 'CCW', 100), v5motor('M2', 'CW', 100)]],
          ELSE(v5blink('Right', 3, 4, 'Yellow'), v5motor('M1', 'CW', 100), v5motor('M2', 'CCW', 100))), pause(rand(300, 700)), v5stop()]],
        ELSE(v5rgb('All', 'White'), v5motor('All', 'CW', 140))))) });
  add({ id: 'py_v5', group: G5, name: 'V5: MicroPython 3센서 라인트레이싱', map: 'line_curve', model: 'v5', mode: 'python',
    desc: 'maqueen_v5 모듈(I2C 레지스터 방식)로 작성한 3센서 라인트레이싱입니다.',
    py: `from microbit import *
import maqueen_v5 as mq

mq.init()
display.scroll(mq.version())
last = 0
while True:
    L = mq.read_patrol(mq.L)
    M = mq.read_patrol(mq.M)
    R = mq.read_patrol(mq.R)
    if L:
        mq.motor_run(mq.M1, mq.CW, 20)
        mq.motor_run(mq.M2, mq.CW, 120)
        mq.set_rgb_light(mq.LEFT, mq.YELLOW)
        last = 1
    elif R:
        mq.motor_run(mq.M1, mq.CW, 120)
        mq.motor_run(mq.M2, mq.CW, 20)
        mq.set_rgb_light(mq.RIGHT, mq.YELLOW)
        last = 2
    elif M:
        mq.motor_run(mq.ALL, mq.CW, 130)
        mq.set_rgb_light(mq.BOTH, mq.GREEN)
    else:
        if last == 1:
            mq.motor_run(mq.M1, mq.CCW, 60)
            mq.motor_run(mq.M2, mq.CW, 60)
        else:
            mq.motor_run(mq.M1, mq.CW, 60)
            mq.motor_run(mq.M2, mq.CCW, 60)
    sleep(10)
` });

  // =============== MicroPython 전용 ===============
  add({ id: 'py_i2c', group: 'MicroPython 직접 제어', name: 'I2C 로 모터 직접 제어', map: 'open', mode: 'python',
    desc: '마퀸 모터 드라이버(I2C 주소 0x10)에 레지스터 값을 직접 써서 모터를 제어합니다.',
    py: `from microbit import *

ADDR = 0x10          # 마퀸 I2C 주소
LEFT_REG = 0x00      # 왼쪽 모터 레지스터
RIGHT_REG = 0x02     # 오른쪽 모터 레지스터

def motor(reg, direction, speed):
    # [레지스터, 방향(0=전진,1=후진), 속도(0~255)]
    i2c.write(ADDR, bytearray([reg, direction, speed]))

display.scroll('I2C')
for i in range(3):
    motor(LEFT_REG, 0, 150)
    motor(RIGHT_REG, 0, 150)
    display.show(Image.ARROW_N)
    sleep(1000)
    motor(LEFT_REG, 0, 120)
    motor(RIGHT_REG, 1, 120)
    display.show(Image.ARROW_E)
    sleep(500)

motor(LEFT_REG, 0, 0)
motor(RIGHT_REG, 0, 0)
display.show(Image.YES)
` });
  add({ id: 'py_ultra', group: 'MicroPython 직접 제어', name: '초음파 직접 측정 (time_pulse_us)', map: 'obstacles', mode: 'python',
    desc: '트리거 핀(P1)에 펄스를 보내고 에코 핀(P2)의 펄스 길이를 측정해 거리를 계산합니다.',
    py: `from microbit import *
import machine
import utime

def distance_cm():
    pin1.write_digital(1)
    utime.sleep_us(10)
    pin1.write_digital(0)
    t = machine.time_pulse_us(pin2, 1, 30000)   # 에코 펄스 길이(us)
    if t < 0:
        return -1
    return t / 58                                 # 소리 왕복 시간 -> cm

while True:
    d = distance_cm()
    print('distance:', round(d, 1))
    if 0 < d < 20:
        display.show(Image.SAD)
        pin8.write_digital(1)
        pin12.write_digital(1)
    else:
        display.show(Image.HAPPY)
        pin8.write_digital(0)
        pin12.write_digital(0)
    sleep(200)
` });
  add({ id: 'py_line', group: 'MicroPython 직접 제어', name: '라인트레이싱 (maqueen 모듈)', map: 'line_curve', mode: 'python',
    desc: 'maqueen 모듈 함수로 작성한 라인트레이싱 예제입니다. 선을 놓쳤을 때 마지막 방향으로 탐색합니다.',
    py: `from microbit import *
import maqueen

BASE = 120
last = 'L'
display.show(Image.HAPPY)

while True:
    L = maqueen.read_patrol(maqueen.LEFT)
    R = maqueen.read_patrol(maqueen.RIGHT)
    if L and R:
        maqueen.motor_run(maqueen.ALL, maqueen.CW, BASE)
    elif L:
        maqueen.motor_run(maqueen.M1, maqueen.CW, 20)
        maqueen.motor_run(maqueen.M2, maqueen.CW, BASE)
        last = 'L'
    elif R:
        maqueen.motor_run(maqueen.M1, maqueen.CW, BASE)
        maqueen.motor_run(maqueen.M2, maqueen.CW, 20)
        last = 'R'
    else:
        if last == 'L':
            maqueen.turn_left(70)
        else:
            maqueen.turn_right(70)
    sleep(10)
` });
  add({ id: 'py_neopixel', group: 'MicroPython 직접 제어', name: 'NeoPixel 색 회전', map: 'open', mode: 'python',
    desc: 'neopixel 모듈로 P15 에 연결된 RGB LED 4개의 색을 회전시킵니다.',
    py: `from microbit import *
import neopixel

np = neopixel.NeoPixel(pin15, 4)
colors = [(255, 0, 0), (255, 160, 0), (0, 255, 0), (0, 80, 255)]

while True:
    for i in range(4):
        np[i] = colors[i]
    np.show()
    colors = colors[1:] + colors[:1]
    sleep(300)
` });

  // =============== MakeCode JavaScript 전용 ===============
  add({ id: 'js_avoid', group: 'MakeCode JavaScript', name: '함수로 만든 장애물 회피', map: 'obstacles', mode: 'js',
    desc: 'MakeCode JavaScript 로 함수를 정의해 장애물 회피 주행을 구현합니다.',
    js: `function turnRight (ms: number) {
    maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 100)
    maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 100)
    basic.pause(ms)
    maqueen.motorStop(maqueen.Motors.All)
}
let distance = 0
basic.showIcon(IconNames.Happy)
basic.forever(function () {
    distance = maqueen.Ultrasonic(PingUnit.Centimeters)
    serial.writeValue("d", distance)
    if (distance < 20) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 100)
        basic.pause(400)
        turnRight(randint(300, 700))
    } else {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 140)
    }
})
` });

  MQ.examples = ex;
})();
