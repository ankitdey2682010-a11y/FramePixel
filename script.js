const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const emptyState = document.getElementById('emptyState');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');

const sliders = ['brightness', 'contrast', 'saturate', 'grayscale', 'sepia', 'blur', 'frameWidth'];
const frameColorInput = document.getElementById('frameColor');

let sourceImg = null;

const defaults = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  frameWidth: 0,
  frameColor: '#ffffff',
  rotate: 0,
  flipH: 1,
  flipV: 1
};

let state = { ...defaults };

function setControlsEnabled(enabled) {
  document.querySelectorAll('input, button').forEach(el => {
    if (el.id !== 'fileInput') el.disabled = !enabled;
  });
}

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      sourceImg = img;
      state = { ...defaults };
      syncUI();
      setControlsEnabled(true);
      emptyState.style.display = 'none';
      canvas.style.display = 'block';
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function syncUI() {
  sliders.forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + 'Val');
    el.value = state[id];
    const unit = id === 'blur' || id === 'frameWidth' ? 'px' : '%';
    valEl.textContent = state[id] + unit;
  });
  frameColorInput.value = state.frameColor;
}

function render() {
  if (!sourceImg) return;

  const isRotated = Math.abs(state.rotate % 180) === 90;
  const baseW = isRotated ? sourceImg.height : sourceImg.width;
  const baseH = isRotated ? sourceImg.width : sourceImg.height;
  const pad = Number(state.frameWidth);

  canvas.width = baseW + pad * 2;
  canvas.height = baseH + pad * 2;

  ctx.save();
  ctx.fillStyle = state.frameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((state.rotate * Math.PI) / 180);
  ctx.scale(state.flipH, state.flipV);

  ctx.filter = [
    `brightness(${state.brightness}%)`,
    `contrast(${state.contrast}%)`,
    `saturate(${state.saturate}%)`,
    `grayscale(${state.grayscale}%)`,
    `sepia(${state.sepia}%)`,
    `blur(${state.blur}px)`
  ].join(' ');

  ctx.drawImage(
    sourceImg,
    -sourceImg.width / 2,
    -sourceImg.height / 2,
    sourceImg.width,
    sourceImg.height
  );

  ctx.restore();
}

fileInput.addEventListener('change', e => loadImage(e.target.files[0]));

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  loadImage(e.dataTransfer.files[0]);
});

sliders.forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state[id] = Number(el.value);
    const unit = id === 'blur' || id === 'frameWidth' ? 'px' : '%';
    document.getElementById(id + 'Val').textContent = state[id] + unit;
    render();
  });
});

frameColorInput.addEventListener('input', () => {
  state.frameColor = frameColorInput.value;
  render();
});

document.getElementById('rotateLeft').addEventListener('click', () => {
  state.rotate = (state.rotate - 90) % 360;
  render();
});

document.getElementById('rotateRight').addEventListener('click', () => {
  state.rotate = (state.rotate + 90) % 360;
  render();
});

document.getElementById('flipH').addEventListener('click', () => {
  state.flipH *= -1;
  render();
});

document.getElementById('flipV').addEventListener('click', () => {
  state.flipV *= -1;
  render();
});

document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    const map = {
      none: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 },
      noir: { brightness: 105, contrast: 135, saturate: 0, grayscale: 100, sepia: 0 },
      warm: { brightness: 105, contrast: 110, saturate: 125, grayscale: 0, sepia: 25 },
      fade: { brightness: 110, contrast: 85, saturate: 80, grayscale: 0, sepia: 10 }
    };
    Object.assign(state, map[preset]);
    syncUI();
    render();
  });
});

resetBtn.addEventListener('click', () => {
  state = { ...defaults };
  syncUI();
  render();
});

exportBtn.addEventListener('click', () => {
  if (!sourceImg) return;
  const link = document.createElement('a');
  link.download = 'framepixl-export.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
