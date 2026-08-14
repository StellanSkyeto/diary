// Mã SHA-256 Mật khẩu mới của bạn (Thay thế chuỗi này bằng hash Pass mới của bạn nhé)
const TARGET_HASH = "5a8112b179e1a35ab35d046914061e1a1c017538fc87f4af32bbb32d41ed04b1";

let userSecretKey = "";
let isUnlocked = false;

// Hàm Hash SHA-256
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Xử lý Unlock khi bấm nút hoặc ấn Enter
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

  // Load nhật ký cũ nếu có
  const savedEncrypted = localStorage.getItem('skyeto_md_diary');
  if (savedEncrypted) {
    try {
      const bytes = CryptoJS.AES.decrypt(savedEncrypted, userSecretKey);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      document.getElementById('markdownInput').value = decryptedText;
      updatePreview();
    } catch (e) {
      console.log("New file initialized");
    }
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

// Import ảnh tự động chuyển thành dòng Code Markdown ![image](data)
document.getElementById('imgUploader').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgMarkdown = `\n![${file.name}](${event.target.result})\n`;
      editor.value += imgMarkdown;
      updatePreview();
    };
    reader.readAsDataURL(file);
  }
});

// Tải file Diary.md về máy
document.getElementById('downloadBtn').addEventListener('click', () => {
  const text = editor.value;
  const blob = new Blob([text], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Diary.md';
  a.click();
});

// Lưu nhật ký mã hóa vào LocalStorage
document.getElementById('saveBtn').addEventListener('click', () => {
  if (!userSecretKey) return;
  const encrypted = CryptoJS.AES.encrypt(editor.value, userSecretKey).toString();
  localStorage.setItem('skyeto_md_diary', encrypted);
  alert("🔒 Encrypted & Saved successfully!");
});

// Tự động khóa khi ẩn/chuyển Tab (An toàn tuyệt đối)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isUnlocked) {
    userSecretKey = "";
    isUnlocked = false;
    location.reload();
  }
});