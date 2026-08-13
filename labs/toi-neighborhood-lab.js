(function () {
  'use strict';

  var canvas = document.getElementById('neighborhoodCanvas');
  var wrap = document.getElementById('canvasWrap');
  var sidebarTitle = document.getElementById('sidebarTitle');
  var sidebarContent = document.getElementById('sidebarContent');
  var ctx = canvas.getContext('2d');

  var catalog = null;
  var stars = [];
  var selectedIndex = -1;

  var view = {
    rotY: 0.6,
    rotX: 0.35,
    zoom: 28,
    panX: 0,
    panY: 0
  };

  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var moved = false;

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

  function rotateY(x, y, z, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return { x: x * c + z * s, y: y, z: -x * s + z * c };
  }

  function rotateX(x, y, z, angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return { x: x, y: y * c - z * s, z: y * s + z * c };
  }

  function project(x, y, z) {
    var p = rotateY(x, y, z, view.rotY);
    p = rotateX(p.x, p.y, p.z, view.rotX);
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    var scale = view.zoom;
    return {
      x: w / 2 + view.panX + p.x * scale,
      y: h / 2 + view.panY - p.y * scale,
      z: p.z,
      depth: p.z
    };
  }

  function buildStars() {
    stars = catalog.systems.map(function (sys, i) {
      var pos = sys.position_pc;
      var dist = sys.st_dist_pc || Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      return {
        hostname: sys.hostname,
        st_dist_pc: dist,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        planets: sys.planets || [],
        archive_url: sys.archive_url,
        color: dist < 4 ? '#ffd166' : dist < 8 ? '#a8dadc' : '#7ec8e3',
        radius: dist < 4 ? 7 : dist < 8 ? 5 : 4
      };
    });

    stars.unshift({
      hostname: 'Sun',
      st_dist_pc: 0,
      x: 0, y: 0, z: 0,
      planets: [],
      archive_url: null,
      color: '#fff176',
      radius: 10,
      isSun: true
    });
  }

  function drawGrid() {
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    ctx.strokeStyle = 'rgba(60, 70, 90, 0.2)';
    ctx.lineWidth = 1;

    for (var r = 2; r <= 16; r += 2) {
      ctx.beginPath();
      var first = true;
      for (var a = 0; a <= Math.PI * 2; a += 0.08) {
        var px = Math.cos(a) * r;
        var pz = Math.sin(a) * r;
        var p = project(px, 0, pz);
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  function draw() {
    if (!catalog) return;

    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060810';
    ctx.fillRect(0, 0, w, h);

    drawGrid();

    var projected = stars.map(function (s, i) {
      var p = project(s.x, s.y, s.z);
      return { star: s, index: i, sx: p.x, sy: p.y, depth: p.depth };
    });

    projected.sort(function (a, b) { return a.depth - b.depth; });

    projected.forEach(function (item) {
      var s = item.star;
      var sx = item.sx;
      var sy = item.sy;
      var r = s.radius * (s.isSun ? 1.2 : 1);
      var isSelected = item.index === selectedIndex;

      if (s.isSun) {
        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
        glow.addColorStop(0, 'rgba(255, 241, 118, 0.9)');
        glow.addColorStop(0.5, 'rgba(255, 200, 50, 0.3)');
        glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isSelected) {
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      if (!s.isSun || isSelected) {
        ctx.fillStyle = 'rgba(232, 234, 240, 0.85)';
        ctx.font = (isSelected ? '600 ' : '') + '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        var label = s.hostname.length > 14 ? s.hostname.slice(0, 12) + '…' : s.hostname;
        ctx.fillText(label, sx, sy + r + 12);
      }

      s._screenX = sx;
      s._screenY = sy;
      s._hitR = r + 10;
    });

    ctx.fillStyle = 'rgba(154, 163, 181, 0.6)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(catalog.systems.length + ' host systems · scale 1 unit = 1 pc', 12, h - 12);
  }

  function fmtNum(v, digits) {
    if (v == null || isNaN(v)) return '—';
    return Number(v).toFixed(digits);
  }

  function showSunInfo() {
    selectedIndex = 0;
    sidebarTitle.textContent = 'The Sun';
    sidebarContent.innerHTML =
      '<div class="detail-row"><span>Position</span><span>0, 0, 0 pc</span></div>' +
      '<div class="detail-row"><span>Host systems shown</span><span>' + catalog.systems.length + '</span></div>' +
      '<p style="margin-top:0.75rem">Click any star to list its confirmed exoplanets.</p>';
    draw();
  }

  function showStarInfo(index) {
    selectedIndex = index;
    var s = stars[index];
    sidebarTitle.textContent = s.hostname;

    var html =
      '<div class="detail-row"><span>Distance</span><span>' + fmtNum(s.st_dist_pc, 2) + ' pc</span></div>' +
      '<div class="detail-row"><span>Position (x,y,z)</span><span>' +
      fmtNum(s.x, 2) + ', ' + fmtNum(s.y, 2) + ', ' + fmtNum(s.z, 2) + '</span></div>' +
      '<div class="detail-row"><span>Confirmed planets</span><span>' + s.planets.length + '</span></div>';

    if (s.planets.length > 0) {
      html += '<h3>Planets</h3><ul class="planet-list">';
      s.planets.forEach(function (pl) {
        html += '<li><strong>' + pl.pl_name + '</strong><br>' +
          'Period: ' + fmtNum(pl.period_days, 2) + ' d · Teq: ' + fmtNum(pl.teq_k, 0) + ' K<br>' +
          '<span style="font-size:0.8rem">' + (pl.discoverymethod || '—') + '</span></li>';
      });
      html += '</ul>';
    } else {
      html += '<p style="margin-top:0.5rem">No confirmed planets in this demo snapshot.</p>';
    }

    if (s.archive_url) {
      html += '<p style="margin-top:0.75rem"><a href="' + s.archive_url + '" target="_blank" rel="noopener">View on NASA Exoplanet Archive →</a></p>';
    }

    sidebarContent.innerHTML = html;
    draw();
  }

  function hitTest(sx, sy) {
    var best = -1;
    var bestDist = Infinity;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var dx = sx - s._screenX;
      var dy = sy - s._screenY;
      var d2 = dx * dx + dy * dy;
      if (d2 <= s._hitR * s._hitR && d2 < bestDist) {
        bestDist = d2;
        best = i;
      }
    }
    return best;
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
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    view.rotY += dx * 0.008;
    view.rotX += dy * 0.008;
    view.rotX = Math.max(-1.2, Math.min(1.2, view.rotX));
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  });

  window.addEventListener('mouseup', function () {
    dragging = false;
  });

  canvas.addEventListener('click', function (e) {
    if (moved) return;
    var pos = getCanvasPos(e);
    var idx = hitTest(pos.x, pos.y);
    if (idx >= 0) showStarInfo(idx);
  });

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY > 0 ? 0.9 : 1.1;
    view.zoom = Math.max(8, Math.min(80, view.zoom * factor));
    draw();
  }, { passive: false });

  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      dragging = true;
      moved = false;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', function (e) {
    if (dragging && e.touches.length === 1) {
      var dx = e.touches[0].clientX - lastX;
      var dy = e.touches[0].clientY - lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      view.rotY += dx * 0.008;
      view.rotX += dy * 0.008;
      view.rotX = Math.max(-1.2, Math.min(1.2, view.rotX));
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      draw();
    }
  }, { passive: true });

  canvas.addEventListener('touchend', function (e) {
    if (!moved && e.changedTouches.length === 1) {
      var pos = getCanvasPos(e);
      var idx = hitTest(pos.x, pos.y);
      if (idx >= 0) showStarInfo(idx);
    }
    dragging = false;
  });

  window.addEventListener('resize', resize);

  fetch('data/toi_neighborhood.json')
    .then(function (r) {
      if (!r.ok) throw new Error('Failed to load catalog');
      return r.json();
    })
    .then(function (json) {
      catalog = json;
      buildStars();
      showSunInfo();
      resize();
    })
    .catch(function (err) {
      sidebarContent.innerHTML = '<p style="color:#f87171">Could not load catalog: ' + err.message + '</p>';
    });
})();
