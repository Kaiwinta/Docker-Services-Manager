class AddServiceDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._ready = false;
    this._openRequested = false;
    this._config = this._defaultConfig();
    this._selectedTab = this._config.defaultTab;
  }

  connectedCallback() {
    if (this._ready) {
      return;
    }

    this._load();
  }

  async _load() {
    const templateResponse = await fetch('/components/addService.html');
    const templateHtml = await templateResponse.text();

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/theme.css">
      <link rel="stylesheet" href="/components/addService.css">
      ${templateHtml}
    `;

    this._backdrop = this.shadowRoot.querySelector('.backdrop');
    this._title = this.shadowRoot.getElementById('add-service-title');
    this._body = this.shadowRoot.getElementById('add-service-body');
    this._zipInput = this.shadowRoot.getElementById('add-service-zip');
    this._folderInput = this.shadowRoot.getElementById('add-service-folder');
    this._githubUrlInput = this.shadowRoot.getElementById('add-service-github-url');
    this._tabButtons = Array.from(this.shadowRoot.querySelectorAll('.tablinks'));
    this._tabPanels = Array.from(this.shadowRoot.querySelectorAll('.tabcontent'));

    this.shadowRoot.querySelector('[data-action="cancel"]').addEventListener('click', () => this.close());
    this.shadowRoot.querySelector('[data-action="confirm"]').addEventListener('click', () => this._submit());
    this._tabButtons.forEach((button) => {
      button.addEventListener('click', (event) => this._selectTab(event.currentTarget.dataset.tab, event.currentTarget));
    });
    this._backdrop.addEventListener('click', (event) => {
      if (event.target === this._backdrop) {
        this.close();
      }
    });

    this._ready = true;

    if (this._openRequested) {
      this._applyOpenState();
    }
  }

  _defaultConfig() {
    return {
      title: 'Add new service',
      body: 'Select the archive for the service you want to add.',
      confirmText: 'Add Service',
      defaultTab: 'Zip',
    };
  }

  open(config = {}) {
    this._config = { ...this._defaultConfig(), ...config };
    this._openRequested = true;

    if (this._ready) {
      this._applyOpenState();
    }
  }

  close() {
    this._openRequested = false;

    if (!this._ready) {
      return;
    }

    this._backdrop.classList.remove('open');
    this._backdrop.hidden = true;
  }

  _applyOpenState() {
    this._title.textContent = this._config.title;
    this._body.textContent = this._config.body;
    this.shadowRoot.querySelector('[data-action="confirm"]').textContent = this._config.confirmText;
    this._backdrop.hidden = false;
    this._backdrop.classList.add('open');
    this._selectTab(this._config.defaultTab);
  }

  _selectTab(tabName, activeButton = null) {
    if (!this.shadowRoot) {
      return;
    }

    this._selectedTab = tabName;

    this._tabPanels.forEach((panel) => {
      panel.style.display = panel.id === tabName ? 'block' : 'none';
    });

    this._tabButtons.forEach((button) => {
      button.classList.toggle('active', button === activeButton || button.dataset.tab === tabName);
    });
  }

  async _submit() {
    const tab = this._selectedTab;

    if (tab === 'Zip') {
      const file = this._zipInput.files[0];
      if (!file) {
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      await fetch('/api/services/upload/zip/', {
        method: 'POST',
        body: formData,
      });
      this.close();
      return;
    }

    if (tab === 'Folder') {
      const files = Array.from(this._folderInput.files || []);
      if (!files.length) return;

      const zip = new JSZip();

      for (const file of files) {
        const path = file.webkitRelativePath;
        zip.file(path, file);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      const formData = new FormData();
      formData.append('file', zipBlob, "folder.zip");
      await fetch('/api/services/upload/zip/', {
        method: 'POST',
        body: formData,
      });
      this.close();
      return;
    }

    if (tab === 'Github') {
      const url = this._githubUrlInput.value.trim();
      if (!url) {
        return;
      }
      const res = await fetch('/api/services/upload/url/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.error}`);
        this.close();
        return;
      }
      const result = await res.json();
      console.log("Service added:", result);
      this.close();
      return;
    }
  }

}
if (!customElements.get('add-service-dialog')) {
  customElements.define('add-service-dialog', AddServiceDialog);
}
