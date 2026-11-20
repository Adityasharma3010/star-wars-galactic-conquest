import { REFERENCE_IMAGES } from '../assets/referenceImages.js';

export default function GalaxyBackdrop() {
  return (
    <div className="galaxy-backdrop" aria-hidden="true">
      <div className="galaxy-fallback-stars" />
      <div className="galaxy-reference-scene">
        <img src={REFERENCE_IMAGES['death-star'].image} alt="" fetchPriority="high" />
      </div>
      <div className="galaxy-light-haze" />
      <div className="galaxy-scene-shade" />
    </div>
  );
}
