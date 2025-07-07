CREATE DATABASE IF NOT EXISTS nongchat;
USE nongchat;

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(100),
  receiver VARCHAR(100),
  content TEXT,
  type ENUM('text','file') DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
