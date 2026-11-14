/* ============================================================
   WHODLE — 3D office scene
   A small, dark, FNAF-flavoured office with a retro CRT terminal.
   The HTML game UI is projected onto the CRT screen.
   ============================================================ */

(function () {
    'use strict';

    // ---- Tunable scene numbers -------------------------------------------
    const SCENE = {
        fov: 40,                 // camera field of view
        screenW: 2.156,          // CRT screen width in 3D units
        screenH: 1.5,            // CRT screen height in 3D units
        monitorCenterY: 1.5,     // height of the monitor centre
        cameraY: 2.12,           // camera eye height
        minDistance: 2.72,       // closest camera distance
        fitPadding: 1.04,        // extra space around the monitor
        viewShift: 0.1,          // push the monitor up in frame (0..0.3)
        deskY: 0.55,             // desk top height
        fogDensity: 0.055,       // atmospheric fog
        dustCount: 260           // floating dust particles
    };

    const container = document.getElementById('office3d');
    const overlay = document.getElementById('screenOverlay');
    const screenScale = document.getElementById('screenScale');
    const gameContainer = document.getElementById('gameContainer');

    if (!container || !overlay || !screenScale) return;

    // ---- Renderer --------------------------------------------------------
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (e) {
        // No WebGL: fall back to a centred HTML screen.
        container.style.display = 'none';
        overlay.style.left = '50%';
        overlay.style.top = '50%';
        overlay.style.width = '92vw';
        overlay.style.height = '86vh';
        overlay.style.transform = 'translate(-50%, -50%)';
        return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // ---- Scene / camera --------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    scene.fog = new THREE.FogExp2(0x05070a, SCENE.fogDensity);

    const camera = new THREE.PerspectiveCamera(
        SCENE.fov,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, SCENE.cameraY, SCENE.minDistance);

    // ---- Materials helpers ----------------------------------------------
    function mat(color, opts = {}) {
        return new THREE.MeshStandardMaterial(Object.assign({
            color: color,
            roughness: 0.85,
            metalness: 0.05
        }, opts));
    }

    function box(w, h, d, material, x, y, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x || 0, y || 0, z || 0);
        m.castShadow = false;
        m.receiveShadow = false;
        return m;
    }

    // ---- Room ------------------------------------------------------------
    const room = new THREE.Group();
    scene.add(room);

    const floorMat = mat(0x0b0d09, { roughness: 1.0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    room.add(floor);

    const wallMat = mat(0x131710, { roughness: 1.0 });
    const backWall = box(10, 5, 0.2, wallMat, 0, 2.5, -2.1);
    room.add(backWall);

    const sideWallL = box(0.2, 5, 6, wallMat, -5, 2.5, 0.9);
    room.add(sideWallL);
    const sideWallR = box(0.2, 5, 6, wallMat, 5, 2.5, 0.9);
    room.add(sideWallR);

    const ceiling = box(10, 0.2, 6, mat(0x0a0c08, { roughness: 1.0 }), 0, 4.1, 0.9);
    room.add(ceiling);

    // baseboards
    room.add(box(10, 0.12, 0.06, mat(0x22261a), 0, 0.06, -1.99));
    room.add(box(0.06, 0.12, 6, mat(0x22261a), -4.89, 0.06, 0.9));
    room.add(box(0.06, 0.12, 6, mat(0x22261a), 4.89, 0.06, 0.9));

    // ---- Desk ------------------------------------------------------------
    const deskMat = mat(0x2a2a24, { roughness: 0.7, metalness: 0.15 });
    const deskTop = box(4.6, 0.09, 1.7, deskMat, 0, SCENE.deskY, 0.55);
    room.add(deskTop);

    const legMat = mat(0x161713, { roughness: 0.8, metalness: 0.2 });
    [[-2.1, 1.28], [2.1, 1.28], [-2.1, -0.15], [2.1, -0.15]].forEach(([x, z]) => {
        room.add(box(0.11, SCENE.deskY, 0.11, legMat, x, SCENE.deskY / 2, z));
    });

    // draw the desk with a front panel for a chunky retro look
    room.add(box(4.6, 0.55, 0.06, mat(0x1d1e18, { roughness: 0.9 }), 0, 0.34, 1.4));

    // ---- Monitor ---------------------------------------------------------
    const monitor = new THREE.Group();
    monitor.position.set(0, SCENE.monitorCenterY, 0);
    scene.add(monitor);

    const bezelW = SCENE.screenW + 0.22;
    const bezelH = SCENE.screenH + 0.22;
    const bezelMat = mat(0x1b1d17, { roughness: 0.55, metalness: 0.25 });

    // main bezel block
    const bezel = box(bezelW, bezelH, 0.22, bezelMat, 0, 0, -0.12);
    monitor.add(bezel);

    // slightly inset dark screen backing
    const screenBack = box(SCENE.screenW + 0.04, SCENE.screenH + 0.04, 0.02,
        new THREE.MeshBasicMaterial({ color: 0x030503 }), 0, 0, -0.005);
    monitor.add(screenBack);

    // The actual screen plane (the HTML overlay is aligned to this).
    const screenPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(SCENE.screenW, SCENE.screenH),
        new THREE.MeshBasicMaterial({ color: 0x0a0c07 })
    );
    screenPlane.position.z = 0.002;
    monitor.add(screenPlane);

    // monitor chin + tiny amber power LED
    const chin = box(bezelW, 0.06, 0.02, mat(0x10120e), 0, -bezelH / 2 + 0.055, 0.01);
    monitor.add(chin);
    const led = new THREE.Mesh(
        new THREE.CircleGeometry(0.012, 12),
        new THREE.MeshBasicMaterial({ color: 0xffb000 })
    );
    led.position.set(bezelW / 2 - 0.13, -bezelH / 2 + 0.055, 0.025);
    monitor.add(led);

    // stand: the CRT sits on the desk with a small pedestal
    const standMat = mat(0x181a15, { roughness: 0.7, metalness: 0.2 });
    monitor.add(box(0.26, 0.12, 0.2, standMat, 0, -bezelH / 2 - 0.06, -0.06));
    monitor.add(box(0.56, 0.05, 0.36, standMat, 0, -bezelH / 2 - 0.13, -0.02));

    // ---- Keyboard / mouse / mug -----------------------------------------
    function makeKeyboardTexture() {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 160;
        const g = c.getContext('2d');
        g.fillStyle = '#22231d';
        g.fillRect(0, 0, 512, 160);
        g.fillStyle = '#2f3128';
        g.fillRect(6, 6, 500, 148);
        const cols = 16, rows = 5;
        const pad = 8;
        const kw = (500 - pad * (cols + 1)) / cols;
        const kh = (140 - pad * (rows + 1)) / rows;
        for (let r = 0; r < rows; r++) {
            for (let k = 0; k < cols; k++) {
                g.fillStyle = '#4a4d3d';
                g.fillRect(pad + k * (kw + pad), 10 + r * (kh + pad), kw, kh);
                g.fillStyle = '#60644f';
                g.fillRect(pad + k * (kw + pad), 10 + r * (kh + pad), kw, 2);
            }
        }
        const t = new THREE.CanvasTexture(c);
        t.anisotropy = 4;
        return t;
    }

    const kbTex = makeKeyboardTexture();
    const kbSide = mat(0x1a1b16, { roughness: 0.8 });
    const kbTop = new THREE.MeshStandardMaterial({ map: kbTex, roughness: 0.75 });
    const keyboard = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.045, 0.34),
        [kbSide, kbSide, kbTop, kbSide, kbSide, kbSide]
    );
    keyboard.position.set(0, SCENE.deskY + 0.035, 0.55);
    scene.add(keyboard);

    const mouse = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 16, 12),
        mat(0x1d1f18, { roughness: 0.6 })
    );
    mouse.scale.set(1, 0.55, 1.5);
    mouse.position.set(0.75, SCENE.deskY + 0.045, 0.55);
    scene.add(mouse);

    const mug = new THREE.Group();
    const mugBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.075, 0.17, 20),
        mat(0x3a3d31, { roughness: 0.7 })
    );
    mugBody.position.y = 0.085;
    mug.add(mugBody);
    const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.016, 8, 16),
        mat(0x3a3d31, { roughness: 0.7 })
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(0.1, 0.09, 0);
    mug.add(handle);
    mug.position.set(-1.35, SCENE.deskY + 0.02, 0.45);
    scene.add(mug);

    // ---- Desk lamp -------------------------------------------------------
    const lamp = new THREE.Group();
    lamp.position.set(1.85, SCENE.deskY, 0.05);

    const lampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.19, 0.05, 20),
        mat(0x1a1c16, { roughness: 0.6, metalness: 0.3 })
    );
    lamp.add(lampBase);

    const lampArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.72, 10),
        mat(0x30332a, { roughness: 0.5, metalness: 0.4 })
    );
    lampArm.position.set(0, 0.36, 0);
    lampArm.rotation.z = 0.28;
    lamp.add(lampArm);

    const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.19, 0.22, 20, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0x2c2f25,
            roughness: 0.6,
            metalness: 0.3,
            side: THREE.DoubleSide
        })
    );
    shade.position.set(-0.1, 0.72, 0);
    shade.rotation.z = 0.35;
    lamp.add(shade);

    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffcf80 })
    );
    bulb.position.set(-0.1, 0.68, 0);
    lamp.add(bulb);

    scene.add(lamp);

    // ---- Lighting --------------------------------------------------------
    const ambient = new THREE.AmbientLight(0x1c2a33, 0.75);
    scene.add(ambient);

    const lampLight = new THREE.PointLight(0xffb060, 1.55, 7.5, 2);
    lampLight.position.set(1.55, SCENE.deskY + 0.72, 0.15);
    scene.add(lampLight);

    const monitorGlow = new THREE.PointLight(0xffb000, 0.85, 3.2, 2);
    monitorGlow.position.set(0, SCENE.monitorCenterY - 0.15, 0.55);
    scene.add(monitorGlow);

    const coldFill = new THREE.PointLight(0x4a6a99, 0.55, 9, 2);
    coldFill.position.set(-4, 3.2, 2.5);
    scene.add(coldFill);

    const ceilingLight = new THREE.PointLight(0xffe0a0, 0.28, 8, 2);
    ceilingLight.position.set(0, 3.8, 0.8);
    scene.add(ceilingLight);

    // ---- Posters --------------------------------------------------------
    function makePosterTexture(lines, accent) {
        const c = document.createElement('canvas');
        c.width = 256;
        c.height = 320;
        const g = c.getContext('2d');
        g.fillStyle = '#0d100a';
        g.fillRect(0, 0, 256, 320);
        g.strokeStyle = accent;
        g.lineWidth = 6;
        g.strokeRect(8, 8, 240, 304);

        g.fillStyle = accent;
        g.textAlign = 'center';
        g.font = 'bold 30px monospace';
        lines.forEach((line, i) => {
            g.fillText(line, 128, 90 + i * 42);
        });

        // little face / camera glyph
        g.beginPath();
        g.arc(128, 220, 42, 0, Math.PI * 2);
        g.strokeStyle = accent;
        g.lineWidth = 4;
        g.stroke();
        g.beginPath();
        g.arc(112, 210, 5, 0, Math.PI * 2);
        g.arc(144, 210, 5, 0, Math.PI * 2);
        g.fillStyle = accent;
        g.fill();
        g.beginPath();
        g.arc(128, 232, 18, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();

        const t = new THREE.CanvasTexture(c);
        t.anisotropy = 4;
        return t;
    }

    const poster1 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.875),
        new THREE.MeshBasicMaterial({ map: makePosterTexture(['SMILE!', "YOU'RE ON", 'CAMERA'], '#ffb000') })
    );
    poster1.position.set(-1.8, 2.55, -1.99);
    scene.add(poster1);

    const poster2 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.875),
        new THREE.MeshBasicMaterial({ map: makePosterTexture(['NIGHT', 'SHIFT', 'CREW'], '#7fae6a') })
    );
    poster2.position.set(1.8, 2.55, -1.99);
    scene.add(poster2);

    // ---- Security camera in the corner ----------------------------------
    const camGroup = new THREE.Group();
    camGroup.position.set(3.8, 3.35, -1.6);
    camGroup.rotation.y = -0.7;
    camGroup.rotation.x = 0.35;

    const camBody = box(0.22, 0.16, 0.34, mat(0x24261f, { roughness: 0.5, metalness: 0.3 }), 0, 0, 0);
    camGroup.add(camBody);
    const camLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.07, 0.1, 14),
        mat(0x0c0d0a, { roughness: 0.3, metalness: 0.5 })
    );
    camLens.rotation.x = Math.PI / 2;
    camLens.position.set(0, 0, 0.2);
    camGroup.add(camLens);
    const camLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3b30 })
    );
    camLed.position.set(0.08, 0.06, 0.19);
    camGroup.add(camLed);
    scene.add(camGroup);

    // ---- Wall clock ------------------------------------------------------
    const clockGroup = new THREE.Group();
    clockGroup.position.set(0, 3.15, -1.98);
    const clockFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 32),
        new THREE.MeshBasicMaterial({ color: 0x10130c })
    );
    clockGroup.add(clockFace);
    const clockRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.018, 8, 32),
        mat(0x3a3d30, { roughness: 0.6 })
    );
    clockGroup.add(clockRim);
    const hourHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.11, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xffb000 })
    );
    hourHand.position.set(0, 0.05, 0.01);
    clockGroup.add(hourHand);
    const minHand = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.17, 0.01),
        new THREE.MeshBasicMaterial({ color: 0xffb000 })
    );
    minHand.position.set(0, 0.08, 0.012);
    minHand.rotation.z = -0.6;
    clockGroup.add(minHand);
    scene.add(clockGroup);

    // ---- Floating dust ---------------------------------------------------
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(SCENE.dustCount * 3);
    const dustSpeed = new Float32Array(SCENE.dustCount);
    for (let i = 0; i < SCENE.dustCount; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 7;
        dustPos[i * 3 + 1] = Math.random() * 3.4 + 0.2;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
        dustSpeed[i] = 0.02 + Math.random() * 0.05;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xffcf80,
        size: 0.018,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ---- Camera fitting + overlay alignment ------------------------------
    function aimCamera(dist) {
        const W = window.innerWidth;
        const H = window.innerHeight;

        camera.position.set(0, SCENE.cameraY, dist);
        camera.lookAt(0, SCENE.monitorCenterY, 0);
        camera.aspect = W / H;

        // Shift the view so the monitor sits a little high in frame and the
        // desk / keyboard stay visible underneath it.
        camera.setViewOffset(W, H, 0, SCENE.viewShift * H, W, H);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();

        // Tilt the monitor to face the camera squarely. Its plane then stays
        // parallel to the image plane, so the projected screen is a clean
        // rectangle the HTML overlay can sit on exactly.
        const pitch = Math.atan2(SCENE.cameraY - SCENE.monitorCenterY, dist);
        monitor.rotation.x = -pitch;
        monitor.updateMatrixWorld(true);
    }

    const screenCorners = [
        new THREE.Vector3(-1, 1, 0),
        new THREE.Vector3(1, 1, 0),
        new THREE.Vector3(1, -1, 0),
        new THREE.Vector3(-1, -1, 0)
    ];

    function projectScreen() {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        screenCorners.forEach((corner) => {
            const v = new THREE.Vector3(
                corner.x * SCENE.screenW / 2,
                corner.y * SCENE.screenH / 2,
                0
            );
            v.applyMatrix4(screenPlane.matrixWorld).project(camera);
            const x = (v.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
    }

    function fitCameraAndMonitor() {
        const W = window.innerWidth;
        const H = window.innerHeight;

        // Pull the camera back until the whole screen fits inside the frame.
        let dist = SCENE.minDistance;
        let rect = null;
        for (let i = 0; i < 160; i++) {
            aimCamera(dist);
            rect = projectScreen();
            const inside =
                rect.minX >= W * 0.05 && rect.maxX <= W * 0.95 &&
                rect.minY >= H * 0.05 && rect.maxY <= H * 0.95;
            if (inside) break;
            dist *= 1.025;
        }

        // Size the overlay to the projected screen.
        const w = Math.max(80, rect.w);
        const h = Math.max(60, rect.h);

        overlay.style.left = rect.minX + 'px';
        overlay.style.top = rect.minY + 'px';
        overlay.style.width = w + 'px';
        overlay.style.height = h + 'px';
        overlay.style.transform = 'none';

        // Pick a design resolution close to the projected size so the text
        // never gets shrunk into an unreadable smear on small screens.
        const designW = Math.min(920, Math.max(380, Math.round(w / 0.92)));
        const designH = Math.round(designW * 640 / 920);
        const scale = Math.min(w / designW, h / designH);

        screenScale.style.width = designW + 'px';
        screenScale.style.height = designH + 'px';
        screenScale.style.transform = `translate(-50%, -50%) scale(${scale})`;

        if (gameContainer) {
            gameContainer.style.width = designW + 'px';
            gameContainer.style.height = designH + 'px';
        }
    }

    // ---- Resize ----------------------------------------------------------
    function onResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        fitCameraAndMonitor();
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // ---- HUD clock -------------------------------------------------------
    function updateHudClock() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const ts = document.getElementById('timestamp');
        if (ts) ts.textContent = `${hh}:${mm}:${ss}`;
        const hudDate = document.getElementById('hudDate');
        if (hudDate) {
            hudDate.textContent = now.toLocaleDateString(undefined, {
                year: 'numeric', month: '2-digit', day: '2-digit'
            });
        }
    }
    updateHudClock();
    setInterval(updateHudClock, 1000);

    // ---- Animation loop --------------------------------------------------
    const clock = new THREE.Clock();
    let elapsed = 0;

    function animate() {
        requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.1);
        elapsed += dt;

        // subtle lamp flicker
        const flicker = 1 + Math.sin(elapsed * 9.3) * 0.02 + Math.sin(elapsed * 23.7) * 0.012;
        lampLight.intensity = 1.55 * flicker;
        ceilingLight.intensity = 0.28 + Math.sin(elapsed * 3.1) * 0.02;

        // dust drift
        const pos = dustGeo.attributes.position.array;
        for (let i = 0; i < SCENE.dustCount; i++) {
            pos[i * 3 + 1] += dustSpeed[i] * dt;
            pos[i * 3] += Math.sin(elapsed * 0.4 + i) * 0.0006;
            if (pos[i * 3 + 1] > 3.6) {
                pos[i * 3 + 1] = 0.15;
            }
        }
        dustGeo.attributes.position.needsUpdate = true;

        // tiny security-camera LED blink
        camLed.material.color.setHex(
            Math.sin(elapsed * 2.2) > 0 ? 0xff3b30 : 0x551210
        );

        // clock hands
        const now = new Date();
        const sec = now.getSeconds();
        const min = now.getMinutes();
        hourHand.rotation.z = -((min / 60) + (now.getHours() % 12)) * (Math.PI * 2 / 12);
        minHand.rotation.z = -(sec / 60) * (Math.PI * 2 / 60) - (min * Math.PI * 2 / 60);

        renderer.render(scene, camera);
    }

    // ---- Go --------------------------------------------------------------
    fitCameraAndMonitor();
    animate();

    // Expose a tiny helper for debugging / other scripts.
    window.Office3D = {
        scene,
        camera,
        renderer,
        refit: onResize
    };
})();
