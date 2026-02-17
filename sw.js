var CACHE_NAME = 'gr1000n-v2';
var ASSETS = [
    './',
    './index.html',
    './data.js',
    './app.js',
    './jib.html',
    './jib_data.js',
    './jib_calc.js',
    './jib_view.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Install - cache all assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - cache first, then network
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});
