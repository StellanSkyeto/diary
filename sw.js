const CACHE_NAME = 'skyeto-diary-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './diary.png', // <--- Thêm dòng này vô nha!
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
	];

// Cài đặt Service Worker và lưu bộ nhớ Cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Kích hoạt SW
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Lấy dữ liệu từ Cache nếu không có mạng (Offline First)
self.addEventListener('fetch', (e) => {
  // Không cache các yêu cầu API gửi lên JSONBin
  if (e.request.url.includes('jsonbin.io')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});