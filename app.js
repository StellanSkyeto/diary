// ==========================================
// 1. CẤU HÌNH BẢO MẬT & HASH MẬT KHẨU
// ==========================================
const TARGET_HASH = "6276b65f2157a26177f833f4a823351ed567c530b8b7be59ff426fbbd4d09925";

let isUnlocked = false;
let isDrawingMode = false;
let selectedObject = null;
let userSecretKey = ""; // Lưu tạm mật khẩu giải mã trong RAM

// Hàm băm SHA-256
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// 2. TÍNH NĂNG BẢO MẬT KHẨN CẤP (PANIC ENGINE)
// ==========================================

function triggerPanicMode() {
  userSecretKey = "";
  isUnlocked = false;

  // Ngụy trang lập tức về trang Google
  document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:20vh;'>404 Not Found</h1>";
  window.location.href = "https://www.google.com";
}

// Lắng nghe phím ESC hoặc Alt + X để kích hoạt Panic Mode
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || (e.altKey && e.key.toLowerCase() === 'x')) {
    e.preventDefault();
    triggerPanicMode();
  }
});

// Tự động khóa khi chuyển Tab
window.addEventListener('blur', () => {
  if (isUnlocked) {
    userSecretKey = "";
    isUnlocked = false;
    location.reload();
  }
});

document.getElementById('panicBtn')?.addEventListener('click', triggerPanicMode);

// ==========================================
// 3. XÁC MINH MẬT KHẨU & GIẢI MÃ AES
// ==========================================

document.getElementById('unlockBtn').addEventListener('click', async () => {
  const inputPass = document.getElementById('passInput').value;
  if (!inputPass) return alert("Vui lòng nhập mật khẩu!");

  const hashedInput = await hashPassword(inputPass);

  // Kiểm tra mã hash của đầu vào với TARGET_HASH
  if (hashedInput !== TARGET_HASH) {
    return alert("❌ Sai mật khẩu giải mã! Đã kích hoạt cảnh báo.");
  }

  // Mật khẩu đúng -> Dùng mật khẩu này làm chìa khóa AES
  userSecretKey = inputPass;
  const savedData = localStorage.getItem('skyeto_diary_encrypted');

  if (!savedData) {
    enableEditorMode();
    alert("🔓 Xác minh thành công! Tạo nhật ký mới.");
  } else {
    try {
      const bytes = CryptoJS.AES.decrypt(savedData, userSecretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

      if (decryptedText.length > 0) {
        const diaryData = JSON.parse(decryptedText);
        
        // Phục hồi HTML Stage
        stage.innerHTML = diaryData.htmlContent;
        document.querySelectorAll('.diary-object').forEach(makeTransformable);

        // Phục hồi nét vẽ Canvas
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = diaryData.canvasData;

        enableEditorMode();
        alert("🔓 Giải mã AES thành công! Mời bạn chỉnh sửa nhật ký.");
      } else {
        alert("❌ Lỗi giải mã dữ liệu!");
      }
    } catch (e) {
      alert("❌ Lỗi dữ liệu mã hóa!");
    }
  }
});

function enableEditorMode() {
  isUnlocked = true;
  document.getElementById('editorToolbar')?.classList.remove('hidden');
  document.getElementById('lockBtn')?.classList.remove('hidden');
  document.getElementById('unlockBtn')?.classList.add('hidden');
  document.getElementById('passInput')?.classList.add('hidden');
}

// Mã hóa & Lưu dữ liệu vào LocalStorage
document.getElementById('saveDiaryBtn')?.addEventListener('click', () => {
  if (!userSecretKey) return alert("Lỗi: Chưa xác minh mật khẩu!");

  const rawData = {
    htmlContent: stage.innerHTML,
    canvasData: canvas.toDataURL()
  };

  const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(rawData), userSecretKey).toString();
  localStorage.setItem('skyeto_diary_encrypted', encryptedData);
  alert('🔒 Nhật ký đã được MÃ HÓA AES và lưu an toàn!');
});

// ==========================================
// 4. CANVAS VẼ TAY VỚI CHỐNG RUNG (LAZY SMOOTHING)
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

canvas?.addEventListener('mousedown', (e) => {
  if (!isDrawingMode) return;
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  currentPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

canvas?.addEventListener('mousemove', (e) => {
  if (!isDrawing || !isDrawingMode) return;
  
  const rect = canvas.getBoundingClientRect();
  const targetPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  const useSmoothing = document.getElementById('smoothToggle')?.checked;

  ctx.lineWidth = document.getElementById('brushSize')?.value || 5;
  ctx.strokeStyle = document.getElementById('brushColor')?.value || '#ffffff';
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
});

canvas?.addEventListener('mouseup', () => isDrawing = false);

// ==========================================
// 5. QUẢN LÝ VẬT THỂ & ĐIỀU KHIỂN (DRAG ENGINE)
// ==========================================

const stage = document.getElementById('stage');

function createObjectContainer(contentNode) {
  if (!isUnlocked) return;
  
  const obj = document.createElement('div');
  obj.className = 'diary-object';
  obj.style.left = '100px';
  obj.style.top = '100px';
  
  obj.appendChild(contentNode);
  stage.appendChild(obj);

  makeTransformable(obj);
  selectObject(obj);
}

function makeTransformable(elm) {
  let posX = 0, posY = 0, initialX = 0, initialY = 0;

  elm.addEventListener('mousedown', (e) => {
    if (isDrawingMode || !isUnlocked) return;
    selectObject(elm);
    
    document.querySelectorAll('.diary-object').forEach(o => o.style.zIndex = 1);
    elm.style.zIndex = 10;

    initialX = e.clientX;
    initialY = e.clientY;

    document.onmousemove = (e) => {
      posX = initialX - e.clientX;
      posY = initialY - e.clientY;
      initialX = e.clientX;
      initialY = e.clientY;
      elm.style.top = (elm.offsetTop - posY) + "px";
      elm.style.left = (elm.offsetLeft - posX) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  });
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