import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { boardFor, isClassic } from '../../game/maps.js';
import { tilePlan, piecePosition, diceRotation } from './layout.js';
import { canvasSurface, paintTile, paintCenter, tileImage } from './textures.js';
import { createPiece, createBuildings, createDice } from './pieces.js';
import { createPlanet, createIndiaAtlas, modelLabel } from './worlds.js';

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
    badgeFor,
  },
) {
  let game = initialGame,
    disposed = false,
    ready = false,
    dirty = true,
    lastFrame = 0;
  const classic = isClassic(game),
    board = boardFor(game),
    resources = new Set(),
    images = new Map(),
    loadingImages = new Map();
  container.dataset.worldModels = '0';
  container.dataset.loadedPhotos = '0';
  container.dataset.presentation = classic ? 'travel-atlas' : 'planetarium';
  const register = (resource) => {
    resources.add(resource);
    return resource;
  };
  const surfaceCache = new Map();
  container.dataset.surfaceTextures = '0';
  const getSurface = (kind) => {
    const name =
      kind === 'clouds'
        ? 'earth_clouds'
        : ['mars', 'moon', 'earth_daymap', 'mars', 'jupiter', 'earth_daymap', 'earth_nightmap'][
            kind
          ];
    if (surfaceCache.has(name)) return surfaceCache.get(name);
    const entry = { texture: null, ready: { value: 0 } };
    const texture = new THREE.TextureLoader().load(
      '/images/space-surfaces/' + name + '.jpg',
      () => {
        if (disposed) return;
        entry.ready.value = 1;
        container.dataset.surfaceTextures = [...surfaceCache.values()].filter(
          (item) => item.ready.value,
        ).length;
        dirty = true;
      },
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    entry.texture = register(texture);
    surfaceCache.set(name, entry);
    return entry;
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = classic ? 1.05 : 1.2;
  renderer.shadowMap.enabled = classic;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D game board');
  renderer.domElement.dataset.testid = 'three-canvas';
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.08;
  controls.minDistance = 26;
  controls.maxDistance = 67;
  controls.minPolarAngle = 0.015;
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.maxTargetRadius = 5;
  controls.target.set(0, 0, 0);
  camera.position.set(4, 27, 27);
  controls.update();
  controls.saveState();
  let cameraPreset = 'reset';
  const cameraDestination = (mode) => {
    const destination = new THREE.Vector3(
      ...(mode === 'projection'
        ? [7, 11, 19]
        : mode === 'top'
          ? [0, 40, 0.01]
          : camera.aspect < 1.25
            ? [2, 36, 26]
            : [4, 27, 27]),
    );
    destination.multiplyScalar(Math.max(1, 1.15 / camera.aspect));
    if (destination.length() > controls.maxDistance) destination.setLength(controls.maxDistance);
    return destination;
  };
  controls.addEventListener('start', () => {
    cameraPreset = null;
  });
  controls.addEventListener('change', () => {
    dirty = true;
  });
  scene.add(
    new THREE.HemisphereLight(
      classic ? '#fff7df' : '#a8d7ff',
      classic ? '#446857' : '#0a1a32',
      classic ? 1.1 : 1.6,
    ),
  );
  const key = new THREE.DirectionalLight('#ffe1b7', classic ? 2 : 3);
  key.position.set(-12, 30, 15);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -17;
  key.shadow.camera.right = key.shadow.camera.top = 17;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const fill = new THREE.DirectionalLight(classic ? '#b8e6c7' : '#5aaaff', classic ? 1 : 1.8);
  fill.position.set(17, 12, -18);
  scene.add(fill);
  const material = (color, options = {}) =>
    register(
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, ...options }),
    );
  const box = (width, height, depth, mat, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(register(new THREE.BoxGeometry(width, height, depth)), mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };
  const rim = material(classic ? '#806647' : '#082039', { metalness: 0.7, roughness: 0.32 });
  if (classic) {
    box(24.75, 0.38, 24.75, rim, 0, -0.3);
    box(24.1, 0.12, 24.1, material('#e5e0cc'), 0, -0.02);
  } else {
    const grid = new THREE.GridHelper(24.5, 28, '#49c9ff', '#22618d');
    register(grid.geometry);
    register(grid.material);
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    grid.position.y = -0.1;
    scene.add(grid);
  }
  const glow = material(classic ? '#d0aa57' : '#a3dcea', {
    emissive: classic ? '#6b4715' : '#296b96',
    emissiveIntensity: 0.6,
  });
  [
    [0, -12.3, 24.4, 0.045],
    [0, 12.3, 24.4, 0.045],
    [-12.3, 0, 0.045, 24.4],
    [12.3, 0, 0.045, 24.4],
  ].forEach(([x, z, w, d]) => box(w, 0.07, d, glow, x, -0.1, z));
  const center = canvasSurface(1024, 1024);
  register(center.texture);
  paintCenter(center, classic);
  box(
    17.95,
    0.02,
    17.95,
    register(
      new THREE.MeshBasicMaterial({
        map: center.texture,
        transparent: !classic,
        opacity: classic ? 1 : 0.82,
        toneMapped: false,
      }),
    ),
    0,
    0.04,
  );
  if (!classic)
    for (const radius of [5.8, 6.5, 7.5]) {
      const ring = new THREE.Mesh(
        register(new THREE.RingGeometry(radius, radius + 0.025, 96)),
        register(
          new THREE.MeshBasicMaterial({
            color: '#56d9ff',
            transparent: true,
            opacity: 0.48,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.12;
      scene.add(ring);
    }
  const tileMeshes = [],
    tiles = new Map(),
    pieces = new Map(),
    tweens = new Set(),
    models = new Set();
  let hero = null,
    heroLabel = null,
    heroTile = null;
  const disposeGroup = (group) => {
    const used = new Set();
    group.traverse((object) => {
      if (object.geometry && resources.has(object.geometry)) used.add(object.geometry);
      if (object.material)
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((mat) => {
          used.add(mat);
          if (mat.map) used.add(mat.map);
        });
    });
    used.forEach((resource) => {
      resource.dispose();
      resources.delete(resource);
    });
    group.removeFromParent();
  };
  const requestImage = (url, finished) => {
    if (!url) return;
    if (images.has(url)) {
      finished(images.get(url));
      return;
    }
    if (loadingImages.has(url)) {
      loadingImages.get(url).callbacks.push(finished);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    const callbacks = [finished];
    loadingImages.set(url, { image, callbacks });
    image.onload = () => {
      loadingImages.delete(url);
      if (disposed) return;
      images.set(url, image);
      container.dataset.loadedPhotos = images.size;
      callbacks.forEach((callback) => callback(image));
      dirty = true;
    };
    image.onerror = () => {
      loadingImages.delete(url);
    };
    image.src = url;
  };
  const showHero = (tile) => {
    if (heroTile === tile.id) return;
    if (hero && !classic) {
      models.delete(hero);
      disposeGroup(hero);
    }
    if (heroLabel) disposeGroup(heroLabel);
    heroTile = tile.id;
    if (!classic) {
      hero = createPlanet(tile, register, true, getSurface);
      hero.position.set(0, 3.85, -1.4);
      scene.add(hero);
      models.add(hero);
    } else if (!hero) {
      hero = createIndiaAtlas(board, register);
      hero.position.y = 0.16;
      scene.add(hero);
      tileMeshes.push(...hero.userData.pickables);
      container.dataset.cityMarkers = hero.userData.pickables.length;
    }
    hero.userData.update?.(game, tile.id, ownerFilter);
    heroLabel = modelLabel(tile.name, classic, register);
    scene.add(heroLabel);
    container.dataset.focusedWorld = tile.name;
    dirty = true;
  };
  for (const tile of board) {
    const plan = tilePlan(tile.id),
      group = new THREE.Group();
    group.position.set(plan.x, 0.14, plan.z);
    scene.add(group);
    const surface = canvasSurface(256, Math.round((256 * plan.depth) / plan.width));
    register(surface.texture);
    const side = classic
      ? material('#e0dbc2')
      : register(
          new THREE.MeshBasicMaterial({ color: '#071a30', transparent: true, opacity: 0.6 }),
        );
    const top = classic
      ? material('#ffffff', { map: surface.texture, roughness: 0.7, metalness: 0.06 })
      : register(
          new THREE.MeshBasicMaterial({
            map: surface.texture,
            transparent: true,
            opacity: 0.9,
            toneMapped: false,
          }),
        );
    const mesh = new THREE.Mesh(
      register(new THREE.BoxGeometry(plan.width - 0.08, classic ? 0.12 : 0.045, plan.depth - 0.08)),
      [side, side, top, side, side, side],
    );
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.tileId = tile.id;
    group.add(mesh);
    tileMeshes.push(mesh);
    const ownerMaterial = classic
      ? material('#e7c785', { emissive: '#714416', emissiveIntensity: 0.5 })
      : register(new THREE.MeshBasicMaterial({ color: '#7ae9ff' }));
    const ownerBar = new THREE.Mesh(
      register(new THREE.BoxGeometry(plan.width - 0.15, 0.065, 0.12)),
      ownerMaterial,
    );
    ownerBar.position.set(0, 0.15, plan.depth / 2 - 0.15);
    group.add(ownerBar);
    const border = new THREE.LineSegments(
      register(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(plan.width - 0.01, 0.27, plan.depth - 0.01)),
      ),
      register(new THREE.LineBasicMaterial({ color: '#ffe09e' })),
    );
    border.position.y = 0.02;
    group.add(border);
    border.visible = false;
    const info = {
      tile,
      plan,
      group,
      mesh,
      surface,
      ownerBar,
      border,
      buildings: null,
      photo: null,
      level: 0,
      worldModel: null,
    };
    tiles.set(tile.id, info);
    if (!classic && tile.type === 'property') {
      info.worldModel = createPlanet(tile, register, false, getSurface);
      info.worldModel.position.set(0, 0.62, -plan.depth * 0.2);
      info.worldModel.userData.pickable.userData.tileId = tile.id;
      group.add(info.worldModel);
      tileMeshes.push(info.worldModel.userData.pickable);
      models.add(info.worldModel);
      container.dataset.worldModels = Number(container.dataset.worldModels) + 1;
    }
    requestImage(tileImage(tile), (image) => {
      info.photo = image;
      repaint(info);
    });
  }
  let selection = 1,
    hover = null,
    highlightedPlayer = null,
    ownerFilter = null,
    moveTween = null;
  const highlightTile = (info) => {
    const player = game.players.find((player) => player.id === highlightedPlayer);
    const location = player?.position === info.tile.id;
    info.border.visible = location || selection === info.tile.id || hover === info.tile.id;
    info.border.material.color.set(location ? player.color : '#ffe09e');
    const dim = ownerFilter && game.ownership[info.tile.id]?.owner !== ownerFilter;
    info.mesh.material[2].color.set(dim ? '#647683' : '#ffffff');
    if (info.worldModel) info.worldModel.userData.surface.uniforms.emphasis.value = dim ? 0.2 : 1;
  };
  const repaint = (info) => {
    const owned = game.ownership[info.tile.id],
      owner = game.players.find((player) => player.id === owned?.owner);
    paintTile(
      info.surface,
      info.tile,
      classic,
      classic || info.tile.type === 'transport' ? info.photo : null,
      owned,
      owner?.color,
      game.rules,
      Boolean(info.worldModel),
    );
    info.ownerBar.visible = Boolean(owner);
    if (owner) {
      info.ownerBar.material.color.set(owner.color);
      info.ownerBar.material.emissive?.set(owner.color);
    }
    highlightTile(info);
  };
  tiles.forEach(repaint);
  const dice = [createDice(register), createDice(register)];
  dice.forEach((die, i) => {
    die.position.set(i ? 1 : -1, 0.76, classic ? 6.7 : 4.6);
    scene.add(die);
  });
  const setDice = (animated) => {
    dice.forEach((die, i) => {
      const [x, y, z] = diceRotation(game.dice[i]);
      if (animated && !reduced) {
        const timeline = gsap.timeline();
        tweens.add(timeline);
        timeline.fromTo(
          die.rotation,
          { x: x + Math.PI * 4, y: Math.PI * 3, z: z + Math.PI * 2 },
          { x, y, z, duration: 1.05, ease: 'power3.out' },
          0,
        );
        timeline.fromTo(
          die.position,
          { y: 3.2 },
          { y: 0.76, duration: 1.05, ease: 'bounce.out' },
          0,
        );
        timeline.eventCallback('onComplete', () => tweens.delete(timeline));
      } else die.rotation.set(x, y, z);
    });
  };
  const setPieces = (before, animate) => {
    const active = game.players.filter((player) => !player.bankrupt),
      ids = new Set(active.map((player) => player.id));
    for (const [id, piece] of pieces)
      if (!ids.has(id)) {
        disposeGroup(piece);
        pieces.delete(id);
      }
    for (const [index, player] of active.entries()) {
      let piece = pieces.get(player.id);
      if (!piece) {
        piece = createPiece(player.color, classic, badgeFor(player), register);
        scene.add(piece);
        pieces.set(player.id, piece);
      }
      piece.userData.ring.visible = player.id === game.players[game.turn].id;
      piece.userData.playerId = player.id;
      const position = piecePosition(player.position, index);
      if (animate && !reduced && game.movement?.player === player.id) {
        const m = game.movement,
          path =
            m.path ||
            Array.from(
              { length: m.steps },
              (_, step) => (m.from + (m.back ? -(step + 1) : step + 1) + 80) % 40,
            );
        const start = piecePosition(m.from, index);
        piece.position.set(start.x, 0.28, start.z);
        moveTween?.kill();
        onMoving(true);
        const timeline = gsap.timeline({
          onComplete: () => {
            onMoving(false);
            tweens.delete(timeline);
            moveTween = null;
          },
        });
        moveTween = timeline;
        tweens.add(timeline);
        path.forEach((id, step) => {
          const target = piecePosition(id, index),
            at = step * 0.26;
          timeline.to(
            piece.position,
            { x: target.x, z: target.z, duration: 0.26, ease: 'power1.inOut' },
            at,
          );
          timeline.to(piece.position, { y: 0.62, duration: 0.13, ease: 'power1.out' }, at);
          timeline.to(piece.position, { y: 0.28, duration: 0.13, ease: 'power1.in' }, at + 0.13);
        });
        if (path.at(-1) !== player.position)
          timeline.to(piece.position, {
            x: position.x,
            z: position.z,
            duration: 0.45,
            ease: 'power2.inOut',
          });
      } else if (
        before?.players.find((old) => old.id === player.id)?.position !== player.position ||
        !moveTween
      )
        piece.position.set(position.x, 0.28, position.z);
    }
  };
  function setGame(next) {
    const before = game,
      changed = next.version !== game.version;
    game = next;
    for (const info of tiles.values()) {
      repaint(info);
      const level = game.ownership[info.tile.id]?.level || 0;
      if (level !== info.level) {
        if (info.buildings) disposeGroup(info.buildings);
        info.level = level;
        if (level) {
          info.buildings = createBuildings(level, classic, register);
          info.buildings.position.set(0, 0.18, -info.plan.depth / 2 + 0.45);
          info.group.add(info.buildings);
          if (changed && !reduced) {
            const tween = gsap.from(info.buildings.scale, {
              y: 0.01,
              duration: 0.65,
              ease: 'back.out(1.5)',
              onComplete: () => tweens.delete(tween),
            });
            tweens.add(tween);
          }
        } else info.buildings = null;
      }
      if (
        changed &&
        !reduced &&
        before.ownership[info.tile.id]?.owner !== game.ownership[info.tile.id]?.owner &&
        game.ownership[info.tile.id]
      ) {
        const tween = gsap.fromTo(
          info.group.position,
          { y: 0.14 },
          {
            y: 0.38,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out',
            onComplete: () => tweens.delete(tween),
          },
        );
        tweens.add(tween);
      }
    }
    setPieces(before, changed);
    setDice(changed && game.lastActionType === 'ROLL');
    hero?.userData.update?.(game, selection, ownerFilter);
    dirty = true;
  }
  setGame(game);
  showHero(board[1]);
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  const pick = (event) => {
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      -(((event.clientY - box.top) / box.height) * 2 - 1),
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...tileMeshes, ...dice], false)[0]?.object;
    return dice.includes(hit) ? 'dice' : (hit?.userData.tileId ?? null);
  };
  let down;
  const pointerDown = (event) => {
    down = { x: event.clientX, y: event.clientY };
  };
  const pointerUp = (event) => {
    const started = down;
    down = null;
    if (!started || Math.hypot(event.clientX - started.x, event.clientY - started.y) > 6) return;
    const id = pick(event);
    if (id === 'dice') onRoll?.();
    else if (id !== null) onSelect(id);
  };
  const pointerMove = (event) => {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) {
      if (hover !== null) {
        hover = null;
        onHover(null);
      }
      renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const id = pick(event);
    if (id === 'dice') {
      if (hover !== null) {
        hover = null;
        onHover(null);
        tiles.forEach(highlightTile);
        dirty = true;
      }
      renderer.domElement.style.cursor = mayRoll?.() ? 'pointer' : 'default';
      return;
    }
    if (id === hover) return;
    hover = id;
    tiles.forEach(highlightTile);
    renderer.domElement.style.cursor = id === null ? 'grab' : 'pointer';
    onHover(id);
    dirty = true;
  };
  const pointerLeave = () => {
    hover = null;
    down = null;
    onHover(null);
    tiles.forEach(highlightTile);
    dirty = true;
  };
  const contextLost = (event) => {
    event.preventDefault();
    if (!disposed) onError();
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerleave', pointerLeave);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (cameraPreset) camera.position.copy(cameraDestination(cameraPreset));
    dirty = true;
  });
  resize.observe(container);
  renderer.setAnimationLoop((now) => {
    if (disposed || document.hidden || now - lastFrame < (tweens.size ? 16 : 32)) return;
    lastFrame = now;
    const changed = controls.update();
    if (!reduced)
      pieces.forEach((piece) => {
        if (piece.userData.ring.visible)
          piece.userData.ring.scale.setScalar(1 + Math.sin(now / 450) * 0.07);
      });
    models.forEach((model) => {
      if (!reduced) {
        model.rotation.y = (now / 1000) * 0.045;
        model.userData.surface.uniforms.time.value = now / 1000;
      }
    });
    if (reduced && !dirty && !changed && !tweens.size) return;
    renderer.render(scene, camera);
    if (dirty || changed || !ready) {
      const plan = tilePlan(selection),
        point = new THREE.Vector3(plan.x, 0.55, plan.z).project(camera);
      onProject({
        x: ((point.x + 1) / 2) * container.clientWidth,
        y: ((1 - point.y) / 2) * container.clientHeight,
        visible: point.z < 1 && Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
      });
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
      tiles.forEach(highlightTile);
      hero?.userData.update?.(game, selection, ownerFilter);
      dirty = true;
    },
    select(id) {
      selection = id;
      tiles.forEach(repaint);
      dirty = true;
      const focused = board[id]?.type === 'property' ? board[id] : board[1];
      showHero(focused);
    },
    reduced(value) {
      reduced = value;
      controls.enableDamping = !value;
      if (value) {
        tweens.forEach((tween) => tween.kill());
        tweens.clear();
        moveTween = null;
        onMoving(false);
        tiles.forEach((info) => {
          info.group.position.y = 0.14;
          info.buildings?.scale.set(1, 1, 1);
        });
        dice.forEach((die) => {
          die.position.y = 0.76;
        });
        setGame(game);
      }
      dirty = true;
    },
    camera(mode) {
      cameraPreset = mode;
      const destination = cameraDestination(mode);
      controls.minDistance = mode === 'projection' ? 18 : 26;
      controls.target.set(
        0,
        mode === 'projection' ? (classic ? 0.5 : 3.85) : 0,
        mode === 'projection' ? (classic ? 0 : -1.4) : 0,
      );
      if (reduced) {
        camera.position.copy(destination);
        controls.update();
      } else {
        const tween = gsap.to(camera.position, {
          x: destination.x,
          y: destination.y,
          z: destination.z,
          duration: 0.7,
          ease: 'power2.inOut',
          onComplete: () => tweens.delete(tween),
        });
        tweens.add(tween);
      }
      dirty = true;
    },
    zoom(factor) {
      cameraPreset = null;
      camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
      controls.update();
      dirty = true;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resize.disconnect();
      controls.dispose();
      tweens.forEach((tween) => tween.kill());
      onMoving(false);
      loadingImages.forEach(({ image }) => {
        image.onload = image.onerror = null;
        image.src = '';
      });
      loadingImages.clear();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerleave', pointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      resources.forEach((resource) => resource.dispose());
      resources.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
