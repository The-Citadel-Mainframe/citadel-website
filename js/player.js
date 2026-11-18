(function(){
  "use strict";
  /* Citadel mini player — autoplay playlist, starts at 50% volume, state kept across pages (sessionStorage). */
  var TRACKS = [
    { title: "Rooftops of the Subsector 086", artist: "CDAI",           src: "audio/rooftops-subsector-086.mp3" },
    { title: "Mainframe Dojo",                artist: "Cephalon Hely",  src: "audio/mainframe-dojo.mp3" }
  ];
  var KEY = "citadel-player", START_VOL = 0.5;
  var st = { i: 0, t: 0, paused: false, vol: START_VOL };
  try{ var s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if(s && typeof s === "object"){
    if(s.i >= 0 && s.i < TRACKS.length) st.i = s.i|0;
    if(isFinite(s.t) && s.t >= 0) st.t = +s.t;
    if(typeof s.paused === "boolean") st.paused = s.paused;
    if(isFinite(s.vol) && s.vol >= 0 && s.vol <= 1) st.vol = +s.vol;
  }}catch(e){}
  function save(){ try{ st.t = audio.currentTime || 0; sessionStorage.setItem(KEY, JSON.stringify(st)); }catch(e){} }

  var audio = new Audio(); audio.preload = "auto"; audio.volume = st.vol;

  /* ---- UI ---- */
  var box = document.createElement("div"); box.id = "player"; box.setAttribute("role","region"); box.setAttribute("aria-label","Music player");
  box.innerHTML =
    '<div class="pl-in">' +
    '<span class="pl-ctl">' +
    '<button type="button" class="pl-b" id="pl-prev" aria-label="Previous track">&lt;&lt;</button>' +
    '<button type="button" class="pl-b" id="pl-play" aria-label="Play">&gt;</button>' +
    '<button type="button" class="pl-b" id="pl-next" aria-label="Next track">&gt;&gt;</button>' +
    '</span>' +
    '<span class="pl-info" aria-live="polite"><span class="pl-title" id="pl-title"></span><span class="pl-art" id="pl-art"></span></span>' +
    '<label class="pl-vol"><span>VOL</span><input type="range" id="pl-vol" min="0" max="100" step="1" aria-label="Volume"></label>' +
    '</div>';
  document.body.appendChild(box);
  var bPrev = box.querySelector("#pl-prev"), bPlay = box.querySelector("#pl-play"), bNext = box.querySelector("#pl-next"),
      tTitle = box.querySelector("#pl-title"), tArt = box.querySelector("#pl-art"), vol = box.querySelector("#pl-vol");
  vol.value = Math.round(st.vol * 100);

  function show(){
    var t = TRACKS[st.i]; tTitle.textContent = t.title; tArt.textContent = t.artist;
    var playing = !audio.paused;
    bPlay.textContent = playing ? "||" : ">"; bPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    box.classList.toggle("on", playing);
  }
  function load(i, t){
    st.i = (i + TRACKS.length) % TRACKS.length; audio.src = TRACKS[st.i].src;
    if(t){ audio.addEventListener("loadedmetadata", function f(){ audio.removeEventListener("loadedmetadata", f); try{ audio.currentTime = Math.min(t, (audio.duration||t) - 1); }catch(e){} }); }
    show();
  }
  function play(){
    var p = audio.play();
    if(p && p.catch) p.catch(function(){ waitGesture(); });
    return p;
  }
  var waiting = false;
  function waitGesture(){
    if(waiting || st.paused) return; waiting = true; box.classList.add("wait");
    function go(){
      ["pointerdown","keydown","touchstart"].forEach(function(ev){ document.removeEventListener(ev, go, true); });
      waiting = false; box.classList.remove("wait"); if(!st.paused) play();
    }
    ["pointerdown","keydown","touchstart"].forEach(function(ev){ document.addEventListener(ev, go, true); });
  }

  /* ---- events ---- */
  audio.addEventListener("play", show); audio.addEventListener("pause", show);
  audio.addEventListener("ended", function(){ st.t = 0; load(st.i + 1, 0); if(!st.paused) play(); });
  audio.addEventListener("timeupdate", (function(){ var last = 0; return function(){ var n = Date.now(); if(n - last > 1000){ last = n; save(); } }; })());
  window.addEventListener("pagehide", save);
  bPlay.addEventListener("click", function(){
    if(audio.paused){ st.paused = false; box.classList.remove("wait"); play(); } else { st.paused = true; audio.pause(); }
    save();
  });
  bNext.addEventListener("click", function(){ load(st.i + 1, 0); if(!st.paused){ play(); } else { st.paused = false; play(); } save(); });
  bPrev.addEventListener("click", function(){
    if(audio.currentTime > 3){ audio.currentTime = 0; } else { load(st.i - 1, 0); }
    st.paused = false; play(); save();
  });
  vol.addEventListener("input", function(){ st.vol = vol.value / 100; audio.volume = st.vol; save(); });

  /* ---- hooks for the mini-game: its own music pauses the playlist, then gives it back ---- */
  var ducked = false;
  window.CitadelPlayer = {
    duck: function(){ if(!audio.paused){ ducked = true; audio.pause(); } },
    release: function(){ if(ducked){ ducked = false; if(!st.paused) play(); } }
  };

  /* ---- start ---- */
  load(st.i, st.t);
  if(!st.paused) play();
  show();
})();
