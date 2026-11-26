/* Citadel service worker — offline support. Bump VERSION when files change. */
var VERSION = "citadel-v10";
var CORE = ["./","index.html","home.html","apps.html","games.html","contact.html","commissions.html","citadelos.html","about.html","404.html",
  "css/terminal.css","css/citadelos.css","js/cortega.js","js/timeline.js","js/cortega-art.js","js/i18n.js","js/config.js","js/terminal.js","js/player.js","js/offline.js",
  "games/escape-subsector-086/game.js","games/escape-subsector-086/style.css",
  "fonts/vt323.woff2","fonts/cyber-blast.woff2","assets/flag-gb.svg","assets/flag-it.svg","assets/favicon.png","assets/apple-touch-icon.png"];
var SCOPE = new URL(self.registration.scope);

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function lookup(req, url){
  return caches.open(VERSION).then(function(c){
    return c.match(req, {ignoreSearch:true}).then(function(r){
      if(r) return r;
      var rel = url.pathname.slice(SCOPE.pathname.length);
      if(rel === "" || /\/$/.test(rel)) rel = "index.html";
      var segs = rel.split("/"), p = Promise.resolve(null);
      segs.forEach(function(_, i){
        p = p.then(function(found){
          if(found) return found;
          return c.match(new URL(segs.slice(i).join("/"), SCOPE).href, {ignoreSearch:true});
        });
      });
      return p;
    });
  });
}
function networkFirst(req, url){
  return new Promise(function(resolve){
    var done = false;
    function fallback(){
      lookup(req, url).then(function(r){
        if(r) return resolve(r);
        if(req.mode === "navigate"){
          return lookup(new Request(new URL("404.html", SCOPE).href), new URL("404.html", SCOPE)).then(function(f){
            resolve(f || new Response("OFFLINE", {status:503}));
          });
        }
        resolve(new Response("", {status:503}));
      });
    }
    var timer = setTimeout(function(){ if(!done){ done = true; fallback(); } }, 4000);
    fetch(req).then(function(res){
      if(done) return;
      done = true; clearTimeout(timer);
      if(res && res.ok && res.type === "basic"){
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copy); });
      }
      resolve(res);
    }).catch(function(){ if(!done){ done = true; clearTimeout(timer); fallback(); } });
  });
}
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== location.origin) return;
  if(/\.(mp3|ogg|wav)$/i.test(url.pathname) || req.headers.has("range")) return;
  e.respondWith(networkFirst(req, url));
});
