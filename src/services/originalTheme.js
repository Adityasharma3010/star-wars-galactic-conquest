export const ORIGINAL_THEME = {
  videoId: 'e9lapdvLSGw',
  title: 'Main Title',
  artist: 'John Williams · London Symphony Orchestra',
  source: 'https://www.youtube.com/watch?v=e9lapdvLSGw',
  provider: 'Provided to YouTube by Universal Music Group · Star Wars: A New Hope',
};

let loading;
export function loadThemePlayer() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previous = window.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => {
      loading = null;
      script.remove();
      reject(new Error('The original theme player could not load.'));
    }, 12000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      previous?.();
      resolve(window.YT);
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      loading = null;
      script.remove();
      reject(new Error('The original theme player could not load.'));
    };
    document.head.append(script);
  });
  return loading;
}
