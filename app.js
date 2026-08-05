// ==========================================
// 1. SECURITY & PANIC ENGINE
// ==========================================
const TARGET_HASH = "6276b65f2157a26177f833f4a823351ed567c530b8b7be59ff426fbbd4d09925";

let isUnlocked = false;
let isDrawingMode = false;
let selectedObject = null;
let userSecretKey = "";

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function triggerPanicMode() {
  userSecretKey = "";
  isUnlocked = false;
  document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:20vh;'>404 Not Found</h1>";
  window.location.href = "https://www.google.com";
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || (e.altKey && e.key.toLowerCase() === 'x')) {
    e.preventDefault();
    triggerPanicMode();
  }
});

window.addEventListener('blur', () => {
  if (isUnlocked) {
    userSecretKey = "";
    isUnlocked = false;
    location.reload();
  }
});

document.getElementById('panicBtn')?.addEventListener('click', triggerPanicMode);

// Unlock Engine
document.getElementById('unlockBtn').addEventListener('click', async () => {
  const inputPass = document.getElementById('passInput').value;
  if (!inputPass) return alert("Please enter password!");

  const hashedInput = await hashPassword(inputPass);
  if (hashedInput !== TARGET_HASH) {
    return alert("❌ Incorrect Password!");
  }

  userSecretKey = inputPass;
  const savedData = localStorage.getItem('skyeto_diary_encrypted');

  if (!savedData) {
    enableEditorMode();
    alert("🔓 Password verified! New diary entry created.");
  } else {
    try {
      const bytes = CryptoJS.AES.decrypt(savedData, userSecretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

      if (decryptedText.length > 0) {
        const diaryData = JSON.parse(decryptedText);
        stage.innerHTML = diaryData.htmlContent;
        document.querySelectorAll('.diary-object').forEach(makeTransformable);

        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = diaryData.canvasData;

        enableEditorMode();
        alert("🔓 Diary loaded & decrypted successfully!");
      } else {
        alert("❌ Decryption error!");
      }
    } catch (e) {
      alert("❌ Data corruption error!");
    }
  }
});

function enableEditorMode() {
  isUnlocked = true;
  document.getElementById('editorToolbar')?.classList.remove('hidden');
  document.getElementById('panicBtn')?.classList.remove('hidden');
  document.getElementById('unlockBtn')?.classList.add('hidden');
  document.getElementById('passInput')?.classList.add('hidden');
}

// Save Entry
document.getElementById('saveDiaryBtn')?.addEventListener('click', () => {
  if (!userSecretKey) return alert("Authentication error!");

  const rawData = {
    htmlContent: stage.innerHTML,
    canvasData: canvas.toDataURL()
  };

  const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(rawData), userSecretKey).toString();
  localStorage.setItem('skyeto_diary_encrypted', encryptedData);
  alert('🔒 Encrypted with AES and saved safely!');
});

// ==========================================
// 2. CANVAS DRAWING ENGINE
// ==========================================
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let isDrawing = false;
let currentPoint = { x: 0, y: 0 };

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

document.getElementById('drawModeBtn')?.addEventListener('click', (e) => {
  if (!isUnlocked) return;
  isDrawingMode = !isDrawingMode;
  e.target.classList.toggle('active', isDrawingMode);
  if (canvas) canvas.style.pointerEvents = isDrawingMode ? 'auto' : 'none';
});

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas?.addEventListener('mousedown', (e) => {
  if (!isDrawingMode) return;
  isDrawing = true;
  currentPoint = getPos(e);
});

canvas?.addEventListener('touchstart', (e) => {
  if (!isDrawingMode) return;
  isDrawing = true;
  currentPoint = getPos(e);
});

canvas?.addEventListener('mousemove', (e) => {
  if (!isDrawing || !isDrawingMode) return;
  drawStroke(getPos(e));
});

canvas?.addEventListener('touchmove', (e) => {
  if (!isDrawing || !isDrawingMode) return;
  drawStroke(getPos(e));
});

function drawStroke(targetPoint) {
  const useSmoothing = document.getElementById('smoothToggle')?.checked;
  ctx.lineWidth = document.getElementById('brushSize')?.value || 5;
  ctx.strokeStyle = document.getElementById('brushColor')?.value || '#142b4c';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(currentPoint.x, currentPoint.y);

  if (useSmoothing) {
    currentPoint.x += (targetPoint.x - currentPoint.x) * 0.25;
    currentPoint.y += (targetPoint.y - currentPoint.y) * 0.25;
  } else {
    currentPoint = targetPoint;
  }

  ctx.lineTo(currentPoint.x, currentPoint.y);
  ctx.stroke();
}

canvas?.addEventListener('mouseup', () => isDrawing = false);
canvas?.addEventListener('touchend', () => isDrawing = false);

// ==========================================
// 3. OBJECT TRANSFORM, PINCH ZOOM & TEXT ENGINE
// ==========================================
const stage = document.getElementById('stage');

function createObjectContainer(contentNode) {
  if (!isUnlocked) return;
  
  const obj = document.createElement('div');
  obj.className = 'diary-object';
  obj.style.left = '80px';
  obj.style.top = '80px';
  
  // Resizing Corner Handle
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  
  obj.appendChild(contentNode);
  obj.appendChild(handle);
  stage.appendChild(obj);

  makeTransformable(obj);
  selectObject(obj);
}

// FIX BUG THÊM CHỮ & NHẬP VĂN BẢN
document.getElementById('addTextBtn')?.addEventListener('click', () => {
  const textDiv = document.createElement('div');
  textDiv.className = 'editable-text';
  textDiv.contentEditable = "true";
  textDiv.innerText = "Click to edit text...";
  
  // Đọc style ban đầu
  textDiv.style.fontFamily = document.getElementById('fontFamilySelect').value;
  textDiv.style.fontSize = document.getElementById('fontSizeInput').value + 'px';
  textDiv.style.color = document.getElementById('textColorInput').value;

  createObjectContainer(textDiv);
});

// Import Hình Ảnh
document.getElementById('imageUploader')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target.result;
      img.style.width = '150px';
      img.style.pointerEvents = 'none';
      createObjectContainer(img);
    };
    reader.readAsDataURL(file);
  }
});

// Import Shapes (Square, Circle, Triangle)
function createShapeSVG(type) {
  const color = document.getElementById('textColorInput')?.value || '#142b4c';
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100");
  svg.setAttribute("height", "100");
  svg.className = "shape-node";

  if (type === 'square') {
    svg.innerHTML = `<rect width="100" height="100" fill="${color}" />`;
  } else if (type === 'circle') {
    svg.innerHTML = `<circle cx="50" cy="50" r="50" fill="${color}" />`;
  } else if (type === 'triangle') {
    svg.innerHTML = `<polygon points="50,0 100,100 0,100" fill="${color}" />`;
  }
  return svg;
}

document.getElementById('addSquareBtn')?.addEventListener('click', () => createObjectContainer(createShapeSVG('square')));
document.getElementById('addCircleBtn')?.addEventListener('click', () => createObjectContainer(createShapeSVG('circle')));
document.getElementById('addTriangleBtn')?.addEventListener('click', () => createObjectContainer(createShapeSVG('triangle')));

// Thay đổi Font / Size / Color trực tiếp khi chọn Object Text
['fontFamilySelect', 'fontSizeInput', 'textColorInput'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    if (selectedObject) {
      const textNode = selectedObject.querySelector('.editable-text');
      if (textNode) {
        if (id === 'fontFamilySelect') textNode.style.fontFamily = document.getElementById(id).value;
        if (id === 'fontSizeInput') textNode.style.fontSize = document.getElementById(id).value + 'px';
        if (id === 'textColorInput') textNode.style.color = document.getElementById(id).value;
      }
    }
  });
});

// Hàm hỗ trợ Kéo thả, Resizing Góc và 2 Ngón Pinch-to-Zoom
function makeTransformable(elm) {
  let initialX, initialY, initialWidth, initialHeight, initialDist = 0;
  const handle = elm.querySelector('.resize-handle');

  // Kéo thả vị trí (Drag)
  elm.addEventListener('mousedown', dragStart);
  elm.addEventListener('touchstart', dragStart, { passive: false });

  function dragStart(e) {
    if (isDrawingMode || !isUnlocked || e.target.classList.contains('resize-handle')) return;
    if (e.target.contentEditable === "true") return; // Cho phép gõ chữ bình thường
    
    selectObject(elm);
    
    if (e.touches && e.touches.length === 2) {
      // Bắt đầu 2 ngón Pinch Zoom
      initialDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialWidth = elm.offsetWidth;
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    initialX = clientX - elm.offsetLeft;
    initialY = clientY - elm.offsetTop;

    const moveHandler = (evt) => {
      if (evt.touches && evt.touches.length === 2) {
        // Xử lý Phóng to 2 ngón
        const dist = Math.hypot(
          evt.touches[0].clientX - evt.touches[1].clientX,
          evt.touches[0].clientY - evt.touches[1].clientY
        );
        const scale = dist / initialDist;
        elm.style.width = (initialWidth * scale) + 'px';
        return;
      }

      const curX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const curY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      elm.style.left = (curX - initialX) + 'px';
      elm.style.top = (curY - initialY) + 'px';
    };

    const endHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  }

  // Kéo Góc Vuông để Phóng To (Resize Handle)
  if (handle) {
    handle.addEventListener('mousedown', resizeStart);
    handle.addEventListener('touchstart', resizeStart, { passive: false });

    function resizeStart(e) {
      e.stopPropagation();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      initialX = clientX;
      initialWidth = elm.offsetWidth;

      const resizeMove = (evt) => {
        const curX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const newWidth = initialWidth + (curX - initialX);
        if (newWidth > 30) elm.style.width = newWidth + 'px';
      };

      const resizeEnd = () => {
        document.removeEventListener('mousemove', resizeMove);
        document.removeEventListener('mouseup', resizeEnd);
        document.removeEventListener('touchmove', resizeMove);
        document.removeEventListener('touchend', resizeEnd);
      };

      document.addEventListener('mousemove', resizeMove);
      document.addEventListener('mouseup', resizeEnd);
      document.addEventListener('touchmove', resizeMove, { passive: false });
      document.addEventListener('touchend', resizeEnd);
    }
  }
}

function selectObject(elm) {
  if (selectedObject) selectedObject.classList.remove('selected');
  selectedObject = elm;
  selectedObject.classList.add('selected');
}

document.getElementById('deleteObjBtn')?.addEventListener('click', () => {
  if (selectedObject) {
    selectedObject.remove();
    selectedObject = null;
  }
	});