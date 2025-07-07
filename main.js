const express = require('express'),
      http = require('http'),
      socketIo = require('socket.io'),
      multer = require('multer'),
      mysql = require('mysql2'),
      fs = require('fs');

const app = express(),
      server = http.createServer(app),
      io = socketIo(server);

const db = mysql.createConnection({ host:'localhost', user:'root', password:'', database:'nongchat' });
db.connect();

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ storage: multer.diskStorage({
  destination: ()=>'uploads/',
  filename: (_,f,cb)=>cb(null, Date.now()+'-'+f.originalname)
}) });

let onlineUsers = {};

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

app.get('/history', (req, res) => {
  const { u1,u2 } = req.query;
  const sql = "SELECT * FROM messages WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY created_at";
  db.query(sql, [u1,u2,u2,u1], (e,rows)=>res.json(rows));
});

app.post('/upload', upload.single('file'), (req,res)=>{
  const { sender, receiver } = req.body;
  const url = `/uploads/${req.file.filename}`;
  db.query("INSERT INTO messages (sender,receiver,content,type) VALUES (?,?,?,'file')",
    [sender,receiver,url], (err,result)=>{
      const msg = { id: result.insertId, sender, receiver, content:url, type:'file', created_at: new Date() };
      io.to(sender).to(receiver).emit('new message', msg);
      res.json({ url });
    });
});

io.on('connection', socket => {
  let currentUser;

  socket.on('join', user => {
    currentUser = user;
    onlineUsers[user] = socket.id;
    io.emit('update users', Object.keys(onlineUsers));
    socket.join(user);
  });

  socket.on('typing', data => {
    socket.to(data.receiver).emit('typing', data);
  });

  socket.on('chat message', data => {
    const { sender,receiver,content } = data;
    db.query("INSERT INTO messages (sender,receiver,content) VALUES (?,?,?)",
      [sender,receiver,content], (err,result)=>{
        const msg = { id: result.insertId, sender, receiver, content, type:'text', created_at: new Date() };
        io.to(receiver).emit('new message', msg);
      });
  });

  socket.on('delete message', id => {
    db.query("DELETE FROM messages WHERE id=?", [id], () => {
      io.emit('message deleted', id);
    });
  });

  socket.on('disconnect', () => {
    delete onlineUsers[currentUser];
    io.emit('update users', Object.keys(onlineUsers));
  });
});

server.listen(3000, ()=>console.log("🚀 Server ready on http://localhost:3000"));
