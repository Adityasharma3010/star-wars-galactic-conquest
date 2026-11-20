import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Globe2, LockKeyhole, Map, Radio, Dices } from 'lucide-react';
import GalaxyBackdrop from '../components/GalaxyBackdrop.jsx';
import { MAP_CATEGORIES, GAME_MAPS } from '../game/maps.js';
import { useGameStore } from '../stores/gameStore.js';
import { REFERENCE_IMAGES } from '../assets/referenceImages.js';
import INDIA_IMAGES from '../assets/indiaImages.json';

export default function MapSelection() {
  const { category } = useParams();
  const open = useGameStore((state) => state.open);
  const chooseMap = useGameStore((state) => state.chooseMap);
  const choose = (id, modal) => {
    chooseMap(id);
    open(modal);
  };
  const selected = MAP_CATEGORIES.find((item) => item.id === category);
  if (!selected) return <Navigate to="/maps/star-wars" replace />;
  const maps = GAME_MAPS.filter((map) => map.category === category);
  return (
    <section className="map-selection" aria-labelledby="map-title">
      <GalaxyBackdrop
        image={category === 'default' ? INDIA_IMAGES['New Delhi'].image : undefined}
      />
      <div className="map-content">
        <Link to="/" className="galaxy-back-link">
          <ArrowLeft size={15} /> Main menu
        </Link>
        <div className="map-heading">
          <span className="eyebrow gold">HOLOMAP / CHOOSE YOUR THEATER</span>
          <h1 id="map-title">
            A WORLD TO <span>CONQUER.</span>
          </h1>
          <p>Choose a category, then chart your next match.</p>
        </div>
        <nav className="map-categories" aria-label="Map categories">
          {MAP_CATEGORIES.map((item) => (
            <Link
              key={item.id}
              to={'/maps/' + item.id}
              aria-current={category === item.id ? 'page' : undefined}
              className={category === item.id ? 'selected' : ''}
            >
              <Map size={17} />
              <span>
                {item.name}
                <small>
                  {GAME_MAPS.filter((map) => map.category === item.id).length} map available
                </small>
              </span>
            </Link>
          ))}
        </nav>
        <div className="map-category-heading">
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
        </div>
        {maps.length ? (
          <div className="map-grid">
            {maps.map((map) => (
              <article className="galaxy-map-card" key={map.id}>
                <div className="galaxy-map-poster">
                  <img
                    src={
                      map.theme === 'default'
                        ? INDIA_IMAGES['New Delhi'].image
                        : REFERENCE_IMAGES['death-star'].image
                    }
                    alt={
                      map.theme === 'default'
                        ? 'Rashtrapati Bhavan, New Delhi'
                        : 'Death Star above the worlds of Galactic Conquest'
                    }
                  />
                  <span className="map-availability">
                    <i /> READY FOR CONQUEST
                  </span>
                  <div className="map-poster-title">
                    <small>{map.theme === 'default' ? 'DEFAULT / CLASSIC' : 'STAR WARS'}</small>
                    <strong>
                      {map.theme === 'default' ? 'INDIA' : 'GALACTIC'}
                      <br />
                      {map.theme === 'default' ? 'CITY CAPITALS' : 'CONQUEST'}
                    </strong>
                  </div>
                </div>
                <div className="galaxy-map-details">
                  <div className="map-stat-line">
                    <span>
                      <Globe2 size={13} /> {map.sectors} sectors
                    </span>
                    <span>
                      <Radio size={13} /> {map.events} events
                    </span>
                    <span>
                      <Dices size={13} /> 2–8 players
                    </span>
                  </div>
                  <h3>{map.name}</h3>
                  <p>
                    {map.theme === 'default'
                      ? 'Explore 22 Indian capital cities. Collect color groups, build houses and hotels, and travel by rail. Classic events and sounds, with no movie intro.'
                      : 'Claim Tatooine, forge alliances and build planetary bases. Your selected factions become part of the opening story.'}
                  </p>
                  <div className="map-launch-actions">
                    <button
                      className="button gold-button"
                      onClick={() => choose(map.id, 'newGame')}
                    >
                      Play locally <ArrowRight size={15} />
                    </button>
                    <button className="button" onClick={() => choose(map.id, 'rooms')}>
                      Online multiplayer <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="default-map-empty">
            <div className="classic-board-preview" aria-hidden="true">
              <Dices size={46} />
              <span>GO</span>
            </div>
            <div>
              <span className="eyebrow gold">
                <LockKeyhole size={13} /> MAPS IN PREPARATION
              </span>
              <h3>Classic streets. A familiar rivalry.</h3>
              <p>
                Default maps are coming soon. This category will use normal Monopoly boards, houses
                and hotels, with its own sounds and effects and no Star Wars opening.
              </p>
              <Link to="/maps/star-wars" className="button gold-button">
                Explore Star Wars maps <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
        <div className="galaxy-page-footnote">
          <i /> NAVIGATION LINK ESTABLISHED <span>CHOOSE YOUR WORLD. WRITE YOUR STORY.</span>
        </div>
      </div>
    </section>
  );
}
