const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Docker = require('dockerode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

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

app.post('/api/services/add/url/:name', async (req, res) => {
  try {
    // Here i need to clone the github and then call a servic ewith the fodler
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

app.post('/api/services/add/zip/:name', async (req, res) => {
  try {
    // Here i need to unzip the folder and then call a servic ewith the fodler
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────



// ─── Démarrage ────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Docker Services Manager démarré sur http://0.0.0.0:${PORT}`);
});