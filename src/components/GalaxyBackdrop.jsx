import { REFERENCE_IMAGES } from '../assets/referenceImages.js';

export default function GalaxyBackdrop({ image = REFERENCE_IMAGES['death-star'].image }) {
  return (
    <div className="galaxy-backdrop" aria-hidden="true">
      <div className="galaxy-fallback-stars" />
      <div className="galaxy-reference-scene">
        <img src={image} alt="" fetchPriority="high" />
      </div>
      <div className="galaxy-light-haze" />
      <div className="galaxy-scene-shade" />
    </div>
  );
}
