const socket = io();
let username = "Anonymous";

function createMessageBubble(html, who){
  const div = document.createElement("div");
  div.className = `message-bubble ${who}`;
  div.innerHTML = html + `<div class="message-time">${new Date().toLocaleTimeString().slice(0,5)}</div>`;
  return div;
}

window.addEventListener("DOMContentLoaded", async () => {
  const modal = new bootstrap.Modal(document.getElementById("usernameModal"));
  modal.show();
  document.getElementById("saveUsername").onclick = () => {
    const input = document.getElementById("usernameInput").value.trim();
    username = input || "Anonymous";
    modal.hide();
  };

  const res = await fetch("/history");
  const messages = await res.json();
  messages.forEach(msg => {
    const who = (msg.username === username) ? "me" : "you";
    const html = `<strong>${msg.username}:</strong> ${
      msg.type === 'file' ? 
      `<a href="${msg.content}" target="_blank">[file]</a>` :
      msg.content
    }`;
    document.getElementById("messages").appendChild(createMessageBubble(html, who));
  });
});

document.getElementById("sendBtn").onclick = () => {
  const text = document.getElementById("chatText").value.trim();
  if (!text) return;
  const html = `<strong>${username}:</strong> ${text}`;
  document.getElementById("messages").appendChild(createMessageBubble(html, "me"));
  socket.emit("chat message", { username, content: text });
  document.getElementById("chatText").value = "";
};

socket.on("chat message", data => {
  const html = `<strong>${data.username}:</strong> ${data.content}`;
  document.getElementById("messages").appendChild(createMessageBubble(html, "you"));
  toastr.info(`Pesan dari ${data.username}`);
});

document.getElementById("fileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("username", username);
  const res = await fetch("/upload", { method: "POST", body: fd });
  const data = await res.json();
  const html = `<strong>${username}:</strong> <a href="${data.url}" target="_blank">${data.name}</a>`;
  document.getElementById("messages").appendChild(createMessageBubble(html, "me"));
  socket.emit("chat message", { username, content: html });
  e.target.value = "";
});

document.getElementById("darkToggle").onclick = () => {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
};
