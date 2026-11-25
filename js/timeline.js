/* Timeline: the red square of each report collapses or expands the whole report. */
(function(){
  "use strict";
  function setState(node, open){
    var btn = node.querySelector(".t-toggle"), body = node.querySelector(".t-body");
    if(!btn || !body) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    body.hidden = !open;
    node.classList.toggle("collapsed", !open);
  }
  var nodes = document.querySelectorAll(".t-node.has-toggle");
  Array.prototype.forEach.call(nodes, function(node){
    var btn = node.querySelector(".t-toggle");
    if(!btn) return;
    btn.addEventListener("click", function(){
      setState(node, btn.getAttribute("aria-expanded") !== "true");
    });
  });
  /* a link such as citadelos.html#r03-open opens the report that contains it */
  function reveal(){
    var id = (location.hash || "").slice(1), el;
    if(!id) return;
    try{ el = document.getElementById(id); }catch(e){ return; }
    var node = el && el.closest ? el.closest(".t-node.has-toggle") : null;
    if(node){ setState(node, true); if(el.tagName === "DETAILS") el.open = true; el.scrollIntoView(); }
  }
  window.addEventListener("hashchange", reveal);
  reveal();
})();
