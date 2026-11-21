/* Cortega ASCII portrait: renders the grid from js/cortega-art.js, animates it
   (scan band, glitch, HUD typing, blink) and moves the eyes toward the cursor. */
(function(){
  "use strict";
  var A = window.CORTEGA_ART, pre = document.getElementById("cortega-art");
  if(!A || !pre) return;

  var COLS = A.cols, ROWS = A.rows.length;
  var ch = A.rows.map(function(s){ return s.split(""); });
  var lv = A.lv.map(function(s){ var a = [], i; for(i = 0; i < s.length; i++) a.push(s.charCodeAt(i) - 48); return a; });
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rep(c, n){ var s = ""; while(n-- > 0) s += c; return s; }
  function blank(r0, r1, c0, c1){
    for(var y = r0; y <= r1; y++) for(var x = c0; x <= c1; x++){ ch[y][x] = " "; lv[y][x] = 0; }
  }
  function put(y, x, t, l){
    for(var i = 0; i < t.length; i++){
      if(x + i >= 0 && x + i < COLS){ ch[y][x + i] = t.charAt(i); lv[y][x + i] = t.charAt(i) === " " ? 0 : l; }
    }
  }

  /* ---- fixed HUD text (replaces the unreadable text of the source logo) ---- */
  blank(13, 19, 199, 236);
  put(14, 200, "CITADEL // AI CORE", 5);
  put(16, 200, "CORTEGA", 6);
  put(18, 200, "STATUS: IN DEVELOPMENT", 5);

  /* ---- typed HUD (left) ---- */
  var HUD_ROWS = [78, 80, 82], HUD_COL = 19;
  var HUD = ["> ANALYZING...", "> PROCESSING...", "> RESPONDING..."];
  var HUD_TOTAL = HUD[0].length + HUD[1].length + HUD[2].length;
  blank(78, 83, 19, 44);
  function hudSet(step){
    var off = 0, i, used, last = -1;
    for(i = 0; i < 3; i++){ if(step > off) last = i; off += HUD[i].length; }
    off = 0;
    for(i = 0; i < 3; i++){
      used = Math.max(0, Math.min(HUD[i].length, step - off));
      blank(HUD_ROWS[i], HUD_ROWS[i], HUD_COL, HUD_COL + 20);
      put(HUD_ROWS[i], HUD_COL, HUD[i].substr(0, used), i === last ? 6 : 5);
      off += HUD[i].length;
    }
  }
  hudSet(reduce ? HUD_TOTAL : 0);

  /* ---- eyes ---- */
  var EY = 46, TW = 15, HW = 7;
  var eyes = [
    { cx: 105, cur: { x: 0, y: 0 }, dx: 0, dy: 0, closed: false, dirty: true },
    { cx: 143, cur: { x: 0, y: 0 }, dx: 0, dy: 0, closed: false, dirty: true }
  ];
  function inEye(r, c){ return (r === 1 || r === 2) ? (c >= 2 && c <= 12) : (c >= 4 && c <= 10); }
  function drawEye(e){
    var x0 = e.cx - HW, r, c;
    blank(EY, EY + 3, x0 - 1, x0 + TW);
    if(e.closed){ put(EY + 1, x0 + 1, rep("-", 13), 5); return; }
    put(EY, x0, "  .-~~~~~~~-.  ", 5);
    for(r = 1; r <= 2; r++){
      put(EY + r, x0, " :", 5); put(EY + r, x0 + 2, rep("x", 11), 4); put(EY + r, x0 + 13, ": ", 5);
    }
    put(EY + 3, x0, "  '-_______-'  ", 5);
    var top = 1 + e.dy, left = 4 + e.dx;
    for(r = top; r <= top + 1; r++){
      for(c = left - 1; c <= left + 6; c++){
        if(!inEye(r, c)) continue;
        var core = c >= left && c <= left + 5;
        ch[EY + r][x0 + c] = core ? "@" : "O";
        lv[EY + r][x0 + c] = core ? 6 : 5;
      }
    }
  }

  /* ---- rendering ---- */
  var rowEls = [], boost = [], y;
  for(y = 0; y < ROWS; y++) boost.push(0);
  function esc(c){ return c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c; }
  function rowHTML(y){
    var line = ch[y], lvl = lv[y], b = boost[y], out = "", cur = 0, open = false, x, l, c;
    for(x = 0; x < COLS; x++){
      c = line[x]; l = lvl[x];
      if(l && b){ l = l >= 4 ? Math.min(6, l + b) : Math.min(3, l + b); }
      if(c === " "){ out += " "; continue; }
      if(l !== cur){ if(open) out += "</span>"; out += '<span class="c' + l + '">'; cur = l; open = true; }
      out += esc(c);
    }
    if(open) out += "</span>";
    return out;
  }
  function draw(y){ rowEls[y].innerHTML = rowHTML(y); }

  var rowsHTML = "";
  for(y = 0; y < ROWS; y++) rowsHTML += '<div class="cr"></div>';
  pre.innerHTML = rowsHTML;
  rowEls = Array.prototype.slice.call(pre.children);
  eyes.forEach(drawEye);
  for(y = 0; y < ROWS; y++) draw(y);

  /* ---- sizing: fit the grid to the container, keep cells 1:2 ---- */
  var cw = 4, chh = 8, ratio = 0.6;
  function measure(){
    var t = document.createElement("span"); t.textContent = "MMMMMMMMMM";
    var keep = pre.innerHTML; pre.innerHTML = ""; pre.style.fontSize = "100px"; pre.style.lineHeight = "normal";
    pre.appendChild(t); var w = t.getBoundingClientRect().width; pre.innerHTML = keep;
    if(w > 0) ratio = w / 10 / 100;
    rowEls = Array.prototype.slice.call(pre.children);
  }
  function fit(){
    var W = pre.parentNode.clientWidth || 800, fs = Math.min(14, W / (COLS * ratio));
    cw = fs * ratio; chh = cw * 2;
    pre.style.fontSize = fs + "px"; pre.style.lineHeight = chh + "px"; pre.style.width = (COLS * cw) + "px";
  }
  measure(); fit();
  window.addEventListener("resize", fit);

  /* ---- pointer tracking ---- */
  var mx = 0, my = 0, lastMove = -1e9, wander = { x: 0, y: 0, next: 0 };
  function onMove(e){ mx = e.clientX; my = e.clientY; lastMove = performance.now(); if(reduce) update(lastMove, true); }
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });

  function aim(e, now){
    var tx, ty;
    if(now - lastMove < 4000){
      var r = pre.getBoundingClientRect();
      var ex = r.left + (e.cx + 0.5) * cw, ey = r.top + (EY + 2) * chh;
      var vx = mx - ex, vy = my - ey, d = Math.sqrt(vx * vx + vy * vy) || 1;
      var mag = Math.min(1, d / (r.width * 0.3));
      tx = vx / d * mag * 2.6; ty = vy / d * mag * 1.8;
    } else { tx = wander.x; ty = wander.y; }
    return { x: tx, y: ty };
  }

  var blinkAt = 0, blinkUntil = 0;
  function update(now, instant){
    var i, e, t, nx, ny, nc, changed = false;
    if(!reduce){
      if(now > blinkAt){ blinkUntil = now + 150; blinkAt = now + 2500 + Math.random() * 4500; }
      if(now > wander.next){ wander.x = (Math.random() * 2 - 1) * 3; wander.y = (Math.random() * 2 - 1) * 1.4; wander.next = now + 1400 + Math.random() * 2200; }
    }
    nc = now < blinkUntil;
    for(i = 0; i < 2; i++){
      e = eyes[i]; t = aim(e, now);
      var k = instant ? 1 : 0.28;
      e.cur.x += (t.x - e.cur.x) * k; e.cur.y += (t.y - e.cur.y) * k;
      nx = Math.max(-2, Math.min(2, Math.round(e.cur.x)));
      ny = Math.max(-1, Math.min(1, Math.round(e.cur.y)));
      if(nx !== e.dx || ny !== e.dy || nc !== e.closed || e.dirty){
        e.dx = nx; e.dy = ny; e.closed = nc; e.dirty = false; drawEye(e); changed = true;
      }
    }
    if(changed) for(i = EY; i <= EY + 3; i++) draw(i);
  }

  /* ---- scan band, HUD typing ---- */
  var scanY = -10, hudStep = reduce ? HUD_TOTAL : 0, hudAt = 0;
  function scan(){
    scanY += 0.45; if(scanY > ROWS + 12) scanY = -10;
    var lo = Math.max(0, Math.floor(scanY) - 9), hi = Math.min(ROWS - 1, Math.floor(scanY) + 9), b, d;
    for(var y = lo; y <= hi; y++){
      d = y - scanY; b = Math.round(2 * Math.exp(-(d * d) / 12));
      if(b !== boost[y]){ boost[y] = b; draw(y); }
    }
  }
  function hud(now){
    if(now < hudAt) return; hudAt = now + 110;
    hudStep++; if(hudStep > HUD_TOTAL + 22) hudStep = 0;
    hudSet(Math.min(hudStep, HUD_TOTAL));
    for(var i = 0; i < 3; i++) draw(HUD_ROWS[i]);
  }

  /* ---- glitch ---- */
  function glitch(){
    var n = 1 + Math.floor(Math.random() * 3), picked = [];
    for(var i = 0; i < n; i++){
      var y = 12 + Math.floor(Math.random() * (ROWS - 30)), off = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3)) * cw;
      rowEls[y].style.transform = "translateX(" + off + "px)"; picked.push(y);
    }
    setTimeout(function(){ picked.forEach(function(y){ rowEls[y].style.transform = ""; }); }, 90 + Math.random() * 90);
    setTimeout(glitch, 2500 + Math.random() * 3500);
  }

  /* ---- main loop (only while visible) ---- */
  var visible = true, last = 0;
  if("IntersectionObserver" in window){
    new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }).observe(pre);
  }
  function loop(now){
    requestAnimationFrame(loop);
    if(!visible || document.hidden || now - last < 33) return;
    last = now;
    update(now, false); scan(); hud(now);
  }
  if(!reduce){ requestAnimationFrame(loop); setTimeout(glitch, 3000); }
  else { update(performance.now(), true); }
})();
