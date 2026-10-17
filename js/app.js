/* 앱: UI, 편집기, 실행 제어, 시뮬레이션 루프 */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const hw = MQ.hw, clock = MQ.clock;
  const STORE = 'maqueenSim.v1';

  const state = { mode: 'blocks', model: 'v4', running: null, speed: 1, mapId: 'open', jsDirty: false, pyDirty: false, previewLang: 'js', exampleId: null };

  // ---------- 토스트 ----------
  let toastT;
  function toast(msg, err) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false; t.classList.toggle('err', !!err);
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), err ? 5000 : 2200);
  }

  // ---------- 시리얼 ----------
  const serialEl = $('#serialOut');
  let serialLines = 0;
  function serialAppend(text, cls) {
    if (cls) {
      const s = document.createElement('span'); s.className = cls; s.textContent = text; serialEl.appendChild(s);
    } else serialEl.appendChild(document.createTextNode(text));
    serialLines += (text.match(/\n/g) || []).length;
    while (serialLines > 600 && serialEl.firstChild) {
      const n = serialEl.firstChild; serialLines -= ((n.textContent || '').match(/\n/g) || []).length; serialEl.removeChild(n);
    }
    serialEl.scrollTop = serialEl.scrollHeight;
  }
  hw.on('serial', (t) => serialAppend(t));
  hw.on('warn', (t) => serialAppend('⚠ ' + t + '\n', 'err'));
  $('#btnClearSerial').onclick = () => { serialEl.textContent = ''; serialLines = 0; };

  // ---------- Blockly ----------
  const theme = Blockly.Theme.defineTheme('mq', {
    base: Blockly.Themes.Classic,
    componentStyles: { workspaceBackgroundColour: '#f4f6fa', toolboxBackgroundColour: '#ffffff', flyoutBackgroundColour: '#e9edf3', flyoutOpacity: 0.97, scrollbarColour: '#c3cad6' },
    fontStyle: { family: 'Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif', weight: '600', size: 11 },
    blockStyles: {
      logic_blocks: { colourPrimary: '#00A4A6' }, loop_blocks: { colourPrimary: '#00AA00' }, math_blocks: { colourPrimary: '#9400D3' },
      text_blocks: { colourPrimary: '#B8860B' }, variable_blocks: { colourPrimary: '#DC143C' }, procedure_blocks: { colourPrimary: '#3455DB' },
    },
  });
  const ws = Blockly.inject('blocklyDiv', {
    toolbox: MQ.blocks.TOOLBOX, renderer: 'zelos', theme, media: 'vendor/blockly/media/',
    grid: { spacing: 24, length: 2, colour: '#dfe4ec', snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.75, maxScale: 2, minScale: 0.35, scaleSpeed: 1.15 },
    trashcan: true, move: { scrollbars: true, drag: true, wheel: false },
  });
  window.addEventListener('resize', () => Blockly.svgResize(ws));
  new ResizeObserver(() => Blockly.svgResize(ws)).observe($('#blocklyDiv'));

  // ---------- CodeMirror ----------
  const cmOpts = { theme: 'material-darker', lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, autoCloseBrackets: true, styleActiveLine: true, indentWithTabs: false,
    extraKeys: { Tab: (cm) => cm.replaceSelection('    '), 'Ctrl-Enter': () => run(), 'Cmd-Enter': () => run() } };
  const jsEd = CodeMirror($('#jsEditor'), Object.assign({ mode: 'javascript', value: '' }, cmOpts));
  const pyEd = CodeMirror($('#pyEditor'), Object.assign({ mode: 'python', value: '' }, cmOpts));
  jsEd.on('change', (cm, ch) => { if (ch.origin !== 'setValue') state.jsDirty = true; save(); });
  pyEd.on('change', (cm, ch) => { if (ch.origin !== 'setValue') state.pyDirty = true; save(); });

  function genJs() { try { return MQ.blocks.workspaceToJs(ws); } catch (e) { console.error(e); return '// 변환 오류: ' + e.message; } }
  function genPy() { try { return MQ.blocks.workspaceToPython(ws); } catch (e) { console.error(e); return '# 변환 오류: ' + e.message; } }

  // ---------- 모드 전환 ----------
  const MODE_HINT = { blocks: 'MakeCode 블록 — 블록을 끌어다 놓아 코딩하세요', js: 'MakeCode JavaScript (TypeScript 문법 일부 지원)', python: 'micro:bit MicroPython' };
  function setMode(mode, opts) {
    opts = opts || {};
    if (!opts.silent && state.mode === 'blocks' && mode !== 'blocks') {
      if (mode === 'js') {
        if (!state.jsDirty || confirm('블록에서 변환한 JavaScript 코드로 바꿀까요?\n(직접 수정한 JavaScript 코드는 사라집니다. 취소하면 기존 코드를 유지합니다)')) { jsEd.setValue(genJs()); state.jsDirty = false; }
      } else if (mode === 'python') {
        if (!state.pyDirty || confirm('블록에서 변환한 MicroPython 코드로 바꿀까요?\n(직접 수정한 Python 코드는 사라집니다. 취소하면 기존 코드를 유지합니다)')) { pyEd.setValue(genPy()); state.pyDirty = false; }
      }
    }
    state.mode = mode;
    $$('.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('#blocklyDiv').hidden = mode !== 'blocks';
    $('#jsEditor').hidden = mode !== 'js';
    $('#pyEditor').hidden = mode !== 'python';
    $('#btnPreview').hidden = mode !== 'blocks';
    if (mode !== 'blocks') $('#previewPanel').hidden = true;
    $('#modeHint').textContent = MODE_HINT[mode];
    if (mode === 'blocks') setTimeout(() => Blockly.svgResize(ws), 0);
    if (mode === 'js') setTimeout(() => jsEd.refresh(), 0);
    if (mode === 'python') setTimeout(() => pyEd.refresh(), 0);
    save();
  }
  $$('.mode').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

  // ---------- 코드 미리보기 ----------
  function updatePreview() {
    if ($('#previewPanel').hidden) return;
    $('#previewCode').textContent = state.previewLang === 'js' ? genJs() : genPy();
  }
  $('#btnPreview').onclick = () => { const p = $('#previewPanel'); p.hidden = !p.hidden; $('#btnPreview').textContent = p.hidden ? '코드 미리보기 ▾' : '코드 미리보기 ▴'; updatePreview(); setTimeout(() => Blockly.svgResize(ws), 0); };
  $$('.ptab').forEach((b) => (b.onclick = () => { state.previewLang = b.dataset.p; $$('.ptab').forEach((x) => x.classList.toggle('active', x === b)); updatePreview(); }));
  $('#btnPreviewCopy').onclick = () => { state.jsDirty = state.pyDirty = false; setMode(state.previewLang === 'js' ? 'js' : 'python'); };
  let wsTimer;
  ws.addChangeListener((e) => {
    if (e.isUiEvent) return;
    clearTimeout(wsTimer);
    wsTimer = setTimeout(() => { updatePreview(); save(); }, 250);
  });

  // ---------- 저장 ----------
  let loading = false;
  function snapshot() {
    return { v: 1, mode: state.mode, model: state.model, map: state.mapId, blocks: Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws)), js: jsEd.getValue(), py: pyEd.getValue(), jsDirty: state.jsDirty, pyDirty: state.pyDirty };
  }
  function save() { if (loading) return; try { localStorage.setItem(STORE, JSON.stringify(snapshot())); } catch (e) { /* 저장 불가 환경 */ } }
  function restore(data) {
    loading = true;
    try {
      ws.clear();
      if (data.blocks) Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(data.blocks), ws);
      jsEd.setValue(data.js || genJs()); pyEd.setValue(data.py || genPy());
      state.jsDirty = !!data.jsDirty; state.pyDirty = !!data.pyDirty;
      if (data.map) loadMap(data.map);
      setModel(data.model || 'v4');
      setMode(data.mode || 'blocks', { silent: true });
    } finally { loading = false; }
    save();
  }

  $('#btnSave').onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `maqueen-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('프로젝트 파일을 저장했습니다.');
  };
  $('#btnLoad').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const text = await f.text();
    e.target.value = '';
    stop();
    try {
      if (/\.py$/i.test(f.name)) { pyEd.setValue(text); state.pyDirty = true; setMode('python', { silent: true }); }
      else if (/\.(js|ts)$/i.test(f.name)) { jsEd.setValue(text); state.jsDirty = true; setMode('js', { silent: true }); }
      else restore(JSON.parse(text));
      showExampleInfo(null);
      toast(`"${f.name}" 을(를) 불러왔습니다.`);
    } catch (err) { toast('파일을 불러오지 못했습니다: ' + err.message, true); }
  };
  $('#btnNew').onclick = () => {
    if (!confirm('새 프로젝트를 시작할까요? 현재 작업 내용은 지워집니다.')) return;
    stop();
    loading = true;
    ws.clear();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom('<xml><block type="mb_on_start" x="30" y="30"></block><block type="mb_forever" x="30" y="150"></block></xml>'), ws);
    jsEd.setValue(genJs()); pyEd.setValue(genPy()); state.jsDirty = state.pyDirty = false;
    loading = false;
    $('#exampleSel').value = '';
    showExampleInfo(null);
    setMode('blocks', { silent: true });
  };

  // ---------- 예제 ----------
  function buildExampleSelect() {
    const sel = $('#exampleSel');
    sel.innerHTML = '<option value="">— 예제 선택 —</option>';
    const groups = {};
    MQ.examples.forEach((ex) => { (groups[ex.group] = groups[ex.group] || []).push(ex); });
    Object.entries(groups).forEach(([g, list]) => {
      const og = document.createElement('optgroup'); og.label = g;
      list.forEach((ex) => { const o = document.createElement('option'); o.value = ex.id; o.textContent = ex.name; og.appendChild(o); });
      sel.appendChild(og);
    });
    sel.onchange = () => { if (sel.value) loadExample(sel.value); };
  }
  function showExampleInfo(ex) {
    const el = $('#exampleInfo');
    if (!ex) { el.hidden = true; state.exampleId = null; return; }
    const mapName = MQ.getMap(ex.map).name;
    el.innerHTML = `<b>📘 ${ex.name}</b> — ${ex.desc} <span style="opacity:.7">(추천 공간: ${mapName})</span>`;
    el.hidden = false;
    state.exampleId = ex.id;
  }
  function loadExample(id) {
    const ex = MQ.examples.find((e) => e.id === id);
    if (!ex) return;
    stop();
    loading = true;
    try {
      ws.clear();
      if (ex.xml) {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(ex.xml), ws);
        ws.scrollCenter();
        jsEd.setValue(genJs()); pyEd.setValue(genPy());
      }
      if (ex.py) pyEd.setValue(ex.py);
      if (ex.js) jsEd.setValue(ex.js);
      state.jsDirty = !!ex.js; state.pyDirty = !!ex.py;
    } finally { loading = false; }
    if (ex.map) loadMap(ex.map);
    setModel(ex.model || 'v4');
    if (ex.pose) { robot.setPose(ex.pose.x, ex.pose.y, (ex.pose.a * Math.PI) / 180); view.clearTrail(); }
    setMode(ex.mode || 'blocks', { silent: true });
    $('#exampleSel').value = id;
    showExampleInfo(ex);
    serialAppend(`── 예제 불러옴: ${ex.name} ──\n`, 'sys');
  }

  // ---------- 로봇 모델 (V4 / V5) ----------
  function setModel(m) {
    m = m === 'v5' ? 'v5' : 'v4';
    state.model = m;
    hw.setModel(m);
    $('#modelSel').value = m;
    document.body.classList.toggle('model-v5', m === 'v5');
    $('#stLineBox').classList.toggle('three', m === 'v5');
    $('#stLine1').hidden = m !== 'v5';
    $('#hud1').hidden = m !== 'v5';
    const lab = m === 'v5' ? [['라인 L', 'I2C'], ['라인 M', 'I2C'], ['라인 R', 'I2C']] : [['라인 왼쪽', 'P13'], ['', ''], ['라인 오른쪽', 'P14']];
    [0, 1, 2].forEach((i) => { const e = $('#stLine' + i); e.querySelector('b').textContent = lab[i][0]; e.querySelector('small').textContent = lab[i][1]; });
    $('#stLedLabel').textContent = m === 'v5' ? 'RGB 조명 L/R' : 'LED P8/P12';
    $('#hudModel').textContent = m === 'v5' ? '마퀸 V5' : '마퀸 V4';
    save();
  }
  $('#modelSel').onchange = () => { stop(); setModel($('#modelSel').value); };

  // ---------- 맵 / 3D ----------
  const robot = new MQ.Robot();
  hw.robot = robot;
  const view = new MQ.View($('#view3d'));
  view.robot = robot;

  function buildMapSelect() {
    const sel = $('#mapSel');
    const g1 = document.createElement('optgroup'); g1.label = '주행 공간';
    const g2 = document.createElement('optgroup'); g2.label = '라인트레이싱 맵';
    MQ.maps.forEach((m) => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.name; (m.group === 'line' ? g2 : g1).appendChild(o); });
    sel.append(g1, g2);
    sel.onchange = () => { loadMap(sel.value); save(); };
  }
  function loadMap(id) {
    const map = MQ.getMap(id);
    state.mapId = map.id;
    $('#mapSel').value = map.id;
    const scale = Math.min(5, 2400 / Math.max(map.w, map.h));
    const c = document.createElement('canvas');
    c.width = Math.round(map.w * scale); c.height = Math.round(map.h * scale);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.scale(scale, scale);
    map.floor(g, map.w, map.h);
    const img = g.getImageData(0, 0, c.width, c.height);
    robot.setMap(map, { data: img.data, w: c.width, h: c.height, scale });
    view.buildMap(map, c);
    $('#mapDesc').textContent = `${map.name} · ${map.w}×${map.h}cm — ${map.desc || ''}`;
  }

  // ---------- 실행 / 정지 ----------
  function setRunningUI(on) {
    $('#btnRun').classList.toggle('running', on);
    $('#btnRun').textContent = on ? '⟳ 다시 실행' : '▶ 실행';
    $('#btnStop').disabled = !on;
    const s = $('#hudState');
    s.textContent = on ? '● 실행 중' : '● 정지됨';
    s.classList.toggle('on', on);
  }
  function stop() {
    if (state.running) { state.running.stop(); state.running = null; }
    clock.cancelAll();
    hw.reset();
    setRunningUI(false);
  }
  function onError(e) {
    const msg = (e && e.message) || String(e);
    serialAppend('✖ 오류: ' + msg + '\n', 'err');
    toast('오류: ' + msg, true);
    console.error(e);
    stop();
  }
  function run() {
    stop();
    MQ.sound.ensure();
    let code, rt;
    if (state.mode === 'python') { code = pyEd.getValue(); rt = MQ.pyrt; }
    else { code = state.mode === 'js' ? jsEd.getValue() : genJs(); rt = MQ.jsrt; }
    serialAppend(`── 실행 (${{ blocks: '블록', js: 'JavaScript', python: 'MicroPython' }[state.mode]}) ──\n`, 'sys');
    const h = rt.run(code, { onError, onDone: () => {} });
    if (h) { state.running = h; setRunningUI(true); }
  }
  $('#btnRun').onclick = run;
  $('#btnStop').onclick = stop;
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable || t.closest('.CodeMirror') || t.closest('.blocklyWidgetDiv'));
    if (typing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'a' || k === 'b') { hw.pressButton(k.toUpperCase(), true); $('#mb' + k.toUpperCase()).classList.add('down'); }
    if (k === 's') hw.shake();
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if ((k === 'a' || k === 'b') && hw.buttons[k.toUpperCase()]) { hw.pressButton(k.toUpperCase(), false); $('#mb' + k.toUpperCase()).classList.remove('down'); }
  });

  // ---------- micro:bit 패널 ----------
  const ledEls = [];
  for (let i = 0; i < 25; i++) { const d = document.createElement('i'); $('#mbLeds').appendChild(d); ledEls.push(d); }
  ['A', 'B'].forEach((n) => {
    const b = $('#mb' + n);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); hw.pressButton(n, true); b.classList.add('down'); });
    const up = () => { if (hw.buttons[n]) hw.pressButton(n, false); b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });
  $('#mbAB').onclick = () => hw.clickButton('AB');
  $('#mbShake').onclick = () => hw.shake();
  $('#mbLogo').addEventListener('pointerdown', () => { hw.pressButton('LOGO', true); $('#mbLogo').classList.add('on'); });
  $('#mbLogo').addEventListener('pointerup', () => { hw.pressButton('LOGO', false); $('#mbLogo').classList.remove('on'); });

  // 환경 슬라이더
  const env = [['envLight', 'light', (v) => v], ['envTemp', 'temp', (v) => v + '°C'], ['envAx', 'ax', (v) => v], ['envAy', 'ay', (v) => v]];
  env.forEach(([id, key, fmt]) => {
    const el = $('#' + id);
    el.oninput = () => { hw.env[key] = +el.value; $('#' + id + 'V').textContent = fmt(+el.value); };
  });
  // IR 리모컨
  MQ.IR_KEYS.forEach(([label, code]) => {
    const b = document.createElement('button');
    b.textContent = label; b.title = `코드 ${code}`;
    if ([4, 5, 6, 8, 10].includes(code)) b.classList.add('nav');
    b.onclick = () => { hw.irReceive(code); };
    $('#irPad').appendChild(b);
  });
  // 탭
  $$('.tab').forEach((t) => (t.onclick = () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.tab-body').forEach((b) => (b.hidden = b.dataset.body !== t.dataset.tab));
    $('#btnClearSerial').hidden = t.dataset.tab !== 'serial';
  }));

  // 툴바
  $$('#camSeg button').forEach((b) => (b.onclick = () => { $$('#camSeg button').forEach((x) => x.classList.toggle('active', x === b)); view.setCamMode(b.dataset.cam); }));
  $$('#speedSeg button').forEach((b) => (b.onclick = () => { $$('#speedSeg button').forEach((x) => x.classList.toggle('active', x === b)); state.speed = +b.dataset.speed; }));
  $('#optBeam').onchange = (e) => (view.showBeam = e.target.checked);
  $('#optTrail').onchange = (e) => { view.showTrail = e.target.checked; };
  $('#optSensor').onchange = (e) => (view.showSensors = e.target.checked);
  $('#btnResetPose').onclick = () => { robot.resetPose(); view.clearTrail(); };
  $('#btnSound').onclick = () => {
    MQ.sound.muted = !MQ.sound.muted;
    $('#btnSound').textContent = MQ.sound.muted ? '🔇' : '🔊';
    if (MQ.sound.muted) MQ.sound.stopOsc(); else { MQ.sound.ensure(); if (hw.music.freq) MQ.sound.start(hw.music.freq); }
  };
  $('#btnHelp').onclick = () => $('#helpDlg').showModal();

  // 분할 바
  (function () {
    const sp = $('#splitter'), cp = $('#codePane');
    let drag = false;
    sp.addEventListener('pointerdown', (e) => { drag = true; sp.classList.add('drag'); sp.setPointerCapture(e.pointerId); });
    sp.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const pct = Math.min(75, Math.max(22, (e.clientX / window.innerWidth) * 100));
      cp.style.flexBasis = pct + '%';
    });
    sp.addEventListener('pointerup', () => { drag = false; sp.classList.remove('drag'); Blockly.svgResize(ws); jsEd.refresh(); pyEd.refresh(); });
  })();

  // ---------- 상태창 갱신 ----------
  const el = {};
  const lineEls = [0, 1, 2].map((i) => document.getElementById('stLine' + i));
  const hudEls = [0, 1, 2].map((i) => document.getElementById('hud' + i));
  ['stLight', 'stBatt', 'stUs', 'stUsBar', 'stM1', 'stM2', 'stM1d', 'stM2d', 'stM1v', 'stM2v', 'stLed0', 'stLed1', 'stServo', 'stBuzz', 'stCompass', 'stIr', 'stSpeed', 'stPos', 'hudUs', 'hudTime']
    .forEach((id) => (el[id] = document.getElementById(id)));
  const rgbEls = [0, 1, 2, 3].map((i) => document.getElementById('stRgb' + i));
  let lastStatus = 0;
  function updateStatus(now) {
    // micro:bit LED (매 프레임)
    for (let i = 0; i < 25; i++) {
      const b = (hw.leds[i] / 255) * (hw.brightness / 255);
      ledEls[i].style.background = b > 0 ? `rgba(255,${Math.round(40 + 30 * b)},${Math.round(30 * b)},${0.25 + 0.75 * b})` : '';
      ledEls[i].style.boxShadow = b > 0.3 ? `0 0 ${Math.round(8 * b)}px rgba(255,60,40,${b})` : '';
    }
    if (now - lastStatus < 80) return;
    lastStatus = now;
    const v5 = state.model === 'v5';
    const sens = v5 ? [robot.lineSensor(0), robot.lineSensor(1), robot.lineSensor(2)] : [robot.lineSensor(0), 0, robot.lineSensor(1)];
    sens.forEach((v, i) => {
      lineEls[i].classList.toggle('black', !!v);
      lineEls[i].querySelector('.ls-val').textContent = v;
      hudEls[i].classList.toggle('black', !!v);
    });
    const raw = robot.ultrasonicRaw();
    const d = raw < 0 ? null : raw;
    el.stUs.textContent = d === null ? '500' : d.toFixed(1);
    el.hudUs.textContent = d === null ? '감지 없음' : d.toFixed(1) + ' cm';
    el.stUsBar.style.width = (d === null ? 100 : Math.min(100, (d / 200) * 100)) + '%';
    el.stUsBar.style.background = d !== null && d < 20 ? '#e5484d' : d !== null && d < 50 ? '#f5a524' : '#1e90ff';
    hw.motors.forEach((m, i) => {
      const bar = i ? el.stM2 : el.stM1, dirEl = i ? el.stM2d : el.stM1d, val = i ? el.stM2v : el.stM1v;
      bar.style.width = (m.speed / 255) * 100 + '%';
      bar.classList.toggle('bw', !!m.dir);
      dirEl.textContent = m.speed ? (m.dir ? '▼' : '▲') : '■';
      dirEl.className = 'mot-dir' + (m.speed ? (m.dir ? ' bw' : ' fw') : '');
      val.textContent = m.speed;
    });
    if (v5) {
      [el.stLed0, el.stLed1].forEach((e, i) => {
        const [r, g, b] = hw.carLightRGB(i), on = r + g + b > 0;
        e.classList.remove('on');
        e.style.background = on ? `rgb(${r},${g},${b})` : '';
        e.style.boxShadow = on ? `0 0 6px rgb(${r},${g},${b})` : '';
      });
      el.stLight.textContent = `${hw.lightValue(0)} / ${hw.lightValue(1)}`;
      el.stBatt.textContent = `${hw.battery()}% · ${hw.v5.patrol ? 'ON' : 'OFF'}`;
    } else {
      [el.stLed0, el.stLed1].forEach((e, i) => { e.style.background = ''; e.style.boxShadow = ''; e.classList.toggle('on', hw.redLeds[i] > 0.05); });
    }
    const kb = hw.pixelBrightness / 255;
    hw.pixels.forEach((c, i) => { rgbEls[i].style.background = `rgb(${c[0] * kb},${c[1] * kb},${c[2] * kb})`; });
    el.stServo.textContent = `${hw.servos[0]}° / ${hw.servos[1]}°`;
    el.stBuzz.textContent = hw.music.freq ? Math.round(hw.music.freq) + ' Hz' : '-';
    el.stCompass.textContent = robot.compass() + '°';
    el.stIr.textContent = hw.irCode >= 0 ? hw.irCode : '-';
    el.stSpeed.textContent = ((robot.vl + robot.vr) / 2).toFixed(1) + ' cm/s';
    el.stPos.textContent = `${robot.x.toFixed(0)}, ${robot.y.toFixed(0)}`;
    el.hudTime.textContent = (clock.now / 1000).toFixed(1) + ' s';
  }

  // ---------- 시뮬레이션 루프 ----------
  const STEP = 5; // ms
  let acc = 0, lastT = performance.now();
  const chan = new MessageChannel(); const q = [];
  chan.port1.onmessage = () => { const f = q.shift(); f && f(); };
  const tick = () => new Promise((r) => { q.push(r); chan.port2.postMessage(0); });
  // requestAnimationFrame 이 멈추는 환경(백그라운드 탭 등)에서도 시뮬레이션 시간이 흐르도록 타이머로 보완
  let inFrame = false, rafPending = false, lastFrameAt = performance.now();
  function schedule() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; frame(); });
  }
  setInterval(() => { if (!inFrame && performance.now() - lastFrameAt > 150) frame(); }, 100);
  async function frame() {
    if (inFrame) return;
    inFrame = true;
    const now = performance.now();
    lastFrameAt = now;
    const dt = Math.min(100, now - lastT); lastT = now;
    acc += dt * state.speed;
    if (acc > 400) acc = 400;
    try {
      while (acc >= STEP) {
        acc -= STEP;
        hw.patrolStep();
        robot.step(STEP / 1000, hw.motors);
        clock.now += STEP;
        if (clock.release()) {
          // 깨어난 프로그램이 다음 대기(sleep)에 도달할 때까지 잠시 기다린 뒤 물리 계산을 계속 (제어 지연 방지)
          const seq = clock.seq;
          for (let k = 0; k < 30 && clock.seq === seq; k++) await tick();
        }
      }
      view.update(robot, hw);
      updateStatus(now);
    } catch (e) { console.error(e); }
    inFrame = false;
    schedule();
  }

  // ---------- 시작 ----------
  buildMapSelect();
  buildExampleSelect();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
  setModel('v4');
  if (saved && saved.blocks) { loadMap(saved.map || 'open'); restore(saved); }
  else { loadMap('open'); loadExample('heart'); }
  schedule();
  setTimeout(() => MQ.pyrt.warmup(), 300); // 파이썬 모듈 미리 컴파일
  serialAppend('Maqueen 시뮬레이터 준비 완료. 예제를 선택하거나 코딩한 뒤 ▶ 실행을 누르세요.\n', 'sys');

  MQ.app = { run, stop, loadExample, loadMap, setModel, state, ws, jsEd, pyEd, robot, view, genJs, genPy };
})();
