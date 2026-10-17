/* Three.js 3D 렌더링: 맵, 마퀸 로봇 모델, 카메라 */
(function () {
  const R = MQ.ROBOT;

  function mat(color, opts) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.05 }, opts || {})); }

  function glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  // 둥근 사각형 Shape
  function roundRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  class View {
    constructor(container) {
      this.container = container;
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x2b313b);
      this.scene.fog = new THREE.Fog(0x2b313b, 900, 2200);
      this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 5000);
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
      this.controls.minDistance = 8;
      this.controls.maxDistance = 1500;

      // 실내 환경맵(반사광) — 금속/광택 재질을 실물처럼
      if (THREE.RoomEnvironment) {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      }
      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.35));
      this.sun = new THREE.DirectionalLight(0xfff4e6, 1.1);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.bias = -0.0008;
      this.scene.add(this.sun); this.scene.add(this.sun.target);

      this.glowTex = glowTexture();
      const rb = MQ.buildRobotModel(this.glowTex);
      this.robotObj = rb.group; this.parts = rb.parts;
      this.scene.add(this.robotObj);

      // 초음파 빔
      this.beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
      this.scene.add(this.beam);
      this.beamDot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      this.scene.add(this.beamDot);
      // 라인센서 점
      this.lineDots = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.45, 14), new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.85, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; this.scene.add(m); return m;
      });
      // 주행 궤적
      this.trailMax = 6000;
      this.trailGeo = new THREE.BufferGeometry();
      this.trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.trailMax * 3), 3));
      this.trailGeo.setDrawRange(0, 0);
      this.trail = new THREE.Line(this.trailGeo, new THREE.LineBasicMaterial({ color: 0xff6d00 }));
      this.trail.frustumCulled = false;
      this.scene.add(this.trail);
      this.trailCount = 0;

      this.mapGroup = new THREE.Group();
      this.scene.add(this.mapGroup);
      this.showBeam = true; this.showTrail = true; this.showSensors = true;
      this.camMode = 'orbit';

      this.raycaster = new THREE.Raycaster();
      this.setupDrag();
      this.resize();
      new ResizeObserver(() => this.resize()).observe(container);
    }

    applyModel(m) {
      this._model = m;
      const p = this.parts, v5 = m === 'v5';
      p.redLeds.forEach((o) => { o.group.visible = !v5; if (v5) o.glow.visible = false; });
      p.carLights.forEach((c) => { c.group.visible = v5; if (!v5) c.glow.visible = false; });
      p.pcbMat.map = v5 ? p.pcbTex.v5 : p.pcbTex.v4; p.pcbMat.needsUpdate = true;
      const off = v5 ? [-MQ.ROBOT.LINE_Y5, 0, MQ.ROBOT.LINE_Y5] : [-MQ.ROBOT.LINE_Y, 0, MQ.ROBOT.LINE_Y];
      p.lineSens.forEach((s, i) => { s.position.z = off[i]; s.visible = v5 || i !== 1; });
      p.lineLeds.forEach((s, i) => { s.visible = v5 || i !== 1; });
    }

    resize() {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    buildMap(map, floorCanvas) {
      this.map = map;
      // 기존 제거
      this.mapGroup.children.slice().forEach((c) => { this.mapGroup.remove(c); c.geometry && c.geometry.dispose(); });
      const W = map.w, H = map.h;
      // 바깥 바닥
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), mat(0x39404b, { roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -0.6, H / 2); ground.receiveShadow = true;
      this.mapGroup.add(ground);
      // 테이블/매트
      const base = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 0.6, H + 6), mat(0x8d6e63));
      base.position.set(W / 2, -0.31, H / 2); base.receiveShadow = true; this.mapGroup.add(base);
      // 바닥 텍스처
      const tex = new THREE.CanvasTexture(floorCanvas);
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      tex.encoding = THREE.sRGBEncoding;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(W / 2, 0, H / 2); floor.receiveShadow = true;
      floor.name = 'floor';
      this.mapGroup.add(floor);
      this.floorMesh = floor;
      // 경계 벽
      const bh = map.border, t = 2;
      const bm = mat(bh > 5 ? 0x90a4ae : 0x546e7a);
      [[W / 2, -t / 2, W + 2 * t, t], [W / 2, H + t / 2, W + 2 * t, t], [-t / 2, H / 2, t, H], [W + t / 2, H / 2, t, H]].forEach(([x, y, w, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, bh, d), bm);
        m.position.set(x, bh / 2, y); m.castShadow = m.receiveShadow = true; this.mapGroup.add(m);
      });
      // 장애물
      map.obstacles.forEach((o) => {
        let m;
        if (o.t === 'cyl') m = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, o.h, 32), mat(o.c || 0x888888));
        else {
          m = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d), mat(o.c || 0x888888));
          m.rotation.y = -((o.rot || 0) * Math.PI) / 180;
        }
        m.position.set(o.x, o.h / 2, o.y); m.castShadow = m.receiveShadow = true;
        this.mapGroup.add(m);
      });
      // 조명/그림자 범위
      const S = Math.max(W, H);
      this.sun.position.set(W / 2 - S * 0.35, S * 1.1, H / 2 - S * 0.5);
      this.sun.target.position.set(W / 2, 0, H / 2);
      const sc = this.sun.shadow.camera;
      sc.left = -S * 0.8; sc.right = S * 0.8; sc.top = S * 0.8; sc.bottom = -S * 0.8; sc.near = 1; sc.far = S * 4;
      sc.updateProjectionMatrix();
      this.clearTrail();
      this.setCamMode(this.camMode, true);
    }

    setCamMode(mode, reset) {
      this.camMode = mode;
      const m = this.map; if (!m) return;
      const S = Math.max(m.w, m.h);
      this.controls.enabled = mode === 'orbit' || mode === 'top';
      if (mode === 'orbit' && reset !== false) {
        this.camera.fov = 50; this.camera.updateProjectionMatrix();
        // 맵 중심과 로봇 출발점 사이를 바라보며, 로봇이 잘 보이도록 적당히 가까이
        const sx = (m.w / 2 + m.start.x) / 2, sy = (m.h / 2 + m.start.y) / 2;
        const D = Math.min(S * 0.75, 230);
        this.controls.target.set(sx, 0, sy);
        this.camera.position.set(sx, D * 0.8, sy + D);
      } else if (mode === 'top') {
        this.camera.fov = 50; this.camera.updateProjectionMatrix();
        this.controls.target.set(m.w / 2, 0, m.h / 2);
        this.camera.position.set(m.w / 2, S * 1.15, m.h / 2 + 0.01);
      } else if (mode === 'follow' || mode === 'fpv') {
        this.camera.fov = mode === 'fpv' ? 75 : 55; this.camera.updateProjectionMatrix();
        this._followInit = true;
      }
      this.controls.update();
    }

    clearTrail() { this.trailCount = 0; this.trailGeo.setDrawRange(0, 0); this._lastTrail = null; }

    setupDrag() {
      const el = this.renderer.domElement;
      const ptr = new THREE.Vector2();
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      const toNdc = (e) => { const r = el.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || !this.robot) return;
        toNdc(e);
        this.raycaster.setFromCamera(ptr, this.camera);
        const hits = this.raycaster.intersectObject(this.robotObj, true);
        if (hits.length) {
          this.dragging = { rotate: e.shiftKey };
          this.controls.enabled = false;
          el.setPointerCapture(e.pointerId);
          el.style.cursor = 'grabbing';
          e.stopPropagation();
        }
      }, true);
      el.addEventListener('pointermove', (e) => {
        if (!this.dragging) {
          // 마우스 오버 커서
          toNdc(e); this.raycaster.setFromCamera(ptr, this.camera);
          el.style.cursor = this.raycaster.intersectObject(this.robotObj, true).length ? 'grab' : '';
          return;
        }
        toNdc(e);
        this.raycaster.setFromCamera(ptr, this.camera);
        if (this.raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
          const rb = this.robot;
          if (this.dragging.rotate || e.shiftKey) rb.setPose(rb.x, rb.y, Math.atan2(hitPoint.z - rb.y, hitPoint.x - rb.x));
          else rb.setPose(hitPoint.x, hitPoint.z);
          this.clearTrail();
        }
      });
      const end = () => {
        if (!this.dragging) return;
        this.dragging = null; el.style.cursor = '';
        this.controls.enabled = this.camMode === 'orbit' || this.camMode === 'top';
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    update(robot, hw) {
      this.robot = robot;
      const g = this.robotObj;
      g.position.set(robot.x, 0, robot.y);
      g.rotation.y = -robot.th;
      const p = this.parts;
      p.wheels[0].rotation.z = -robot.wheelAngL; // 왼쪽 바퀴: -z 쪽
      p.wheels[1].rotation.z = -robot.wheelAngR;

      // micro:bit LED
      for (let i = 0; i < 25; i++) {
        const b = (hw.leds[i] / 255) * (hw.brightness / 255);
        p.mbLeds[i].material.color.setRGB(0.16 + 0.84 * b, 0.02 + 0.2 * b * b, 0.02 + 0.1 * b * b);
      }
      p.btnA.material.color.set(hw.buttons.A ? 0xffcc00 : 0x333333);
      p.btnB.material.color.set(hw.buttons.B ? 0xffcc00 : 0x333333);
      // 빨간 LED
      if (robot.model !== 'v5') p.redLeds.forEach((o, i) => {
        const v = hw.redLeds[i];
        o.led.material.emissive.setRGB(v, 0, 0);
        o.led.material.color.set(v ? 0xff3030 : 0x661111);
        o.glow.visible = v > 0.05; o.glow.material.opacity = Math.min(1, v);
      });
      // RGB
      let sr = 0, sg = 0, sb = 0;
      const kb = hw.pixelBrightness / 255;
      hw.pixels.forEach((c, i) => {
        const r = (c[0] / 255) * kb, gg = (c[1] / 255) * kb, b = (c[2] / 255) * kb;
        p.rgb[i].material.color.setRGB(0.13 + r, 0.13 + gg, 0.13 + b);
        sr += r; sg += gg; sb += b;
      });
      p.underGlow.material.color.setRGB(Math.min(1, sr / 2.2), Math.min(1, sg / 2.2), Math.min(1, sb / 2.2));
      // 모델(V4/V5) 차이 반영
      if (this._model !== robot.model) this.applyModel(robot.model);
      const nS = robot.lineOffsets().length;
      // 라인센서 표시 LED (흰 바닥에서 켜짐)
      [0, 1, 2].forEach((i) => {
        if (i >= nS) { this.lineDots[i].visible = false; return; }
        const black = robot.lineSensor(i);
        const ind = p.lineLeds[nS === 2 ? i * 2 : i];
        ind.material.color.set(black ? 0x0a2a55 : 0x40a0ff);
        const [x, y] = robot.lineSensorPos(i);
        this.lineDots[i].position.set(x, 0.08, y);
        this.lineDots[i].material.color.set(black ? 0x00e676 : 0xff3333);
        this.lineDots[i].visible = this.showSensors;
      });
      // V5 RGB 자동차 조명
      if (robot.model === 'v5') {
        p.carLights.forEach((c, i) => {
          const [r, g, b] = hw.carLightRGB(i);
          const on = r + g + b > 0;
          c.lensMat.color.setRGB(on ? 0.6 + 0.4 * r / 255 : 0.95, on ? 0.6 + 0.4 * g / 255 : 0.95, on ? 0.6 + 0.4 * b / 255 : 0.95);
          c.lensMat.emissive.setRGB(r / 255, g / 255, b / 255);
          c.glow.visible = on; c.glow.material.color.setRGB(r / 255, g / 255, b / 255);
        });
      }
      // 서보 혼
      hw.servos.forEach((a, i) => { p.servoHorns[i].rotation.y = ((a - 90) * Math.PI) / 180; });

      // 초음파 빔
      robot.ultrasonicRaw();
      const us = robot.lastUs;
      if (this.showBeam && us) {
        const d = Math.min(isFinite(us.d) ? us.d : R.US_MAX, R.US_MAX);
        const len = Math.max(0.5, d);
        const rad = Math.tan((15 * Math.PI) / 180) * len;
        this.beam.visible = true;
        this.beam.scale.set(rad, len, rad);
        const cx = us.sx + (Math.cos(robot.th) * len) / 2, cy = us.sy + (Math.sin(robot.th) * len) / 2;
        this.beam.position.set(cx, R.US_H, cy);
        this.beam.rotation.set(0, 0, 0);
        this.beam.rotation.z = Math.PI / 2;
        this.beam.rotation.y = -robot.th;
        this.beamDot.visible = isFinite(us.d) && us.d <= R.US_MAX;
        if (this.beamDot.visible) this.beamDot.position.set(us.sx + Math.cos(us.ang) * us.d, R.US_H, us.sy + Math.sin(us.ang) * us.d);
      } else { this.beam.visible = false; this.beamDot.visible = false; }

      // 궤적
      this.trail.visible = this.showTrail;
      const last = this._lastTrail;
      if (!last || Math.hypot(last[0] - robot.x, last[1] - robot.y) > 0.8) {
        if (this.trailCount >= this.trailMax) {
          const a = this.trailGeo.attributes.position.array;
          a.copyWithin(0, 3 * 1000); this.trailCount -= 1000;
        }
        const a = this.trailGeo.attributes.position.array;
        a[this.trailCount * 3] = robot.x; a[this.trailCount * 3 + 1] = 0.1; a[this.trailCount * 3 + 2] = robot.y;
        this.trailCount++;
        this.trailGeo.setDrawRange(0, this.trailCount);
        this.trailGeo.attributes.position.needsUpdate = true;
        this._lastTrail = [robot.x, robot.y];
      }

      // 카메라
      const fx = Math.cos(robot.th), fy = Math.sin(robot.th);
      if (this.camMode === 'follow') {
        const want = new THREE.Vector3(robot.x - fx * 38, 26, robot.y - fy * 38);
        if (this._followInit) { this.camera.position.copy(want); this._followInit = false; }
        this.camera.position.lerp(want, 0.08);
        this.camera.lookAt(robot.x + fx * 10, 2, robot.y + fy * 10);
      } else if (this.camMode === 'fpv') {
        this.camera.position.set(robot.x + fx * 1.5, 8.5, robot.y + fy * 1.5);
        this.camera.lookAt(robot.x + fx * 40, 3, robot.y + fy * 40);
      } else {
        this.controls.update();
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  MQ.View = View;
})();
