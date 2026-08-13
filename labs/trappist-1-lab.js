(function () {
  'use strict';

  var canvas = document.getElementById('orbitCanvas');
  var wrap = document.getElementById('canvasWrap');
  var sidebarTitle = document.getElementById('sidebarTitle');
  var sidebarContent = document.getElementById('sidebarContent');
  var ctx = canvas.getContext('2d');

  var data = null;
  var planets = [];
  var selectedIndex = -1;

  var cam = { x: 0, y: 0, zoom: 1 };
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var animTime = 0;
  var maxOrbitAu = 0.07;
  var pxPerAu = 800;

  var planetColors = [
    '#e8a87c', '#c38d6e', '#85c1e9', '#58d68d',
    '#f7dc6f', '#bb8fce', '#aab7b8'
  ];

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function auToScreen(au) {
    return au * pxPerAu * cam.zoom;
  }

  function worldToScreen(wx, wy) {
    var cx = wrap.clientWidth / 2 + cam.x;
    var cy = wrap.clientHeight / 2 + cam.y;
    return { x: cx + wx, y: cy + wy };
  }

  function screenToWorld(sx, sy) {
    var cx = wrap.clientWidth / 2 + cam.x;
    var cy = wrap.clientHeight / 2 + cam.y;
    return { x: sx - cx, y: sy - cy };
  }

  function buildPlanets() {
    planets = data.planets.map(function (p, i) {
      return {
        letter: p.letter,
        name: p.name,
        a_au: p.a_au,
        period_days: p.period_days,
        radius_re: p.radius_re,
        mass_me: p.mass_me,
        teq_k: p.teq_k,
        color: planetColors[i % planetColors.length],
        angle: (i * 1.7) % (Math.PI * 2),
        screenRadius: Math.max(6, Math.min(14, p.radius_re * 5))
      };
    });
    maxOrbitAu = Math.max.apply(null, planets.map(function (p) { return p.a_au; })) * 1.15;
    pxPerAu = Math.min(900, (Math.min(wrap.clientWidth, wrap.clientHeight) * 0.42) / maxOrbitAu);
  }

  function drawStar(cx, cy) {
    var r = auToScreen(0.0005);
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
    glow.addColorStop(0, 'rgba(255, 120, 60, 0.9)');
    glow.addColorStop(0.4, 'rgba(255, 80, 40, 0.4)');
    glow.addColorStop(1, 'rgba(255, 60, 30, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, r), 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    if (!data) return;

    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, w, h);

    var center = worldToScreen(0, 0);

    planets.forEach(function (p, i) {
      var orbitR = auToScreen(p.a_au);
      ctx.strokeStyle = 'rgba(120, 130, 160, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center.x, center.y, orbitR, 0, Math.PI * 2);
      ctx.stroke();

      var angle = p.angle + animTime * (0.5 / p.period_days);
      var px = Math.cos(angle) * orbitR;
      var py = Math.sin(angle) * orbitR;
      var pos = worldToScreen(px, py);

      var pr = p.screenRadius * Math.sqrt(cam.zoom);
      var isSelected = i === selectedIndex;

      if (isSelected) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pr + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pr, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(232, 234, 240, 0.9)';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.letter, pos.x, pos.y + pr + 14);

      p._screenX = pos.x;
      p._screenY = pos.y;
      p._hitR = pr + 8;
    });

    drawStar(center.x, center.y);

    ctx.fillStyle = 'rgba(154, 163, 181, 0.6)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Face-on · coplanar · not to scale (planet sizes exaggerated)', 12, h - 12);
  }

  function fmtNum(v, digits) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toFixed(digits);
  }

  function showStarInfo() {
    selectedIndex = -1;
    sidebarTitle.textContent = data.star.name;
    sidebarContent.innerHTML =
      '<div class="detail-row"><span>Distance</span><span>' + fmtNum(data.star.dist_pc, 2) + ' pc</span></div>' +
      '<div class="detail-row"><span>Mass</span><span>' + fmtNum(data.star.mass_msun, 4) + ' M☉</span></div>' +
      '<div class="detail-row"><span>Radius</span><span>' + fmtNum(data.star.radius_rsun, 4) + ' R☉</span></div>' +
      '<div class="detail-row"><span>Teff</span><span>' + fmtNum(data.star.teff_k, 0) + ' K</span></div>' +
      '<div class="detail-row"><span>Planets</span><span>' + data.planets.length + ' confirmed</span></div>' +
      '<p style="margin-top:0.75rem">Click any planet in the diagram for orbital parameters.</p>';
  }

  function showPlanetInfo(index) {
    selectedIndex = index;
    var p = planets[index];
    sidebarTitle.textContent = p.name;
    sidebarContent.innerHTML =
      '<div class="detail-row"><span>Orbital period</span><span>' + fmtNum(p.period_days, 3) + ' days</span></div>' +
      '<div class="detail-row"><span>Semi-major axis</span><span>' + fmtNum(p.a_au, 5) + ' AU</span></div>' +
      '<div class="detail-row"><span>Radius</span><span>' + fmtNum(p.radius_re, 3) + ' R⊕</span></div>' +
      '<div class="detail-row"><span>Mass</span><span>' + fmtNum(p.mass_me, 3) + ' M⊕</span></div>' +
      '<div class="detail-row"><span>Equilibrium T</span><span>' + fmtNum(p.teq_k, 1) + ' K</span></div>' +
      '<p style="margin-top:0.75rem"><a href="' + data.archive_url + '" target="_blank" rel="noopener">View on NASA Exoplanet Archive →</a></p>';
    draw();
  }

  function hitTest(sx, sy) {
    for (var i = planets.length - 1; i >= 0; i--) {
      var p = planets[i];
      var dx = sx - p._screenX;
      var dy = sy - p._screenY;
      if (dx * dx + dy * dy <= p._hitR * p._hitR) return i;
    }
    return -1;
  }

  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches && e.touches[0];
    var clientX = touch ? touch.clientX : e.clientX;
    var clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  canvas.addEventListener('mousedown', function (e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    cam.x += e.clientX - lastX;
    cam.y += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  });

  window.addEventListener('mouseup', function () {
    dragging = false;
  });

  canvas.addEventListener('click', function (e) {
    if (Math.abs(e.clientX - lastX) > 3 || Math.abs(e.clientY - lastY) > 3) return;
    var pos = getCanvasPos(e);
    var idx = hitTest(pos.x, pos.y);
    if (idx >= 0) showPlanetInfo(idx);
    else showStarInfo();
  });

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY > 0 ? 0.9 : 1.1;
    cam.zoom = Math.max(0.3, Math.min(5, cam.zoom * factor));
    draw();
  }, { passive: false });

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      dragging = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function (e) {
    if (dragging && e.touches.length === 1) {
      cam.x += e.touches[0].clientX - lastX;
      cam.y += e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      draw();
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function (e) {
    if (e.changedTouches.length === 1) {
      var pos = getCanvasPos(e);
      var idx = hitTest(pos.x, pos.y);
      if (idx >= 0) showPlanetInfo(idx);
      dragging = false;
    }
  });

  window.addEventListener('resize', resize);

  function animate() {
    animTime += 0.016;
    draw();
    requestAnimationFrame(animate);
  }

  fetch('data/trappist_1_system.json')
    .then(function (r) {
      if (!r.ok) throw new Error('Failed to load catalog');
      return r.json();
    })
    .then(function (json) {
      data = json;
      buildPlanets();
      showStarInfo();
      resize();
      animate();
    })
    .catch(function (err) {
      sidebarContent.innerHTML = '<p style="color:#f87171">Could not load catalog: ' + err.message + '</p>';
    });
})();
