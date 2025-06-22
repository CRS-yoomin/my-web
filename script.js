const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');

// ✅ 라벨 색상 정의
const labelColors = {
  "Nemopilema nomurai": "red",
  "Sargassum": "orange"
};
const labelKeys = Object.keys(labelColors);

let image = new Image();
let imageFiles = [], currentIndex = 0;
let boxesPerImage = [], boxes = [];

let startX, startY, currentX, currentY, isDrawing = false;
let selectedBoxIndex = -1, resizing = false, resizeHandle = null;
const resizeHandleSize = 10;

// ✅ 이미지 업로드
fileInput.addEventListener('change', (e) => {
  imageFiles = Array.from(e.target.files);
  boxesPerImage = imageFiles.map(() => []);
  currentIndex = 0;
  loadImage(currentIndex);
  generateThumbnails();
});

// ✅ 이미지 로드
function loadImage(index) {
  if (!imageFiles[index]) return;
  const reader = new FileReader();
  reader.onload = (e) => image.src = e.target.result;
  reader.readAsDataURL(imageFiles[index]);
}

image.onload = () => {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  boxes = boxesPerImage[currentIndex];
  drawAll();
  updateLabelList();
  updateStatus();
  highlightThumbnail();
};

function prevImage() {
  saveCurrentBoxes();
  if (currentIndex > 0) {
    currentIndex--;
    loadImage(currentIndex);
  }
}

function nextImage() {
  saveCurrentBoxes();
  if (currentIndex < imageFiles.length - 1) {
    currentIndex++;
    loadImage(currentIndex);
  }
}

function saveCurrentBoxes() {
  boxesPerImage[currentIndex] = [...boxes];
}

function updateStatus() {
  document.getElementById('imageStatus').innerText = `이미지 ${currentIndex + 1} / ${imageFiles.length}`;
}

// ✅ 썸네일 생성
function generateThumbnails() {
  const container = document.getElementById('thumbnailContainer');
  container.innerHTML = '';
  imageFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.addEventListener('click', () => {
        saveCurrentBoxes();
        currentIndex = index;
        loadImage(currentIndex);
      });
      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function highlightThumbnail() {
  const thumbs = document.querySelectorAll('#thumbnailContainer img');
  thumbs.forEach((img, i) => {
    img.classList.toggle('active', i === currentIndex);
  });
}

// ✅ 캔버스 라벨링
canvas.addEventListener('mousedown', (e) => {
  const pos = getMousePos(e);
  selectedBoxIndex = boxes.findIndex(b =>
    pos.x >= b.x && pos.x <= b.x + b.width &&
    pos.y >= b.y && pos.y <= b.y + b.height);

  if (selectedBoxIndex !== -1) {
    const box = boxes[selectedBoxIndex];
    resizeHandle = getResizeHandle(pos, box);
    if (resizeHandle) {
      resizing = true;
      return;
    }
  }

  isDrawing = true;
  startX = pos.x;
  startY = pos.y;
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getMousePos(e);
  if (resizing && selectedBoxIndex !== -1) {
    const b = boxes[selectedBoxIndex];
    switch (resizeHandle) {
      case 'tl': b.width += b.x - pos.x; b.height += b.y - pos.y; b.x = pos.x; b.y = pos.y; break;
      case 'tr': b.width = pos.x - b.x; b.height += b.y - pos.y; b.y = pos.y; break;
      case 'bl': b.width += b.x - pos.x; b.x = pos.x; b.height = pos.y - b.y; break;
      case 'br': b.width = pos.x - b.x; b.height = pos.y - b.y; break;
    }
    drawAll();
    updateLabelList();
    return;
  }

  if (isDrawing) {
    currentX = pos.x;
    currentY = pos.y;
    drawAll(true);
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (resizing) {
    resizing = false;
    resizeHandle = null;
    return;
  }

  if (!isDrawing) return;
  isDrawing = false;
  const pos = getMousePos(e);
  const label = document.getElementById('selectedLabel').value;
  const x = Math.min(startX, pos.x);
  const y = Math.min(startY, pos.y);
  const w = Math.abs(pos.x - startX);
  const h = Math.abs(pos.y - startY);
  if (w < 10 || h < 10) return;
  boxes.push({ x, y, width: w, height: h, label });
  drawAll();
  updateLabelList();
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const pos = getMousePos(e);
  const i = boxes.findIndex(b =>
    pos.x >= b.x && pos.x <= b.x + b.width &&
    pos.y >= b.y && pos.y <= b.y + b.height);
  if (i !== -1) {
    boxes.splice(i, 1);
    drawAll();
    updateLabelList();
  }
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function getResizeHandle(pos, box) {
  const handles = {
    tl: { x: box.x, y: box.y },
    tr: { x: box.x + box.width, y: box.y },
    bl: { x: box.x, y: box.y + box.height },
    br: { x: box.x + box.width, y: box.y + box.height }
  };
  for (let key in handles) {
    const h = handles[key];
    if (Math.abs(pos.x - h.x) < resizeHandleSize && Math.abs(pos.y - h.y) < resizeHandleSize) {
      return key;
    }
  }
  return null;
}

function drawResizeHandle(x, y, scale = 1) {
  const size = resizeHandleSize / scale;
  ctx.fillStyle = 'black';
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
}

function drawAll(temp = false) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  const scale = Math.min(scaleX, scaleY);

  boxes.forEach((b) => {
    ctx.strokeStyle = labelColors[b.label] || 'black';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(b.x, b.y, b.width, b.height);
    drawResizeHandle(b.x, b.y, scale);
    drawResizeHandle(b.x + b.width, b.y, scale);
    drawResizeHandle(b.x, b.y + b.height, scale);
    drawResizeHandle(b.x + b.width, b.y + b.height, scale);
  });

  if (temp && isDrawing) {
    ctx.strokeStyle = 'gray';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(Math.min(startX, currentX), Math.min(startY, currentY),
      Math.abs(currentX - startX), Math.abs(currentY - startY));
    ctx.setLineDash([]);
  }
}

function updateLabelList() {
  document.getElementById('labelList').innerHTML =
    '<b>라벨 목록:</b><br>' + boxes.map((b, i) =>
      `${i + 1}) ${b.label} [x:${b.x.toFixed(1)}, y:${b.y.toFixed(1)}, w:${b.width.toFixed(1)}, h:${b.height.toFixed(1)}]`
    ).join('<br>');
}

// ✅ YOLO 형식으로 빠르게 저장 (최적화 버전)
async function downloadLabels() {
  saveCurrentBoxes();
  const zip = new JSZip();
  const imgFolder = zip.folder("images");
  const labelFolder = zip.folder("labels");

  for (let idx = 0; idx < imageFiles.length; idx++) {
    const imageBoxes = boxesPerImage[idx];
    const originalBlob = imageFiles[idx];
    const imgName = originalBlob.name;
    imgFolder.file(imgName, originalBlob);

    const tempImg = new Image();
    const reader = new FileReader();

    await new Promise((resolve) => {
      reader.onload = (e) => {
        tempImg.src = e.target.result;
        tempImg.onload = () => {
          const w = tempImg.naturalWidth;
          const h = tempImg.naturalHeight;

          const lines = (imageBoxes || []).map(b => {
            const cx = (b.x + b.width / 2) / w;
            const cy = (b.y + b.height / 2) / h;
            const bw = b.width / w;
            const bh = b.height / h;
            const classId = labelKeys.indexOf(b.label);
            return `${classId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${bw.toFixed(6)} ${bh.toFixed(6)}`;
          });

          const txtName = imgName.replace(/\.[^/.]+$/, ".txt");
          labelFolder.file(txtName, lines.join('\n'));
          resolve();
        };
      };
      reader.readAsDataURL(originalBlob);
    });
  }

  const yamlContent = `
path: ./
train: images
val: images

names:
${labelKeys.map((key, idx) => `  ${idx}: ${key}`).join('\n')}
`.trim();
  zip.file("data.yaml", yamlContent);

  zip.generateAsync({ type: "blob" }).then(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "YOLO_labels.zip";
    a.click();
  });
}
