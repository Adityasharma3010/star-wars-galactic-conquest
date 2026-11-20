import { isClassic } from '../game/maps.js';
export const CLASSIC_TRACKS = [
  {
    id: 'city-evening',
    title: 'City Evening',
    artist: 'Galactic Conquest project',
    src: '/audio/music/city-evening.wav',
  },
];
export const tracksFor = (context) => (isClassic(context) ? CLASSIC_TRACKS : MATCH_TRACKS);
export const MATCH_TRACKS = [
  {
    id: 'space-ambience',
    title: 'Space Ambience',
    artist: 'Alexander Nakarada',
    src: '/audio/music/space-ambience.mp3',
    source: 'https://creatorchords.com/music/space-ambience/',
  },
  {
    id: 'decoherence',
    title: 'Decoherence',
    artist: 'Scott Buckley',
    src: '/audio/music/decoherence.mp3',
    source: 'https://www.scottbuckley.com.au/library/decoherence/',
  },
  {
    id: 'ephemera',
    title: 'Ephemera',
    artist: 'Scott Buckley',
    src: '/audio/music/ephemera.mp3',
    source: 'https://www.scottbuckley.com.au/library/ephemera/',
  },
];
export const MAX_PERSONAL_TRACKS = 5;
export const MAX_MUSIC_BYTES = 50 * 1024 * 1024;
let database,
  generation = 0;
const urls = new Map();
function musicDatabase() {
  if (!window.indexedDB)
    return Promise.reject(new Error('Personal music storage is unavailable in this browser.'));
  database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('galactic-personal-music', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = null;
      reject(new Error('Unable to open personal music storage.'));
    };
  });
  return database;
}
async function transaction(mode, operation) {
  const db = await musicDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', mode);
    const request = operation(tx.objectStore('tracks'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () =>
      reject(new Error('Unable to save personal music. Your browser storage may be full.'));
  });
}
export async function listPersonalMusic() {
  return (await transaction('readonly', (store) => store.getAll())).map(
    ({ blob, ...metadata }) => metadata,
  );
}
export async function addPersonalMusic(file) {
  if (!file.size || file.size > MAX_MUSIC_BYTES)
    throw new Error('Choose an audio file smaller than 50 MB.');
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name))
    throw new Error('Choose an MP3, M4A, OGG, WAV, or other supported audio file.');
  if ((await listPersonalMusic()).length >= MAX_PERSONAL_TRACKS)
    throw new Error('Your personal playlist holds five songs. Remove one before adding another.');
  const url = URL.createObjectURL(file);
  let duration;
  try {
    duration = await new Promise((resolve, reject) => {
      const audio = new Audio();
      const finish = (error) => {
        clearTimeout(timer);
        audio.removeAttribute('src');
        audio.load();
        if (error) reject(error);
      };
      const timer = setTimeout(
        () => finish(new Error('This audio file could not be read. Try another format.')),
        12000,
      );
      audio.onloadedmetadata = () => {
        const length = audio.duration;
        audio.onloadedmetadata = audio.onerror = null;
        finish();
        resolve(length);
      };
      audio.onerror = () => {
        audio.onloadedmetadata = audio.onerror = null;
        finish(new Error('This audio format is not supported by your browser.'));
      };
      audio.preload = 'metadata';
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  const track = {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^.]+$/, ''),
    fileName: file.name,
    artist: 'Your personal music',
    size: file.size,
    type: file.type,
    duration,
    blob: file,
  };
  await transaction('readwrite', (store) => store.put(track));
  const { blob, ...metadata } = track;
  return metadata;
}
export async function personalMusicUrl(id) {
  if (!urls.has(id)) {
    const current = generation;
    const promise = transaction('readonly', (store) => store.get(id))
      .then((track) => {
        if (!track)
          throw new Error('This personal song is no longer on this browser. Add it again.');
        const url = URL.createObjectURL(track.blob);
        if (current !== generation) URL.revokeObjectURL(url);
        return url;
      })
      .catch((error) => {
        urls.delete(id);
        throw error;
      });
    urls.set(id, promise);
  }
  return urls.get(id);
}
export function releaseMusicUrls() {
  generation++;
  for (const promise of urls.values())
    promise.then((url) => URL.revokeObjectURL(url)).catch(() => {});
  urls.clear();
}
export async function removePersonalMusic(id) {
  await transaction('readwrite', (store) => store.delete(id));
  if (urls.has(id)) {
    urls
      .get(id)
      .then((url) => URL.revokeObjectURL(url))
      .catch(() => {});
    urls.delete(id);
  }
}
