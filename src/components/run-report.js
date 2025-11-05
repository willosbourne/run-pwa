class RunReport extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.runData = null;
  }

  connectedCallback() {
    this.render();
  }

  setRunData(run) {
    this.runData = run;
    this.render();
    this.displayReport();
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

        .report-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .summary-section {
          background: var(--background-color);
          border: 1px solid var(--secondary-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 2px solid var(--primary-color);
        }

        .run-date {
          font-size: var(--font-size-lg);
          font-weight: bold;
          color: var(--primary-color);
        }

        .run-time {
          color: var(--text-color);
          font-size: var(--font-size-md);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--spacing-lg);
          margin-top: var(--spacing-lg);
        }

        .stat-card {
          text-align: center;
          padding: var(--spacing-md);
          background: rgba(53, 84, 43, 0.05);
          border-radius: 8px;
        }

        .stat-icon {
          font-size: 2rem;
          color: var(--primary-color);
          margin-bottom: var(--spacing-sm);
        }

        .stat-value {
          font-size: var(--font-size-xl);
          font-weight: bold;
          color: var(--primary-color);
          margin-bottom: var(--spacing-xs);
        }

        .stat-label {
          font-size: var(--font-size-sm);
          color: var(--secondary-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .workout-section {
          background: var(--background-color);
          border: 1px solid var(--secondary-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .section-title {
          font-size: var(--font-size-lg);
          font-weight: bold;
          color: var(--primary-color);
          margin-bottom: var(--spacing-md);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .workout-plan {
          background: rgba(53, 84, 43, 0.05);
          padding: var(--spacing-md);
          border-radius: 4px;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: var(--font-size-sm);
          line-height: 1.6;
        }

        .breakdown-section {
          background: var(--background-color);
          border: 1px solid var(--secondary-color);
          border-radius: 8px;
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .step-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .step-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-md);
          margin-bottom: var(--spacing-sm);
          background: rgba(53, 84, 43, 0.05);
          border-radius: 4px;
        }

        .step-item:last-child {
          margin-bottom: 0;
        }

        .step-info {
          flex: 1;
        }

        .step-name {
          font-weight: 500;
          color: var(--text-color);
        }

        .step-distance {
          font-size: var(--font-size-sm);
          color: var(--secondary-color);
          margin-top: var(--spacing-xs);
        }

        .step-pace {
          font-weight: bold;
          color: var(--primary-color);
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--secondary-color);
        }

        .back-button {
          margin-bottom: var(--spacing-md);
        }

        .no-data {
          font-style: italic;
          color: var(--secondary-color);
        }
      </style>

      <div class="report-container">
        <div class="back-button">
          <sl-button id="backButton" variant="default">
            <sl-icon name="arrow-left" slot="prefix"></sl-icon>
            Back to History
          </sl-button>
        </div>

        <div id="reportContent">
          <div class="empty-state">
            <sl-icon name="inbox" style="font-size: 4rem;"></sl-icon>
            <p>No run data to display</p>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const backButton = this.shadowRoot.getElementById('backButton');
    backButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('navigateBack', {
        bubbles: true,
        composed: true
      }));
    });
  }

  displayReport() {
    if (!this.runData) {
      return;
    }

    const reportContent = this.shadowRoot.getElementById('reportContent');

    const date = new Date(this.runData.datetime);
    const formattedDate = this.formatDate(date);
    const formattedTime = this.formatTime(date);
    const distance = this.runData.distance ? `${this.runData.distance.toFixed(2)} km` : 'N/A';
    const duration = this.runData.duration ? this.formatDuration(this.runData.duration) : 'N/A';
    const avgPace = this.calculateAveragePace();

    reportContent.innerHTML = `
      <div class="summary-section">
        <div class="summary-header">
          <div>
            <div class="run-date">${formattedDate}</div>
            <div class="run-time">${formattedTime}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <sl-icon name="geo-alt" class="stat-icon"></sl-icon>
            <div class="stat-value">${distance}</div>
            <div class="stat-label">Distance</div>
          </div>

          <div class="stat-card">
            <sl-icon name="clock" class="stat-icon"></sl-icon>
            <div class="stat-value">${duration}</div>
            <div class="stat-label">Duration</div>
          </div>

          <div class="stat-card">
            <sl-icon name="speedometer2" class="stat-icon"></sl-icon>
            <div class="stat-value">${avgPace}</div>
            <div class="stat-label">Avg Pace</div>
          </div>
        </div>
      </div>

      ${this.runData.workoutPlan ? `
        <div class="workout-section">
          <div class="section-title">
            <sl-icon name="list-task"></sl-icon>
            Workout Plan
          </div>
          <div class="workout-plan">${this.escapeHtml(this.runData.workoutPlan)}</div>
        </div>
      ` : ''}

      ${this.renderStepBreakdown()}
    `;
  }

  renderStepBreakdown() {
    if (!this.runData.stepDistances || this.runData.stepDistances.length === 0) {
      return '';
    }

    const stepsHtml = this.runData.stepDistances.map((stepData, index) => {
      const step = this.runData.workoutSteps[stepData.stepIndex];
      const distance = stepData.distance.toFixed(3);
      const pace = this.calculateStepPace(stepData, step);

      return `
        <li class="step-item">
          <div class="step-info">
            <div class="step-name">${step?.activity || `Step ${index + 1}`}</div>
            <div class="step-distance">${distance} km</div>
          </div>
          <div class="step-pace">${pace}</div>
        </li>
      `;
    }).join('');

    return `
      <div class="breakdown-section">
        <div class="section-title">
          <sl-icon name="graph-up"></sl-icon>
          Pace Breakdown by Step
        </div>
        <ul class="step-list">
          ${stepsHtml}
        </ul>
      </div>
    `;
  }

  calculateAveragePace() {
    if (!this.runData.distance || !this.runData.duration || this.runData.distance === 0) {
      return 'N/A';
    }

    const paceInMinutesPerKm = this.runData.duration / 60 / this.runData.distance;
    const minutes = Math.floor(paceInMinutesPerKm);
    const seconds = Math.round((paceInMinutesPerKm - minutes) * 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }

  calculateStepPace(stepData, step) {
    if (!stepData.distance || !step?.duration || stepData.distance === 0) {
      return 'N/A';
    }

    const durationInSeconds = this.convertToSeconds(step.duration);
    const paceInMinutesPerKm = durationInSeconds / 60 / stepData.distance;
    const minutes = Math.floor(paceInMinutesPerKm);
    const seconds = Math.round((paceInMinutesPerKm - minutes) * 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }

  convertToSeconds(duration) {
    const match = duration.match(/(\d+)([smh])/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch(unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      default: return 0;
    }
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
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('run-report', RunReport);
