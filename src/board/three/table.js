import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { gsap } from 'gsap';
import { boardFor, isClassic } from '../../game/maps.js';
import { CHARACTERS } from '../../game/rules/data.js';
import { diceRotation } from './layout.js';
import { createStarWarsWorld } from './starwars.js';
import { createIndiaWorld } from './india.js';

/**
 * Real-time 3D table. The orchestrator owns the renderer, camera, post-processing, game-state
 * syncing, pawn/dice animation and picking; the theme "world" (starwars.js / india.js) owns the set.
 */
export function createTable(
  container,
  initialGame,
  {
    reduced = false,
    onSelect,
    onRoll,
    mayRoll,
    onHover,
    onMoving,
    onReady,
    onError,
    onProject,
    onWorldProject,
  },
) {
  let game = initialGame,
    disposed = false,
    ready = false,
    dirty = true,
    selection = 1,
    hover = null,
    highlightedPlayer = null,
    ownerFilter = null,
    moveTimeline = null,
    following = null,
    lastInteraction = 0,
    cameraTween = null,
    quality = 1;
  const classic = isClassic(game),
    board = boardFor(game);
  const resources = new Set(),
    tweens = new Set(),
    pieces = new Map(),
    images = new Map(),
    loadingImages = new Map();
  const register = (resource) => {
    resources.add(resource);
    return resource;
  };
  container.dataset.presentation = classic ? 'tabletop' : 'holochess';
  container.dataset.loadedPhotos = '0';
  container.dataset.pawnModels = '0';
  container.dataset.physicalTiles = '40';
  container.dataset.developmentModels = '0';

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  const maxRatio = innerWidth < 700 ? 1.6 : 2;
  const pixelRatio = () => Math.min(window.devicePixelRatio || 1, maxRatio) * quality;
  renderer.setPixelRatio(pixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = classic ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D game table');
  renderer.domElement.dataset.testid = 'three-canvas';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1.6, 0.1, 700);

  const disposeGroup = (group) => {
    const used = new Set();
    group.traverse((object) => {
      if (object.geometry) used.add(object.geometry);
      if (object.material)
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) =>
          used.add(m),
        );
    });
    used.forEach((resource) => {
      if (resources.has(resource)) {
        resource.dispose();
        resources.delete(resource);
      }
    });
    group.removeFromParent();
  };
  const tween = (target, { from, to, duration = 0.5, ease = 'power2.out' }) => {
    if (reduced) return null;
    const t = gsap.fromTo(target, from, {
      ...to,
      duration,
      ease,
      onUpdate: () => (dirty = true),
      onComplete: () => tweens.delete(t),
    });
    tweens.add(t);
    return t;
  };
  const requestImage = (url, finished) => {
    if (!url) return;
    if (images.has(url)) return finished(images.get(url));
    if (loadingImages.has(url)) return loadingImages.get(url).callbacks.push(finished);
    const image = new Image(),
      callbacks = [finished];
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    loadingImages.set(url, { image, callbacks });
    image.onload = () => {
      loadingImages.delete(url);
      if (disposed) return;
      images.set(url, image);
      container.dataset.loadedPhotos = images.size;
      callbacks.forEach((cb) => cb(image));
      dirty = true;
    };
    image.onerror = () => loadingImages.delete(url);
    image.src = url;
  };

  /* ---------- world ---------- */
  const worldContext = {
    scene,
    register,
    container,
    renderer,
    disposeGroup,
    tween,
    requestImage,
    dirty: () => (dirty = true),
    repaint: (info) => repaint(info),
  };
  let world;
  try {
    world = classic
      ? createIndiaWorld(worldContext, board)
      : createStarWarsWorld(worldContext, board);
  } catch (error) {
    console.warn('3D world failed to build', error);
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
  renderer.toneMappingExposure = world.exposure;

  /* ---------- post-processing ---------- */
  let composer = null,
    bloom = null;
  const buildComposer = () => {
    try {
      const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, target);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(
        new THREE.Vector2(512, 512),
        world.bloom.strength,
        world.bloom.radius,
        world.bloom.threshold,
      );
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch (error) {
      console.warn('Post-processing unavailable; rendering directly.', error);
      composer = null;
    }
  };
  buildComposer();

  /* ---------- camera & controls ---------- */
  const home = { target: new THREE.Vector3(0, classic ? 0.2 : 0.5, world.camera.lift || 0) };
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = classic ? 1.38 : 1.46;
  controls.minDistance = world.camera.min;
  controls.maxDistance = world.camera.max;
  controls.target.copy(home.target);
  let aspect = 1.6;
  const fitDistance = () => {
    const vfov = THREE.MathUtils.degToRad(world.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const sinE = Math.sin(world.camera.elevation);
    const dv = (world.bounds * (sinE + 0.22)) / Math.tan(vfov / 2);
    const dh = (world.bounds * 1.04) / Math.tan(hfov / 2);
    return Math.min(world.camera.max * 0.92, Math.max(dv, dh) * 1.02);
  };
  const place = (distance, elevation, azimuth, target) => {
    const phi = Math.PI / 2 - elevation;
    camera.position.set(
      target.x + distance * Math.sin(phi) * Math.sin(azimuth),
      target.y + distance * Math.cos(phi),
      target.z + distance * Math.sin(phi) * Math.cos(azimuth),
    );
    controls.target.copy(target);
    camera.lookAt(target);
  };
  const currentPose = () => {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    return {
      distance: spherical.radius,
      phi: spherical.phi,
      theta: spherical.theta,
      target: controls.target.clone(),
    };
  };
  const flyTo = ({ distance, elevation, azimuth, target }, duration = 1.1) => {
    cameraTween?.kill();
    following = null;
    const from = currentPose();
    const to = {
      distance: distance ?? from.distance,
      phi: elevation === undefined ? from.phi : Math.PI / 2 - elevation,
      theta: azimuth === undefined ? from.theta : azimuth,
      target: target || from.target,
    };
    // shortest way around
    while (to.theta - from.theta > Math.PI) to.theta -= Math.PI * 2;
    while (to.theta - from.theta < -Math.PI) to.theta += Math.PI * 2;
    const apply = (p) => {
      const spherical = new THREE.Spherical(p.distance, p.phi, p.theta);
      camera.position.setFromSpherical(spherical).add(p.target);
      controls.target.copy(p.target);
      camera.lookAt(p.target);
      dirty = true;
    };
    if (reduced || duration <= 0) return apply(to);
    const state = { k: 0 };
    cameraTween = gsap.to(state, {
      k: 1,
      duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        apply({
          distance: THREE.MathUtils.lerp(from.distance, to.distance, state.k),
          phi: THREE.MathUtils.lerp(from.phi, to.phi, state.k),
          theta: THREE.MathUtils.lerp(from.theta, to.theta, state.k),
          target: from.target.clone().lerp(to.target, state.k),
        });
      },
    });
  };
  const homePose = () => ({
    distance: fitDistance(),
    elevation: world.camera.elevation,
    azimuth: 0,
    target: home.target,
  });
  const resetHome = () => {
    const p = homePose();
    place(p.distance, p.elevation, p.azimuth, p.target);
  };
  resetHome();
  controls.update();
  controls.addEventListener('start', () => {
    cameraTween?.kill();
    following = null;
    lastInteraction = performance.now();
  });
  controls.addEventListener('change', () => (dirty = true));

  /* ---------- tile state ---------- */
  const styleTile = (info) => {
    const hp = game.players.find((p) => p.id === highlightedPlayer);
    const location = hp && !hp.bankrupt && hp.position === info.tile.id ? hp.color : null;
    const filterOwner = game.players.find((p) => p.id === ownerFilter);
    const owned = ownerFilter && game.ownership[info.tile.id]?.owner === ownerFilter;
    world.style(info, {
      selected: selection === info.tile.id && !highlightedPlayer,
      hover: hover === info.tile.id && !highlightedPlayer,
      location,
      ownerMatch: owned ? filterOwner?.color : null,
      dim: Boolean(ownerFilter && !location && !owned),
    });
  };
  function repaint(info) {
    const owned = game.ownership[info.tile.id];
    const owner = game.players.find((p) => p.id === owned?.owner);
    world.paint(info, game, owner);
    styleTile(info);
  }

  /* ---------- dice ---------- */
  const dice = [world.createDie(), world.createDie()];
  dice.forEach((die, i) => {
    die.position.copy(world.diceHome[i]);
    scene.add(die);
  });
  const setDice = (animated) =>
    dice.forEach((die, i) => {
      const [x, y, z] = diceRotation(game.dice[i]);
      const home = world.diceHome[i];
      if (animated && !reduced) {
        const timeline = gsap.timeline({
          onComplete: () => tweens.delete(timeline),
          onUpdate: () => (dirty = true),
        });
        tweens.add(timeline);
        const startX = home.x + (i ? 4.5 : -4.5),
          startZ = home.z + (i ? 5 : 4);
        timeline.fromTo(
          die.rotation,
          { x: x + Math.PI * 6, y: Math.PI * 5, z: z + Math.PI * 3 },
          { x, y, z, duration: 1.15, ease: 'power3.out' },
          0,
        );
        timeline.fromTo(
          die.position,
          { x: startX, z: startZ },
          { x: home.x, z: home.z, duration: 1.1, ease: 'power2.out' },
          0,
        );
        timeline.fromTo(
          die.position,
          { y: home.y + 5.5 },
          { y: home.y, duration: 1.15, ease: 'bounce.out' },
          0,
        );
      } else {
        die.rotation.set(x, y, z);
        die.position.copy(home);
      }
    });

  /* ---------- pieces ---------- */
  const pawnKind = (player) => CHARACTERS.find((c) => c.id === player.character)?.symbol || 'saber';
  const pawnPosition = (position, player) => {
    const occupants = game.players.filter(
      (p) => !p.bankrupt && (p.position === position || p.id === player.id),
    );
    return world.piecePosition(
      position,
      Math.max(
        0,
        occupants.findIndex((p) => p.id === player.id),
      ),
      occupants.length,
    );
  };
  const stylePiece = (piece, player) => {
    const count = game.players.filter((p) => !p.bankrupt && p.position === player.position).length;
    const scale =
      (count > 4 ? 0.7 : count > 1 ? 0.86 : 1.05) *
      world.pawnScale *
      (player.id === highlightedPlayer ? 1.12 : 1);
    piece.userData.baseScale = scale;
    piece.scale.setScalar(scale);
    const active = game.phase !== 'finished' && player.id === game.players[game.turn].id;
    piece.userData.active = active || player.id === highlightedPlayer;
    piece.userData.ring.visible = piece.userData.active;
    if (piece.userData.beam) piece.userData.beam.visible = piece.userData.active;
  };
  const setPieces = (before, animate) => {
    const active = game.players.filter((p) => !p.bankrupt),
      ids = new Set(active.map((p) => p.id));
    for (const [id, piece] of pieces)
      if (!ids.has(id)) {
        disposeGroup(piece);
        pieces.delete(id);
      }
    for (const player of active) {
      let piece = pieces.get(player.id);
      if (!piece) {
        piece = world.createPawn({ ...player, pawnKind: pawnKind(player) });
        piece.traverse((o) => (o.userData.playerId = player.id));
        scene.add(piece);
        pieces.set(player.id, piece);
      }
      piece.userData.tileId = player.position;
      piece.userData.playerId = player.id;
      stylePiece(piece, player);
      const position = pawnPosition(player.position, player);
      const y = world.pawnY + (world.tileTop === undefined ? 0 : 0);
      if (animate && !reduced && game.movement?.player === player.id) {
        const m = game.movement;
        const path =
          m.path ||
          Array.from(
            { length: m.steps },
            (_, step) => (m.from + (m.back ? -(step + 1) : step + 1) + 80) % 40,
          );
        const start = pawnPosition(m.from, player);
        piece.position.set(start.x, y, start.z);
        moveTimeline?.kill();
        onMoving(true);
        const follow = { enabled: true };
        following = follow;
        const timeline = gsap.timeline({
          onUpdate: () => (dirty = true),
          onComplete: () => {
            onMoving(false);
            tweens.delete(timeline);
            moveTimeline = null;
            dirty = true;
            if (following === follow) {
              following = null;
              if (performance.now() - lastInteraction > 4000)
                flyTo(
                  {
                    ...homePose(),
                    distance: currentPose().distance,
                    azimuth: currentPose().theta,
                    elevation: Math.PI / 2 - currentPose().phi,
                  },
                  1.4,
                );
            }
          },
        });
        moveTimeline = timeline;
        tweens.add(timeline);
        let previous = start;
        path.forEach((id, step) => {
          const target = pawnPosition(id, player),
            at = step * 0.28;
          const angle = Math.atan2(target.x - previous.x, target.z - previous.z);
          timeline.to(piece.rotation, { y: angle, duration: 0.18, ease: 'power1.out' }, at);
          timeline.to(
            piece.position,
            { x: target.x, z: target.z, duration: 0.28, ease: 'power1.inOut' },
            at,
          );
          timeline.to(piece.position, { y: y + 0.55, duration: 0.14, ease: 'power2.out' }, at);
          timeline.to(piece.position, { y, duration: 0.14, ease: 'power2.in' }, at + 0.14);
          previous = target;
        });
        if (path.at(-1) !== player.position)
          timeline.to(piece.position, {
            x: position.x,
            z: position.z,
            duration: 0.45,
            ease: 'power2.inOut',
          });
        piece.userData.following = true;
      } else if (
        !moveTimeline ||
        before?.players.find((o) => o.id === player.id)?.position !== player.position
      ) {
        piece.position.set(position.x, y, position.z);
      }
    }
    container.dataset.pawnModels = pieces.size;
  };

  /* ---------- game sync ---------- */
  function setGame(next) {
    const before = game,
      changed = next.version !== game.version;
    game = next;
    for (const info of world.tiles.values()) {
      repaint(info);
      const level = game.ownership[info.tile.id]?.level || 0;
      if (level !== info.level) world.setDevelopment(info, level, changed);
    }
    world.styleWorlds(game, selection, ownerFilter);
    setPieces(before, changed);
    setDice(
      changed &&
        game.lastActionType === 'ROLL' &&
        !['card', 'hop', 'final'].includes(game.presentation),
    );
    container.dataset.developmentModels = [...world.tiles.values()].reduce(
      (n, info) => n + (info.level === 5 ? 1 : info.level),
      0,
    );
    dirty = true;
  }
  setGame(game);

  /* ---------- picking ---------- */
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const pick = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      [...world.pickables, ...dice, ...pieces.values()],
      true,
    )[0]?.object;
    if (!hit) return null;
    if (dice.includes(hit)) return 'dice';
    for (let o = hit; o; o = o.parent)
      if (o.userData.tileId !== undefined) return o.userData.tileId;
    return null;
  };
  let down = null;
  const pointerDown = (e) => (down = { x: e.clientX, y: e.clientY });
  const pointerUp = (e) => {
    const started = down;
    down = null;
    if (!started || Math.hypot(e.clientX - started.x, e.clientY - started.y) > 6) return;
    const id = pick(e);
    if (id === 'dice') onRoll?.();
    else if (id !== null) onSelect(id);
  };
  const pointerMove = (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      if (hover !== null) {
        hover = null;
        onHover(null);
        world.tiles.forEach(styleTile);
      }
      renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const id = pick(e);
    renderer.domElement.style.cursor =
      id === 'dice' ? (mayRoll?.() ? 'pointer' : 'default') : id === null ? 'grab' : 'pointer';
    const tile = id === 'dice' ? null : id;
    if (tile === hover) return;
    hover = tile;
    world.tiles.forEach(styleTile);
    onHover(tile);
    dirty = true;
  };
  const pointerLeave = () => {
    hover = null;
    down = null;
    onHover(null);
    world.tiles.forEach(styleTile);
    dirty = true;
  };
  const contextLost = (e) => {
    e.preventDefault();
    if (!disposed) onError();
  };
  const listeners = [
    ['pointerdown', pointerDown],
    ['pointerup', pointerUp],
    ['pointermove', pointerMove],
    ['pointerleave', pointerLeave],
    ['webglcontextlost', contextLost],
  ];
  listeners.forEach(([n, h]) => renderer.domElement.addEventListener(n, h));

  /* ---------- sizing ---------- */
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (!width || !height || disposed) return;
    const previousAspect = aspect;
    aspect = width / height;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    composer?.setPixelRatio(pixelRatio());
    composer?.setSize(width, height);
    bloom?.resolution.set(width / 2, height / 2);
    if (!ready || Math.abs(previousAspect - aspect) > 0.001) {
      const pose = currentPose();
      if (!ready || !cameraTween) {
        const p = homePose();
        if (!ready) place(p.distance, p.elevation, p.azimuth, p.target);
        else
          place(
            Math.max(pose.distance, p.distance * 0.7) *
              (pose.distance > p.distance * 1.4 ? 1 : p.distance / Math.max(pose.distance, 1)),
            Math.PI / 2 - pose.phi,
            pose.theta,
            pose.target,
          );
      }
    }
    dirty = true;
  });
  resize.observe(container);

  /* ---------- frame loop ---------- */
  let frames = 0,
    slowFrames = 0,
    lastNow = 0,
    lastOverlay = 0,
    lastAnchor = null,
    lastLabels = '';
  const projectVector = new THREE.Vector3();
  renderer.setAnimationLoop((now) => {
    if (disposed || document.hidden) return;
    const dt = Math.min(0.1, (now - lastNow) / 1000 || 0.016);
    lastNow = now;
    const time = now / 1000;
    const moved = controls.update();
    // follow the moving pawn (soft)
    if (following && moveTimeline) {
      const piece = pieces.get(game.movement?.player);
      if (piece) {
        const goal = piece.position.clone();
        goal.y = home.target.y;
        goal.multiplyScalar(0.55);
        const delta = goal
          .clone()
          .sub(controls.target)
          .multiplyScalar(Math.min(1, dt * 2.6));
        controls.target.add(delta);
        camera.position.add(delta);
        dirty = true;
      }
    }
    const animating = !reduced;
    if (animating) {
      world.animate(time);
      pieces.forEach((piece) => {
        const ud = piece.userData;
        if (ud.active) {
          const pulse = 1 + Math.sin(time * 3) * 0.04;
          ud.ring.scale.setScalar(pulse);
          if (!moveTimeline) ud.visual.position.y = Math.sin(time * 2.2) * 0.04 + 0.04;
          if (ud.beam) ud.beam.material.opacity = 0.06 + Math.sin(time * 3) * 0.015;
        } else ud.visual.position.y = 0;
      });
    }
    if (reduced && !dirty && !moved && !tweens.size) return;
    // adaptive quality: drop resolution if the GPU struggles
    frames++;
    if (animating && dt > 0.034) slowFrames++;
    if (frames === 120) {
      if (slowFrames > 70 && quality > 0.6) {
        quality = Math.max(0.6, quality - 0.2);
        renderer.setPixelRatio(pixelRatio());
        composer?.setPixelRatio(pixelRatio());
        const w = container.clientWidth,
          h = container.clientHeight;
        renderer.setSize(w, h, false);
        composer?.setSize(w, h);
      }
      frames = 0;
      slowFrames = 0;
    }
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
    // overlay anchors for the HTML layer
    const width = container.clientWidth,
      height = container.clientHeight;
    if (dirty || moved || animating) {
      const plan = world.plan(selection);
      projectVector.set(plan.x, world.tileTop + 0.4, plan.z).project(camera);
      const anchor = {
        x: Math.round(((projectVector.x + 1) / 2) * width),
        y: Math.round(((1 - projectVector.y) / 2) * height),
        visible:
          Math.abs(projectVector.x) < 1 && Math.abs(projectVector.y) < 1 && projectVector.z < 1,
      };
      // Throttle React updates: only when something moved on screen, at most ~25 times a second.
      if (now - lastOverlay > 40) {
        lastOverlay = now;
        if (
          !lastAnchor ||
          lastAnchor.x !== anchor.x ||
          lastAnchor.y !== anchor.y ||
          lastAnchor.visible !== anchor.visible
        ) {
          lastAnchor = anchor;
          onProject(anchor);
        }
        const labels = world.project(camera, width, height, game);
        const signature = labels
          .map(
            (l) =>
              `${l.id}:${Math.round(l.x)}:${Math.round(l.y)}:${l.visible ? 1 : 0}:${l.color || ''}`,
          )
          .join('|');
        if (signature !== lastLabels) {
          lastLabels = signature;
          onWorldProject?.(labels);
        }
      }
      projectVector.copy(dice[0].position).project(camera);
      container.dataset.diceX = ((projectVector.x + 1) / 2) * width;
      container.dataset.diceY = ((1 - projectVector.y) / 2) * height;
      container.dataset.cameraZoom = (fitDistance() / currentPose().distance).toFixed(3);
    }
    dirty = false;
    if (!ready) {
      ready = true;
      onReady();
    }
  });

  return {
    update: setGame,
    highlight(playerId, filter) {
      highlightedPlayer = playerId;
      ownerFilter = filter;
      world.styleWorlds(game, selection, ownerFilter);
      world.tiles.forEach(styleTile);
      pieces.forEach((piece, id) => {
        const player = game.players.find((p) => p.id === id);
        if (player) stylePiece(piece, player);
      });
      dirty = true;
    },
    select(id) {
      selection = id;
      world.styleWorlds(game, id, ownerFilter);
      world.tiles.forEach(styleTile);
      dirty = true;
    },
    reduced(value) {
      reduced = value;
      controls.enableDamping = !value;
      if (value) {
        tweens.forEach((t) => t.kill());
        tweens.clear();
        moveTimeline = null;
        onMoving(false);
        setGame(game);
      }
      dirty = true;
    },
    camera(mode) {
      container.dataset.cameraView = mode === 'projection' ? 'focus' : mode;
      const base = homePose();
      if (mode === 'top') flyTo({ ...base, elevation: 1.5, azimuth: 0 }, 1.1);
      else if (mode === 'projection') {
        const point = world.focusPoint(selection);
        const angle = Math.atan2(point.x, point.z);
        flyTo(
          {
            distance: Math.max(world.camera.min * 1.7, base.distance * 0.42),
            elevation: 0.62,
            azimuth: angle,
            target: point,
          },
          1.2,
        );
      } else flyTo(base, 1.1);
      dirty = true;
    },
    zoom(factor) {
      const pose = currentPose();
      flyTo(
        {
          distance: THREE.MathUtils.clamp(
            pose.distance * factor,
            world.camera.min,
            world.camera.max,
          ),
        },
        0.35,
      );
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      controls.dispose();
      cameraTween?.kill();
      tweens.forEach((t) => t.kill());
      onMoving(false);
      loadingImages.forEach(({ image }) => {
        image.onload = image.onerror = null;
        image.src = '';
      });
      loadingImages.clear();
      listeners.forEach(([n, h]) => renderer.domElement.removeEventListener(n, h));
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        const m = o.material;
        (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => {
          Object.values(mm).forEach((v) => v?.isTexture && v.dispose());
          mm.dispose?.();
        });
      });
      resources.forEach((r) => r.dispose?.());
      resources.clear();
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
