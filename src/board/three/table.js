import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { boardFor, isClassic } from '../../game/maps.js';
import { scenePlan, scenePiecePosition, diceRotation } from './layout.js';
import { createPlanetarium } from './planetarium.js';
import { canvasSurface, paintTile, tileImage } from './textures.js';
import { createPiece, createBuildings, createDice } from './pieces.js';
import { createFurniture, createTileFrame } from './tabletop.js';

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
    lastFrame = 0;
  let selection = 1,
    hover = null,
    highlightedPlayer = null,
    ownerFilter = null,
    moveTween = null;
  let cameraPreset = 'table';
  const classic = isClassic(game),
    board = boardFor(game),
    pawnHeight = classic ? 0.255 : 0.55;
  const resources = new Set(),
    tiles = new Map(),
    pieces = new Map(),
    tweens = new Set();
  const images = new Map(),
    loadingImages = new Map(),
    tileMeshes = [];
  const register = (resource) => {
    resources.add(resource);
    return resource;
  };
  container.dataset.presentation = classic ? 'tabletop' : 'holochess';
  container.dataset.loadedPhotos = '0';
  container.dataset.pawnModels = '0';
  container.dataset.physicalTiles = '40';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(classic ? '#584b40' : '#354247');
  const camera = new THREE.OrthographicCamera(-18, 18, 14, -14, 0.1, 150);
  camera.position.set(12, 26, 28);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(
    Math.max(innerWidth < 700 ? 1.5 : 2, Math.min(window.devicePixelRatio || 1, 2.5)),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D Monopoly table');
  renderer.domElement.dataset.testid = 'three-canvas';
  container.appendChild(renderer.domElement);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.06);
  register(environment);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  room.dispose();
  pmrem.dispose();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduced;
  controls.dampingFactor = 0.1;
  controls.minZoom = 0.6;
  controls.maxZoom = 3;
  controls.minPolarAngle = 0.015;
  controls.maxPolarAngle = Math.PI * 0.4;
  controls.enablePan = false;
  controls.target.set(0, 0.3, 0);
  controls.update();
  let aspect = 1;
  const fitCamera = () => {
    camera.updateMatrixWorld();
    let width = 0,
      height = 0;
    const bounds = classic
      ? [-12.8, 12.8].flatMap((x) => [-12.8, 12.8].map((z) => ({ x, z })))
      : Array.from({ length: 64 }, (_, index) => ({
          x: Math.sin((index * Math.PI) / 32) * 13.9,
          z: Math.cos((index * Math.PI) / 32) * 13.9,
        }));
    for (const { x, z } of bounds)
      for (const y of [-0.95, 2.8]) {
        const corner = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        width = Math.max(width, Math.abs(corner.x) * 2);
        height = Math.max(height, Math.abs(corner.y) * 2);
      }
    const span = Math.max(height, width / aspect) * 1.055;
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  controls.addEventListener('start', () => {
    cameraPreset = null;
  });
  controls.addEventListener('change', () => {
    dirty = true;
  });
  scene.add(new THREE.HemisphereLight('#fff7df', '#65777c', 0.55));
  const key = new THREE.DirectionalLight('#fff1d6', 2);
  key.position.set(-14, 28, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -19;
  key.shadow.camera.right = key.shadow.camera.top = 19;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 75;
  key.shadow.normalBias = 0.015;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#d8edff', 0.5);
  fill.position.set(16, 12, -18);
  scene.add(fill);
  createFurniture(scene, classic, register);

  const material = (color, options = {}) =>
    register(new THREE.MeshStandardMaterial({ color, roughness: 0.62, ...options }));
  const disposeGroup = (group) => {
    const used = new Set();
    group.traverse((object) => {
      if (object.geometry) used.add(object.geometry);
      if (object.material)
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((mat) => {
          used.add(mat);
          if (mat.map) used.add(mat.map);
        });
    });
    used.forEach((resource) => {
      if (resources.has(resource)) {
        resource.dispose();
        resources.delete(resource);
      }
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
      callbacks.forEach((callback) => callback(image));
      dirty = true;
    };
    image.onerror = () => loadingImages.delete(url);
    image.src = url;
  };
  const highlightTile = (info) => {
    const player = game.players.find((player) => player.id === highlightedPlayer);
    const location = player && !player.bankrupt && player.position === info.tile.id;
    const owned = ownerFilter && game.ownership[info.tile.id]?.owner === ownerFilter;
    const owner = game.players.find((player) => player.id === ownerFilter);
    info.border.visible = Boolean(
      location ||
      owned ||
      (!highlightedPlayer && (selection === info.tile.id || hover === info.tile.id)),
    );
    info.border.userData.material.color.set(
      location ? player.color : owned ? owner.color : '#d4ad62',
    );
    const dim = ownerFilter && !location && !owned;
    info.top.color.set(dim ? '#92978d' : '#ffffff');
    info.group.position.y = classic
      ? selection === info.tile.id
        ? 0.175
        : 0.14
      : selection === info.tile.id
        ? 0.42
        : 0.38;
  };
  const repaint = (info) => {
    const owned = game.ownership[info.tile.id],
      owner = game.players.find((player) => player.id === owned?.owner);
    paintTile(info.surface, info.tile, classic, info.photo, owned, owner?.color, game.rules);
    info.ownerBar.visible = Boolean(owner);
    if (owner) info.ownerBar.material.color.set(owner.color);
    highlightTile(info);
  };
  for (const tile of board) {
    const plan = scenePlan(tile.id, classic),
      corner = tile.id % 10 === 0;
    const width = classic ? (corner ? 3 : 2) : plan.width,
      depth = 3;
    const group = new THREE.Group();
    group.position.set(plan.x, classic ? 0.14 : 0.38, plan.z);
    group.rotation.y = plan.rotation;
    scene.add(group);
    const surface = canvasSurface(768, classic && corner ? 768 : 1152);
    register(surface.texture);
    surface.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const side = classic
      ? material('#d8cdb4', { roughness: 0.72 })
      : material('#236981', { transparent: true, opacity: 0.28, depthWrite: false });
    const top = material(
      '#ffffff',
      classic
        ? { map: surface.texture, roughness: 0.76 }
        : {
            map: surface.texture,
            roughness: 0.6,
            transparent: true,
            opacity: 0.94,
            emissive: '#35758a',
            emissiveIntensity: 0.28,
          },
    );
    const geometry = register(
      new THREE.BoxGeometry(width - 0.055, classic ? 0.2 : 0.13, depth - 0.055),
    );
    if (!classic) {
      const vertices = geometry.attributes.position;
      for (let index = 0; index < vertices.count; index++)
        vertices.setX(
          index,
          (vertices.getX(index) * (plan.radius + vertices.getZ(index))) / plan.radius,
        );
      vertices.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    const mesh = new THREE.Mesh(geometry, [side, side, top, side, side, side]);
    mesh.castShadow = mesh.receiveShadow = classic;
    mesh.userData.tileId = tile.id;
    group.add(mesh);
    tileMeshes.push(mesh);
    const ownerBar = new THREE.Mesh(
      register(new THREE.BoxGeometry(width - 0.12, 0.055, 0.12)),
      material('#d4ad62', { roughness: 0.35 }),
    );
    ownerBar.position.set(0, 0.13, depth / 2 - 0.12);
    group.add(ownerBar);
    const border = classic
      ? createTileFrame(width - 0.025, depth - 0.025, register)
      : new THREE.LineSegments(
          register(new THREE.EdgesGeometry(geometry)),
          register(
            new THREE.LineBasicMaterial({ color: '#93e5eb', transparent: true, opacity: 0.75 }),
          ),
        );
    if (!classic) border.userData.material = border.material;
    group.add(border);
    border.visible = false;
    const info = {
      tile,
      plan,
      group,
      mesh,
      top,
      surface,
      ownerBar,
      border,
      photo: null,
      buildings: null,
      level: 0,
      width,
      depth,
    };
    tiles.set(tile.id, info);
    requestImage(tileImage(tile), (image) => {
      info.photo = image;
      repaint(info);
    });
  }
  const planets = classic
    ? null
    : createPlanetarium(scene, board, register, container, () => {
        if (!disposed) dirty = true;
      });
  const dice = [createDice(register, classic), createDice(register, classic)];
  dice.forEach((die, index) => {
    die.position.set(index ? 1 : -1, 0.76, classic ? 6.7 : 8.5);
    die.receiveShadow = true;
    scene.add(die);
  });
  const setDice = (animated) =>
    dice.forEach((die) => {
      const index = dice.indexOf(die),
        [x, y, z] = diceRotation(game.dice[index]);
      if (animated && !reduced) {
        const timeline = gsap.timeline({ onComplete: () => tweens.delete(timeline) });
        tweens.add(timeline);
        timeline.fromTo(
          die.rotation,
          { x: x + Math.PI * 4, y: Math.PI * 3, z: z + Math.PI * 2 },
          { x, y, z, duration: 1.05, ease: 'power3.out' },
          0,
        );
        timeline.fromTo(
          die.position,
          { y: 2.8 },
          { y: 0.76, duration: 1.05, ease: 'bounce.out' },
          0,
        );
      } else die.rotation.set(x, y, z);
    });
  const pawnPosition = (position, player) => {
    const occupants = game.players.filter(
      (pawn) => !pawn.bankrupt && (pawn.position === position || pawn.id === player.id),
    );
    return scenePiecePosition(
      position,
      Math.max(
        0,
        occupants.findIndex((pawn) => pawn.id === player.id),
      ),
      occupants.length,
      classic,
    );
  };
  const stylePiece = (piece, player) => {
    const count = game.players.filter(
      (pawn) => !pawn.bankrupt && pawn.position === player.position,
    ).length;
    const scale = count > 4 ? 0.66 : count > 1 ? 0.8 : 1.12;
    piece.scale.setScalar(scale * (player.id === highlightedPlayer ? 1.12 : 1));
    piece.userData.ring.visible =
      (game.phase !== 'finished' && player.id === game.players[game.turn].id) ||
      player.id === highlightedPlayer;
    piece.userData.ring.scale.setScalar(1);
    piece.userData.visual.scale.setScalar(1);
  };
  const setPieces = (before, animate) => {
    const active = game.players.filter((player) => !player.bankrupt),
      ids = new Set(active.map((player) => player.id));
    for (const [id, piece] of pieces)
      if (!ids.has(id)) {
        disposeGroup(piece);
        pieces.delete(id);
      }
    for (const player of active) {
      let piece = pieces.get(player.id);
      if (!piece) {
        piece = createPiece(player.color, classic, register);
        scene.add(piece);
        pieces.set(player.id, piece);
      }
      piece.userData.tileId = player.position;
      piece.userData.playerId = player.id;
      stylePiece(piece, player);
      const position = pawnPosition(player.position, player);
      if (animate && !reduced && game.movement?.player === player.id) {
        const movement = game.movement;
        const path =
          movement.path ||
          Array.from(
            { length: movement.steps },
            (_, step) => (movement.from + (movement.back ? -(step + 1) : step + 1) + 80) % 40,
          );
        const start = pawnPosition(movement.from, player);
        piece.position.set(start.x, pawnHeight, start.z);
        if (moveTween) {
          moveTween.kill();
          tweens.delete(moveTween);
        }
        onMoving(true);
        const timeline = gsap.timeline({
          onComplete: () => {
            onMoving(false);
            tweens.delete(timeline);
            moveTween = null;
            dirty = true;
          },
        });
        moveTween = timeline;
        tweens.add(timeline);
        let previousPosition = start;
        path.forEach((id, step) => {
          const target = pawnPosition(id, player),
            at = step * 0.26;
          const angle = Math.atan2(target.x - previousPosition.x, target.z - previousPosition.z);
          timeline.to(piece.rotation, { y: angle, duration: 0.18, ease: 'power1.out' }, at);
          timeline.to(
            piece.position,
            { x: target.x, z: target.z, duration: 0.26, ease: 'power1.inOut' },
            at,
          );
          timeline.to(
            piece.position,
            { y: pawnHeight + 0.4, duration: 0.13, ease: 'power1.out' },
            at,
          );
          timeline.to(
            piece.position,
            { y: pawnHeight, duration: 0.13, ease: 'power1.in' },
            at + 0.13,
          );
          previousPosition = target;
        });
        if (path.at(-1) !== player.position)
          timeline.to(piece.position, {
            x: position.x,
            z: position.z,
            duration: 0.45,
            ease: 'power2.inOut',
          });
      } else if (
        !moveTween ||
        before?.players.find((old) => old.id === player.id)?.position !== player.position
      ) {
        piece.position.set(position.x, pawnHeight, position.z);
      }
    }
    container.dataset.pawnModels = pieces.size;
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
        info.buildings = null;
        if (level) {
          info.buildings = createBuildings(level, classic, register);
          info.buildings.position.set(0, 0.11, -info.depth / 2 + 0.42);
          info.group.add(info.buildings);
          if (changed && !reduced) {
            const tween = gsap.from(info.buildings.scale, {
              y: 0.01,
              duration: 0.55,
              ease: 'back.out(1.3)',
              onComplete: () => tweens.delete(tween),
            });
            tweens.add(tween);
          }
        }
      }
    }
    planets?.highlight(game, selection, ownerFilter);
    setPieces(before, changed);
    setDice(changed && game.lastActionType === 'ROLL');
    dirty = true;
    container.dataset.developmentModels = [...tiles.values()].reduce(
      (count, info) => count + (info.level === 5 ? 1 : info.level),
      0,
    );
  }
  setGame(game);
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
      [...tileMeshes, ...dice, ...pieces.values(), ...(planets?.pickables || [])],
      true,
    )[0]?.object;
    if (dice.includes(hit)) return 'dice';
    for (let object = hit; object; object = object.parent)
      if (object.userData.tileId !== undefined) return object.userData.tileId;
    return null;
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
    renderer.domElement.style.cursor =
      id === 'dice' ? (mayRoll?.() ? 'pointer' : 'default') : id === null ? 'grab' : 'pointer';
    const tile = id === 'dice' ? null : id;
    if (tile === hover) return;
    hover = tile;
    tiles.forEach(highlightTile);
    onHover(tile);
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
  for (const [name, handler] of [
    ['pointerdown', pointerDown],
    ['pointerup', pointerUp],
    ['pointermove', pointerMove],
    ['pointerleave', pointerLeave],
    ['webglcontextlost', contextLost],
  ])
    renderer.domElement.addEventListener(name, handler);
  const resize = new ResizeObserver(() => {
    const width = container.clientWidth,
      height = container.clientHeight;
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    aspect = width / height;
    if (cameraPreset === 'focus') {
      const span = camera.top - camera.bottom;
      camera.left = (-span * aspect) / 2;
      camera.right = (span * aspect) / 2;
      camera.updateProjectionMatrix();
    } else fitCamera();
    dirty = true;
  });
  resize.observe(container);
  renderer.setAnimationLoop((now) => {
    if (disposed || document.hidden || now - lastFrame < (tweens.size ? 16 : 32)) return;
    lastFrame = now;
    const changed = controls.update();
    if (!reduced) {
      resources.forEach((resource) => {
        if (resource.userData?.holoTime) resource.userData.holoTime.value = now / 1000;
      });
      planets?.animate(now / 1000);
    }
    if (!reduced)
      pieces.forEach((piece) => {
        if (piece.userData.ring.visible) {
          const breathe = 1 + Math.sin(now / 380) * 0.035;
          piece.userData.visual.scale.setScalar(breathe);
          piece.userData.ring.scale.setScalar(1 + Math.sin(now / 380) * 0.045);
        }
      });
    if (reduced && !dirty && !changed && !tweens.size) return;
    if (dirty || tweens.size) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    if (dirty || changed || !ready) {
      const plan = scenePlan(selection, classic),
        point = new THREE.Vector3(plan.x, 0.4, plan.z).project(camera);
      onWorldProject?.(
        planets?.project(camera, container.clientWidth, container.clientHeight) || [],
      );
      onProject({
        x: ((point.x + 1) / 2) * container.clientWidth,
        y: ((1 - point.y) / 2) * container.clientHeight,
        visible: Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
      });
      const die = dice[0].position.clone().project(camera);
      container.dataset.diceX = ((die.x + 1) / 2) * container.clientWidth;
      container.dataset.diceY = ((1 - die.y) / 2) * container.clientHeight;
      container.dataset.cameraZoom = camera.zoom;
      container.dataset.cameraView = cameraPreset || 'orbit';
      // Equal scales keep projected spheres round at every viewport size.
      container.dataset.pixelScaleX =
        (Math.abs(camera.projectionMatrix.elements[0]) * container.clientWidth) / 2;
      container.dataset.pixelScaleY =
        (Math.abs(camera.projectionMatrix.elements[5]) * container.clientHeight) / 2;
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
      planets?.highlight(game, selection, ownerFilter);
      tiles.forEach(highlightTile);
      pieces.forEach((piece, id) => {
        const player = game.players.find((player) => player.id === id);
        if (player) stylePiece(piece, player);
      });
      dirty = true;
    },
    select(id) {
      selection = id;
      planets?.highlight(game, id, ownerFilter);
      tiles.forEach(highlightTile);
      dirty = true;
    },
    reduced(value) {
      reduced = value;
      controls.enableDamping = !value;
      if (value) {
        tweens.forEach((tween) => tween.kill());
        tweens.clear();
        moveTween = null;
        onMoving(false);
        setGame(game);
        dice.forEach((die) => {
          die.position.y = 0.76;
        });
      }
      dirty = true;
    },
    camera(mode) {
      cameraPreset = mode === 'projection' ? 'focus' : mode;
      const plan = planets?.position(selection) || scenePlan(selection, classic),
        target =
          mode === 'projection'
            ? new THREE.Vector3(plan.x, plan.y ?? 0.3, plan.z)
            : new THREE.Vector3(0, 0.3, 0);
      const offset = mode === 'top' ? new THREE.Vector3(0, 40, 0.6) : new THREE.Vector3(12, 26, 28);
      // Set a complete camera pose together so a preset cannot lose its framing mid-transition.
      controls.target.copy(target);
      camera.position.copy(target).add(offset);
      camera.zoom = 1;
      controls.update();
      if (mode !== 'projection') fitCamera();
      else {
        camera.zoom = 1.7;
        camera.updateProjectionMatrix();
      }
      dirty = true;
    },
    zoom(factor) {
      cameraPreset = null;
      camera.zoom = THREE.MathUtils.clamp(camera.zoom / factor, 0.6, 3);
      camera.updateProjectionMatrix();
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
      for (const [name, handler] of [
        ['pointerdown', pointerDown],
        ['pointerup', pointerUp],
        ['pointermove', pointerMove],
        ['pointerleave', pointerLeave],
        ['webglcontextlost', contextLost],
      ])
        renderer.domElement.removeEventListener(name, handler);
      resources.forEach((resource) => resource.dispose());
      resources.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
