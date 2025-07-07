const socket = io();
let me = "", peer = "";

// DOM
const meInput = document.getElementById("me");
const peerInput = document.getElementById("peerInput");
const startBtn = document.getElementById("start");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");
const fileInput = document.getElementById("fileInput");
const userList = document.getElementById("userList");
const chatArea = document.getElementById("chatArea");

startBtn.onclick = () => {
  me = meInput.value.trim();
  if (!me) return alert("Nama wajib diisi");
  document.getElementById("modalUser").remove();
  const backdrop = document.querySelector('.modal-backdrop');
  if (backdrop) backdrop.remove();
  socket.emit("join", me);
};

sendBtn.onclick = () => {
  const text = chatText.value.trim();
  if (!text || !peer) return;
  socket.emit("chat message", { sender: me, receiver: peer, content: text });
  chatText.value = "";
};

chatText.oninput = () => {
  if (peer) socket.emit("typing", { sender: me, receiver: peer });
};

fileInput.onchange = () => {
  if (!peer || !fileInput.files.length) return;
  const form = new FormData();
  form.append("file", fileInput.files[0]);
  form.append("sender", me);
  form.append("receiver", peer);
  fetch("/upload", { method: "POST", body: form });
  fileInput.value = "";
};

socket.on("update users", users => {
  userList.innerHTML = "";
  users.filter(u => u !== me).forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fa-solid fa-user-circle me-2"></i> ${u}`;
    li.onclick = () => {
      peer = u;
      document.getElementById("chatWith").textContent = peer;
      chatArea.style.display = "flex";
      if (window.innerWidth < 768) {
        document.querySelector(".sidebar").style.display = "none";
      }
      fetch(`/history?u1=${me}&u2=${peer}`)
        .then(res => res.json())
        .then(renderMessages);
    };
    userList.appendChild(li);
  });
});

socket.on("typing", data => {
  if (data.sender === peer) {
    const el = document.getElementById("typingStatus");
    el.textContent = "Mengetik...";
    setTimeout(() => (el.textContent = ""), 1000);
  }
});

socket.on("new message", msg => {
  if ((msg.sender === peer && msg.receiver === me) || (msg.sender === me && msg.receiver === peer)) {
    appendMessage(msg);
  }
});

socket.on("message deleted", id => {
  const el = document.getElementById("msg-" + id);
  if (el) el.remove();
});

document.getElementById("backBtn").onclick = () => {
  chatArea.style.display = "none";
  document.querySelector(".sidebar").style.display = "block";
};

function renderMessages(msgs) {
  messages.innerHTML = "";
  msgs.forEach(appendMessage);
  messages.scrollTop = messages.scrollHeight;
}

function appendMessage(m) {
  const div = document.createElement("div");
  div.className = `chat-bubble-avatar ${m.sender === me ? "me" : "you"}`;
  div.id = "msg-" + m.id;
  div.innerHTML = `
    <div class="avatar"><i class="fa-solid fa-circle-user"></i></div>
    <div class="bubble">
      ${
        m.type === "file"
          ? `<a href="${m.content}" target="_blank">📎 File</a>`
          : `<span>${m.content}</span>`
      }
      <div class="message-time">${new Date(m.created_at).toLocaleTimeString()}</div>
      ${m.sender === me ? `<button class="delete-btn" onclick="deleteMsg(${m.id})">&times;</button>` : ""}
    </div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function deleteMsg(id) {
  socket.emit("delete message", id);
}
