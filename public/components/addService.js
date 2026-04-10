class AddServiceDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._ready = false;
    this._openRequested = false;
    this._config = this._defaultConfig();
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
    this._fileInput = this.shadowRoot.getElementById('add-service-file');
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
    this._selectTab('Zip');
  }

  _selectTab(tabName, activeButton = null) {
    if (!this.shadowRoot) {
      return;
    }

    this._tabPanels.forEach((panel) => {
      panel.style.display = panel.id === tabName ? 'block' : 'none';
    });

    this._tabButtons.forEach((button) => {
      button.classList.toggle('active', button === activeButton || button.dataset.tab === tabName);
    });
  }

  _submit() {
    const files = Array.from(this._fileInput.files || []);
    this.dispatchEvent(new CustomEvent('add-service-submit', {
      detail: { files },
      bubbles: true,
      composed: true,
    }));
    this.close();
  }
}
if (!customElements.get('add-service-dialog')) {
  customElements.define('add-service-dialog', AddServiceDialog);
}
