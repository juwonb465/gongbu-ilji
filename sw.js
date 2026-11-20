// 공부일지 서비스 워커: 홈 화면 앱으로 빠르게 열리고, 인터넷이 없어도 열리게 함
// index.html을 고쳐 올리면 다음에 열 때 자동으로 새 버전을 받아요. (CACHE 이름은 안 바꿔도 돼요)
const CACHE = 'gongbu-ilji-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheFirst = async req => {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase 프로그램 파일과 글꼴: 주소에 버전이 고정돼 있어서 한 번 받으면 계속 씀
  if ((url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
    return;
  }

  // 로그인·데이터베이스 같은 서버 통신은 건드리지 않음
  if (url.origin !== self.location.origin) return;

  // 앱 화면: 인터넷이 되면 최신 버전, 안 되면 저장해 둔 버전
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
