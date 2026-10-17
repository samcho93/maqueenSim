/* Blockly 블록 정의 (MakeCode 스타일) + JavaScript / MicroPython 코드 생성 */
(function () {
  const A = MQ.assets;
  const JS = javascript.javascriptGenerator, JO = javascript.Order;
  const PY = python.pythonGenerator, PO = python.Order;

  const C = { basic: '#1E90FF', input: '#D400D4', led: '#5C2D91', music: '#E63022', pins: '#B22222', serial: '#002050', maqueen: '#0FBC11', rgb: '#2BA3B5', logic: '#00A4A6', loops: '#00AA00', math: '#9400D3', vars: '#DC143C', text: '#B8860B', func: '#3455DB' };

  const ICON_OPTS = Object.keys(A.ICON_KO).map((k) => [A.ICON_KO[k], k]);
  const MELODY_OPTS = Object.keys(A.MELODIES).map((k) => [A.MELODY_KO[k], k]);
  const NOTE_OPTS = [['낮은 도 (C3)', '131'], ['낮은 레 (D3)', '147'], ['낮은 미 (E3)', '165'], ['낮은 파 (F3)', '175'], ['낮은 솔 (G3)', '196'], ['낮은 라 (A3)', '220'], ['낮은 시 (B3)', '247'],
    ['도 (C4)', '262'], ['도# (C#4)', '277'], ['레 (D4)', '294'], ['레# (D#4)', '311'], ['미 (E4)', '330'], ['파 (F4)', '349'], ['파# (F#4)', '370'], ['솔 (G4)', '392'], ['솔# (G#4)', '415'], ['라 (A4)', '440'], ['라# (A#4)', '466'], ['시 (B4)', '494'],
    ['높은 도 (C5)', '523'], ['높은 레 (D5)', '587'], ['높은 미 (E5)', '659'], ['높은 파 (F5)', '698'], ['높은 솔 (G5)', '784'], ['높은 라 (A5)', '880'], ['높은 시 (B5)', '988']];
  const NOTE_JS = { 131: 'Note.C3', 147: 'Note.D3', 165: 'Note.E3', 175: 'Note.F3', 196: 'Note.G3', 220: 'Note.A3', 247: 'Note.B3', 262: 'Note.C', 277: 'Note.CSharp', 294: 'Note.D', 311: 'Note.Eb', 330: 'Note.E', 349: 'Note.F', 370: 'Note.FSharp', 392: 'Note.G', 415: 'Note.GSharp', 440: 'Note.A', 466: 'Note.Bb', 494: 'Note.B', 523: 'Note.C5', 587: 'Note.D5', 659: 'Note.E5', 698: 'Note.F5', 784: 'Note.G5', 880: 'Note.A5', 988: 'Note.B5' };
  const BEAT_OPTS = [['1 박자', '1'], ['1/2 박자', '2'], ['1/4 박자', '4'], ['1/8 박자', '8'], ['2 박자', '32'], ['4 박자', '64']];
  const BEAT_JS = { 1: 'BeatFraction.Whole', 2: 'BeatFraction.Half', 4: 'BeatFraction.Quarter', 8: 'BeatFraction.Eighth', 32: 'BeatFraction.Double', 64: 'BeatFraction.Breve' };
  const BEAT_MS = { 1: 500, 2: 250, 4: 125, 8: 62, 32: 1000, 64: 2000 };
  const PIN_OPTS = [0, 1, 2, 8, 12, 13, 14, 15, 16].map((p) => ['P' + p, String(p)]);
  const COLOR_OPTS = [['빨강', 'Red'], ['주황', 'Orange'], ['노랑', 'Yellow'], ['초록', 'Green'], ['파랑', 'Blue'], ['남색', 'Indigo'], ['보라', 'Violet'], ['자주', 'Purple'], ['흰색', 'White'], ['검정(끄기)', 'Black']];
  const COLOR_RGB = { Red: [255, 0, 0], Orange: [255, 165, 0], Yellow: [255, 255, 0], Green: [0, 255, 0], Blue: [0, 0, 255], Indigo: [75, 0, 130], Violet: [138, 43, 226], Purple: [255, 0, 255], White: [255, 255, 255], Black: [0, 0, 0] };
  const ARROW_OPTS = [['북 ↑', '0'], ['북동 ↗', '1'], ['동 →', '2'], ['남동 ↘', '3'], ['남 ↓', '4'], ['남서 ↙', '5'], ['서 ←', '6'], ['북서 ↖', '7']];
  const ARROW_JS = ['North', 'NorthEast', 'East', 'SouthEast', 'South', 'SouthWest', 'West', 'NorthWest'];
  const ARROW_PY = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  const num = (name, check) => ({ type: 'input_value', name, check: check || null });
  const defs = [
    // ----- 기본 -----
    { type: 'mb_on_start', message0: '시작하면 실행 %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: C.basic, tooltip: '프로그램이 시작될 때 한 번 실행합니다.' },
    { type: 'mb_forever', message0: '무한 반복 실행 %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: C.basic, tooltip: '안의 블록을 계속 반복합니다.' },
    { type: 'mb_show_number', message0: '수 출력 %1', args0: [num('NUM')], previousStatement: null, nextStatement: null, colour: C.basic, inputsInline: true },
    { type: 'mb_show_string', message0: '문자열 출력 %1', args0: [num('TEXT')], previousStatement: null, nextStatement: null, colour: C.basic, inputsInline: true },
    { type: 'mb_show_icon', message0: '아이콘 출력 %1', args0: [{ type: 'field_dropdown', name: 'ICON', options: ICON_OPTS }], previousStatement: null, nextStatement: null, colour: C.basic },
    { type: 'mb_show_arrow', message0: '화살표 출력 %1', args0: [{ type: 'field_dropdown', name: 'DIR', options: ARROW_OPTS }], previousStatement: null, nextStatement: null, colour: C.basic },
    { type: 'mb_clear', message0: 'LED 스크린 지우기', previousStatement: null, nextStatement: null, colour: C.basic },
    { type: 'mb_pause', message0: '일시중지 %1 (ms)', args0: [num('MS', 'Number')], previousStatement: null, nextStatement: null, colour: C.basic, inputsInline: true },
    // ----- 입력 -----
    { type: 'mb_on_button', message0: '%1 버튼 누르면 실행 %2 %3', args0: [{ type: 'field_dropdown', name: 'BTN', options: [['A', 'A'], ['B', 'B'], ['A+B', 'AB']] }, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: C.input },
    { type: 'mb_on_shake', message0: '흔들면 실행 %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: C.input },
    { type: 'mb_button_pressed', message0: '%1 버튼 눌림 상태', args0: [{ type: 'field_dropdown', name: 'BTN', options: [['A', 'A'], ['B', 'B'], ['A+B', 'AB']] }], output: 'Boolean', colour: C.input },
    { type: 'mb_acceleration', message0: '가속도 센서 값 (mg) %1', args0: [{ type: 'field_dropdown', name: 'AXIS', options: [['x', 'x'], ['y', 'y'], ['z', 'z'], ['크기', 's']] }], output: 'Number', colour: C.input },
    { type: 'mb_light_level', message0: '빛 센서 값', output: 'Number', colour: C.input },
    { type: 'mb_temperature', message0: '온도 센서 값 (°C)', output: 'Number', colour: C.input },
    { type: 'mb_compass', message0: '나침반 센서 값 (°)', output: 'Number', colour: C.input },
    { type: 'mb_running_time', message0: '작동 시간 (ms)', output: 'Number', colour: C.input },
    // ----- LED -----
    { type: 'mb_plot', message0: 'LED 켜기 x %1 y %2', args0: [num('X', 'Number'), num('Y', 'Number')], previousStatement: null, nextStatement: null, colour: C.led, inputsInline: true },
    { type: 'mb_unplot', message0: 'LED 끄기 x %1 y %2', args0: [num('X', 'Number'), num('Y', 'Number')], previousStatement: null, nextStatement: null, colour: C.led, inputsInline: true },
    { type: 'mb_toggle', message0: 'LED 반전 x %1 y %2', args0: [num('X', 'Number'), num('Y', 'Number')], previousStatement: null, nextStatement: null, colour: C.led, inputsInline: true },
    { type: 'mb_point', message0: 'LED 상태 x %1 y %2', args0: [num('X', 'Number'), num('Y', 'Number')], output: 'Boolean', colour: C.led, inputsInline: true },
    // ----- 음악 -----
    { type: 'mb_play_tone', message0: '음 %1 을 %2 동안 연주', args0: [{ type: 'field_dropdown', name: 'NOTE', options: NOTE_OPTS }, { type: 'field_dropdown', name: 'BEAT', options: BEAT_OPTS }], previousStatement: null, nextStatement: null, colour: C.music },
    { type: 'mb_play_freq', message0: '주파수 %1 Hz 를 %2 ms 동안 연주', args0: [num('FREQ', 'Number'), num('MS', 'Number')], previousStatement: null, nextStatement: null, colour: C.music, inputsInline: true },
    { type: 'mb_rest', message0: '쉼표 %1', args0: [{ type: 'field_dropdown', name: 'BEAT', options: BEAT_OPTS }], previousStatement: null, nextStatement: null, colour: C.music },
    { type: 'mb_melody', message0: '멜로디 %1 연주 %2', args0: [{ type: 'field_dropdown', name: 'MELODY', options: MELODY_OPTS }, { type: 'field_dropdown', name: 'MODE', options: [['끝날 때까지 기다리기', 'once'], ['배경에서', 'bg']] }], previousStatement: null, nextStatement: null, colour: C.music },
    { type: 'mb_stop_music', message0: '모든 소리 끄기', previousStatement: null, nextStatement: null, colour: C.music },
    // ----- 핀 -----
    { type: 'mb_digital_write', message0: '디지털 출력 %1 에 %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: PIN_OPTS }, num('VAL', 'Number')], previousStatement: null, nextStatement: null, colour: C.pins, inputsInline: true },
    { type: 'mb_digital_read', message0: '디지털 입력 값 %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: PIN_OPTS }], output: 'Number', colour: C.pins },
    { type: 'mb_analog_read', message0: '아날로그 입력 값 %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: PIN_OPTS }], output: 'Number', colour: C.pins },
    // ----- 시리얼 -----
    { type: 'mb_serial_line', message0: '시리얼 출력: 문자열 + 줄바꿈 %1', args0: [num('TEXT')], previousStatement: null, nextStatement: null, colour: C.serial, inputsInline: true },
    { type: 'mb_serial_value', message0: '시리얼 출력: 이름 %1 = 값 %2', args0: [num('NAME', 'String'), num('VAL', 'Number')], previousStatement: null, nextStatement: null, colour: C.serial, inputsInline: true },
    // ----- 마퀸 -----
    { type: 'mq_motor_run', message0: '모터 %1 방향 %2 속도 %3', args0: [{ type: 'field_dropdown', name: 'MOTOR', options: [['모두', 'All'], ['왼쪽(M1)', 'M1'], ['오른쪽(M2)', 'M2']] }, { type: 'field_dropdown', name: 'DIR', options: [['전진 ⬆', 'CW'], ['후진 ⬇', 'CCW']] }, num('SPEED', 'Number')], previousStatement: null, nextStatement: null, colour: C.maqueen, inputsInline: true, tooltip: '속도: 0~255' },
    { type: 'mq_motor_stop', message0: '모터 %1 정지', args0: [{ type: 'field_dropdown', name: 'MOTOR', options: [['모두', 'All'], ['왼쪽(M1)', 'M1'], ['오른쪽(M2)', 'M2']] }], previousStatement: null, nextStatement: null, colour: C.maqueen },
    { type: 'mq_ultrasonic', message0: '초음파 센서 거리 (cm)', output: 'Number', colour: C.maqueen },
    { type: 'mq_read_patrol', message0: '라인 센서 %1 값', args0: [{ type: 'field_dropdown', name: 'SIDE', options: [['왼쪽', 'PatrolLeft'], ['오른쪽', 'PatrolRight']] }], output: 'Number', colour: C.maqueen, tooltip: '검은 선: 1, 흰 바닥: 0' },
    { type: 'mq_write_led', message0: 'LED %1 %2', args0: [{ type: 'field_dropdown', name: 'LED', options: [['왼쪽', 'LEDLeft'], ['오른쪽', 'LEDRight']] }, { type: 'field_dropdown', name: 'STATE', options: [['켜기', 'turnOn'], ['끄기', 'turnOff']] }], previousStatement: null, nextStatement: null, colour: C.maqueen },
    { type: 'mq_servo', message0: '서보 %1 각도 %2', args0: [{ type: 'field_dropdown', name: 'SERVO', options: [['S1', 'S1'], ['S2', 'S2']] }, num('ANGLE', 'Number')], previousStatement: null, nextStatement: null, colour: C.maqueen, inputsInline: true },
    { type: 'mq_on_ir', message0: 'IR 리모컨 신호 받으면 실행 %1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour: C.maqueen },
    { type: 'mq_ir_value', message0: 'IR 리모컨 값', output: 'Number', colour: C.maqueen },
    // ----- RGB (네오픽셀 P15) -----
    { type: 'mq_rgb_all', message0: 'RGB LED 모두 %1 색으로 켜기', args0: [{ type: 'field_dropdown', name: 'COLOR', options: COLOR_OPTS }], previousStatement: null, nextStatement: null, colour: C.rgb },
    { type: 'mq_rgb_pixel', message0: 'RGB LED %1 번을 %2 색으로', args0: [num('IDX', 'Number'), { type: 'field_dropdown', name: 'COLOR', options: COLOR_OPTS }], previousStatement: null, nextStatement: null, colour: C.rgb, inputsInline: true, tooltip: '번호: 0~3' },
    { type: 'mq_rgb_pixel_rgb', message0: 'RGB LED %1 번 R %2 G %3 B %4', args0: [num('IDX', 'Number'), num('R', 'Number'), num('G', 'Number'), num('B', 'Number')], previousStatement: null, nextStatement: null, colour: C.rgb, inputsInline: true },
    { type: 'mq_rgb_rainbow', message0: 'RGB LED 무지개 표시', previousStatement: null, nextStatement: null, colour: C.rgb },
    { type: 'mq_rgb_clear', message0: 'RGB LED 모두 끄기', previousStatement: null, nextStatement: null, colour: C.rgb },
    { type: 'mq_rgb_brightness', message0: 'RGB LED 밝기 %1 (0~255)', args0: [num('B', 'Number')], previousStatement: null, nextStatement: null, colour: C.rgb, inputsInline: true },
  ];
  // 5x5 LED 그리기 블록
  const ledArgs = [], ledMsg = [];
  let ai = 1;
  for (let y = 0; y < 5; y++) {
    let row = '';
    for (let x = 0; x < 5; x++) { row += `%${ai++} `; ledArgs.push({ type: 'field_checkbox', name: `P${y}${x}`, checked: false }); }
    row += `%${ai++}`; ledArgs.push({ type: 'input_dummy' });
    ledMsg.push(row);
  }
  defs.push({ type: 'mb_show_leds', message0: 'LED 출력 %1', args0: [{ type: 'input_dummy' }], message1: ledMsg.join(' '), args1: ledArgs, previousStatement: null, nextStatement: null, colour: C.basic });

  Blockly.defineBlocksWithJsonArray(defs);
  const HATS = ['mb_on_start', 'mb_forever', 'mb_on_button', 'mb_on_shake', 'mq_on_ir'];

  // ===================== JavaScript (MakeCode) =====================
  const j = (t, f) => (JS.forBlock[t] = f);
  const v = (b, n, def, order) => JS.valueToCode(b, n, order || JO.NONE) || def;
  const st = (b) => JS.statementToCode(b, 'DO');
  const RGB_DEF = () => { JS.definitions_['mq_strip'] = 'let strip = neopixel.create(DigitalPin.P15, 4, NeoPixelMode.RGB)'; };
  j('mb_on_start', (b) => st(b).replace(/^ {2}/gm, ''));
  j('mb_forever', (b) => `basic.forever(function () {\n${st(b)}})\n`);
  j('mb_on_button', (b) => `input.onButtonPressed(Button.${b.getFieldValue('BTN')}, function () {\n${st(b)}})\n`);
  j('mb_on_shake', (b) => `input.onGesture(Gesture.Shake, function () {\n${st(b)}})\n`);
  j('mq_on_ir', (b) => `maqueen.IR_callbackUser(function (message) {\n${st(b)}})\n`);
  j('mb_show_number', (b) => `basic.showNumber(${v(b, 'NUM', '0')})\n`);
  j('mb_show_string', (b) => `basic.showString(${v(b, 'TEXT', '""')})\n`);
  j('mb_show_icon', (b) => {
    const key = b.getFieldValue('ICON');
    const mc = Object.keys(A.MAKECODE_ICON).find((k) => A.MAKECODE_ICON[k] === key);
    return `basic.showIcon(IconNames.${mc})\n`;
  });
  j('mb_show_arrow', (b) => `basic.showArrow(ArrowNames.${ARROW_JS[+b.getFieldValue('DIR')]})\n`);
  j('mb_show_leds', (b) => {
    let s = 'basic.showLeds(`\n';
    for (let y = 0; y < 5; y++) { s += '    '; for (let x = 0; x < 5; x++) s += (b.getFieldValue(`P${y}${x}`) === 'TRUE' ? '#' : '.') + ' '; s += '\n'; }
    return s + '    `)\n';
  });
  j('mb_clear', () => 'basic.clearScreen()\n');
  j('mb_pause', (b) => `basic.pause(${v(b, 'MS', '100')})\n`);
  j('mb_button_pressed', (b) => [`input.buttonIsPressed(Button.${b.getFieldValue('BTN')})`, JO.FUNCTION_CALL]);
  j('mb_acceleration', (b) => [`input.acceleration(Dimension.${{ x: 'X', y: 'Y', z: 'Z', s: 'Strength' }[b.getFieldValue('AXIS')]})`, JO.FUNCTION_CALL]);
  j('mb_light_level', () => ['input.lightLevel()', JO.FUNCTION_CALL]);
  j('mb_temperature', () => ['input.temperature()', JO.FUNCTION_CALL]);
  j('mb_compass', () => ['input.compassHeading()', JO.FUNCTION_CALL]);
  j('mb_running_time', () => ['input.runningTime()', JO.FUNCTION_CALL]);
  j('mb_plot', (b) => `led.plot(${v(b, 'X', '0')}, ${v(b, 'Y', '0')})\n`);
  j('mb_unplot', (b) => `led.unplot(${v(b, 'X', '0')}, ${v(b, 'Y', '0')})\n`);
  j('mb_toggle', (b) => `led.toggle(${v(b, 'X', '0')}, ${v(b, 'Y', '0')})\n`);
  j('mb_point', (b) => [`led.point(${v(b, 'X', '0')}, ${v(b, 'Y', '0')})`, JO.FUNCTION_CALL]);
  j('mb_play_tone', (b) => `music.playTone(${NOTE_JS[b.getFieldValue('NOTE')]}, music.beat(${BEAT_JS[b.getFieldValue('BEAT')]}))\n`);
  j('mb_play_freq', (b) => `music.playTone(${v(b, 'FREQ', '440')}, ${v(b, 'MS', '500')})\n`);
  j('mb_rest', (b) => `music.rest(music.beat(${BEAT_JS[b.getFieldValue('BEAT')]}))\n`);
  j('mb_melody', (b) => {
    const key = b.getFieldValue('MELODY');
    const mc = Object.keys(A.MAKECODE_MELODY).find((k) => A.MAKECODE_MELODY[k] === key);
    return `music.startMelody(music.builtInMelody(Melodies.${mc}), MelodyOptions.${b.getFieldValue('MODE') === 'bg' ? 'OnceInBackground' : 'Once'})\n`;
  });
  j('mb_stop_music', () => 'music.stopAllSounds()\n');
  j('mb_digital_write', (b) => `pins.digitalWritePin(DigitalPin.P${b.getFieldValue('PIN')}, ${v(b, 'VAL', '0')})\n`);
  j('mb_digital_read', (b) => [`pins.digitalReadPin(DigitalPin.P${b.getFieldValue('PIN')})`, JO.FUNCTION_CALL]);
  j('mb_analog_read', (b) => [`pins.analogReadPin(AnalogPin.P${b.getFieldValue('PIN')})`, JO.FUNCTION_CALL]);
  j('mb_serial_line', (b) => `serial.writeLine(${v(b, 'TEXT', '""')})\n`);
  j('mb_serial_value', (b) => `serial.writeValue(${v(b, 'NAME', '"x"')}, ${v(b, 'VAL', '0')})\n`);
  j('mq_motor_run', (b) => `maqueen.motorRun(maqueen.Motors.${b.getFieldValue('MOTOR')}, maqueen.Dir.${b.getFieldValue('DIR')}, ${v(b, 'SPEED', '0')})\n`);
  j('mq_motor_stop', (b) => `maqueen.motorStop(maqueen.Motors.${b.getFieldValue('MOTOR')})\n`);
  j('mq_ultrasonic', () => ['maqueen.Ultrasonic(PingUnit.Centimeters)', JO.FUNCTION_CALL]);
  j('mq_read_patrol', (b) => [`maqueen.readPatrol(maqueen.Patrol.${b.getFieldValue('SIDE')})`, JO.FUNCTION_CALL]);
  j('mq_write_led', (b) => `maqueen.writeLED(maqueen.LED.${b.getFieldValue('LED')}, maqueen.LEDswitch.${b.getFieldValue('STATE')})\n`);
  j('mq_servo', (b) => `maqueen.servoRun(maqueen.Servos.${b.getFieldValue('SERVO')}, ${v(b, 'ANGLE', '90')})\n`);
  j('mq_ir_value', () => ['maqueen.IR_read()', JO.FUNCTION_CALL]);
  j('mq_rgb_all', (b) => { RGB_DEF(); return `strip.showColor(neopixel.colors(NeoPixelColors.${b.getFieldValue('COLOR')}))\n`; });
  j('mq_rgb_pixel', (b) => { RGB_DEF(); return `strip.setPixelColor(${v(b, 'IDX', '0')}, neopixel.colors(NeoPixelColors.${b.getFieldValue('COLOR')}))\nstrip.show()\n`; });
  j('mq_rgb_pixel_rgb', (b) => { RGB_DEF(); return `strip.setPixelColor(${v(b, 'IDX', '0')}, neopixel.rgb(${v(b, 'R', '0')}, ${v(b, 'G', '0')}, ${v(b, 'B', '0')}))\nstrip.show()\n`; });
  j('mq_rgb_rainbow', () => { RGB_DEF(); return 'strip.showRainbow(1, 360)\n'; });
  j('mq_rgb_clear', () => { RGB_DEF(); return 'strip.clear()\nstrip.show()\n'; });
  j('mq_rgb_brightness', (b) => { RGB_DEF(); return `strip.setBrightness(${v(b, 'B', '255')})\nstrip.show()\n`; });

  function workspaceToJs(ws) {
    JS.init(ws);
    const tops = ws.getTopBlocks(true);
    const events = [], start = [], forever = [], others = [];
    for (const b of tops) {
      if (!b.isEnabled()) continue;
      let code = JS.blockToCode(b);
      if (Array.isArray(code)) continue; // 떠 있는 값 블록 무시
      if (b.type === 'mb_on_start') start.push(code);
      else if (b.type === 'mb_forever') forever.push(code);
      else if (HATS.includes(b.type)) events.push(code);
      else if (b.type === 'procedures_defnoreturn' || b.type === 'procedures_defreturn') continue; // 정의는 definitions 에 포함됨
      else others.push(code); // 떠 있는 일반 블록은 시작 코드로 취급
    }
    let body = [...events, ...start, ...others, ...forever].join('');
    let code = JS.finish(body);
    code = code.replace(/^var /gm, 'let ').replace(/\n{3,}/g, '\n\n');
    return code.trim() + '\n';
  }

  // ===================== MicroPython =====================
  const p = (t, f) => (PY.forBlock[t] = f);
  const pv = (b, n, def, order) => PY.valueToCode(b, n, order || PO.NONE) || def;
  const use = (mod) => {
    if (mod === 'microbit') PY.definitions_['import_microbit'] = 'from microbit import *';
    else PY.definitions_['import_' + mod] = 'import ' + mod;
  };
  const NP = () => { use('neopixel'); PY.definitions_['zz_np'] = 'np = neopixel.NeoPixel(pin15, 4)\nnp_brightness = 255'; PY.definitions_['zz_np_fn'] = 'def np_color(c):\n    return tuple(int(x * np_brightness / 255) for x in c)'; };
  const MOTOR_PY = { All: 'maqueen.ALL', M1: 'maqueen.M1', M2: 'maqueen.M2' };
  ['mb_on_start', 'mb_forever', 'mb_on_button', 'mb_on_shake', 'mq_on_ir'].forEach((t) => p(t, () => ''));
  p('mb_show_number', (b) => `display.scroll(${pv(b, 'NUM', '0')})\n`);
  p('mb_show_string', (b) => `display.scroll(${pv(b, 'TEXT', "''")})\n`);
  p('mb_show_icon', (b) => `display.show(Image.${b.getFieldValue('ICON')})\nsleep(600)\n`);
  p('mb_show_arrow', (b) => `display.show(Image.ARROW_${ARROW_PY[+b.getFieldValue('DIR')]})\nsleep(600)\n`);
  p('mb_show_leds', (b) => {
    const rows = [];
    for (let y = 0; y < 5; y++) { let r = ''; for (let x = 0; x < 5; x++) r += b.getFieldValue(`P${y}${x}`) === 'TRUE' ? '9' : '0'; rows.push(r); }
    return `display.show(Image('${rows.join(':')}'))\nsleep(400)\n`;
  });
  p('mb_clear', () => 'display.clear()\n');
  p('mb_pause', (b) => `sleep(${pv(b, 'MS', '100')})\n`);
  p('mb_button_pressed', (b) => {
    const n = b.getFieldValue('BTN');
    return [n === 'AB' ? '(button_a.is_pressed() and button_b.is_pressed())' : `button_${n.toLowerCase()}.is_pressed()`, PO.FUNCTION_CALL];
  });
  p('mb_acceleration', (b) => { const a = b.getFieldValue('AXIS'); return [a === 's' ? 'accelerometer.get_strength()' : `accelerometer.get_${a}()`, PO.FUNCTION_CALL]; });
  p('mb_light_level', () => ['display.read_light_level()', PO.FUNCTION_CALL]);
  p('mb_temperature', () => ['temperature()', PO.FUNCTION_CALL]);
  p('mb_compass', () => ['compass.heading()', PO.FUNCTION_CALL]);
  p('mb_running_time', () => ['running_time()', PO.FUNCTION_CALL]);
  p('mb_plot', (b) => `display.set_pixel(${pv(b, 'X', '0')}, ${pv(b, 'Y', '0')}, 9)\n`);
  p('mb_unplot', (b) => `display.set_pixel(${pv(b, 'X', '0')}, ${pv(b, 'Y', '0')}, 0)\n`);
  p('mb_toggle', (b) => { const x = pv(b, 'X', '0'), y = pv(b, 'Y', '0'); return `display.set_pixel(${x}, ${y}, 0 if display.get_pixel(${x}, ${y}) else 9)\n`; });
  p('mb_point', (b) => [`(display.get_pixel(${pv(b, 'X', '0')}, ${pv(b, 'Y', '0')}) > 0)`, PO.RELATIONAL]);
  p('mb_play_tone', (b) => { use('music'); return `music.pitch(${b.getFieldValue('NOTE')}, ${BEAT_MS[b.getFieldValue('BEAT')]})\n`; });
  p('mb_play_freq', (b) => { use('music'); return `music.pitch(${pv(b, 'FREQ', '440')}, ${pv(b, 'MS', '500')})\n`; });
  p('mb_rest', (b) => `sleep(${BEAT_MS[b.getFieldValue('BEAT')]})\n`);
  p('mb_melody', (b) => { use('music'); return `music.play(music.${b.getFieldValue('MELODY')}${b.getFieldValue('MODE') === 'bg' ? ', wait=False' : ''})\n`; });
  p('mb_stop_music', () => { use('music'); return 'music.stop()\n'; });
  p('mb_digital_write', (b) => `pin${b.getFieldValue('PIN')}.write_digital(${pv(b, 'VAL', '0')})\n`);
  p('mb_digital_read', (b) => [`pin${b.getFieldValue('PIN')}.read_digital()`, PO.FUNCTION_CALL]);
  p('mb_analog_read', (b) => [`pin${b.getFieldValue('PIN')}.read_analog()`, PO.FUNCTION_CALL]);
  p('mb_serial_line', (b) => `print(${pv(b, 'TEXT', "''")})\n`);
  p('mb_serial_value', (b) => `print(str(${pv(b, 'NAME', "'x'")}) + ':' + str(${pv(b, 'VAL', '0')}))\n`);
  p('mq_motor_run', (b) => { use('maqueen'); return `maqueen.motor_run(${MOTOR_PY[b.getFieldValue('MOTOR')]}, maqueen.${b.getFieldValue('DIR')}, ${pv(b, 'SPEED', '0')})\n`; });
  p('mq_motor_stop', (b) => { use('maqueen'); return `maqueen.motor_stop(${MOTOR_PY[b.getFieldValue('MOTOR')]})\n`; });
  p('mq_ultrasonic', () => { use('maqueen'); return ['maqueen.ultrasonic()', PO.FUNCTION_CALL]; });
  p('mq_read_patrol', (b) => { use('maqueen'); return [`maqueen.read_patrol(maqueen.${b.getFieldValue('SIDE') === 'PatrolLeft' ? 'LEFT' : 'RIGHT'})`, PO.FUNCTION_CALL]; });
  p('mq_write_led', (b) => { use('maqueen'); return `maqueen.write_led(maqueen.${b.getFieldValue('LED') === 'LEDLeft' ? 'LEFT' : 'RIGHT'}, maqueen.${b.getFieldValue('STATE') === 'turnOn' ? 'ON' : 'OFF'})\n`; });
  p('mq_servo', (b) => { use('maqueen'); return `maqueen.servo_run(maqueen.${b.getFieldValue('SERVO')}, ${pv(b, 'ANGLE', '90')})\n`; });
  p('mq_ir_value', () => { use('maqueen'); return ['maqueen.ir_read()', PO.FUNCTION_CALL]; });
  const col = (b) => `(${COLOR_RGB[b.getFieldValue('COLOR')].join(', ')})`;
  p('mq_rgb_all', (b) => { NP(); return `np.fill(np_color(${col(b)}))\nnp.show()\n`; });
  p('mq_rgb_pixel', (b) => { NP(); return `np[${pv(b, 'IDX', '0')}] = np_color(${col(b)})\nnp.show()\n`; });
  p('mq_rgb_pixel_rgb', (b) => { NP(); return `np[${pv(b, 'IDX', '0')}] = np_color((${pv(b, 'R', '0')}, ${pv(b, 'G', '0')}, ${pv(b, 'B', '0')}))\nnp.show()\n`; });
  p('mq_rgb_rainbow', () => { NP(); return 'for i, c in enumerate([(255, 0, 0), (255, 255, 0), (0, 255, 0), (0, 0, 255)]):\n    np[i] = np_color(c)\nnp.show()\n'; });
  p('mq_rgb_clear', () => { NP(); return 'np.clear()\n'; });
  p('mq_rgb_brightness', (b) => { NP(); return `np_brightness = ${pv(b, 'B', '255')}\n`; });

  function workspaceToPython(ws) {
    PY.init(ws);
    use('microbit');
    const tops = ws.getTopBlocks(true);
    const varNames = ws.getAllVariables().map((vv) => PY.nameDB_.getName(vv.getId(), Blockly.Names.NameType.VARIABLE));
    const usesNpBright = tops.some((t) => t.getDescendants(false).some((d) => d.type === 'mq_rgb_brightness'));
    const globalsFor = (code) => {
      const names = varNames.filter((n) => new RegExp(`\\b${n}\\b`).test(code));
      if (usesNpBright && /np_brightness\s*=/.test(code)) names.push('np_brightness');
      return names.length ? `    global ${names.join(', ')}\n` : '';
    };
    const start = [], forever = [], handlers = [], checks = [];
    let hn = 0;
    for (const b of tops) {
      if (!b.isEnabled()) continue;
      const code = PY.blockToCode(b);
      if (Array.isArray(code)) continue;
      const body = () => PY.statementToCode(b, 'DO') || PY.INDENT + 'pass\n';
      if (b.type === 'mb_on_start') start.push((PY.statementToCode(b, 'DO') || '').replace(/^ {4}/gm, ''));
      else if (b.type === 'mb_forever') forever.push(PY.statementToCode(b, 'DO') || '');
      else if (b.type === 'mb_on_button') {
        const btn = b.getFieldValue('BTN'), name = `on_button_${btn.toLowerCase()}${hn++ || ''}`;
        const bd = body();
        handlers.push(`def ${name}():\n${globalsFor(bd)}${bd}`);
        if (btn === 'AB') checks.push(`    if button_a.is_pressed() and button_b.is_pressed():\n        ${name}()\n        sleep(300)`);
        else checks.push(`    if button_${btn.toLowerCase()}.was_pressed():\n        ${name}()`);
      } else if (b.type === 'mb_on_shake') {
        const bd = body(), name = `on_shake${hn++ || ''}`;
        handlers.push(`def ${name}():\n${globalsFor(bd)}${bd}`);
        checks.push(`    if accelerometer.was_gesture('shake'):\n        ${name}()`);
      } else if (b.type === 'mq_on_ir') {
        use('maqueen');
        const bd = body(), name = `on_ir_received${hn++ || ''}`;
        handlers.push(`def ${name}():\n${globalsFor(bd)}${bd}`);
        checks.push(`    if maqueen.ir_available():\n        ${name}()`);
      } else if (b.type === 'procedures_defnoreturn' || b.type === 'procedures_defreturn') continue;
      else start.push(code);
    }
    let out = '';
    if (handlers.length) out += handlers.join('\n') + '\n';
    if (start.length) out += '# 시작하면 실행\n' + start.join('');
    if (forever.length || checks.length) {
      out += '\n# 무한 반복\nwhile True:\n';
      if (checks.length) out += checks.join('\n') + '\n';
      forever.forEach((f) => (out += f));
      out += '    sleep(20)\n';
    }
    let code = PY.finish(out);
    // np_brightness 정의가 변수 선언보다 앞서도록 유지, 빈 줄 정리
    code = code.replace(/\n{3,}/g, '\n\n');
    return code.trim() + '\n';
  }

  // ===================== 툴박스 =====================
  const sh = (type, val) => `<value name="${type}"><shadow type="math_number"><field name="NUM">${val}</field></shadow></value>`;
  const shT = (type, val) => `<value name="${type}"><shadow type="text"><field name="TEXT">${val}</field></shadow></value>`;
  const TOOLBOX = `
<xml id="toolbox">
  <category name="기본" colour="${C.basic}">
    <block type="mb_on_start"></block>
    <block type="mb_forever"></block>
    <block type="mb_show_number">${sh('NUM', 0)}</block>
    <block type="mb_show_string">${shT('TEXT', 'Hello!')}</block>
    <block type="mb_show_icon"></block>
    <block type="mb_show_leds"></block>
    <block type="mb_show_arrow"></block>
    <block type="mb_clear"></block>
    <block type="mb_pause">${sh('MS', 100)}</block>
  </category>
  <category name="입력" colour="${C.input}">
    <block type="mb_on_button"></block>
    <block type="mb_on_shake"></block>
    <block type="mb_button_pressed"></block>
    <block type="mb_acceleration"></block>
    <block type="mb_light_level"></block>
    <block type="mb_temperature"></block>
    <block type="mb_compass"></block>
    <block type="mb_running_time"></block>
  </category>
  <category name="마퀸" colour="${C.maqueen}">
    <label text="모터"></label>
    <block type="mq_motor_run"><field name="DIR">CW</field>${sh('SPEED', 150)}</block>
    <block type="mq_motor_stop"></block>
    <label text="센서"></label>
    <block type="mq_ultrasonic"></block>
    <block type="mq_read_patrol"></block>
    <label text="LED / 서보 / IR"></label>
    <block type="mq_write_led"></block>
    <block type="mq_servo">${sh('ANGLE', 90)}</block>
    <block type="mq_on_ir"></block>
    <block type="mq_ir_value"></block>
  </category>
  <category name="RGB LED" colour="${C.rgb}">
    <block type="mq_rgb_all"></block>
    <block type="mq_rgb_pixel">${sh('IDX', 0)}</block>
    <block type="mq_rgb_pixel_rgb">${sh('IDX', 0)}${sh('R', 255)}${sh('G', 0)}${sh('B', 0)}</block>
    <block type="mq_rgb_rainbow"></block>
    <block type="mq_rgb_brightness">${sh('B', 128)}</block>
    <block type="mq_rgb_clear"></block>
  </category>
  <category name="음악" colour="${C.music}">
    <block type="mb_play_tone"></block>
    <block type="mb_play_freq">${sh('FREQ', 440)}${sh('MS', 500)}</block>
    <block type="mb_rest"></block>
    <block type="mb_melody"></block>
    <block type="mb_stop_music"></block>
  </category>
  <category name="LED" colour="${C.led}">
    <block type="mb_plot">${sh('X', 0)}${sh('Y', 0)}</block>
    <block type="mb_unplot">${sh('X', 0)}${sh('Y', 0)}</block>
    <block type="mb_toggle">${sh('X', 0)}${sh('Y', 0)}</block>
    <block type="mb_point">${sh('X', 0)}${sh('Y', 0)}</block>
  </category>
  <sep></sep>
  <category name="반복" colour="${C.loops}">
    <block type="controls_repeat_ext">${sh('TIMES', 4)}</block>
    <block type="controls_whileUntil"></block>
    <block type="controls_for"><field name="VAR">index</field>${sh('FROM', 0)}${sh('TO', 4)}${sh('BY', 1)}</block>
    <block type="controls_flow_statements"></block>
  </category>
  <category name="논리" colour="${C.logic}">
    <block type="controls_if"></block>
    <block type="controls_if"><mutation else="1"></mutation></block>
    <block type="logic_compare"><field name="OP">LT</field>${sh('A', 0)}${sh('B', 0)}</block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
  </category>
  <category name="변수" colour="${C.vars}" custom="VARIABLE"></category>
  <category name="계산" colour="${C.math}">
    <block type="math_number"></block>
    <block type="math_arithmetic">${sh('A', 0)}${sh('B', 0)}</block>
    <block type="math_random_int">${sh('FROM', 0)}${sh('TO', 10)}</block>
    <block type="math_single"><field name="OP">ABS</field>${sh('NUM', 0)}</block>
    <block type="math_round">${sh('NUM', 0)}</block>
    <block type="math_modulo">${sh('DIVIDEND', 0)}${sh('DIVISOR', 1)}</block>
    <block type="math_constrain">${sh('VALUE', 0)}${sh('LOW', 0)}${sh('HIGH', 255)}</block>
  </category>
  <category name="문자열" colour="${C.text}">
    <block type="text"></block>
    <block type="text_join"></block>
    <block type="text_length"></block>
  </category>
  <category name="함수" colour="${C.func}" custom="PROCEDURE"></category>
  <sep></sep>
  <category name="고급: 핀" colour="${C.pins}">
    <block type="mb_digital_write">${sh('VAL', 1)}</block>
    <block type="mb_digital_read"></block>
    <block type="mb_analog_read"></block>
  </category>
  <category name="고급: 시리얼" colour="${C.serial}">
    <block type="mb_serial_line">${shT('TEXT', 'Hello')}</block>
    <block type="mb_serial_value">${shT('NAME', 'x')}${sh('VAL', 0)}</block>
  </category>
</xml>`;

  MQ.blocks = { TOOLBOX, workspaceToJs, workspaceToPython, HATS, COLORS: C };
})();
