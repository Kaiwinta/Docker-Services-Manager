let containers = [];

  async function loadContainers() {
    try {
      const res = await fetch('/api/containers');
      containers = await res.json();
      document.getElementById('host-label').textContent = location.hostname;
      render();
    } catch (e) { console.error(e); }
  }

  async function startContainer(name) {
    setLoading(name, true);
    await fetch(`/api/containers/${name}/start`, { method: 'POST' });
    await loadContainers();
  }

  async function stopContainer(name) {
    setLoading(name, true);
    await fetch(`/api/containers/${name}/stop`, { method: 'POST' });
    await loadContainers();
  }

  function render() {
    const main = document.getElementById('main');
    main.innerHTML = '';

    let running = 0;
    let stopped = 0;
    containers.forEach(c => c.status === 'running' ? running++ : stopped++);
    document.getElementById('count-running').textContent = running;
    document.getElementById('count-stopped').textContent = stopped;

    if (containers.length) {
      main.appendChild(sectionLabel('Standalone containers'));
      containers.forEach(c => main.appendChild(buildCard(c)));
    }
  }

  function sectionLabel(text) {
    const newDiv = document.createElement('div');
    newDiv.className = 'section-label';
    newDiv.textContent = text;
    return newDiv;
  }

  function buildCard(c) {
    const isRunning = c.status === 'running';
    const isLoading = c._loading;
    const dotClass = isLoading ? 'dot-loading' : isRunning ? 'dot-running' : 'dot-stopped';

    const wrapper = document.createElement('div');
    wrapper.className = 'standalone-card';
    wrapper.id = `card-${c.name}`;

    wrapper.innerHTML = `
      <div class="card-row">
        <div class="status-dot ${dotClass}"></div>
        <div class="card-info">
          <div class="card-name">
            ${c.compose && c.compose.service ? c.compose.service : c.name}
            <span class="badge badge-standalone">standalone</span>
          </div>
          <div class="card-meta">${c.image} — ${c.statusText}</div>
        </div>
        <div class="card-actions">
          ${isRunning
            ? `<button class="btn btn-stop" onclick="confirmStop('${c.name}')" ${isLoading ? 'disabled' : ''}>stop</button>`
            : `<button class="btn btn-start" onclick="startContainer('${c.name}')" ${isLoading ? 'disabled' : ''}>start</button>`
          }
        </div>
      </div>
    `;
    return wrapper;
  }

  function setLoading(name, val) {
    const c = containers.find(x => x.name === name);
    if (c) { c._loading = val; render(); }
  }

  function confirmStop(name) {
    document.getElementById('dialog-title').textContent = `Stop ${name}?`;
    document.getElementById('dialog-body').textContent = `The container will be stopped. You can restart it at any time.`;
    document.getElementById('dialog-ok').textContent = 'Stop';
    document.getElementById('dialog-ok').onclick = () => { closeDialog(); stopContainer(name); };
    document.getElementById('dialog').classList.add('open');
  }

  function closeDialog() {
    document.getElementById('dialog').classList.remove('open');
  }

  loadContainers();
  setInterval(loadContainers, 10000);