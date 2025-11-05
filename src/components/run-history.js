import databaseService from '../services/database.js';

class RunHistory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.runs = [];
  }

  connectedCallback() {
    this.render();
    this.loadRuns();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* Import CSS variables from parent document */
          --primary-color: #35542B;
          --primary-light: #4A7239;
          --primary-dark: #2A4121;
          --secondary-color: #8B9D77;
          --background-color: #ffffff;
          --text-color: #2C2C2C;
          --error-color: #D32F2F;
          --success-color: #388E3C;
          --spacing-xs: 0.25rem;
          --spacing-sm: 0.5rem;
          --spacing-md: 1rem;
          --spacing-lg: 1.5rem;
          --spacing-xl: 2rem;
          --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          --font-size-sm: 0.875rem;
          --font-size-md: 1rem;
          --font-size-lg: 1.25rem;
          --font-size-xl: 1.5rem;

          display: block;
          padding: var(--spacing-md);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }

        h2 {
          margin: 0;
          color: var(--primary-color);
        }

        .runs-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .run-item {
          background: var(--background-color);
          border: 1px solid var(--secondary-color);
          border-radius: 8px;
          padding: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .run-item:hover {
          border-color: var(--primary-color);
          box-shadow: 0 2px 8px rgba(53, 84, 43, 0.15);
        }

        .run-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .run-date {
          font-weight: bold;
          color: var(--primary-color);
        }

        .run-stats {
          display: flex;
          gap: var(--spacing-lg);
          font-size: var(--font-size-sm);
          color: var(--text-color);
        }

        .stat {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .stat-icon {
          color: var(--primary-color);
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--secondary-color);
        }

        .empty-state sl-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }

        .workout-preview {
          margin-top: var(--spacing-sm);
          font-size: var(--font-size-sm);
          color: var(--secondary-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>

      <div class="container">
        <div class="header">
          <h2>Run History</h2>
          <sl-button variant="neutral" id="refreshButton" size="small">
            <sl-icon name="arrow-clockwise" slot="prefix"></sl-icon>
            Refresh
          </sl-button>
        </div>

        <div class="runs-list" id="runsList">
          <div class="empty-state">
            <sl-icon name="hourglass"></sl-icon>
            <p>Loading runs...</p>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const refreshButton = this.shadowRoot.getElementById('refreshButton');
    refreshButton.addEventListener('click', () => this.loadRuns());

    // Listen for new runs being saved
    document.addEventListener('runSaved', () => {
      this.loadRuns();
    });
  }

  async loadRuns() {
    try {
      this.runs = await databaseService.getAllRuns();
      this.displayRuns();
    } catch (error) {
      console.error('Error loading runs:', error);
      this.displayError();
    }
  }

  displayRuns() {
    const runsList = this.shadowRoot.getElementById('runsList');

    if (this.runs.length === 0) {
      runsList.innerHTML = `
        <div class="empty-state">
          <sl-icon name="inbox"></sl-icon>
          <p>No runs recorded yet</p>
          <p style="font-size: var(--font-size-sm);">Start a workout to record your first run!</p>
        </div>
      `;
      return;
    }

    runsList.innerHTML = '';
    this.runs.forEach(run => {
      const runItem = this.createRunItem(run);
      runsList.appendChild(runItem);
    });
  }

  createRunItem(run) {
    const runItem = document.createElement('div');
    runItem.className = 'run-item';

    const date = new Date(run.datetime);
    const formattedDate = this.formatDate(date);
    const formattedTime = this.formatTime(date);
    const distance = run.distance ? `${run.distance.toFixed(2)} km` : 'N/A';
    const duration = run.duration ? this.formatDuration(run.duration) : 'N/A';

    runItem.innerHTML = `
      <div class="run-header">
        <div class="run-date">${formattedDate}</div>
        <div>${formattedTime}</div>
      </div>
      <div class="run-stats">
        <div class="stat">
          <sl-icon name="geo-alt" class="stat-icon"></sl-icon>
          <span>${distance}</span>
        </div>
        <div class="stat">
          <sl-icon name="clock" class="stat-icon"></sl-icon>
          <span>${duration}</span>
        </div>
      </div>
      ${run.workoutPlan ? `<div class="workout-preview">${run.workoutPlan}</div>` : ''}
    `;

    runItem.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('runSelected', {
        detail: { run },
        bubbles: true,
        composed: true
      }));
    });

    return runItem;
  }

  formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  displayError() {
    const runsList = this.shadowRoot.getElementById('runsList');
    runsList.innerHTML = `
      <div class="empty-state">
        <sl-icon name="exclamation-triangle" style="color: var(--error-color);"></sl-icon>
        <p>Error loading runs</p>
        <p style="font-size: var(--font-size-sm);">Please try refreshing the page</p>
      </div>
    `;
  }
}

customElements.define('run-history', RunHistory);
