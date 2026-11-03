// State configuration
const state = {
  size: 16,
  scale: 24, // visual display zoom factor
  tool: 'pencil',
  color: '#000000',
  showGrid: true,
  onionSkin: false,
  fps: 8,
  isPlaying: true,
  activeFrameIdx: 0,
  // 3D array: frames[frameIndex][y][x] = hexColor or null
  frames: []
};

// Common palette colors
const DEFAULT_PALETTE = [
  '#000000', '#ffffff', '#6b7280', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#a855f7', '#ec4899', '#78350f'
];

// Canvas and DOM references
const artCanvas = document.getElementById('art-canvas');
const gridCanvas = document.getElementById('grid-canvas');
const onionCanvas = document.getElementById('onion-canvas');
const previewCanvas = document.getElementById('preview-canvas');
const framesTrack = document.getElementById('frames-track');
const colorInput = document.getElementById('primary-color');
const fpsInput = document.getElementById('fps-input');
const fpsLabel = document.getElementById('fps-label');
const btnPlay = document.getElementById('btn-play');

const artCtx = artCanvas.getContext('2d');
const gridCtx = gridCanvas.getContext('2d');
const onionCtx = onionCanvas.getContext('2d');
const previewCtx = previewCanvas.getContext('2d');

let isDrawing = false;
let previewTimer = null;
let currentPreviewFrame = 0;

// Setup empty frame grid
function createEmptyGrid(size) {
  const grid = [];
  for (let y = 0; y < size; y++) {
    const row = new Array(size).fill(null);
    grid.push(row);
  }
  return grid;
}

function init() {
  state.frames = [createEmptyGrid(state.size)];
  setupCanvases();
  setupPalette();
  bindEvents();
  renderAll();
  startPreviewLoop();
}

function setupCanvases() {
  const pixelDimension = state.size * state.scale;
  
  [artCanvas, gridCanvas, onionCanvas].forEach(c => {
    c.width = pixelDimension;
    c.height = pixelDimension;
  });

  previewCanvas.width = state.size;
  previewCanvas.height = state.size;
}

function setupPalette() {
  const container = document.getElementById('swatches-container');
  container.innerHTML = '';
  
  DEFAULT_PALETTE.forEach(col => {
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = col;
    swatch.addEventListener('click', () => {
      state.color = col;
      colorInput.value = col;
    });
    container.appendChild(swatch);
  });
}

// Rendering routines
function renderCurrentFrame() {
  const grid = state.frames[state.activeFrameIdx];
  artCtx.clearRect(0, 0, artCanvas.width, artCanvas.height);

  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      const color = grid[y][x];
      if (color) {
        artCtx.fillStyle = color;
        artCtx.fillRect(x * state.scale, y * state.scale, state.scale, state.scale);
      }
    }
  }
}

function renderGrid() {
  gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  if (!state.showGrid) return;

  gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  gridCtx.lineWidth = 1;

  for (let i = 0; i <= state.size; i++) {
    const pos = i * state.scale;
    // Vertical lines
    gridCtx.beginPath();
    gridCtx.moveTo(pos, 0);
    gridCtx.lineTo(pos, gridCanvas.height);
    gridCtx.stroke();

    // Horizontal lines
    gridCtx.beginPath();
    gridCtx.moveTo(0, pos);
    gridCtx.lineTo(gridCanvas.width, pos);
    gridCtx.stroke();
  }
}

function renderOnionSkin() {
  onionCtx.clearRect(0, 0, onionCanvas.width, onionCanvas.height);
  if (!state.onionSkin || state.activeFrameIdx === 0) return;

  const prevGrid = state.frames[state.activeFrameIdx - 1];
  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      const color = prevGrid[y][x];
      if (color) {
        onionCtx.fillStyle = color;
        onionCtx.fillRect(x * state.scale, y * state.scale, state.scale, state.scale);
      }
    }
  }
}

function renderTimeline() {
  framesTrack.innerHTML = '';

  state.frames.forEach((frameData, idx) => {
    const thumb = document.createElement('div');
    thumb.className = `frame-thumb ${idx === state.activeFrameIdx ? 'active' : ''}`;
    
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = state.size;
    thumbCanvas.height = state.size;
    const tCtx = thumbCanvas.getContext('2d');

    // Paint tiny thumbnail
    for (let y = 0; y < state.size; y++) {
      for (let x = 0; x < state.size; x++) {
        if (frameData[y][x]) {
          tCtx.fillStyle = frameData[y][x];
          tCtx.fillRect(x, y, 1, 1);
        }
      }
    }

    thumb.appendChild(thumbCanvas);

    // Delete frame button (prevent deleting if only 1 frame remains)
    if (state.frames.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'frame-delete-btn';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFrame(idx);
      });
      thumb.appendChild(delBtn);
    }

    thumb.addEventListener('click', () => {
      state.activeFrameIdx = idx;
      renderAll();
    });

    framesTrack.appendChild(thumb);
  });
}

function renderAll() {
  renderCurrentFrame();
  renderGrid();
  renderOnionSkin();
  renderTimeline();
}

// Drawing logic
function getCoords(e) {
  const rect = artCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / state.scale);
  const y = Math.floor((e.clientY - rect.top) / state.scale);
  return {
    x: Math.max(0, Math.min(state.size - 1, x)),
    y: Math.max(0, Math.min(state.size - 1, y))
  };
}

function applyTool(x, y) {
  const currentGrid = state.frames[state.activeFrameIdx];

  if (state.tool === 'pencil') {
    currentGrid[y][x] = state.color;
  } else if (state.tool === 'eraser') {
    currentGrid[y][x] = null;
  } else if (state.tool === 'picker') {
    const picked = currentGrid[y][x];
    if (picked) {
      state.color = picked;
      colorInput.value = picked;
    }
  } else if (state.tool === 'bucket') {
    floodFill(x, y, currentGrid[y][x], state.color);
  }

  renderCurrentFrame();
  renderTimeline();
}

function floodFill(startX, startY, targetColor, fillColor) {
  if (targetColor === fillColor) return;
  const grid = state.frames[state.activeFrameIdx];
  const queue = [[startX, startY]];

  while (queue.length > 0) {
    const [cx, cy] = queue.pop();
    if (cx < 0 || cx >= state.size || cy < 0 || cy >= state.size) continue;
    if (grid[cy][cx] !== targetColor) continue;

    grid[cy][cx] = fillColor;
    queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

// Timeline Management
function addFrame() {
  // Duplicate active frame layout for smooth animating
  const current = state.frames[state.activeFrameIdx];
  const clone = current.map(row => [...row]);
  state.frames.splice(state.activeFrameIdx + 1, 0, clone);
  state.activeFrameIdx++;
  renderAll();
}

function deleteFrame(idx) {
  state.frames.splice(idx, 1);
  if (state.activeFrameIdx >= state.frames.length) {
    state.activeFrameIdx = state.frames.length - 1;
  }
  renderAll();
}

// Preview Loop
function startPreviewLoop() {
  if (previewTimer) clearInterval(previewTimer);
  if (!state.isPlaying) return;

  previewTimer = setInterval(() => {
    if (state.frames.length === 0) return;
    currentPreviewFrame = (currentPreviewFrame + 1) % state.frames.length;
    
    const frame = state.frames[currentPreviewFrame];
    previewCtx.clearRect(0, 0, state.size, state.size);

    for (let y = 0; y < state.size; y++) {
      for (let x = 0; x < state.size; x++) {
        if (frame[y][x]) {
          previewCtx.fillStyle = frame[y][x];
          previewCtx.fillRect(x, y, 1, 1);
        }
      }
    }
  }, 1000 / state.fps);
}

// Export functions
function exportSpriteSheet() {
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = state.size * state.frames.length;
  sheetCanvas.height = state.size;
  const sCtx = sheetCanvas.getContext('2d');

  state.frames.forEach((frame, fIdx) => {
    const offsetX = fIdx * state.size;
    for (let y = 0; y < state.size; y++) {
      for (let x = 0; x < state.size; x++) {
        if (frame[y][x]) {
          sCtx.fillStyle = frame[y][x];
          sCtx.fillRect(offsetX + x, y, 1, 1);
        }
      }
    }
  });

  const a = document.createElement('a');
  a.download = `spritesheet_${Date.now()}.png`;
  a.href = sheetCanvas.toDataURL('image/png');
  a.click();
}

function exportJSONMetadata() {
  const metadata = {
    meta: {
      app: 'PixelPulse',
      version: '1.0',
      size: { w: state.size, h: state.size },
      frameCount: state.frames.length,
      fps: state.fps
    },
    frames: state.frames.map((frame, idx) => ({
      frame: idx,
      rect: { x: idx * state.size, y: 0, w: state.size, h: state.size }
    }))
  };

  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = `spritesheet_${Date.now()}.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
}

// Event Bindings
function bindEvents() {
  // Drawing Canvas Mouse Listeners
  artCanvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const { x, y } = getCoords(e);
    applyTool(x, y);
  });

  window.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  artCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    // Don't rerun bucket fill on drag
    if (state.tool !== 'bucket') {
      applyTool(x, y);
    }
  });

  // Tools Selection
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tool = btn.dataset.tool;
    });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (key === 'p') switchTool('pencil');
    if (key === 'e') switchTool('eraser');
    if (key === 'b') switchTool('bucket');
    if (key === 'i') switchTool('picker');
  });

  function switchTool(toolName) {
    state.tool = toolName;
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === toolName);
    });
  }

  // Color picker
  colorInput.addEventListener('input', (e) => {
    state.color = e.target.value;
  });

  // Grid / Onion toggles
  document.getElementById('toggle-grid').addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    renderGrid();
  });

  document.getElementById('toggle-onion').addEventListener('change', (e) => {
    state.onionSkin = e.target.checked;
    renderOnionSkin();
  });

  // 
  document.getElementById('grid-size').addEventListener('change', (e) => {
    const newSize = parseInt(e.target.value, 10);
    state.size = newSize;
    state.scale = newSize === 32 ? 14 : 24; // scale canvas to fit viewport
    state.frames = [createEmptyGrid(newSize)];
    state.activeFrameIdx = 0;
    setupCanvases();
    renderAll();
  });

  document.getElementById('btn-add-frame').addEventListener('click', addFrame);
  
  btnPlay.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    btnPlay.textContent = state.isPlaying ? 'Pause' : 'Play';
    if (state.isPlaying) startPreviewLoop();
    else clearInterval(previewTimer);
  });

  fpsInput.addEventListener('input', (e) => {
    state.fps = parseInt(e.target.value, 10);
    fpsLabel.textContent = state.fps;
    startPreviewLoop();
  });

  document.getElementById('btn-export-sheet').addEventListener('click', exportSpriteSheet);
  document.getElementById('btn-export-json').addEventListener('click', exportJSONMetadata);
}

window.addEventListener('DOMContentLoaded', init);