const socket = io();
let me = "", peer = "";

const chatArea = document.getElementById("chatArea");
const messages = document.getElementById("messages");
const userList = document.getElementById("userList");
const typingStatus = document.getElementById("typingStatus");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");

document.getElementById("start").onclick = () => {
  me = document.getElementById("me").value.trim();
  if (!me) return alert("Isi nama dulu!");
  socket.emit("join", me);
  document.getElementById("modalUser").remove();
};

document.getElementById("backBtn").onclick = () => {
  chatArea.classList.remove("active");
  messages.innerHTML = "";
  document.getElementById("chatWith").innerText = "";
};

chatText.addEventListener("input", () => {
  if (peer) {
    socket.emit("typing", { sender: me, receiver: peer });
  }
});

sendBtn.onclick = () => {
  const content = chatText.value.trim();
  if (!content || !peer) return;
  socket.emit("chat message", { sender: me, receiver: peer, content });
  chatText.value = "";
};

socket.on("new message", msg => {
  const you = msg.sender === peer ? "you" : "me";
  appendMessage(msg, you);

  // 📩 Notifikasi popup kalau dari orang lain & bukan sedang dibuka
  if (msg.sender !== me && msg.sender !== peer) {
    alert(`💬 Pesan baru dari ${msg.sender}`);
  }

  // 📜 Scroll otomatis
  messages.scrollTop = messages.scrollHeight;
});

socket.on("typing", data => {
  if (data.sender === peer) {
    typingStatus.innerText = `${data.sender} sedang mengetik...`;
    setTimeout(() => (typingStatus.innerText = ""), 2000);
  }
});

socket.on("update users", users => {
  userList.innerHTML = "";
  users.filter(u => u !== me).forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `<i class="fa-solid fa-user-circle me-2"></i> ${u}`;
    li.onclick = () => {
      peer = u;
      messages.innerHTML = "";
      document.getElementById("chatWith").innerText = `Chat dengan ${peer}`;
      chatArea.classList.add("active");

      fetch(`/history?u1=${me}&u2=${peer}`)
        .then(res => res.json())
        .then(data => {
          data.forEach(msg => {
            const you = msg.sender === me ? "me" : "you";
            appendMessage(msg, you);
          });
          messages.scrollTop = messages.scrollHeight;
        });
    };
    userList.appendChild(li);
  });
});

fileInput.addEventListener("change", () => {
  if (!peer || !fileInput.files[0]) return;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("sender", me);
  formData.append("receiver", peer);

  fetch("/upload", { method: "POST", body: formData })
    .then(res => res.json())
    .then(({ url }) => {
      fileInput.value = "";
    });
});

function appendMessage(msg, who) {
  const wrap = document.createElement("div");
  wrap.className = `chat-bubble-avatar ${who}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;

  const bubble = document.createElement("div");
  bubble.className = `bubble`;

  if (msg.type === "file") {
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(msg.content);
    bubble.innerHTML = isImage
      ? `<a href="${msg.content}" target="_blank"><img src="${msg.content}" style="max-width:150px;border-radius:4px;"></a>`
      : `<a href="${msg.content}" target="_blank">📎 Unduh File</a>`;
  } else {
    bubble.textContent = msg.content;
  }

  const time = document.createElement("div");
  time.className = "message-time";
  time.innerText = new Date(msg.created_at).toLocaleTimeString();
  bubble.appendChild(time);

  if (who === "me") {
    const del = document.createElement("button");
    del.className = "delete-btn";
    del.innerHTML = "×";
    del.onclick = () => {
      if (confirm("Hapus pesan ini?")) {
        socket.emit("delete message", msg.id);
      }
    };
    bubble.appendChild(del);
  }

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  messages.appendChild(wrap);
}

socket.on("message deleted", id => {
  const all = document.querySelectorAll(".delete-btn");
  all.forEach(btn => {
    if (btn.onclick && btn.onclick.toString().includes(id)) {
      btn.closest(".chat-bubble-avatar").remove();
    }
  });
});
