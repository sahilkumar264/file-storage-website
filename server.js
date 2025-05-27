const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads"),
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Load users from users.json
const usersPath = "./users.json";
function loadUsers() {
  if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, "[]");
  return JSON.parse(fs.readFileSync(usersPath));
}
function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

// Load links metadata from links.json
const linksPath = "./links.json";
function loadLinks() {
  if (!fs.existsSync(linksPath)) fs.writeFileSync(linksPath, "{}");
  return JSON.parse(fs.readFileSync(linksPath));
}
function saveLinks(links) {
  fs.writeFileSync(linksPath, JSON.stringify(links, null, 2));
}

// Auth middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/login.html");
}

// Routes

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  if (users.find((u) => u.username === username)) {
    return res.send("Username already taken.");
  }
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  saveUsers(users);
  res.redirect("/login.html");
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return res.send("Invalid username or password");
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.send("Invalid username or password");
  req.session.userId = user.username;
  res.redirect("/");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login.html"));
});

// Serve homepage only if authenticated
app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

// Upload file
app.post("/upload", isAuthenticated, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  const links = loadLinks();

  // Generate unique link ID
  const linkId = uuidv4();

  // Save link info
  links[linkId] = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploader: req.session.userId,
    uploadedAt: Date.now(),
  };

  saveLinks(links);

  const downloadUrl = `${req.protocol}://${req.get("host")}/download/${linkId}`;
  res.json({ link: downloadUrl });
});

// Download file by unique link id
app.get("/download/:linkId", (req, res) => {
  const links = loadLinks();
  const link = links[req.params.linkId];
  if (!link) return res.status(404).send("Invalid or expired link");

  const filePath = path.join(__dirname, "uploads", link.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

  res.download(filePath, link.originalName);
});

// Delete file (only by uploader)
app.post("/delete", isAuthenticated, (req, res) => {
  const { linkId } = req.body;
  const links = loadLinks();
  const link = links[linkId];
  if (!link) return res.status(404).send("Invalid link");

  if (link.uploader !== req.session.userId) {
    return res.status(403).send("You can only delete your own files");
  }

  const filePath = path.join(__dirname, "uploads", link.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  delete links[linkId];
  saveLinks(links);

  res.send("File deleted successfully");
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
