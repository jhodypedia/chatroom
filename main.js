const express = require('express'),
      http = require('http'),
      socketIo = require('socket.io'),
      multer = require('multer'),
      mysql = require('mysql2'),
      fs = require('fs');

const app = express(),
      server = http.createServer(app),
      io = socketIo(server);

// Koneksi ke MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nongchat'
});

db.connect(err => {
  if (err) {
    console.error("❌ Gagal koneksi database:", err);
    process.exit(1);
  }
  console.log("✅ Terhubung ke database MySQL");
});

// Buat folder uploads jika belum ada
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Konfigurasi upload file
const upload = multer({
  storage: multer.diskStorage({
    destination: () => 'uploads/',
    filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});

// User online
let onlineUsers = {};

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Endpoint histori chat (private)
app.get('/history', (req, res) => {
  const { u1, u2 } = req.query;
  const sql = `
    SELECT * FROM messages 
    WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) 
    ORDER BY created_at
  `;
  db.query(sql, [u1, u2, u2, u1], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Gagal ambil data' });
    res.json(rows);
  });
});

// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
  const { sender, receiver } = req.body;
  const url = `/uploads/${req.file.filename}`;
  db.query(
    "INSERT INTO messages (sender, receiver, content, type) VALUES (?, ?, ?, 'file')",
    [sender, receiver, url],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Gagal simpan file' });
      const msg = {
        id: result.insertId,
        sender,
        receiver,
        content: url,
        type: 'file',
        created_at: new Date()
      };
      io.to(sender).to(receiver).emit('new message', msg);
      res.json({ url });
    }
  );
});

// Socket.IO
io.on('connection', socket => {
  let currentUser = '';

  socket.on('join', user => {
    currentUser = user;
    onlineUsers[user] = socket.id;
    socket.join(user);
    console.log(`✅ ${user} bergabung (${socket.id})`);
    io.emit('update users', Object.keys(onlineUsers));
  });

  socket.on('chat message', ({ sender, receiver, content }) => {
    db.query(
      "INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)",
      [sender, receiver, content],
      (err, result) => {
        if (err) return console.error('❌ Gagal simpan pesan:', err);
        const msg = {
          id: result.insertId,
          sender,
          receiver,
          content,
          type: 'text',
          created_at: new Date()
        };
        io.to(receiver).emit('new message', msg);
      }
    );
  });

  socket.on('typing', data => {
    socket.to(data.receiver).emit('typing', data);
  });

  socket.on('delete message', id => {
    db.query("DELETE FROM messages WHERE id=?", [id], err => {
      if (!err) io.emit('message deleted', id);
    });
  });

  socket.on('disconnect', () => {
    if (currentUser) {
      console.log(`❌ ${currentUser} disconnect (${socket.id})`);
      delete onlineUsers[currentUser];
      io.emit('update users', Object.keys(onlineUsers));
    }
  });
});

// Jalankan server
server.listen(3000, () => {
  console.log("🚀 Server jalan di http://localhost:3000");
});
