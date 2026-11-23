import * as THREE from 'three';
import OUTLINE from '../../assets/indiaOutline.json';
import { canvasSurface } from './textures.js';

const palettes = {
  Tatooine: [0, '#8b542e', '#e8c088', '#e8ba75', 0.5],
  Jakku: [0, '#7b533c', '#dbc39f', '#dcd0ad', 0.5],
  Geonosis: [0, '#63291e', '#b76b38', '#d29168', 0.5],
  Hoth: [1, '#5999b7', '#e5f5fa', '#92d8ff', 0.5],
  Kessel: [0, '#344940', '#a39b65', '#a1ba85', 0.5],
  Lothal: [2, '#143f57', '#829365', '#a9dbed', 0.41],
  Dantooine: [2, '#123452', '#739448', '#87bde1', 0.38],
  'Yavin 4': [2, '#183649', '#38643b', '#a8e4bf', 0.35],
  Dagobah: [2, '#143b3b', '#2e5941', '#87b796', 0.34],
  'Ahch-To': [2, '#123b61', '#7a8b69', '#aecfe2', 0.62],
  Mandalore: [0, '#344353', '#8597a1', '#b9d1e1', 0.5],
  Bespin: [4, '#8d4b37', '#e8bd89', '#ecc4a3', 0.5],
  Naboo: [2, '#12385c', '#588746', '#96d8ff', 0.47],
  Kashyyyk: [2, '#123643', '#315b2c', '#9ccdaf', 0.39],
  Kamino: [5, '#05233f', '#276286', '#a6dcff', 0.76],
  'Mon Cala': [5, '#123856', '#4598b5', '#a2ddf5', 0.69],
  Scarif: [2, '#126482', '#86a86c', '#bce7ef', 0.63],
  Mustafar: [3, '#17171c', '#db4a18', '#dd552d', 0.5],
  Endor: [2, '#183d47', '#365d32', '#8fbd9e', 0.3],
  Corellia: [2, '#183346', '#537869', '#7fbcd4', 0.47],
  Alderaan: [2, '#194f70', '#59856a', '#93d5fb', 0.46],
  Coruscant: [6, '#14213a', '#636978', '#a6cce9', 0.5],
  Moraband: [0, '#3a241f', '#8f5133', '#c39064', 0.5],
};
const noise = `
float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p){
 vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.11)*.15; }
`;

export function createPlanet(tile, register, large = false, getSurface, options = {}) {
  const root = new THREE.Group();
  const [kind, dark, light, air, coast] = palettes[tile.name] || [
    0,
    '#613e36',
    '#ba7e64',
    '#d4a98a',
    0.5,
  ];
  const radius = options.radius ?? (large ? 3.55 : 0.49);
  const detail = getSurface?.(kind),
    cloud = getSurface?.('clouds');
  const detailed = large || options.highDetail;
  const geometry = register(
    new THREE.SphereGeometry(radius, detailed ? 64 : 24, detailed ? 40 : 16),
  );
  const surface = register(
    new THREE.ShaderMaterial({
      uniforms: {
        dark: { value: new THREE.Color(dark) },
        light: { value: new THREE.Color(light) },
        air: { value: new THREE.Color(air) },
        kind: { value: kind },
        coast: { value: coast },
        seed: { value: tile.id * 3.7 },
        time: { value: 0 },
        emphasis: { value: 1 },
        projected: { value: options.holographic ? 1 : 0 },
        surfaceMap: { value: detail?.texture || null },
        surfaceReady: detail?.ready || { value: 0 },
        cloudMap: { value: cloud?.texture || null },
        cloudReady: cloud?.ready || { value: 0 },
      },
      vertexShader: `varying vec3 local; varying vec3 n; varying vec3 eye; varying vec2 vUv;
      void main(){vUv=uv;local=normalize(position);n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);eye=-p.xyz;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `${noise}
      uniform vec3 dark; uniform vec3 light; uniform vec3 air; uniform float kind; uniform float coast;
      uniform float seed; uniform float time; uniform float emphasis; uniform float projected;
      uniform sampler2D surfaceMap; uniform float surfaceReady; uniform sampler2D cloudMap; uniform float cloudReady;
      varying vec3 local; varying vec3 n; varying vec3 eye; varying vec2 vUv;
      void main(){
        vec3 p=normalize(local); float land=.5; float grain=.5;
        vec3 geology=pow(max(texture2D(surfaceMap,vUv).rgb,vec3(0.)),vec3(.4545));
        float relief=dot(geology,vec3(.2126,.7152,.0722));
        if(surfaceReady>.5 && kind!=6.){land=relief;grain=relief;}
        else {land=fbm(p*4.8+seed);grain=noise(p*85.+seed);}
        float sun=max(dot(normalize(n),normalize(vec3(-.8,.35,.5))),0.);
        vec3 color=mix(dark,light,smoothstep(.28,.75,land));
        if(kind==0.){color=mix(dark,light,smoothstep(.22,.72,land));color*=.86+grain*.2;}
        if(kind==1.){color=mix(dark,light,smoothstep(.28,.48,land));color*=.91+grain*.12;}
        if(kind==2.){color=mix(dark,light,smoothstep(coast-.035,coast+.035,land));color*=.9+grain*.15;}
        if(kind==3.){float lava=1.-smoothstep(.012,.052,abs(fbm(p*10.+seed)-.5));color=dark*(.8+grain*.4)+light*lava*1.8;}
        if(kind==4.){float bands=relief;if(surfaceReady<.5) bands=.5+.5*sin(p.y*70.+fbm(p*8.+seed)*9.);color=mix(dark,light,bands*.7+land*.25);}
        if(kind==5.){color=mix(dark,light,land*.65);}
        float clouds=0.;
        if(cloudReady>.5) clouds=pow(texture2D(cloudMap,vUv+vec2(time*.001,0.)).r,.82);
        else clouds=smoothstep(.66,.8,fbm(p*13.+vec3(time*.007,0.,seed)));
        if(kind==2.||kind==5.) color=mix(color,vec3(.85,.91,.94),clouds*.63);
        color*=mix(.065,.32,projected)+sun*.85;
        if(kind==6.){float city=pow(noise(p*185.+seed),19.);if(surfaceReady>.5) city=mix(city,max(max(geology.r,geology.g),geology.b),.95);color+=vec3(1.,.64,.25)*city*(1.-sun)*3.5;}
        if(kind==3.){float lava=1.-smoothstep(.012,.052,abs(fbm(p*10.+seed)-.5));color+=light*lava*.75;}
        float rim=pow(1.-max(dot(normalize(n),normalize(eye)),0.),3.);
        color+=air*rim*.11;
        if(projected>.5){float scan=.5+.5*sin(local.y*95.-time*2.);color*=.95+scan*.05;color+=air*rim*.18;}
        gl_FragColor=vec4(color*(.45+.55*emphasis),1.);
        #include <colorspace_fragment>
      }`,
    }),
  );
  const body = new THREE.Mesh(geometry, surface);
  root.add(body);
  root.userData.surface = surface;
  root.userData.pickable = body;
  root.userData.spin = true;
  const atmosphere = register(
    new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(air) } },
      vertexShader:
        'varying vec3 n;varying vec3 eye;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
      fragmentShader:
        'uniform vec3 tint;varying vec3 n;varying vec3 eye;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),3.);gl_FragColor=vec4(tint,rim*.55);}',
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const halo = new THREE.Mesh(geometry, atmosphere);
  halo.scale.setScalar(1.05);
  root.add(halo);
  if (large) {
    const ring = new THREE.Mesh(
      register(new THREE.TorusGeometry(radius * 1.3, 0.012, 4, 128)),
      register(new THREE.MeshBasicMaterial({ color: '#719fb7', transparent: true, opacity: 0.55 })),
    );
    ring.rotation.set(1.35, 0.3, -0.25);
    root.add(ring);
  }
  return root;
}

const CITIES = {
  Shimla: [77.17, 31.1],
  Gangtok: [88.61, 27.33],
  Shillong: [91.89, 25.58],
  Kohima: [94.1, 25.68],
  Itanagar: [93.6, 27.08],
  Patna: [85.14, 25.61],
  Ranchi: [85.31, 23.34],
  Bhubaneswar: [85.82, 20.3],
  Bhopal: [77.41, 23.26],
  Raipur: [81.63, 21.25],
  Lucknow: [80.95, 26.85],
  Panaji: [73.83, 15.5],
  Gandhinagar: [72.64, 23.22],
  Jaipur: [75.79, 26.91],
  Thiruvananthapuram: [76.94, 8.52],
  Bengaluru: [77.59, 12.97],
  Chennai: [80.27, 13.08],
  Hyderabad: [78.49, 17.39],
  Kolkata: [88.36, 22.57],
  Mumbai: [72.88, 19.08],
  Chandigarh: [76.78, 30.73],
  'New Delhi': [77.21, 28.61],
};
const mapPoint = ([lon, lat]) => new THREE.Vector2((lon - 83) * 0.39, (lat - 22) * 0.39);
export function createIndiaAtlas(board, register) {
  const root = new THREE.Group(),
    markers = new Map();
  const polygons =
    OUTLINE.geometry.type === 'Polygon'
      ? [OUTLINE.geometry.coordinates]
      : OUTLINE.geometry.coordinates;
  for (const polygon of polygons) {
    const shape = new THREE.Shape(polygon[0].map(mapPoint));
    for (const hole of polygon.slice(1)) shape.holes.push(new THREE.Path(hole.map(mapPoint)));
    const geometry = register(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.38,
        bevelEnabled: true,
        bevelSize: 0.055,
        bevelThickness: 0.055,
        bevelSegments: 2,
        steps: 1,
      }),
    );
    const land = new THREE.Mesh(geometry, [
      register(new THREE.MeshStandardMaterial({ color: '#46765c', roughness: 0.8 })),
      register(
        new THREE.MeshStandardMaterial({ color: '#c1a270', roughness: 0.45, metalness: 0.25 }),
      ),
    ]);
    land.rotation.x = -Math.PI / 2;
    land.castShadow = land.receiveShadow = true;
    root.add(land);
  }
  for (const tile of board.filter((tile) => tile.type === 'property')) {
    const point = mapPoint(CITIES[tile.name]);
    const pin = new THREE.Mesh(
      register(new THREE.SphereGeometry(0.115, 16, 10)),
      register(
        new THREE.MeshStandardMaterial({
          color: tile.color,
          emissive: tile.color,
          emissiveIntensity: 0.15,
          metalness: 0.3,
          roughness: 0.3,
        }),
      ),
    );
    pin.position.set(point.x, 0.57, -point.y);
    pin.userData.tileId = tile.id;
    root.add(pin);
    markers.set(tile.id, pin);
  }
  root.userData.pickables = [...markers.values()];
  root.userData.update = (game, selected, filter) => {
    markers.forEach((marker, id) => {
      const owner = game.players.find((player) => player.id === game.ownership[id]?.owner);
      marker.material.color.set(owner?.color || board[id].color);
      marker.scale.setScalar(id === selected ? 1.8 : filter && owner?.id !== filter ? 0.65 : 1);
    });
  };
  return root;
}

export function modelLabel(name, classic, register) {
  const surface = canvasSurface(1024, 128),
    ctx = surface.context;
  ctx.textAlign = 'center';
  ctx.fillStyle = classic ? '#b29560' : '#89c5e4';
  ctx.font = '600 16px Segoe UI';
  ctx.fillText(classic ? 'INDIA / CAPITAL ROUTES' : 'GALACTIC COMMAND / SELECTED WORLD', 512, 27);
  ctx.fillStyle = classic ? '#f8e7bd' : '#e2f4ff';
  ctx.font = '700 49px Segoe UI';
  ctx.fillText(name.toUpperCase(), 512, 91, 980);
  surface.texture.needsUpdate = true;
  register(surface.texture);
  const label = new THREE.Sprite(
    register(
      new THREE.SpriteMaterial({
        map: surface.texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    ),
  );
  label.scale.set(11.5, 1.44, 1);
  label.position.set(0, 1.25, classic ? -6.7 : 6.65);
  return label;
}
