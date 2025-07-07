const socket = io();
let me = '', peer = '';

const meInput = document.getElementById('me');
const startBtn = document.getElementById('start');
const chatText = document.getElementById('chatText');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const userList = document.getElementById('userList');
const chatWith = document.getElementById('chatWith');
const typingStatus = document.getElementById('typingStatus');
const fileInput = document.getElementById('fileInput');

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, me + peer).toString();
}

function decrypt(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, me + peer);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '[DECRYPT ERROR]';
  }
}

function createBubble(msg) {
  const div = document.createElement('div');
  div.className = 'chat-bubble-avatar ' + (msg.sender === me ? 'me' : 'you');
  div.classList.add('message');
  div.dataset.id = msg.id;

  const avatar = `<div class="avatar ${msg.sender === me ? 'me' : 'you'}">
    <i class="fa-solid ${msg.sender === me ? 'fa-user-ninja' : 'fa-user-circle'}"></i>
  </div>`;

  const content = msg.type === 'file'
    ? `<a href="${msg.content}" target="_blank">📎 File</a>`
    : decrypt(msg.content);

  const html = `<div class="bubble">
    <strong>${msg.sender}</strong><br>${content}
    <div class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
    ${msg.sender === me ? `<button class="delete-btn" onclick="deleteMsg(${msg.id})"><i class="fa fa-trash"></i></button>` : ''}
  </div>`;

  div.innerHTML = avatar + html;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function loadHistory() {
  fetch(`/history?u1=${me}&u2=${peer}`)
    .then(res => res.json())
    .then(data => {
      messagesDiv.innerHTML = '';
      data.forEach(createBubble);
    });
}

function deleteMsg(id) {
  socket.emit('delete message', id);
}

startBtn.onclick = () => {
  me = meInput.value.trim();
  if (!me) return alert('Nama wajib diisi');
  document.getElementById('modalUser').remove();
  socket.emit('join', me);
};

sendBtn.onclick = () => {
  const text = chatText.value.trim();
  if (!text || !peer) return;
  const encrypted = encrypt(text);
  socket.emit('chat message', { sender: me, receiver: peer, content: encrypted });
  chatText.value = '';
};

chatText.addEventListener('input', () => {
  if (peer) {
    socket.emit('typing', { sender: me, receiver: peer });
  }
});

fileInput.addEventListener('change', () => {
  if (!peer || !fileInput.files.length) return;
  const form = new FormData();
  form.append('file', fileInput.files[0]);
  form.append('sender', me);
  form.append('receiver', peer);
  fetch('/upload', { method: 'POST', body: form })
    .then(res => res.json())
    .then(data => {
      console.log('File uploaded:', data.url);
    });
});

socket.on('new message', createBubble);

socket.on('message deleted', id => {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) el.classList.add('deleted');
});

socket.on('typing', ({ sender }) => {
  if (sender !== peer) return;
  typingStatus.textContent = 'sedang mengetik...';
  setTimeout(() => typingStatus.textContent = '', 2000);
});

socket.on('update users', users => {
  userList.innerHTML = '';
  users.forEach(user => {
    if (user !== me) {
      const li = document.createElement('li');
      li.textContent = user;
      li.classList.add('online');
      userList.appendChild(li);
    }
  });
});

// Pilih teman dari sidebar
userList.addEventListener('click', e => {
  if (e.target.tagName !== 'LI') return;
  document.querySelectorAll('#userList li').forEach(li => li.classList.remove('active'));
  e.target.classList.add('active');
  peer = e.target.textContent;
  chatWith.textContent = peer;
  messagesDiv.innerHTML = '';
  loadHistory();
});
