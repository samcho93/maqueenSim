/* 공용 데이터: 5x5 폰트, 아이콘, 멜로디, 음계 */
window.MQ = window.MQ || {};

(function () {
  // ---------- 아이콘 (micro:bit 기본 이미지) ----------
  const ICONS = {
    HEART: '01010,11111,11111,01110,00100',
    SMALL_HEART: '00000,01010,01110,00100,00000',
    YES: '00000,00001,00010,10100,01000',
    NO: '10001,01010,00100,01010,10001',
    HAPPY: '00000,01010,00000,10001,01110',
    SAD: '00000,01010,00000,01110,10001',
    CONFUSED: '00000,01010,00000,01010,10101',
    ANGRY: '10001,01010,00000,11111,10101',
    ASLEEP: '00000,11011,00000,01110,00000',
    SURPRISED: '01010,00000,00100,01010,00100',
    SILLY: '10001,00000,11111,00011,00011',
    FABULOUS: '11111,11011,00000,01010,01110',
    MEH: '01010,00000,00010,00100,01000',
    TSHIRT: '11011,11111,01110,01110,01110',
    ROLLERSKATE: '00011,00011,11111,11111,01010',
    DUCK: '01100,11100,01111,01110,00000',
    HOUSE: '00100,01110,11111,01110,01010',
    TORTOISE: '00000,01110,11111,01010,00000',
    BUTTERFLY: '11011,11111,00100,11111,11011',
    STICKFIGURE: '00100,11111,00100,01010,10001',
    GHOST: '11111,10101,11111,11111,10101',
    SWORD: '00100,00100,00100,01110,00100',
    GIRAFFE: '11000,01000,01000,01110,01010',
    SKULL: '01110,10101,11111,01110,01110',
    UMBRELLA: '01110,11111,00100,10100,01100',
    SNAKE: '11000,11011,01010,01110,00000',
    RABBIT: '10100,10100,11110,11010,11110',
    COW: '10001,10001,11111,01110,00100',
    QUARTER_NOTE: '00100,00100,00100,11100,11100',
    EIGHTH_NOTE: '00100,00110,00101,11100,11100',
    PITCHFORK: '10101,10101,11111,00100,00100',
    TARGET: '00100,01110,11011,01110,00100',
    TRIANGLE: '00000,00100,01010,11111,00000',
    CHESSBOARD: '01010,10101,01010,10101,01010',
    DIAMOND: '00100,01010,10001,01010,00100',
    SMALL_DIAMOND: '00000,00100,01010,00100,00000',
    SQUARE: '11111,10001,10001,10001,11111',
    SMALL_SQUARE: '00000,01110,01010,01110,00000',
    SCISSORS: '11001,11010,00100,11010,11001',
    ARROW_N: '00100,01110,10101,00100,00100',
    ARROW_NE: '00111,00011,00101,01000,10000',
    ARROW_E: '00100,00010,11111,00010,00100',
    ARROW_SE: '10000,01000,00101,00011,00111',
    ARROW_S: '00100,00100,10101,01110,00100',
    ARROW_SW: '00001,00010,10100,11000,11100',
    ARROW_W: '00100,01000,11111,01000,00100',
    ARROW_NW: '11100,11000,10100,00010,00001',
  };
  // 아이콘 한글 이름 (블록 드롭다운용)
  const ICON_KO = {
    HEART: '하트', SMALL_HEART: '작은 하트', YES: '체크', NO: '엑스', HAPPY: '웃는 얼굴', SAD: '슬픈 얼굴',
    CONFUSED: '혼란', ANGRY: '화남', ASLEEP: '잠', SURPRISED: '놀람', SILLY: '장난', FABULOUS: '멋짐', MEH: '시큰둥',
    TSHIRT: '티셔츠', ROLLERSKATE: '롤러스케이트', DUCK: '오리', HOUSE: '집', TORTOISE: '거북이', BUTTERFLY: '나비',
    STICKFIGURE: '사람', GHOST: '유령', SWORD: '칼', GIRAFFE: '기린', SKULL: '해골', UMBRELLA: '우산', SNAKE: '뱀',
    RABBIT: '토끼', COW: '소', QUARTER_NOTE: '4분음표', EIGHTH_NOTE: '8분음표', PITCHFORK: '쇠스랑', TARGET: '과녁',
    TRIANGLE: '삼각형', CHESSBOARD: '체스판', DIAMOND: '다이아몬드', SMALL_DIAMOND: '작은 다이아몬드',
    SQUARE: '사각형', SMALL_SQUARE: '작은 사각형', SCISSORS: '가위',
  };
  // MakeCode IconNames <-> 내부 키
  const MAKECODE_ICON = {
    Heart: 'HEART', SmallHeart: 'SMALL_HEART', Yes: 'YES', No: 'NO', Happy: 'HAPPY', Sad: 'SAD', Confused: 'CONFUSED',
    Angry: 'ANGRY', Asleep: 'ASLEEP', Surprised: 'SURPRISED', Silly: 'SILLY', Fabulous: 'FABULOUS', Meh: 'MEH',
    TShirt: 'TSHIRT', Rollerskate: 'ROLLERSKATE', Duck: 'DUCK', House: 'HOUSE', Tortoise: 'TORTOISE',
    Butterfly: 'BUTTERFLY', StickFigure: 'STICKFIGURE', Ghost: 'GHOST', Sword: 'SWORD', Giraffe: 'GIRAFFE',
    Skull: 'SKULL', Umbrella: 'UMBRELLA', Snake: 'SNAKE', Rabbit: 'RABBIT', Cow: 'COW', QuarterNote: 'QUARTER_NOTE',
    EigthNote: 'EIGHTH_NOTE', EighthNote: 'EIGHTH_NOTE', Pitchfork: 'PITCHFORK', Target: 'TARGET',
    Triangle: 'TRIANGLE', Chessboard: 'CHESSBOARD', Diamond: 'DIAMOND', SmallDiamond: 'SMALL_DIAMOND',
    Square: 'SQUARE', SmallSquare: 'SMALL_SQUARE', Scissors: 'SCISSORS',
  };
  const ARROWS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  function patternToLeds(p) {
    const out = [];
    p.split(',').forEach((row) => { for (let i = 0; i < 5; i++) out.push(row[i] === '1' ? 255 : 0); });
    return out;
  }

  // ---------- 5x5 폰트 ----------
  const FONT_SRC = {
    ' ': '00000,00000,00000,00000,00000', '!': '01000,01000,01000,00000,01000', '"': '01010,01010,00000,00000,00000',
    '#': '01010,11111,01010,11111,01010', '$': '01110,11001,01110,10011,01110', '%': '11001,10010,00100,01001,10011',
    '&': '01100,10010,01100,10010,01101', "'": '01000,01000,00000,00000,00000', '(': '00100,01000,01000,01000,00100',
    ')': '01000,00100,00100,00100,01000', '*': '00000,01010,00100,01010,00000', '+': '00000,00100,01110,00100,00000',
    ',': '00000,00000,00000,00100,01000', '-': '00000,00000,01110,00000,00000', '.': '00000,00000,00000,00000,01000',
    '/': '00001,00010,00100,01000,10000', '0': '01100,10010,10010,10010,01100', '1': '00100,01100,00100,00100,01110',
    '2': '11100,00010,01100,10000,11110', '3': '11110,00010,00100,10010,01100', '4': '00110,01010,10010,11111,00010',
    '5': '11111,10000,11110,00001,11110', '6': '00010,00100,01110,10001,01110', '7': '11111,00010,00100,01000,10000',
    '8': '01110,10001,01110,10001,01110', '9': '01110,10001,01110,00100,01000', ':': '00000,01000,00000,01000,00000',
    ';': '00000,00100,00000,00100,01000', '<': '00010,00100,01000,00100,00010', '=': '00000,01110,00000,01110,00000',
    '>': '01000,00100,00010,00100,01000', '?': '01110,00001,00110,00000,00100', '@': '01110,10001,10101,10011,01100',
    A: '01100,10010,11110,10010,10010', B: '11100,10010,11100,10010,11100', C: '01110,10000,10000,10000,01110',
    D: '11100,10010,10010,10010,11100', E: '11110,10000,11100,10000,11110', F: '11110,10000,11100,10000,10000',
    G: '01110,10000,10011,10001,01110', H: '10010,10010,11110,10010,10010', I: '11100,01000,01000,01000,11100',
    J: '11111,00010,00010,10010,01100', K: '10010,10100,11000,10100,10010', L: '10000,10000,10000,10000,11110',
    M: '10001,11011,10101,10001,10001', N: '10001,11001,10101,10011,10001', O: '01100,10010,10010,10010,01100',
    P: '11100,10010,11100,10000,10000', Q: '01100,10010,10010,01100,00110', R: '11100,10010,11100,10010,10001',
    S: '01110,10000,01100,00010,11100', T: '11111,00100,00100,00100,00100', U: '10010,10010,10010,10010,01100',
    V: '10001,10001,10001,01010,00100', W: '10001,10001,10101,11011,10001', X: '10010,10010,01100,10010,10010',
    Y: '10001,01010,00100,00100,00100', Z: '11110,00100,01000,10000,11110', '[': '01110,01000,01000,01000,01110',
    '\\': '10000,01000,00100,00010,00001', ']': '01110,00010,00010,00010,01110', '^': '00100,01010,00000,00000,00000',
    _: '00000,00000,00000,00000,11111', '`': '01000,00100,00000,00000,00000', '{': '00110,00100,01000,00100,00110',
    '|': '00100,00100,00100,00100,00100', '}': '01100,00100,00010,00100,01100', '~': '00000,00000,01101,10110,00000',
  };

  // 글자 -> 열(column) 배열. 각 열은 5개(0/1)
  function glyphColumns(ch) {
    let src = FONT_SRC[ch] || FONT_SRC[ch.toUpperCase()] || FONT_SRC['?'];
    const rows = src.split(',');
    const cols = [];
    for (let c = 0; c < 5; c++) cols.push(rows.map((r) => (r[c] === '1' ? 1 : 0)));
    if (ch === ' ') return cols.slice(0, 3);
    // 오른쪽 빈 열 제거
    while (cols.length > 1 && cols[cols.length - 1].every((v) => !v)) cols.pop();
    // 왼쪽 빈 열 제거
    while (cols.length > 1 && cols[0].every((v) => !v)) cols.shift();
    return cols;
  }
  // 한 글자를 5x5 화면 중앙에 표시할 LED 배열
  function charLeds(ch) {
    const src = FONT_SRC[ch] || FONT_SRC[String(ch).toUpperCase()] || FONT_SRC['?'];
    return patternToLeds(src);
  }
  // 스크롤용 전체 열 목록
  function textColumns(text) {
    const cols = [];
    const blank = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) cols.push(blank);
    for (const ch of String(text)) {
      glyphColumns(ch).forEach((c) => cols.push(c));
      cols.push(blank);
    }
    for (let i = 0; i < 4; i++) cols.push(blank);
    return cols;
  }

  // ---------- 멜로디 (MicroPython 표기) ----------
  const MELODIES = {
    DADADADUM: ['r4:2', 'g', 'g', 'g', 'eb:8', 'r:2', 'f', 'f', 'f', 'd:8'],
    ENTERTAINER: ['d4:1', 'd#', 'e', 'c5:2', 'e4:1', 'c5:2', 'e4:1', 'c5:3', 'c:1', 'd', 'd#', 'e', 'c', 'd', 'e:2', 'b4:1', 'd5:2', 'c:4'],
    PRELUDE: ['c4:1', 'e', 'g', 'c5', 'e', 'g4', 'c5', 'e', 'c4', 'e', 'g', 'c5', 'e', 'g4', 'c5', 'e'],
    ODE: ['e4', 'e', 'f', 'g', 'g', 'f', 'e', 'd', 'c', 'c', 'd', 'e', 'e:6', 'd:2', 'd:8'],
    NYAN: ['f#5:2', 'g#', 'c#:1', 'd#:2', 'b4:1', 'd5:1', 'c#', 'b4:2', 'b', 'c#5', 'd', 'd:1', 'c#', 'b4:1', 'c#5:1', 'd#', 'f#', 'g#', 'd#', 'f#', 'c#', 'd', 'b4', 'c#5', 'b4'],
    RINGTONE: ['c4:1', 'd', 'e:2', 'g', 'd:1', 'e', 'f:2', 'a', 'e:1', 'f', 'g:2', 'b', 'c5:4'],
    FUNK: ['c2:2', 'c', 'd#', 'c:1', 'f:2', 'c:1', 'f:2', 'f#', 'g', 'c', 'c', 'g', 'c:1', 'f#:2', 'c:1', 'f#:2', 'f', 'd#'],
    BLUES: ['c2:2', 'e', 'g', 'a', 'a#', 'a', 'g', 'e', 'c2:2', 'e', 'g', 'a', 'a#', 'a', 'g', 'e', 'f', 'a', 'c3', 'd', 'd#', 'd', 'c', 'a2', 'c2:2', 'e', 'g', 'a', 'a#', 'a', 'g', 'e'],
    BIRTHDAY: ['c4:3', 'c:1', 'd:4', 'c:4', 'f', 'e:8', 'c:3', 'c:1', 'd:4', 'c:4', 'g', 'f:8', 'c:3', 'c:1', 'c5:4', 'a4', 'f', 'e', 'd', 'a#:3', 'a#:1', 'a:4', 'f', 'g', 'f:8'],
    WEDDING: ['c4:4', 'f:3', 'f:1', 'f:8', 'c:4', 'g:3', 'e:1', 'f:8', 'c:4', 'f:3', 'a:1', 'c5:4', 'a4:3', 'f:1', 'f:4', 'e:3', 'f:1', 'g:8'],
    FUNERAL: ['c3:4', 'c:3', 'c:1', 'c:4', 'd#:3', 'd:1', 'd:3', 'c:1', 'c:3', 'b2:1', 'c3:4'],
    PUNCHLINE: ['c4:3', 'g3:1', 'f#', 'g', 'g#:3', 'g', 'r', 'b', 'c4'],
    BADDY: ['c3:3', 'r', 'd:2', 'd#', 'r', 'c', 'r', 'f#:8'],
    CHASE: ['a4:1', 'b', 'c5', 'b4', 'a:2', 'r', 'a:1', 'b', 'c5', 'b4', 'a:2', 'r', 'a:2', 'e5', 'd#', 'e', 'f', 'e', 'd#', 'e', 'b4:1', 'c5', 'd', 'c', 'b4:2', 'r', 'b:1', 'c5', 'd', 'c', 'b4:2', 'r', 'b:2', 'e5', 'd#', 'e', 'f', 'e', 'd#', 'e'],
    BA_DING: ['b5:1', 'e6:3'],
    WAWAWAWAA: ['e3:3', 'r:1', 'd#:3', 'r:1', 'd:4', 'r:1', 'c#:8'],
    JUMP_UP: ['c5:1', 'd', 'e', 'f', 'g'],
    JUMP_DOWN: ['g5:1', 'f', 'e', 'd', 'c'],
    POWER_UP: ['g4:1', 'c5', 'e', 'g:2', 'e:1', 'g:3'],
    POWER_DOWN: ['g5:1', 'd#', 'c', 'g4:2', 'b:1', 'c5:3'],
  };
  const MELODY_KO = {
    DADADADUM: '다다다덤', ENTERTAINER: '엔터테이너', PRELUDE: '전주곡', ODE: '환희의 송가', NYAN: '냥캣',
    RINGTONE: '벨소리', FUNK: '펑크', BLUES: '블루스', BIRTHDAY: '생일 축하', WEDDING: '결혼 행진곡', FUNERAL: '장송곡',
    PUNCHLINE: '펀치라인', BADDY: '악당', CHASE: '추격', BA_DING: '바딩', WAWAWAWAA: '와와와와', JUMP_UP: '점프 업',
    JUMP_DOWN: '점프 다운', POWER_UP: '파워 업', POWER_DOWN: '파워 다운',
  };
  // MakeCode Melodies 열거형 이름 -> 키
  const MAKECODE_MELODY = {
    Dadadadum: 'DADADADUM', Entertainer: 'ENTERTAINER', Prelude: 'PRELUDE', Ode: 'ODE', Nyan: 'NYAN',
    Ringtone: 'RINGTONE', Funk: 'FUNK', Blues: 'BLUES', Birthday: 'BIRTHDAY', Wedding: 'WEDDING', Funeral: 'FUNERAL',
    Punchline: 'PUNCHLINE', Baddy: 'BADDY', Chase: 'CHASE', BaDing: 'BA_DING', Wawawawaa: 'WAWAWAWAA',
    JumpUp: 'JUMP_UP', JumpDown: 'JUMP_DOWN', PowerUp: 'POWER_UP', PowerDown: 'POWER_DOWN',
  };

  const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  // MicroPython 멜로디 -> [{freq, ticks}] (freq 0 = 쉼표)
  function parseMelody(notes) {
    let octave = 4, dur = 4;
    const out = [];
    for (const raw of notes) {
      const m = /^([a-gr])([#b]?)(\d?)(?::(\d+))?$/i.exec(String(raw).trim());
      if (!m) continue;
      const n = m[1].toLowerCase();
      if (m[3]) octave = parseInt(m[3], 10);
      if (m[4]) dur = parseInt(m[4], 10);
      if (n === 'r') { out.push({ freq: 0, ticks: dur }); continue; }
      let semi = SEMI[n] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
      const midi = 12 * (octave + 1) + semi;
      out.push({ freq: 440 * Math.pow(2, (midi - 69) / 12), ticks: dur });
    }
    return out;
  }
  // MakeCode 텍스트 멜로디 "C D E F G A B C5" (음표:길이 형식도 지원)
  function parseMakeCodeMelody(str) {
    return parseMelody(String(str).trim().split(/\s+/).filter(Boolean).map((s) => s.replace('R', 'r')));
  }

  const NOTES = {
    C3: 131, CSharp3: 139, D3: 147, Eb3: 156, E3: 165, F3: 175, FSharp3: 185, G3: 196, GSharp3: 208, A3: 220, Bb3: 233, B3: 247,
    C: 262, CSharp: 277, D: 294, Eb: 311, E: 330, F: 349, FSharp: 370, G: 392, GSharp: 415, A: 440, Bb: 466, B: 494,
    C4: 262, CSharp4: 277, D4: 294, Eb4: 311, E4: 330, F4: 349, FSharp4: 370, G4: 392, GSharp4: 415, A4: 440, Bb4: 466, B4: 494,
    C5: 523, CSharp5: 555, D5: 587, Eb5: 622, E5: 659, F5: 698, FSharp5: 740, G5: 784, GSharp5: 831, A5: 880, Bb5: 932, B5: 988,
  };

  MQ.assets = {
    ICONS, ICON_KO, MAKECODE_ICON, ARROWS, patternToLeds, FONT_SRC, glyphColumns, charLeds, textColumns,
    MELODIES, MELODY_KO, MAKECODE_MELODY, parseMelody, parseMakeCodeMelody, NOTES,
  };
})();
