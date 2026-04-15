const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Docker = require('dockerode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const multer = require('multer');
const unzipper = require('unzipper');
const fs = require('fs');
const simpleGit = require('simple-git');
const upload = multer({ dest: 'uploads/' });
const { exec } = require('child_process');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── Utils ────────────────────────────────────────────────────────────────────

function broadcast(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...payload }));
  }
}

function formatContainer(c) {
  const labels = c.Labels || {};
  return {
    id: c.Id.slice(0, 12),
    name: c.Names[0].replace('/', ''),
    image: c.Image,
    status: c.State,
    statusText: c.Status,
    created: c.Created,
    compose: {
      project: labels['com.docker.compose.project'] || null,
      service: labels['com.docker.compose.service'] || null,
      workdir: labels['com.docker.compose.project.working_dir'] || null,
    }
  };
}

// ─── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers.map(formatContainer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/containers/:name/start', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    await container.start();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/containers/:name/stop', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    await container.stop();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/containers/:name/restart', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    await container.restart();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/containers/:name/inspect', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.name);
    const info = await container.inspect();
    res.json({
      name: info.Name.replace('/', ''),
      status: info.State.Status,
      startedAt: info.State.StartedAt,
      image: info.Config.Image,
      ports: info.HostConfig.PortBindings,
      mounts: info.Mounts.map(m => ({ src: m.Source, dst: m.Destination })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services/upload/url/', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      console.log("Received invalid URL:", req.body.url);
      return res.status(400).json({ error: "Missing GitHub URL" + req.body });
    }
    if (!url.startsWith('https://github.com/')) {
      return res.status(400).json({ error: "Invalid GitHub URL" });
    }

    const repoName = url.split('/').slice(-1)[0].replace('.git', ''); 
    const clonePath = path.join(__dirname, 'tmp', repoName);

    const git = simpleGit();
    await git.clone(url, clonePath);

    console.log("Repo cloned at:", clonePath);

    const result = await startDockerService(clonePath);

    res.json({
      message: "Repo cloned and docker service started",
      result
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/services/upload/zip/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing ZIP file" });
    }

    const zipPath = req.file.path;
    const extractPath = path.join(__dirname, 'tmp', `unzipped_${Date.now()}`);

    fs.mkdirSync(extractPath, { recursive: true });

    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    console.log("ZIP extracted to:", extractPath);

    const result = await startDockerService(extractPath);

    res.json({
      message: "ZIP extracted and docker service started",
      result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function startDockerService(folderPath) {
  console.log("Starting Docker service for:", folderPath);

  const composeFile = path.join(folderPath, "docker-compose.yml");
  const dockerfile = path.join(folderPath, "Dockerfile");

  // docker-compose.yml → docker compose up -d
  if (fs.existsSync(composeFile)) {
    console.log("docker-compose.yml found → running docker compose up");

    return new Promise((resolve, reject) => {
      exec(`docker compose -f "${composeFile}" up -d`, { cwd: folderPath }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve({ type: "compose", output: stdout });
      });
    });
  }

  // Dockerfile → docker build + docker run
  if (fs.existsSync(dockerfile)) {
    console.log("Dockerfile found → building image");

    const imageName = `service_${Date.now()}`;

    // Build image
    await docker.buildImage(
      { context: folderPath, src: fs.readdirSync(folderPath) },
      { t: imageName }
    );

    console.log("Image built:", imageName);

    // Run container
    const container = await docker.createContainer({
      Image: imageName,
      name: `container_${Date.now()}`,
      HostConfig: { AutoRemove: true }
    });

    await container.start();

    return {
      type: "dockerfile",
      image: imageName,
      container: container.id
    };
  }
  throw new Error("No docker-compose.yml or Dockerfile found in uploaded folder");
}

// ─── Démarrage ────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Docker Services Manager démarré sur http://0.0.0.0:${PORT}`);
});