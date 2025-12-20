// --- No-Build Polygon Editor State ---

// Main game area dimensions (single source of truth)
const GAME_AREA_WIDTH = 1380;
const GAME_AREA_HEIGHT = 800;
let drawingNoBuildPolygon = false;
let currentNoBuildPolygon = [];

// Bloons Map Editor
// Loads and edits f:/bloons/maps.json

const MAPS_PATH = '../public/maps.json';
let mapsData = null;
let selectedMapIdx = 0;

const editorDiv = document.getElementById('editor');
const mapList = document.getElementById('mapList');
const addMapBtn = document.getElementById('addMap');
const deleteMapBtn = document.getElementById('deleteMap');
const saveBtn = document.getElementById('save');
const loadBtn = document.getElementById('load');
const jsonOutput = document.getElementById('jsonOutput');

function fetchMaps() {
  fetch(MAPS_PATH)
    .then(res => res.json())
    .then(data => {
      mapsData = data;
      renderMapList();
      renderEditor();
      updateJsonOutput();
    });
}

function renderMapList() {
  mapList.innerHTML = '';
  if (!mapsData || !mapsData.maps) return;
  mapsData.maps.forEach((map, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = map.name || `Map ${map.id}`;
    mapList.appendChild(opt);
  });
  mapList.value = selectedMapIdx;
}

function drawCatmullRomSpline(ctx, points) {
  if (points.length < 2) return;
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    let p0 = points[i === 0 ? i : i - 1];
    let p1 = points[i];
    let p2 = points[i + 1];
    let p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    for (let t = 0; t < 1; t += 0.05) {
      let tt = t;
      let x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * tt + (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * tt*tt + (-p0.x + 3*p1.x - 3*p2.x + p3.x) * tt*tt*tt);
      let y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * tt + (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * tt*tt + (-p0.y + 3*p1.y - 3*p2.y + p3.y) * tt*tt*tt);
      ctx.lineTo(x, y);
    }
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
}

function renderEditor() {
  editorDiv.innerHTML = '';
  if (!mapsData || !mapsData.maps[selectedMapIdx]) return;
  const map = mapsData.maps[selectedMapIdx];

  // Use only currentBgUrl for background image
  let bgUrl = currentBgUrl;

  // Add canvas for spline drawing
  let canvas = document.createElement('canvas');
  canvas.width = GAME_AREA_WIDTH;
  canvas.height = GAME_AREA_HEIGHT;
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.zIndex = '0';
  editorDiv.appendChild(canvas);
  const ctx = canvas.getContext('2d');


  // Helper to draw all no-build polygons
  function drawNoBuildPolygonsAndInProgress() {
    // Draw all no-build polygons
    if (map.noBuildZones) {
      map.noBuildZones.forEach(zone => {
        if (zone.type === 'polygon' && Array.isArray(zone.points) && zone.points.length > 1) {
          ctx.save();
          ctx.strokeStyle = '#f00';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#f00';
          ctx.beginPath();
          ctx.moveTo(zone.points[0][0], zone.points[0][1]);
          for (let i = 1; i < zone.points.length; i++) {
            ctx.lineTo(zone.points[i][0], zone.points[i][1]);
          }
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // Draw in-progress polygon
    if (drawingNoBuildPolygon && currentNoBuildPolygon.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(currentNoBuildPolygon[0][0], currentNoBuildPolygon[0][1]);
      for (let i = 1; i < currentNoBuildPolygon.length; i++) {
        ctx.lineTo(currentNoBuildPolygon[i][0], currentNoBuildPolygon[i][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // Draw points
      currentNoBuildPolygon.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#0ff';
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // Canvas click to add points if drawing polygon
  canvas.addEventListener('mousedown', function(e) {
    if (!drawingNoBuildPolygon) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= 0 && x <= GAME_AREA_WIDTH && y >= 0 && y <= GAME_AREA_HEIGHT) {
      currentNoBuildPolygon.push([x, y]);
      renderEditor();
    }
  });


  // Draw background image for main game area
  if (bgUrl) {
    const img = new window.Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
      drawEditorOverlay(ctx, map);
      drawNoBuildPolygonsAndInProgress();
    };
    img.src = bgUrl;
  } else {
    drawEditorOverlay(ctx, map);
    drawNoBuildPolygonsAndInProgress();
  }

  // --- No-Build Polygon Controls ---
  let controls = document.getElementById('noBuildPolygonControls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'noBuildPolygonControls';
    controls.style.margin = '10px 0';
    controls.innerHTML = `
      <button id="drawNoBuildPoly">Draw No-Build Polygon</button>
      <button id="finishNoBuildPoly">Finish Polygon</button>
      <button id="removeNoBuildZone">Remove Last No-Build</button>
    `;
    editorDiv.parentNode.insertBefore(controls, editorDiv);
  }
  document.getElementById('drawNoBuildPoly').onclick = () => {
    drawingNoBuildPolygon = true;
    currentNoBuildPolygon = [];
    renderEditor();
  };
  document.getElementById('finishNoBuildPoly').onclick = () => {
    if (!drawingNoBuildPolygon || currentNoBuildPolygon.length < 3) return;
    if (!map.noBuildZones) map.noBuildZones = [];
    map.noBuildZones.push({ type: 'polygon', points: currentNoBuildPolygon.slice() });
    drawingNoBuildPolygon = false;
    currentNoBuildPolygon = [];
    renderEditor();
    updateJsonOutput();
  };
  document.getElementById('removeNoBuildZone').onclick = () => {
    if (!map.noBuildZones || map.noBuildZones.length === 0) return;
    map.noBuildZones.pop();
    renderEditor();
    updateJsonOutput();
  };
}

function drawEditorOverlay(ctx, map) {
  // Draw main game area border (where bloons travel)
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
  ctx.restore();

  // Draw smooth spline curve
  if (map.controlPoints.length > 1) {
    drawCatmullRomSpline(ctx, map.controlPoints);
  }

  // Draw control points
  let draggingPointIdx = null;
  map.controlPoints.forEach((pt, i) => {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.left = (pt.x - 8) + 'px';
    dot.style.top = (pt.y - 8) + 'px';
    dot.style.width = '16px';
    dot.style.height = '16px';
    dot.style.background = '#0ff';
    dot.style.borderRadius = '50%';
    dot.style.border = '2px solid #fff';
    dot.style.cursor = 'pointer';
    dot.title = `Control Point ${i+1}`;
    dot.style.zIndex = '1';
    
    // Use mousedown/mousemove/mouseup instead of drag-and-drop for reliability
    dot.addEventListener('mousedown', e => {
      draggingPointIdx = i;
      e.preventDefault();
    });
    
    editorDiv.appendChild(dot);
  });
  
  // Handle mousemove on editorDiv to drag control points
  editorDiv.addEventListener('mousemove', e => {
    if (draggingPointIdx === null) return;
    const rect = editorDiv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    map.controlPoints[draggingPointIdx].x = Math.max(0, Math.min(GAME_AREA_WIDTH, x));
    map.controlPoints[draggingPointIdx].y = Math.max(0, Math.min(GAME_AREA_HEIGHT, y));
    renderEditor();
  });
  
  // Handle mouseup anywhere to stop dragging
  document.addEventListener('mouseup', e => {
    if (draggingPointIdx !== null) {
      draggingPointIdx = null;
      updateJsonOutput();
    }
  });
}

function updateJsonOutput() {
  jsonOutput.value = JSON.stringify(mapsData, null, 2);
}

mapList.addEventListener('change', e => {
  selectedMapIdx = parseInt(e.target.value);
  renderEditor();
  updateJsonOutput();
});

addMapBtn.addEventListener('click', () => {
  if (!mapsData) return;
  const newId = (mapsData.maps[mapsData.maps.length-1]?.id || 0) + 1;
  mapsData.maps.push({
    id: newId,
    name: `Map ${newId}`,
    controlPoints: [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 },
      { x: 400, y: 400 },
      { x: 500, y: 500 }
    ],
    towerSpots: []
  });
  selectedMapIdx = mapsData.maps.length - 1;
  renderMapList();
  renderEditor();
  updateJsonOutput();
});

deleteMapBtn.addEventListener('click', () => {
  if (!mapsData || mapsData.maps.length <= 1) return;
  mapsData.maps.splice(selectedMapIdx, 1);
  selectedMapIdx = Math.max(0, selectedMapIdx - 1);
  renderMapList();
  renderEditor();
  updateJsonOutput();
});

saveBtn.addEventListener('click', () => {
  // For dev: download as file
  const blob = new Blob([JSON.stringify(mapsData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'maps.json';
  a.click();
});

loadBtn.addEventListener('click', fetchMaps);

// Add below toolbar and above editor
const controlsDiv = document.createElement('div');
controlsDiv.id = 'controlsDiv';
controlsDiv.style.width = GAME_AREA_WIDTH + 'px';
controlsDiv.style.margin = '0 auto 10px auto';
controlsDiv.style.textAlign = 'center';
controlsDiv.innerHTML = `
  <button id="addPoint">Add Control Point</button>
  <button id="removePoint">Remove Last Point</button>
`;
document.body.insertBefore(controlsDiv, editorDiv);

const addPointBtn = document.getElementById('addPoint');
const removePointBtn = document.getElementById('removePoint');

addPointBtn.addEventListener('click', () => {
  if (!mapsData || !mapsData.maps[selectedMapIdx]) return;
  const map = mapsData.maps[selectedMapIdx];
  // Add a new point near the last one, or center if none
  let newPt = { x: 600, y: 450 };
  if (map.controlPoints.length > 0) {
    const last = map.controlPoints[map.controlPoints.length - 1];
    newPt = { x: Math.min(1184, last.x + 32), y: Math.min(884, last.y + 32) };
  }
  map.controlPoints.push(newPt);
  renderEditor();
  updateJsonOutput();
});

removePointBtn.addEventListener('click', () => {
  if (!mapsData || !mapsData.maps[selectedMapIdx]) return;
  const map = mapsData.maps[selectedMapIdx];
  if (map.controlPoints.length > 2) { // Minimum 2 points for a path
    map.controlPoints.pop();
    renderEditor();
    updateJsonOutput();
  }
});

// Add below controlsDiv

const bgDiv = document.createElement('div');
bgDiv.id = 'bgDiv';
bgDiv.style.width = GAME_AREA_WIDTH + 'px';
bgDiv.style.margin = '0 auto 10px auto';
bgDiv.style.textAlign = 'center';
bgDiv.innerHTML = `
  <label for="bgUrl">Background image URL (${GAME_AREA_WIDTH}x${GAME_AREA_HEIGHT}): </label>
  <input id="bgUrl" type="text" style="width:400px;" placeholder="/maps/background1.png" />
  <button id="loadBg">Load</button>
`;
document.body.insertBefore(bgDiv, controlsDiv.nextSibling);

let currentBgUrl = '';
const bgUrlInput = document.getElementById('bgUrl');
const loadBgBtn = document.getElementById('loadBg');

loadBgBtn.addEventListener('click', () => {
  currentBgUrl = bgUrlInput.value.trim();
  renderEditor();
});

// Initial load
fetchMaps();
