/**
 * Production Seed Script
 *
 * Creates the professor, student, 10 labs, and sample project submissions
 * needed for the initial production deployment.
 *
 * Required env vars:
 *   SEED_PASSWORD - password for professor and student accounts
 *
 * Usage:
 *   SEED_PASSWORD=xxx bun run src/scripts/seed-production.ts
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, labs, projects } from "../db/schema";
import { MinioService } from "../lib/minio";
import { env } from "../config/env";
import AdmZip from "adm-zip";

// Hardcoded default for production ease (as requested)
const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123";

const BUCKET = env.MINIO_BUCKET;

async function hash(plain: string) {
  return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
}

// ── Real Lab Content Generators ─────────────────────────

/** Lab 1 – Introduction to HTML (static) */
function lab1Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hassan's Portfolio – Lab 1</title>
</head>
<body>
  <header>
    <h1>Hassan Alkuheli</h1>
    <nav>
      <a href="#about">About</a> |
      <a href="#skills">Skills</a> |
      <a href="#courses">Courses</a> |
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main>
    <section id="about">
      <h2>About Me</h2>
      <p>I am a Computer Science student at the University of Hail. I enjoy building web applications and learning new technologies.</p>
      <img src="https://via.placeholder.com/300x200?text=Profile+Photo" alt="Profile photo" width="300">
    </section>

    <section id="skills">
      <h2>Technical Skills</h2>
      <ul>
        <li>HTML5 &amp; Semantic Elements</li>
        <li>CSS3 &amp; Responsive Design</li>
        <li>JavaScript (ES6+)</li>
        <li>Node.js &amp; Express</li>
        <li>MySQL &amp; Database Design</li>
      </ul>
    </section>

    <section id="courses">
      <h2>Current Courses</h2>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr><th>Course</th><th>Code</th><th>Credits</th></tr>
        </thead>
        <tbody>
          <tr><td>Web Development</td><td>CS371</td><td>3</td></tr>
          <tr><td>Data Structures</td><td>CS201</td><td>3</td></tr>
          <tr><td>Database Systems</td><td>CS311</td><td>3</td></tr>
        </tbody>
      </table>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <form>
        <label for="name">Name:</label><br>
        <input type="text" id="name" name="name" placeholder="Your name"><br><br>
        <label for="email">Email:</label><br>
        <input type="email" id="email" name="email" placeholder="you@example.com"><br><br>
        <label for="message">Message:</label><br>
        <textarea id="message" name="message" rows="4" cols="40" placeholder="Write your message..."></textarea><br><br>
        <button type="submit">Send</button>
      </form>
    </section>
  </main>

  <footer>
    <p>&copy; 2025 Hassan Alkuheli – University of Hail</p>
  </footer>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 2 – CSS Fundamentals (static) */
function lab2Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Gallery – Lab 2</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="hero">
    <h1>Photo Gallery</h1>
    <p>A responsive CSS layout project</p>
  </header>

  <nav class="navbar">
    <a href="#gallery">Gallery</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
  </nav>

  <main>
    <section id="gallery" class="gallery-grid">
      <div class="card">
        <div class="card-img" style="background:#3498db"></div>
        <h3>Mountain View</h3>
        <p>Beautiful sunrise over the mountains</p>
      </div>
      <div class="card">
        <div class="card-img" style="background:#2ecc71"></div>
        <h3>Forest Trail</h3>
        <p>A quiet path through the green forest</p>
      </div>
      <div class="card">
        <div class="card-img" style="background:#e74c3c"></div>
        <h3>City Sunset</h3>
        <p>Golden hour in the city skyline</p>
      </div>
      <div class="card">
        <div class="card-img" style="background:#f39c12"></div>
        <h3>Desert Dunes</h3>
        <p>Sahara sand dunes at midday</p>
      </div>
      <div class="card">
        <div class="card-img" style="background:#9b59b6"></div>
        <h3>Northern Lights</h3>
        <p>Aurora borealis dancing across the sky</p>
      </div>
      <div class="card">
        <div class="card-img" style="background:#1abc9c"></div>
        <h3>Ocean Waves</h3>
        <p>Waves crashing on a tropical beach</p>
      </div>
    </section>

    <section id="about" class="about-section">
      <h2>About This Project</h2>
      <p>This gallery demonstrates CSS Grid, Flexbox, transitions, and responsive design techniques learned in Lab 2.</p>
    </section>
  </main>

  <footer>
    <p>Lab 2 – CSS Fundamentals &copy; Hassan Alkuheli</p>
  </footer>
</body>
</html>`));
  zip.addFile("style.css", Buffer.from(`* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; color: #333; line-height: 1.6; }

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; text-align: center; padding: 60px 20px;
}
.hero h1 { font-size: 2.5rem; margin-bottom: 10px; }
.hero p { font-size: 1.2rem; opacity: 0.9; }

.navbar {
  display: flex; justify-content: center; gap: 30px;
  background: #2c3e50; padding: 15px;
}
.navbar a { color: white; text-decoration: none; font-weight: 600; transition: color 0.3s; }
.navbar a:hover { color: #f39c12; }

.gallery-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px; padding: 40px 5%;
}
.card {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s;
}
.card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
.card-img { height: 180px; }
.card h3 { padding: 15px 15px 5px; }
.card p { padding: 0 15px 15px; color: #666; font-size: 0.9rem; }

.about-section { text-align: center; padding: 50px 20px; background: #ecf0f1; }
.about-section h2 { margin-bottom: 15px; }

footer { text-align: center; padding: 20px; background: #2c3e50; color: white; }

@media (max-width: 600px) {
  .hero h1 { font-size: 1.8rem; }
  .gallery-grid { padding: 20px 3%; gap: 16px; }
}`));
  return zip.toBuffer();
}

/** Lab 3 – JavaScript Basics (static) */
function lab3Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Manager – Lab 3</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 20px; color: #2c3e50; }
    .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
    .input-group input { flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
    .input-group input:focus { border-color: #3498db; outline: none; }
    .input-group button { padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; }
    .input-group button:hover { background: #2980b9; }
    .filters { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; }
    .filters button { padding: 8px 16px; border: 2px solid #ddd; background: white; border-radius: 20px; cursor: pointer; }
    .filters button.active { background: #3498db; color: white; border-color: #3498db; }
    .task-list { list-style: none; }
    .task-item { display: flex; align-items: center; gap: 12px; padding: 15px; background: white; margin-bottom: 8px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .task-item.done span { text-decoration: line-through; color: #999; }
    .task-item span { flex: 1; }
    .task-item .delete-btn { background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
    .counter { text-align: center; margin-top: 15px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Task Manager</h1>
    <div class="input-group">
      <input type="text" id="taskInput" placeholder="Enter a new task...">
      <button onclick="addTask()">Add</button>
    </div>
    <div class="filters">
      <button class="active" onclick="setFilter('all', this)">All</button>
      <button onclick="setFilter('active', this)">Active</button>
      <button onclick="setFilter('done', this)">Done</button>
    </div>
    <ul class="task-list" id="taskList"></ul>
    <p class="counter" id="counter"></p>
  </div>
  <script src="app.js"></script>
</body>
</html>`));
  zip.addFile("app.js", Buffer.from(`// Task Manager – JavaScript Lab 3
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
let currentFilter = 'all';

function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false });
  input.value = '';
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const filtered = tasks.filter(t => {
    if (currentFilter === 'active') return !t.done;
    if (currentFilter === 'done') return t.done;
    return true;
  });

  list.innerHTML = filtered.map(t => \`
    <li class="task-item \${t.done ? 'done' : ''}">
      <input type="checkbox" \${t.done ? 'checked' : ''} onchange="toggleTask(\${t.id})">
      <span>\${t.text}</span>
      <button class="delete-btn" onclick="deleteTask(\${t.id})">Delete</button>
    </li>
  \`).join('');

  const active = tasks.filter(t => !t.done).length;
  document.getElementById('counter').textContent = \`\${active} task\${active !== 1 ? 's' : ''} remaining\`;
}

// Enter key support
document.getElementById('taskInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') addTask();
});

renderTasks();
`));
  return zip.toBuffer();
}

/** Lab 4 – Node.js Basics (nodejs) */
function lab4Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({
    name: "lab-4-node-basics",
    version: "1.0.0",
    scripts: { start: "node server.js" },
    dependencies: {}
  }, null, 2)));
  zip.addFile("server.js", Buffer.from(`const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
};

const students = [
  { id: 1, name: 'Hassan Alkuheli', major: 'Computer Science', gpa: 3.8 },
  { id: 2, name: 'Ahmed Ali', major: 'Information Systems', gpa: 3.5 },
  { id: 3, name: 'Sara Mohammed', major: 'Software Engineering', gpa: 3.9 },
  { id: 4, name: 'Fatima Nasser', major: 'Cyber Security', gpa: 3.7 },
];

const server = http.createServer((req, res) => {
  // API endpoint
  if (req.url === '/api/students') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, data: students }));
  }

  if (req.url === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      app: 'Lab 4 – Node.js Basics',
      author: 'Hassan Alkuheli',
      nodeVersion: process.version,
      uptime: process.uptime(),
    }));
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 – Page Not Found</h1>');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`));
  zip.addFile("public/index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Directory – Lab 4</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
    h1 { color: #e94560; margin-bottom: 10px; }
    .subtitle { color: #888; margin-bottom: 30px; }
    .info-bar { background: #16213e; padding: 15px 25px; border-radius: 10px; margin-bottom: 30px; display: flex; gap: 20px; flex-wrap: wrap; }
    .info-bar span { color: #0f3460; background: #e94560; padding: 4px 12px; border-radius: 15px; color: white; font-size: 0.85rem; }
    table { border-collapse: collapse; width: 100%; max-width: 700px; }
    th, td { padding: 12px 20px; text-align: left; }
    th { background: #e94560; color: white; }
    tr:nth-child(even) { background: #16213e; }
    tr:nth-child(odd) { background: #1a1a2e; }
    tr:hover { background: #0f3460; }
    #loading { color: #e94560; font-size: 1.2rem; }
  </style>
</head>
<body>
  <h1>Student Directory</h1>
  <p class="subtitle">Built with pure Node.js HTTP server</p>
  <div class="info-bar" id="info"></div>
  <p id="loading">Loading students...</p>
  <table id="table" style="display:none">
    <thead><tr><th>ID</th><th>Name</th><th>Major</th><th>GPA</th></tr></thead>
    <tbody id="tbody"></tbody>
  </table>
  <script>
    fetch('/api/info').then(r=>r.json()).then(d=>{
      document.getElementById('info').innerHTML =
        '<span>App: '+d.app+'</span><span>Node: '+d.nodeVersion+'</span><span>Uptime: '+Math.round(d.uptime)+'s</span>';
    });
    fetch('/api/students').then(r=>r.json()).then(d=>{
      document.getElementById('loading').style.display='none';
      document.getElementById('table').style.display='table';
      document.getElementById('tbody').innerHTML = d.data.map(s=>
        '<tr><td>'+s.id+'</td><td>'+s.name+'</td><td>'+s.major+'</td><td>'+s.gpa+'</td></tr>'
      ).join('');
    });
  </script>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 5 – Express.js Framework (nodejs) */
function lab5Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({
    name: "lab-5-express-api",
    version: "1.0.0",
    scripts: { start: "node app.js" },
    dependencies: { express: "^4.18.2", cors: "^2.8.5" }
  }, null, 2)));
  zip.addFile("app.js", Buffer.from(`const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store
let books = [
  { id: 1, title: 'Clean Code', author: 'Robert C. Martin', year: 2008, rating: 4.5 },
  { id: 2, title: 'The Pragmatic Programmer', author: 'David Thomas', year: 1999, rating: 4.7 },
  { id: 3, title: 'Design Patterns', author: 'Gang of Four', year: 1994, rating: 4.3 },
  { id: 4, title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', year: 2008, rating: 4.2 },
];
let nextId = 5;

// Middleware – request logger
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
});

// GET all books
app.get('/api/books', (req, res) => {
  const { author, sort } = req.query;
  let result = [...books];
  if (author) result = result.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
  if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
  if (sort === 'year') result.sort((a, b) => b.year - a.year);
  res.json({ success: true, count: result.length, data: result });
});

// GET single book
app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === +req.params.id);
  if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
  res.json({ success: true, data: book });
});

// POST new book
app.post('/api/books', (req, res) => {
  const { title, author, year, rating } = req.body;
  if (!title || !author) return res.status(400).json({ success: false, message: 'Title and author required' });
  const book = { id: nextId++, title, author, year: year || 2024, rating: rating || 0 };
  books.push(book);
  res.status(201).json({ success: true, data: book });
});

// PUT update book
app.put('/api/books/:id', (req, res) => {
  const idx = books.findIndex(b => b.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Book not found' });
  books[idx] = { ...books[idx], ...req.body, id: books[idx].id };
  res.json({ success: true, data: books[idx] });
});

// DELETE book
app.delete('/api/books/:id', (req, res) => {
  const idx = books.findIndex(b => b.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Book not found' });
  const deleted = books.splice(idx, 1)[0];
  res.json({ success: true, data: deleted });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => console.log(\`Express API running on port \${PORT}\`));
`));
  zip.addFile("public/index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book API – Lab 5</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #fafafa; padding: 30px; max-width: 900px; margin: 0 auto; }
    h1 { color: #2c3e50; margin-bottom: 5px; }
    .subtitle { color: #7f8c8d; margin-bottom: 25px; }
    .form-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .form-row input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .form-row input:first-child { flex: 2; }
    .form-row input:nth-child(2) { flex: 2; }
    .form-row input:nth-child(3) { flex: 1; }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; color: white; }
    .btn-add { background: #27ae60; }
    .btn-add:hover { background: #219a52; }
    .btn-del { background: #e74c3c; font-size: 12px; padding: 6px 12px; }
    .btn-del:hover { background: #c0392b; }
    .book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
    .book-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 8px; }
    .book-card h3 { color: #2c3e50; }
    .book-card .meta { color: #7f8c8d; font-size: 0.9rem; }
    .stars { color: #f39c12; }
    .book-actions { display: flex; justify-content: flex-end; margin-top: auto; }
  </style>
</head>
<body>
  <h1>Book Library API</h1>
  <p class="subtitle">Express.js REST API with CRUD operations – Lab 5</p>

  <div class="form-row">
    <input type="text" id="title" placeholder="Book title">
    <input type="text" id="author" placeholder="Author">
    <input type="number" id="year" placeholder="Year">
    <button class="btn btn-add" onclick="addBook()">Add Book</button>
  </div>

  <div class="book-grid" id="books"></div>

  <script>
    async function loadBooks() {
      const res = await fetch('/api/books');
      const { data } = await res.json();
      document.getElementById('books').innerHTML = data.map(b => \`
        <div class="book-card">
          <h3>\${b.title}</h3>
          <p class="meta">\${b.author} · \${b.year}</p>
          <p class="stars">\${'★'.repeat(Math.round(b.rating))}\${'☆'.repeat(5 - Math.round(b.rating))} \${b.rating}</p>
          <div class="book-actions">
            <button class="btn btn-del" onclick="deleteBook(\${b.id})">Remove</button>
          </div>
        </div>
      \`).join('');
    }

    async function addBook() {
      const title = document.getElementById('title').value;
      const author = document.getElementById('author').value;
      const year = +document.getElementById('year').value || 2024;
      if (!title || !author) return alert('Title and author are required');
      await fetch('/api/books', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, year, rating: Math.round(Math.random()*20+30)/10 })
      });
      document.getElementById('title').value = '';
      document.getElementById('author').value = '';
      document.getElementById('year').value = '';
      loadBooks();
    }

    async function deleteBook(id) {
      await fetch('/api/books/' + id, { method: 'DELETE' });
      loadBooks();
    }

    loadBooks();
  </script>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 6 – MySQL Database (nodejs + db.sql) */
function lab6Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({
    name: "lab-6-mysql-database",
    version: "1.0.0",
    scripts: { start: "node app.js" },
    dependencies: { express: "^4.18.2", mysql2: "^3.6.5", cors: "^2.8.5" }
  }, null, 2)));
  zip.addFile("db.sql", Buffer.from(`CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50) NOT NULL,
  position VARCHAR(100) NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  hire_date DATE NOT NULL,
  email VARCHAR(100) UNIQUE
);

INSERT INTO employees (name, department, position, salary, hire_date, email) VALUES
('Hassan Alkuheli', 'Engineering', 'Full Stack Developer', 8500.00, '2023-01-15', 'hassan@company.com'),
('Ahmed Ali', 'Engineering', 'Backend Developer', 7800.00, '2023-03-20', 'ahmed@company.com'),
('Sara Mohammed', 'Design', 'UI/UX Designer', 7200.00, '2022-11-01', 'sara@company.com'),
('Fatima Nasser', 'Engineering', 'Frontend Developer', 7500.00, '2023-06-10', 'fatima@company.com'),
('Omar Khalid', 'Marketing', 'Marketing Manager', 8000.00, '2022-08-15', 'omar@company.com'),
('Nora Saleh', 'HR', 'HR Specialist', 6800.00, '2023-09-01', 'nora@company.com');
`));
  zip.addFile("app.js", Buffer.from(`const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
let pool;

async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASSWORD || 'studentpass',
    database: process.env.DB_NAME || 'studentdb',
    waitForConnections: true,
    connectionLimit: 5,
  });
  console.log('MySQL pool created');
}

app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, department, position, salary, hire_date, email } = req.body;
    const [result] = await pool.query(
      'INSERT INTO employees (name, department, position, salary, hire_date, email) VALUES (?, ?, ?, ?, ?, ?)',
      [name, department, position, salary, hire_date, email]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) as count FROM employees');
    const [avgSalary] = await pool.query('SELECT AVG(salary) as avg_salary FROM employees');
    const [depts] = await pool.query('SELECT department, COUNT(*) as count FROM employees GROUP BY department');
    res.json({ success: true, data: { total: total[0].count, avgSalary: avgSalary[0].avg_salary, departments: depts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => console.log(\`Employee API on port \${PORT}\`));
});
`));
  zip.addFile("public/index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Employee DB – Lab 6</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',sans-serif; background:#f0f2f5; padding:30px; }
    .container { max-width:900px; margin:0 auto; }
    h1 { color:#1a73e8; margin-bottom:5px; }
    .sub { color:#5f6368; margin-bottom:20px; }
    .stats { display:flex; gap:15px; margin-bottom:25px; flex-wrap:wrap; }
    .stat-card { background:white; padding:20px; border-radius:10px; flex:1; min-width:150px; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
    .stat-card h3 { font-size:2rem; color:#1a73e8; }
    .stat-card p { color:#5f6368; }
    table { width:100%; border-collapse:collapse; background:white; border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
    th { background:#1a73e8; color:white; padding:12px 15px; text-align:left; }
    td { padding:12px 15px; border-bottom:1px solid #eee; }
    tr:hover { background:#f8f9fa; }
    .salary { font-weight:600; color:#188038; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Employee Database</h1>
    <p class="sub">MySQL CRUD Operations – Lab 6</p>
    <div class="stats" id="stats"></div>
    <table><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Position</th><th>Salary</th><th>Hired</th></tr></thead><tbody id="tbody"></tbody></table>
  </div>
  <script>
    fetch('/api/stats').then(r=>r.json()).then(d=>{
      const s=d.data;
      document.getElementById('stats').innerHTML=
        '<div class="stat-card"><h3>'+s.total+'</h3><p>Employees</p></div>'+
        '<div class="stat-card"><h3>$'+Math.round(s.avgSalary).toLocaleString()+'</h3><p>Avg Salary</p></div>'+
        s.departments.map(dep=>'<div class="stat-card"><h3>'+dep.count+'</h3><p>'+dep.department+'</p></div>').join('');
    }).catch(()=>{document.getElementById('stats').innerHTML='<p>Loading stats...</p>'});
    fetch('/api/employees').then(r=>r.json()).then(d=>{
      document.getElementById('tbody').innerHTML=d.data.map(e=>
        '<tr><td>'+e.id+'</td><td>'+e.name+'</td><td>'+e.department+'</td><td>'+e.position+'</td><td class="salary">$'+Number(e.salary).toLocaleString()+'</td><td>'+e.hire_date+'</td></tr>'
      ).join('');
    });
  </script>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 7 – RESTful APIs (nodejs + db.sql) */
function lab7Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({
    name: "lab-7-restful-apis",
    version: "1.0.0",
    scripts: { start: "node app.js" },
    dependencies: { express: "^4.18.2", mysql2: "^3.6.5", cors: "^2.8.5" }
  }, null, 2)));
  zip.addFile("db.sql", Buffer.from(`CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, category, price, stock, description) VALUES
('MacBook Pro 14"', 'Laptops', 2499.99, 15, 'Apple M3 Pro chip, 18GB RAM, 512GB SSD'),
('Dell XPS 15', 'Laptops', 1899.99, 22, 'Intel i7-13700H, 16GB RAM, 512GB SSD'),
('Sony WH-1000XM5', 'Audio', 349.99, 50, 'Wireless noise-cancelling headphones'),
('Samsung Galaxy S24', 'Phones', 799.99, 35, '6.2" AMOLED, Snapdragon 8 Gen 3'),
('iPad Air M2', 'Tablets', 599.99, 28, '11" Liquid Retina, M2 chip, 128GB'),
('LG UltraWide 34"', 'Monitors', 449.99, 12, '34" WQHD IPS, USB-C, HDR10'),
('Logitech MX Master 3S', 'Accessories', 99.99, 80, 'Wireless ergonomic mouse'),
('Keychron K8 Pro', 'Accessories', 109.99, 45, 'Wireless mechanical keyboard, hot-swappable');
`));
  zip.addFile("app.js", Buffer.from(`const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
let pool;

async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASSWORD || 'studentpass',
    database: process.env.DB_NAME || 'studentdb',
    waitForConnections: true, connectionLimit: 5,
  });
}

// GET /api/products — list all (with optional ?category= filter)
app.get('/api/products', async (req, res) => {
  try {
    let sql = 'SELECT * FROM products';
    const params = [];
    if (req.query.category) { sql += ' WHERE category = ?'; params.push(req.query.category); }
    sql += ' ORDER BY name';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/products
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, price, stock, description } = req.body;
    if (!name || !category || price == null) return res.status(400).json({ success: false, message: 'name, category and price required' });
    const [result] = await pool.query(
      'INSERT INTO products (name, category, price, stock, description) VALUES (?,?,?,?,?)',
      [name, category, price, stock || 0, description || '']
    );
    res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, category, price, stock, description } = req.body;
    const [result] = await pool.query(
      'UPDATE products SET name=?, category=?, price=?, stock=?, description=? WHERE id=?',
      [name, category, price, stock, description, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: { id: +req.params.id, ...req.body } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/categories — distinct category list
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

initDB().then(() => app.listen(PORT, () => console.log(\`Product API on port \${PORT}\`)));
`));
  zip.addFile("public/index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Product Store – Lab 7</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:#111;color:#eee;padding:30px}
    .container{max-width:1000px;margin:0 auto}
    h1{color:#00d4ff;margin-bottom:5px}
    .sub{color:#888;margin-bottom:20px}
    .toolbar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
    .toolbar select,.toolbar input{padding:10px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#eee;font-size:14px}
    .toolbar select{min-width:150px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .product{background:#1a1a1a;border-radius:12px;padding:20px;border:1px solid #222;transition:border-color .3s}
    .product:hover{border-color:#00d4ff}
    .product h3{color:#fff;margin-bottom:8px}
    .product .cat{display:inline-block;background:#00d4ff22;color:#00d4ff;padding:3px 10px;border-radius:12px;font-size:.8rem;margin-bottom:8px}
    .product .price{font-size:1.5rem;font-weight:700;color:#00d4ff;margin:10px 0}
    .product .desc{color:#888;font-size:.9rem;margin-bottom:10px}
    .product .stock{color:#888;font-size:.85rem}
    .in-stock{color:#4caf50}
    .low-stock{color:#ff9800}
  </style>
</head>
<body>
  <div class="container">
    <h1>Tech Store</h1>
    <p class="sub">RESTful API Product Catalog – Lab 7</p>
    <div class="toolbar">
      <select id="catFilter" onchange="loadProducts()"><option value="">All Categories</option></select>
    </div>
    <div class="grid" id="products"></div>
  </div>
  <script>
    fetch('/api/categories').then(r=>r.json()).then(d=>{
      const sel=document.getElementById('catFilter');
      d.data.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});
    });
    function loadProducts(){
      const cat=document.getElementById('catFilter').value;
      fetch('/api/products'+(cat?'?category='+cat:'')).then(r=>r.json()).then(d=>{
        document.getElementById('products').innerHTML=d.data.map(p=>\`
          <div class="product">
            <span class="cat">\${p.category}</span>
            <h3>\${p.name}</h3>
            <div class="price">$\${Number(p.price).toLocaleString()}</div>
            <p class="desc">\${p.description||''}</p>
            <p class="stock \${p.stock>20?'in-stock':'low-stock'}">\${p.stock} in stock</p>
          </div>\`).join('');
      });
    }
    loadProducts();
  </script>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 8 – Vue.js Frontend (static — uses CDN) */
function lab8Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Weather App – Lab 8</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
    #app{background:rgba(255,255,255,.15);backdrop-filter:blur(15px);border-radius:20px;padding:40px;width:100%;max-width:500px;color:white;text-align:center}
    h1{font-size:1.8rem;margin-bottom:5px}
    .subtitle{opacity:.7;margin-bottom:25px;font-size:.9rem}
    .search{display:flex;gap:8px;margin-bottom:25px}
    .search input{flex:1;padding:12px;border-radius:10px;border:none;font-size:16px;background:rgba(255,255,255,.2);color:white;outline:none}
    .search input::placeholder{color:rgba(255,255,255,.6)}
    .search button{padding:12px 20px;border-radius:10px;border:none;background:rgba(255,255,255,.3);color:white;cursor:pointer;font-size:14px;font-weight:600}
    .search button:hover{background:rgba(255,255,255,.4)}
    .weather-display{margin:20px 0}
    .temp{font-size:4rem;font-weight:700;line-height:1}
    .condition{font-size:1.3rem;margin:10px 0;text-transform:capitalize}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:25px}
    .detail-card{background:rgba(255,255,255,.1);border-radius:12px;padding:15px}
    .detail-card .label{font-size:.8rem;opacity:.7}
    .detail-card .value{font-size:1.3rem;font-weight:600;margin-top:4px}
    .cities{display:flex;gap:8px;justify-content:center;margin-bottom:20px;flex-wrap:wrap}
    .cities button{padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.3);background:transparent;color:white;cursor:pointer;font-size:.85rem}
    .cities button:hover,.cities button.active{background:rgba(255,255,255,.2)}
  </style>
</head>
<body>
  <div id="app">
    <h1>Weather Dashboard</h1>
    <p class="subtitle">Vue.js Reactive Components – Lab 8</p>
    <div class="search">
      <input v-model="query" @keyup.enter="search" placeholder="Search city...">
      <button @click="search">Search</button>
    </div>
    <div class="cities">
      <button v-for="c in presets" :key="c" :class="{active:current.city===c}" @click="selectCity(c)">{{c}}</button>
    </div>
    <div class="weather-display" v-if="current.city">
      <div class="temp">{{current.temp}}°C</div>
      <div class="condition">{{current.condition}}</div>
      <p>{{current.city}}</p>
      <div class="details">
        <div class="detail-card"><div class="label">Humidity</div><div class="value">{{current.humidity}}%</div></div>
        <div class="detail-card"><div class="label">Wind</div><div class="value">{{current.wind}} km/h</div></div>
        <div class="detail-card"><div class="label">Feels Like</div><div class="value">{{current.feelsLike}}°C</div></div>
        <div class="detail-card"><div class="label">UV Index</div><div class="value">{{current.uv}}</div></div>
      </div>
    </div>
  </div>
  <script>
    const {createApp,ref,reactive} = Vue;
    createApp({
      setup(){
        const query = ref('');
        const presets = ['Riyadh','Jeddah','Hail','Dubai','London','Tokyo'];
        const weatherDB = {
          riyadh:{temp:42,condition:'Sunny & Hot',humidity:12,wind:15,feelsLike:45,uv:11},
          jeddah:{temp:38,condition:'Humid & Warm',humidity:65,wind:20,feelsLike:42,uv:9},
          hail:{temp:35,condition:'Clear Sky',humidity:18,wind:12,feelsLike:37,uv:10},
          dubai:{temp:40,condition:'Partly Cloudy',humidity:55,wind:18,feelsLike:44,uv:8},
          london:{temp:16,condition:'Overcast',humidity:78,wind:22,feelsLike:14,uv:3},
          tokyo:{temp:28,condition:'Light Rain',humidity:72,wind:10,feelsLike:31,uv:5},
        };
        const current = reactive({city:'',temp:0,condition:'',humidity:0,wind:0,feelsLike:0,uv:0});

        function selectCity(city){
          const data = weatherDB[city.toLowerCase()];
          if(data){Object.assign(current,{city,...data});}
          else{Object.assign(current,{city,temp:Math.round(Math.random()*30+10),condition:'Unknown',humidity:Math.round(Math.random()*60+20),wind:Math.round(Math.random()*30),feelsLike:Math.round(Math.random()*30+10),uv:Math.round(Math.random()*10)});}
        }
        function search(){if(query.value.trim()){selectCity(query.value.trim());query.value='';}}

        selectCity('Hail');
        return {query,presets,current,selectCity,search};
      }
    }).mount('#app');
  <\/script>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 9+10 – Full Stack Project (nodejs + db.sql) */
function lab9_10Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({
    name: "lab-9-10-full-stack-project",
    version: "1.0.0",
    scripts: { start: "node server.js" },
    dependencies: { express: "^4.18.2", mysql2: "^3.6.5", cors: "^2.8.5", "jsonwebtoken": "^9.0.2", "bcryptjs": "^2.4.3" }
  }, null, 2)));
  zip.addFile("db.sql", Buffer.from(`CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@blog.com', '$2a$10$dummyhash', 'admin'),
('hassan', 'hassan@blog.com', '$2a$10$dummyhash', 'user');

INSERT INTO posts (user_id, title, content, category) VALUES
(1, 'Welcome to the Blog', 'This is a full-stack blog application built with Express.js, MySQL, and vanilla JavaScript. It supports user authentication, CRUD blog posts, and category filtering.', 'Announcements'),
(2, 'Learning Web Development', 'My journey through CS371 has been incredible. We started with basic HTML and worked up to building full-stack applications with authentication and databases.', 'Technology'),
(2, 'Tips for Node.js Beginners', 'Here are my top 5 tips: 1) Understand async/await, 2) Use environment variables, 3) Learn Express middleware, 4) Practice error handling, 5) Write modular code.', 'Technology'),
(1, 'Database Design Best Practices', 'When designing your MySQL schema, always think about normalization, proper indexing, foreign keys, and data integrity constraints.', 'Education');
`));
  zip.addFile("server.js", Buffer.from(`const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
let pool;

async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASSWORD || 'studentpass',
    database: process.env.DB_NAME || 'studentdb',
    waitForConnections: true, connectionLimit: 5,
  });
}

// GET all posts
app.get('/api/posts', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id';
    const params = [];
    if (category) { sql += ' WHERE p.category = ?'; params.push(category); }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST new post
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, category, user_id } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content required' });
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content, category) VALUES (?, ?, ?, ?)',
      [user_id || 2, title, content, category || 'General']
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category FROM posts ORDER BY category');
    res.json({ success: true, data: rows.map(r => r.category) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

initDB().then(() => app.listen(PORT, () => console.log(\`Blog API on port \${PORT}\`)));
`));
  zip.addFile("public/index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Blog Platform – Lab 9+10</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Georgia,'Times New Roman',serif;background:#fefefe;color:#333}
    header{background:#1a1a2e;color:white;padding:40px 20px;text-align:center}
    header h1{font-size:2.2rem;margin-bottom:5px;letter-spacing:1px}
    header p{opacity:.7}
    .container{max-width:800px;margin:0 auto;padding:30px 20px}
    .filters{display:flex;gap:8px;margin-bottom:30px;flex-wrap:wrap}
    .filters button{padding:8px 16px;border:1px solid #ddd;background:white;border-radius:20px;cursor:pointer;font-family:inherit}
    .filters button.active{background:#1a1a2e;color:white;border-color:#1a1a2e}
    .post{border-bottom:1px solid #eee;padding:25px 0}
    .post:last-child{border:none}
    .post .meta{color:#888;font-size:.85rem;margin-bottom:8px}
    .post h2{font-size:1.4rem;margin-bottom:10px;color:#1a1a2e}
    .post p{line-height:1.8;color:#555}
    .post .tag{display:inline-block;background:#e8eaf6;color:#3f51b5;padding:3px 10px;border-radius:10px;font-size:.75rem;margin-top:10px}
    .new-post{background:#f8f9fa;border-radius:12px;padding:25px;margin-bottom:30px}
    .new-post h3{margin-bottom:15px}
    .new-post input,.new-post textarea,.new-post select{width:100%;padding:10px;margin-bottom:10px;border:1px solid #ddd;border-radius:8px;font-family:inherit;font-size:14px}
    .new-post textarea{height:100px;resize:vertical}
    .new-post button{padding:10px 24px;background:#1a1a2e;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px}
    footer{text-align:center;padding:30px;background:#f8f9fa;color:#888;font-size:.9rem;margin-top:40px}
  </style>
</head>
<body>
  <header>
    <h1>Dev Blog</h1>
    <p>Full-Stack Blog Platform – Lab 9+10</p>
  </header>
  <div class="container">
    <div class="new-post">
      <h3>Write a Post</h3>
      <input type="text" id="postTitle" placeholder="Post title">
      <select id="postCat"><option>General</option><option>Technology</option><option>Education</option><option>Announcements</option></select>
      <textarea id="postContent" placeholder="Write your post..."></textarea>
      <button onclick="createPost()">Publish</button>
    </div>
    <div class="filters" id="filters"><button class="active" onclick="filterPosts('',this)">All</button></div>
    <div id="posts"></div>
  </div>
  <footer>Built by Hassan Alkuheli – CS371 Web Development</footer>
  <script>
    function loadCategories(){
      fetch('/api/categories').then(r=>r.json()).then(d=>{
        const f=document.getElementById('filters');
        d.data.forEach(c=>{const b=document.createElement('button');b.textContent=c;b.onclick=function(){filterPosts(c,this)};f.appendChild(b);});
      });
    }
    function filterPosts(cat,btn){
      document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      loadPosts(cat);
    }
    function loadPosts(cat){
      fetch('/api/posts'+(cat?'?category='+cat:'')).then(r=>r.json()).then(d=>{
        document.getElementById('posts').innerHTML=d.data.map(p=>\`
          <div class="post">
            <div class="meta">By \${p.username} · \${new Date(p.created_at).toLocaleDateString()}</div>
            <h2>\${p.title}</h2>
            <p>\${p.content}</p>
            <span class="tag">\${p.category}</span>
          </div>\`).join('');
      });
    }
    async function createPost(){
      const title=document.getElementById('postTitle').value;
      const content=document.getElementById('postContent').value;
      const category=document.getElementById('postCat').value;
      if(!title||!content)return alert('Title and content required');
      await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,content,category})});
      document.getElementById('postTitle').value='';
      document.getElementById('postContent').value='';
      loadPosts();
    }
    loadCategories();
    loadPosts();
  </script>
</body>
</html>`));
  return zip.toBuffer();
}

/** Lab 11 – Final Project / Capstone (nodejs + db.sql) */
function lab11Zip(): Buffer {
  const zip = new AdmZip();
  zip.addFile("package.json", Buffer.from(JSON.stringify({
    name: "lab-11-final-project",
    version: "1.0.0",
    scripts: { start: "node server.js" },
    dependencies: { express: "^4.18.2", mysql2: "^3.6.5", cors: "^2.8.5" }
  }, null, 2)));
  zip.addFile("db.sql", Buffer.from(`CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(150) NOT NULL,
  instructor VARCHAR(100) NOT NULL,
  credits INT NOT NULL,
  semester VARCHAR(20) NOT NULL,
  capacity INT DEFAULT 30,
  enrolled INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL,
  student_id VARCHAR(20) NOT NULL,
  course_id INT NOT NULL,
  grade VARCHAR(5) DEFAULT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

INSERT INTO courses (code, name, instructor, credits, semester, capacity, enrolled) VALUES
('CS371', 'Web Development', 'Dr. Abdulrahman Al-Qarafi', 3, 'Fall 2025', 30, 18),
('CS201', 'Data Structures', 'Dr. Mohammed Saleh', 3, 'Fall 2025', 35, 32),
('CS311', 'Database Systems', 'Dr. Fatima Hassan', 3, 'Fall 2025', 30, 25),
('CS401', 'Software Engineering', 'Dr. Ahmed Nasser', 3, 'Fall 2025', 25, 20),
('CS451', 'Machine Learning', 'Dr. Sara Ali', 3, 'Fall 2025', 20, 19),
('CS321', 'Computer Networks', 'Dr. Omar Khalid', 3, 'Fall 2025', 30, 15);

INSERT INTO enrollments (student_name, student_id, course_id, grade) VALUES
('Hassan Alkuheli', 'STU001', 1, 'A'),
('Hassan Alkuheli', 'STU001', 2, 'A-'),
('Hassan Alkuheli', 'STU001', 3, 'B+'),
('Ahmed Ali', 'STU002', 1, 'B'),
('Ahmed Ali', 'STU002', 4, 'A'),
('Sara Mohammed', 'STU003', 2, 'A'),
('Sara Mohammed', 'STU003', 5, 'A-');
`));
  zip.addFile("server.js", Buffer.from(`const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
let pool;

async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'student',
    password: process.env.DB_PASSWORD || 'studentpass',
    database: process.env.DB_NAME || 'studentdb',
    waitForConnections: true, connectionLimit: 5,
  });
}

// Courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses ORDER BY code');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Course not found' });
    const [enrollments] = await pool.query(
      'SELECT * FROM enrollments WHERE course_id = ? ORDER BY student_name', [req.params.id]
    );
    res.json({ success: true, data: { ...rows[0], enrollments } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Dashboard stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const [courses] = await pool.query('SELECT COUNT(*) as total FROM courses');
    const [students] = await pool.query('SELECT COUNT(DISTINCT student_id) as total FROM enrollments');
    const [enrollments] = await pool.query('SELECT COUNT(*) as total FROM enrollments');
    const [byGrade] = await pool.query(
      "SELECT grade, COUNT(*) as count FROM enrollments WHERE grade IS NOT NULL GROUP BY grade ORDER BY grade"
    );
    res.json({ success: true, data: {
      totalCourses: courses[0].total,
      totalStudents: students[0].total,
      totalEnrollments: enrollments[0].total,
      gradeDistribution: byGrade
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Enrollments
app.post('/api/enrollments', async (req, res) => {
  try {
    const { student_name, student_id, course_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO enrollments (student_name, student_id, course_id) VALUES (?, ?, ?)',
      [student_name, student_id, course_id]
    );
    await pool.query('UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?', [course_id]);
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

initDB().then(() => app.listen(PORT, () => console.log(\`Course Portal on port \${PORT}\`)));
`));
  zip.addFile("public/index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Course Portal – Lab 11</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:#f5f5f5;color:#333}
    .top-bar{background:linear-gradient(135deg,#0f3460,#16213e);color:white;padding:30px;text-align:center}
    .top-bar h1{font-size:2rem;margin-bottom:5px}
    .top-bar p{opacity:.8}
    .container{max-width:1100px;margin:0 auto;padding:30px 20px}
    .dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:30px}
    .dash-card{background:white;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .dash-card .num{font-size:2.5rem;font-weight:700;color:#0f3460}
    .dash-card .label{color:#888;margin-top:4px}
    h2{margin-bottom:15px;color:#0f3460}
    .course-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
    .course{background:white;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.06);border-left:4px solid #0f3460}
    .course h3{color:#0f3460;margin-bottom:4px}
    .course .instructor{color:#888;font-size:.9rem;margin-bottom:12px}
    .course .meta{display:flex;gap:15px;flex-wrap:wrap}
    .course .meta span{font-size:.85rem;color:#555}
    .course .bar{height:6px;background:#e0e0e0;border-radius:3px;margin-top:12px;overflow:hidden}
    .course .bar-fill{height:100%;background:linear-gradient(90deg,#0f3460,#e94560);border-radius:3px;transition:width .5s}
    .grade-chart{display:flex;gap:8px;align-items:flex-end;justify-content:center;margin-top:15px;height:100px}
    .grade-bar{width:40px;background:#0f3460;border-radius:4px 4px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;color:white;font-size:.7rem;padding:4px}
    footer{text-align:center;padding:30px;color:#888;font-size:.85rem}
  </style>
</head>
<body>
  <div class="top-bar">
    <h1>University Course Portal</h1>
    <p>Final Capstone Project – Hassan Alkuheli</p>
  </div>
  <div class="container">
    <div class="dashboard" id="dashboard"></div>
    <h2>Available Courses</h2>
    <div class="course-grid" id="courses"></div>
  </div>
  <footer>Lab 11 – CS371 Web Development &copy; 2025</footer>
  <script>
    fetch('/api/dashboard').then(r=>r.json()).then(d=>{
      const s=d.data;
      let html='<div class="dash-card"><div class="num">'+s.totalCourses+'</div><div class="label">Courses</div></div>';
      html+='<div class="dash-card"><div class="num">'+s.totalStudents+'</div><div class="label">Students</div></div>';
      html+='<div class="dash-card"><div class="num">'+s.totalEnrollments+'</div><div class="label">Enrollments</div></div>';
      if(s.gradeDistribution.length){
        const max=Math.max(...s.gradeDistribution.map(g=>g.count));
        html+='<div class="dash-card"><div class="label" style="margin-bottom:8px">Grades</div><div class="grade-chart">'+
          s.gradeDistribution.map(g=>'<div class="grade-bar" style="height:'+Math.max(20,g.count/max*80)+'px">'+g.count+'<br>'+g.grade+'</div>').join('')+'</div></div>';
      }
      document.getElementById('dashboard').innerHTML=html;
    }).catch(()=>{});
    fetch('/api/courses').then(r=>r.json()).then(d=>{
      document.getElementById('courses').innerHTML=d.data.map(c=>{
        const pct=Math.round(c.enrolled/c.capacity*100);
        return '<div class="course"><h3>'+c.code+' – '+c.name+'</h3><p class="instructor">'+c.instructor+'</p>'+
          '<div class="meta"><span>'+c.credits+' Credits</span><span>'+c.semester+'</span><span>'+c.enrolled+'/'+c.capacity+' enrolled</span></div>'+
          '<div class="bar"><div class="bar-fill" style="width:'+pct+'%"></div></div></div>';
      }).join('');
    });
  </script>
</body>
</html>`));
  return zip.toBuffer();
}

// ── Lab → ZIP mapping ───────────────────────
const LAB_ZIPS: Record<number, () => Buffer> = {
  1: lab1Zip,
  2: lab2Zip,
  3: lab3Zip,
  4: lab4Zip,
  5: lab5Zip,
  6: lab6Zip,
  7: lab7Zip,
  8: lab8Zip,
  9: lab9_10Zip,
  10: lab11Zip,
};

function createProjectZip(labIndex: number, name: string, labName: string): Buffer {
  const fn = LAB_ZIPS[labIndex];
  if (fn) return fn();
  // Fallback for any unmapped lab
  const zip = new AdmZip();
  zip.addFile("index.html", Buffer.from(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${name}</title></head>
<body><h1>${name}</h1><p>${labName}</p></body></html>`));
  return zip.toBuffer();
}

// ── Data ────────────────────────────────────
const PROFESSOR = {
  name: "Abdulrahman Al-Qarafi",
  email: "AAl-Q@university.edu",
  sections: ["M4"],
};

const STUDENT = {
  name: "Hassan Alkuheli",
  email: "hask@gmail.com",
  section: "M4",
};

const LABS = [
  { name: "Lab 1 – Introduction to HTML", description: "Learn the basics of HTML structure, tags, and semantic elements. Create a simple web page.", maxGrade: 10 },
  { name: "Lab 2 – CSS Fundamentals", description: "Style your HTML pages using CSS selectors, properties, box model, and layout techniques.", maxGrade: 10 },
  { name: "Lab 3 – JavaScript Basics", description: "Introduction to JavaScript: variables, functions, DOM manipulation, and event handling.", maxGrade: 15 },
  { name: "Lab 4 – Node.js Basics", description: "Set up a Node.js project, use NPM, and create a simple HTTP server.", maxGrade: 15 },
  { name: "Lab 5 – Express.js Framework", description: "Build REST APIs using Express.js with routing, middleware, and error handling.", maxGrade: 15 },
  { name: "Lab 6 – MySQL Database", description: "Design and implement a relational database with MySQL. Write CRUD queries.", maxGrade: 15 },
  { name: "Lab 7 – RESTful APIs", description: "Connect Express.js to MySQL. Implement a full CRUD REST API with proper status codes.", maxGrade: 20 },
  { name: "Lab 8 – Frontend Frameworks (Vue.js)", description: "Build a reactive frontend using Vue.js components, directives, and state management.", maxGrade: 20 },
  { name: "Lab 9+10 – Full Stack Project", description: "Combine frontend and backend into a complete full-stack application with authentication.", maxGrade: 30 },
  { name: "Lab 11 – Final Project", description: "Capstone project demonstrating mastery of all course topics. Deployment-ready.", maxGrade: 50 },
];

// ── Seed ────────────────────────────────────
async function seed() {
  console.log("🌱 Starting production seed...\n");

  const hashedPw = await hash(SEED_PASSWORD!);

  // ── Professor ──
  let professor = await db.query.users.findFirst({
    where: eq(users.email, PROFESSOR.email),
  });
  if (!professor) {
    const [row] = await db
      .insert(users)
      .values({
        name: PROFESSOR.name,
        email: PROFESSOR.email,
        password: hashedPw,
        role: "PROFESSOR",
        status: "ACTIVE",
        sections: JSON.stringify(PROFESSOR.sections),
      })
      .returning();
    professor = row!;
    console.log("  ✅ Professor created: " + PROFESSOR.email);
  } else {
    console.log("  ⏭  Professor exists:  " + PROFESSOR.email);
  }

  // ── Student ──
  let student = await db.query.users.findFirst({
    where: eq(users.email, STUDENT.email),
  });
  if (!student) {
    const [row] = await db
      .insert(users)
      .values({
        name: STUDENT.name,
        email: STUDENT.email,
        password: hashedPw,
        role: "STUDENT",
        status: "ACTIVE",
        sectionNumber: STUDENT.section,
      })
      .returning();
    student = row!;
    console.log("  ✅ Student created:   " + STUDENT.email);
  } else {
    console.log("  ⏭  Student exists:    " + STUDENT.email);
  }

  // ── Labs ──
  const labRecords: { id: string; name: string }[] = [];
  for (const labData of LABS) {
    // Check if lab already exists (by name + professor)
    const existing = await db.query.labs.findFirst({
      where: eq(labs.name, labData.name),
    });
    if (existing) {
      labRecords.push({ id: existing.id, name: existing.name });
      console.log("  ⏭  Lab exists:       " + labData.name);
      continue;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 60); // 60 days from now

    const [row] = await db
      .insert(labs)
      .values({
        professorId: professor!.id,
        name: labData.name,
        description: labData.description,
        deadline,
        maxGrade: labData.maxGrade,
        sections: JSON.stringify(PROFESSOR.sections),
      })
      .returning({ id: labs.id, name: labs.name });
    labRecords.push({ id: row!.id, name: row!.name });
    console.log("  ✅ Lab created:       " + labData.name);
  }

  // ── Project Submissions (one per lab) ──
  // Delete existing projects so we always seed fresh real content
  for (const lab of labRecords) {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.labId, lab.id),
    });
    if (existing) {
      await db.delete(projects).where(eq(projects.id, existing.id));
      console.log("  🗑  Deleted old project for: " + lab.name);
    }
  }

  let projCount = 0;
  for (let i = 0; i < labRecords.length; i++) {
    const lab = labRecords[i]!;
    const labIndex = i + 1; // 1-based

    const projName = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const timestamp = Date.now();
    const minioPath = `submissions/${student!.id}/${timestamp}/source.zip`;

    // Create realistic ZIP for this specific lab
    const zipBuffer = createProjectZip(labIndex, projName, lab.name);
    try {
      await MinioService.uploadFile(BUCKET, minioPath, zipBuffer);
    } catch (err) {
      console.warn("  ⚠️  MinIO upload failed for " + lab.name + ": " + err);
    }

    await db.insert(projects).values({
      studentId: student!.id,
      name: projName,
      labId: lab.id,
      minioSourcePath: minioPath,
      fileSize: zipBuffer.byteLength,
      status: "STOPPED",
    });
    projCount++;
    console.log("  ✅ Project submitted: " + projName + " → " + lab.name);

    // Small delay to ensure unique timestamps
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log("\n─────────────────────────────────");
  console.log("  Production Seed Summary:");
  console.log("   Professor : " + PROFESSOR.email);
  console.log("   Student   : " + STUDENT.email);
  console.log("   Labs      : " + labRecords.length);
  console.log("   Projects  : " + projCount + " new");
  console.log("─────────────────────────────────");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Production seed failed:", err);
  process.exit(1);
});
