const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

// Konfigurasi MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // sesuaikan
  database: 'nongchat'
});
db.connect(err => {
  if (err) throw err;
  console.log("✅ Terhubung ke database MySQL.");
});

// Buat folder upload jika belum ada
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

// Konfigurasi Multer
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middleware
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Ambil semua pesan dari database
app.get('/history', (req, res) => {
  db.query("SELECT * FROM messages ORDER BY created_at ASC", (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;
  db.query("INSERT INTO messages (username, content, type) VALUES (?, ?, 'file')", 
    [req.body.username, fileUrl], 
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ url: fileUrl, name: req.file.originalname });
    });
});

// Socket.IO
io.on('connection', socket => {
  socket.on('chat message', data => {
    db.query("INSERT INTO messages (username, content) VALUES (?, ?)", 
      [data.username, data.content], 
      err => {
        if (err) return console.error(err);
        socket.broadcast.emit('chat message', data);
      });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
