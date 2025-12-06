import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve all static files from root and public directories
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// Debug endpoint to check if files are being served
app.get('/debug', (req, res) => {
  res.json({
    message: 'Server is running',
    __dirname: __dirname,
    wavesJsonExists: fs.existsSync(path.join(__dirname, 'waves.json')),
    towerJsonExists: fs.existsSync(path.join(__dirname, 'src/game/towers/tower.json')),
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback to index.html for any unmatched routes (for client-side routing)
app.get('*', (req, res) => {
  // Don't redirect requests with file extensions
  if (req.path.includes('.')) {
    res.status(404).send('Not Found');
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});