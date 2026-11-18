(function(){
  "use strict";
  /* Registers the service worker that keeps the site (and the game) available offline. */
  if(!("serviceWorker" in navigator)) return;
  var h = location.hostname;
  if(location.protocol !== "https:" && h !== "localhost" && h !== "127.0.0.1") return;
  var src = document.currentScript && document.currentScript.src;
  if(!src) return;
  var sw = new URL("../sw.js", src).href;
  window.addEventListener("load", function(){ navigator.serviceWorker.register(sw).catch(function(){}); });
})();
