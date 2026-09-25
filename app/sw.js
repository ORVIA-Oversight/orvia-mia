const CACHE="mia-app-v1";
const SHELL=[
  "/app/",
  "/app/login.html",
  "/app/auth.js",
  "/app/pwa.js",
  "/app/manifest.webmanifest",
  "/assets/mia-app.css",
  "/assets/mia-app.js",
  "/ChatGPT%20Image%20Sep%2025,%202026,%2003_00_49%20PM.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=="GET" || url.origin!==self.location.origin) return;

  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match("/app/")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      const network=fetch(req).then(res=>{
        if(res.ok) caches.open(CACHE).then(c=>c.put(req,res.clone())).catch(()=>{});
        return res;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});