const socket = io(), secret="nongchat";
let me, peer, contacts=[], socketConnectedUsers=[];

function enc(t){return CryptoJS.AES.encrypt(t,secret).toString();}
function dec(c){return CryptoJS.AES.decrypt(c,secret).toString(CryptoJS.enc.Utf8);}
function getAvatarIcon(name){
  const icons=['fa-user-circle','fa-user-ninja','fa-cat','fa-robot','fa-ghost'];
  return icons[name.charCodeAt(0)%icons.length];
}
function renderContacts(){
  const ul = document.getElementById("userList");
  ul.innerHTML = "";
  contacts.forEach(u=>{
    const icon = getAvatarIcon(u);
    const li = document.createElement("li");
    li.innerHTML = `<i class="fa-solid ${icon} me-2"></i>${u}`;
    li.onclick = ()=>selectPeer(u);
    if(u===peer) li.classList.add("active");
    if(socketConnectedUsers.includes(u)) li.classList.add("online");
    ul.appendChild(li);
  });
}
function selectPeer(u){
  peer=u;document.getElementById("chatWith").textContent=u;
  renderContacts();loadHistory();
}
async function loadHistory(){
  document.getElementById("messages").innerHTML="";
  const res = await fetch(`/history?u1=${me}&u2=${peer}`);
  const arr = await res.json();
  arr.forEach(m=>addMessage(m,m.sender===me?'me':'you'));
}
function addMessage(msg, who){
  const wrapper = document.createElement("div");
  wrapper.id = 'msg-'+msg.id;
  wrapper.className = `chat-bubble-avatar ${who}`;

  const avWrap = document.createElement("div");
  avWrap.className = `avatar ${who}`;
  avWrap.innerHTML = `<i class="fa-solid ${getAvatarIcon(msg.sender)}"></i>`;

  const msgDiv = document.createElement("div");
  const content = (msg.type==='file')
    ? `<a href="${msg.content}" target="_blank">[file]</a>`
    : dec(msg.content);
  msgDiv.innerHTML = `<strong>${msg.sender}:</strong> ${content}
    <button class="delete-btn" onclick="deleteMsg(${msg.id})">&times;</button>
    <div class="message-time">${new Date(msg.created_at).toLocaleTimeString().slice(0,5)}</div>`;

  wrapper.appendChild(avWrap);
  wrapper.appendChild(msgDiv);
  document.getElementById("messages").appendChild(wrapper);
}
window.deleteMsg = id => socket.emit('delete message', id);

document.getElementById("start").onclick = ()=>{
  me=document.getElementById("me").value.trim();
  const p=document.getElementById("peerInput").value.trim();
  if(!me||!p)return alert("Isi nama!");
  peer=p;contacts=[...new Set([peer])];
  socket.emit('join',me);
  document.getElementById("chatWith").textContent=peer;
  document.getElementById("modalUser").remove();
  document.querySelector('.modal-backdrop').remove();
  document.querySelector('.container').style.display='flex';
  renderContacts();loadHistory();
};
document.getElementById("sendBtn").onclick = ()=>{
  const t=document.getElementById("chatText").value.trim();
  if(!t)return;
  const cipher=enc(t);
  socket.emit("chat message",{sender:me,receiver:peer,content:cipher});
  addMessage({id:Date.now(),sender:me,content:cipher,type:'text',created_at:new Date()},'me');
  addContact(peer); document.getElementById("chatText").value="";
};
document.getElementById("fileInput").onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  const fd=new FormData(); fd.append('file',f);
  fd.append('sender',me); fd.append('receiver',peer);
  const res=await fetch("/upload",{method:'POST',body:fd});
  const d=await res.json();
  addMessage({id:Date.now(),sender:me,content:d.url,type:'file',created_at:new Date()},'me');
  addContact(peer);
};
document.getElementById("chatText").addEventListener('input', ()=>{
  if(peer) socket.emit('typing',{sender:me,receiver:peer});
});
socket.on("typing", d=>{
  const el = document.getElementById("typingStatus");
  el.textContent = d.sender+" sedang mengetik...";
  clearTimeout(window._tt); window._tt = setTimeout(()=>el.textContent='', 1500);
});
socket.on("new message", msg=>{
  if(msg.sender===peer && msg.receiver===me){
    addMessage(msg,'you');
    addContact(msg.sender);
  }
});
socket.on("message deleted", id=>{
  const el = document.getElementById("msg-"+id);
  if(el) el.classList.add("deleted");
});
socket.on("update users", users=>{
  socketConnectedUsers = users.filter(u=>u!==me);
  contacts = Array.from(new Set([...contacts,...socketConnectedUsers]));
  renderContacts();
});
function addContact(u){
  if(!contacts.includes(u)&&u!==me){contacts.push(u);renderContacts();}
}
