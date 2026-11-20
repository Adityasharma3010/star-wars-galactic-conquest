import { REFERENCE_IMAGES } from '../assets/referenceImages.js';

export default function GalaxyBackdrop({ image = REFERENCE_IMAGES['death-star'].image }) {
  return (
    <div className="galaxy-backdrop" aria-hidden="true">
      <div className="galaxy-fallback-stars" />
      <div className="galaxy-reference-scene">
        <img src={image} alt="" fetchPriority="high" />
      </div>
      <div className="galaxy-light-haze" />
      <div className="galaxy-dust">
        {Array.from({ length: 28 }, (_, i) => (
          <i
            key={i}
            style={{ '--i': i, left: `${(i * 37 + 13) % 100}%`, top: `${(i * 23 + 7) % 100}%` }}
          />
        ))}
      </div>
      <div className="galaxy-beacon beacon-one" />
      <div className="galaxy-beacon beacon-two" />
      <div className="galaxy-scene-shade" />
    </div>
  );
}
