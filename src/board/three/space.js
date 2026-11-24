import * as THREE from 'three';
import { mulberry, glowTexture } from './common.js';
import { createShip } from './ships.js';

const NOISE = `
float hash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
`;

/** Deep-space dome: layered stars, a faint galactic band and coloured nebula clouds. */
export function createSkydome(register, palette = {}) {
  const { a = '#2b5fa8', b = '#7b3aa8', c = '#d98a3a' } = palette;
  const material = register(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        time: { value: 0 },
        ca: { value: new THREE.Color(a) },
        cb: { value: new THREE.Color(b) },
        cc: { value: new THREE.Color(c) },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `${NOISE}
        uniform float time; uniform vec3 ca; uniform vec3 cb; uniform vec3 cc; varying vec3 vDir;
        float stars(vec3 d, float scale, float density){
          vec3 p = d*scale; vec3 id = floor(p); vec3 f = fract(p)-.5;
          float h = hash(id);
          if(h < density) return 0.;
          vec3 o = vec3(hash(id+3.1),hash(id+7.7),hash(id+1.3))-.5;
          float d2 = length(f-o*.6);
          float tw = .75+.25*sin(time*(1.+h*4.)+h*40.);
          return (1.-smoothstep(.0,.16,d2))*tw*(.5+h);
        }
        void main(){
          vec3 d = normalize(vDir);
          float s = stars(d,70.,.965)*1.25 + stars(d,140.,.975)*.9 + stars(d,260.,.985)*.7;
          float band = exp(-pow(dot(d, normalize(vec3(.25,.9,.35)))*3.2,2.));
          float n1 = fbm(d*2.6+vec3(0.,time*.003,0.));
          float n2 = fbm(d*5.2+11.);
          vec3 col = vec3(.004,.007,.016);
          col += ca*pow(n1,2.6)*.7*(.35+band);
          col += cb*pow(n2,3.2)*.8*(.25+band*1.2);
          col += cc*pow(fbm(d*3.4+31.),4.)*.5*band;
          col += vec3(.62,.72,1.)*s*(.8+band*.8);
          col += vec3(1.,.9,.75)*band*pow(noise(d*60.),3.)*.35;
          gl_FragColor = vec4(min(col,vec3(6.)),1.);
          #include <colorspace_fragment>
        }`,
    }),
  );
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(260, 48, 32), material);
  register(mesh.geometry);
  mesh.renderOrder = -10;
  mesh.userData.material = material;
  return mesh;
}

/** Spiral galaxy hologram made of ~9k additive points. */
export function createGalaxy(
  register,
  { radius = 2.6, count = 9000, tint = '#8fc4ff', core = '#ffd9a6' } = {},
) {
  const rand = mulberry(42);
  const positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    sizes = new Float32Array(count);
  const inner = new THREE.Color(core),
    outer = new THREE.Color(tint),
    mix = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const arm = i % 3,
      t = Math.pow(rand(), 0.62),
      r = t * radius;
    const angle = (arm / 3) * Math.PI * 2 + t * 5.2 + (rand() - 0.5) * (0.55 - t * 0.25);
    const spread = (rand() - 0.5) * (0.28 + (1 - t) * 0.4) * radius * 0.2;
    positions[i * 3] = Math.cos(angle) * r + (rand() - 0.5) * 0.12;
    positions[i * 3 + 1] = spread * (1 - t * 0.6);
    positions[i * 3 + 2] = Math.sin(angle) * r + (rand() - 0.5) * 0.12;
    mix.copy(inner).lerp(outer, Math.min(1, t * 1.25));
    const lum = 0.55 + rand() * 0.9;
    colors.set([mix.r * lum, mix.g * lum, mix.b * lum], i * 3);
    sizes[i] = 0.5 + rand() * 1.4 + (1 - t) * 0.5;
  }
  const geometry = register(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const material = register(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { scale: { value: 95 }, opacity: { value: 1 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float scale;
        void main(){ vColor=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vColor; uniform float opacity;
        void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=1.-smoothstep(.0,.5,d); gl_FragColor=vec4(vColor*.42,a*a*opacity*.5); }`,
    }),
  );
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

/** Slowly drifting capital ships and TIE patrols out in the void. */
export function createFleet(register) {
  const group = new THREE.Group();
  const drifters = [];
  const specs = [
    { kind: 'destroyer', scale: 9, radius: 62, height: 14, speed: 0.012, phase: 0.4 },
    { kind: 'executor', scale: 14, radius: 90, height: -6, speed: 0.008, phase: 2.6 },
    { kind: 'destroyer', scale: 7, radius: 74, height: 26, speed: -0.01, phase: 4.4 },
    { kind: 'blockade', scale: 6, radius: 55, height: 2, speed: 0.016, phase: 5.5 },
  ];
  for (const spec of specs) {
    const ship = createShip(spec.kind, register);
    ship.scale.setScalar(spec.scale);
    group.add(ship);
    drifters.push({ ship, ...spec });
  }
  const ties = [];
  for (let i = 0; i < 6; i++) {
    const tie = createShip('tie', register);
    tie.scale.setScalar(1.6);
    group.add(tie);
    ties.push(tie);
  }
  return {
    group,
    animate(time) {
      for (const d of drifters) {
        const a = d.phase + time * d.speed;
        d.ship.position.set(
          Math.cos(a) * d.radius,
          d.height + Math.sin(time * 0.1 + d.phase) * 0.8,
          Math.sin(a) * d.radius,
        );
        d.ship.rotation.y = -a + (d.speed > 0 ? 0 : Math.PI) + Math.PI;
      }
      ties.forEach((tie, i) => {
        const a = time * 0.05 + i * 1.05;
        tie.position.set(
          Math.cos(a) * 34,
          5 + Math.sin(time * 0.4 + i) * 1.4 + i,
          Math.sin(a) * 34,
        );
        tie.rotation.set(0, -a + Math.PI / 2, Math.sin(time * 0.5 + i) * 0.3);
      });
    },
  };
}

export { glowTexture };
