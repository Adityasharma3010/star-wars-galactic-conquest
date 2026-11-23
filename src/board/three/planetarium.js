import * as THREE from 'three';
import { createPlanet } from './worlds.js';

export function createPlanetarium(scene, board, register, container, changed) {
  const textures = new Map(),
    nodes = [],
    pickables = [];
  container.dataset.worldModels = '0';
  container.dataset.surfaceTextures = '0';
  const getSurface = (kind) => {
    const name =
      kind === 'clouds'
        ? 'earth_clouds'
        : ['mars', 'moon', 'earth_daymap', 'mars', 'jupiter', 'earth_daymap', 'earth_nightmap'][
            kind
          ];
    if (textures.has(name)) return textures.get(name);
    const entry = { texture: null, ready: { value: 0 } };
    const texture = new THREE.TextureLoader().load(`/images/space-surfaces/${name}.jpg`, () => {
      entry.ready.value = 1;
      container.dataset.surfaceTextures = [...textures.values()].filter(
        (entry) => entry.ready.value,
      ).length;
      changed?.();
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    entry.texture = register(texture);
    textures.set(name, entry);
    return entry;
  };
  const worlds = board.filter((tile) => tile.type === 'property');
  worlds.forEach((tile, index) => {
    const ring =
      index < 3
        ? { count: 3, radius: 2.35, index }
        : index < 10
          ? { count: 7, radius: 4.6, index: index - 3 }
          : { count: 12, radius: 7.35, index: index - 10 };
    const angle = ((ring.index + 0.5) * Math.PI * 2) / ring.count;
    const model = createPlanet(tile, register, false, getSurface, {
      radius: 0.79,
      highDetail: true,
      holographic: true,
    });
    model.position.set(
      Math.sin(angle) * ring.radius,
      index < 3 ? 1.4 : 1.25,
      -Math.cos(angle) * ring.radius,
    );
    model.userData.pickable.userData.tileId = tile.id;
    pickables.push(model.userData.pickable);
    scene.add(model);
    const light = new THREE.Mesh(
      register(new THREE.RingGeometry(0.46, 0.52, 48)),
      register(
        new THREE.MeshBasicMaterial({
          color: tile.planetColor || '#8ddde7',
          transparent: true,
          opacity: 0.48,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    light.rotation.x = -Math.PI / 2;
    light.position.set(model.position.x, 0.205, model.position.z);
    scene.add(light);
    nodes.push({ tile, model, light });
  });
  container.dataset.worldModels = nodes.length;
  return {
    pickables,
    position(id) {
      return nodes.find((node) => node.tile.id === id)?.model.position.clone();
    },
    animate(time) {
      nodes.forEach(({ model }) => {
        model.rotation.y = time * 0.035;
        model.userData.surface.uniforms.time.value = time;
      });
    },
    highlight(game, selected, filter) {
      nodes.forEach(({ tile, model, light }) => {
        const dim = filter && game.ownership[tile.id]?.owner !== filter;
        model.userData.surface.uniforms.emphasis.value = dim ? 0.28 : 1;
        model.scale.setScalar(tile.id === selected ? 1.12 : 1);
        light.material.opacity = tile.id === selected ? 0.9 : dim ? 0.18 : 0.48;
      });
    },
    project(camera, width, height) {
      return nodes.map(({ tile, model }) => {
        const center = model.position.clone().project(camera);
        const point = model.position.clone();
        point.y -= 0.92;
        point.z += 0.22;
        point.project(camera);
        return {
          id: tile.id,
          name: tile.name,
          modelX: ((center.x + 1) * width) / 2,
          modelY: ((1 - center.y) * height) / 2,
          x: ((point.x + 1) * width) / 2,
          y: ((1 - point.y) * height) / 2,
          visible: Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
        };
      });
    },
  };
}
