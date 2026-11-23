import * as THREE from 'three';

export function hologramMaterial(color, register, options = {}) {
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.28,
    roughness: 0.42,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    ...options,
  });
  material.userData.holoTime = time;
  material.customProgramCacheKey = () => 'falcon-projection-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.holoTime = time;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 hologramPosition;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nhologramPosition = position;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 hologramPosition;\nuniform float holoTime;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      float scan = .5 + .5 * sin(hologramPosition.y * 75.0 - holoTime * 3.0);
      diffuseColor.a *= .65 + .3 * smoothstep(.22,.7,scan);
      outgoingLight += diffuseColor.rgb * (.07 + scan * .12);
      #include <opaque_fragment>
    `,
    );
  };
  return register(material);
}
