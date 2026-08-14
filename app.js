// ==========================================
// THÔNG TIN CẤU HÌNH CỦA BẠN
// ==========================================
const TARGET_HASH = "5a8112b179e1a35ab35d046914061e1a1c017538fc87f4af32bbb32d41ed04b1";

// Dán thông tin từ JSONBin vào đây:
const JSONBIN_BIN_ID = "6a7f5ef1f5f4af5e29173bb2";
const JSONBIN_MASTER_KEY = "$2a$10$LR4V6teNCwfZqhRAHJoLsuv9vnnBE5sZPeoBok5SHk66xsSYMHVwK";

let userSecretKey = "";
let isUnlocked = false;

// Hàm mã hóa SHA-256 nhẹ cho mật khẩu
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// UNLOCK & TỰ ĐỘNG TẢI DỮ LIỆU TỪ JSONBIN
// ==========================================
async function handleUnlock() {
  const inputPass = document.getElementById('passInput').value;
  if (!inputPass) return alert("Please enter password!");

  const hashedInput = await hashPassword(inputPass);
  if (hashedInput !== TARGET_HASH) {
    return alert("❌ Incorrect Password!");
  }

  userSecretKey = inputPass;
  isUnlocked = true;

  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('editorApp').classList.remove('hidden');

  // Kéo dữ liệu từ JSONBin về
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: {
        "X-Master-Key": JSONBIN_MASTER_KEY
      }
    });
    const data = await res.json();
    
    // Nếu có dữ liệu đã mã hóa
    if (data.record && data.record.content) {
      const bytes = CryptoJS.AES.decrypt(data.record.content, userSecretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      
      if (decryptedText) {
        document.getElementById('markdownInput').value = decryptedText;
        updatePreview();
      }
    }
  } catch (e) {
    console.log("Mới tạo file hoặc lỗi kết nối Cloud:", e);
  }
}

document.getElementById('unlockBtn').addEventListener('click', handleUnlock);
document.getElementById('passInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleUnlock();
});

// Auto Render Live Preview
const editor = document.getElementById('markdownInput');
const preview = document.getElementById('markdownPreview');

function updatePreview() {
  const markdownText = editor.value;
  preview.innerHTML = marked.parse(markdownText);
}
editor.addEventListener('input', updatePreview);

// Tải file Diary.md về máy
document.getElementById('downloadBtn').addEventListener('click', () => {
  const text = editor.value;
  const blob = new Blob([text], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Diary.md';
  a.click();
});

// ==========================================
// LƯU MÃ HÓA LÊN JSONBIN CLOUD
// ==========================================
document.getElementById('saveBtn').addEventListener('click', async () => {
  if (!userSecretKey) return;
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.innerText = "⏳ Saving...";

  try {
    // Mã hóa nội dung bằng mật khẩu của bạn
    const encryptedText = CryptoJS.AES.encrypt(editor.value, userSecretKey).toString();

    // Đẩy lên JSONBin
    const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_MASTER_KEY
      },
      body: JSON.stringify({ content: encryptedText })
    });

    if (res.ok) {
      alert("☁️ Encrypted & Saved to Cloud successfully!");
    } else {
      alert("❌ Save failed! Check Bin ID or Master Key.");
    }
  } catch (e) {
    alert("❌ Network Error!");
  } finally {
    saveBtn.innerText = "💾 Save Encrypted";
  }
});

// Auto Lock khi chuyển tab
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isUnlocked) {
    userSecretKey = "";
    isUnlocked = false;
    location.reload();
  }
	});