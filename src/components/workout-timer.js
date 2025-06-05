class WorkoutTimer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentStep = 0;
    this.timeRemaining = 0;
    this.timer = null;
    this.workoutSteps = [];
    this.wakeLock = null;
    this.wakeLockEnabled = true;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: var(--spacing-md);
        }

        .timer-display {
          text-align: center;
          font-size: 3rem;
          font-weight: bold;
          margin: var(--spacing-lg) 0;
        }

        .current-activity {
          text-align: center;
          font-size: 1.5rem;
          margin-bottom: var(--spacing-md);
        }

        .controls {
          display: flex;
          justify-content: center;
          gap: var(--spacing-md);
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--background-color);
          border-radius: 4px;
          margin: var(--spacing-md) 0;
          overflow: hidden;
        }

        .progress {
          height: 100%;
          background: var(--primary-color);
          transition: width 1s linear;
        }
      </style>

      <div class="container">
        <div class="current-activity" id="currentActivity">
          Ready to start
        </div>

        <div class="timer-display" id="timerDisplay">
          00:00
        </div>

        <div class="progress-bar">
          <div class="progress" id="progressBar"></div>
        </div>

        <div class="controls">
          <sl-button variant="primary" id="startButton">Start Workout</sl-button>
          <sl-button variant="neutral" id="pauseButton" disabled>Pause</sl-button>
          <sl-button variant="danger" id="stopButton" disabled>Stop</sl-button>
        </div>
        <div class="wake-lock-controls" style="display: flex; justify-content: center; margin-top: var(--spacing-md);">
          <sl-button variant="neutral" id="wakeLockButton">
            <sl-icon name="display" slot="prefix"></sl-icon>
            Wake Lock: On
          </sl-button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const startButton = this.shadowRoot.getElementById('startButton');
    const pauseButton = this.shadowRoot.getElementById('pauseButton');
    const stopButton = this.shadowRoot.getElementById('stopButton');
    const wakeLockButton = this.shadowRoot.getElementById('wakeLockButton');

    startButton.addEventListener('click', () => this.startWorkout());
    pauseButton.addEventListener('click', () => this.togglePause());
    stopButton.addEventListener('click', () => this.stopWorkout());
    wakeLockButton.addEventListener('click', () => this.toggleWakeLock());
  }

  setWorkoutSteps(steps) {
    this.workoutSteps = this.expandWorkoutSteps(steps);
  }

  expandWorkoutSteps(steps) {
    const expandedSteps = [];
    let currentSteps = [];

    steps.forEach(step => {
      if (step.type === 'activity') {
        currentSteps.push(step);
      } else if (step.type === 'repeat') {
        const repeatDuration = this.convertToSeconds(step.duration);
        const currentStepsDuration = currentSteps.reduce((total, step) => 
          total + this.convertToSeconds(step.duration), 0);

        const repeats = Math.ceil(repeatDuration / currentStepsDuration);

        for (let i = 0; i < repeats; i++) {
          expandedSteps.push(...currentSteps);
        }

        currentSteps = [];
      }
    });

    // Add any remaining steps
    expandedSteps.push(...currentSteps);

    return expandedSteps;
  }

  convertToSeconds(duration) {
    return duration.unit === 'minutes' ? duration.value * 60 : duration.value;
  }

  async requestWakeLock() {
    // Only request wake lock if it's enabled
    if (!this.wakeLockEnabled) {
      console.log('Wake lock is disabled by user');
      return false;
    }

    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');

        // Update button text
        const wakeLockButton = this.shadowRoot.getElementById('wakeLockButton');
        if (wakeLockButton) {
          wakeLockButton.innerHTML = '<sl-icon name="display" slot="prefix"></sl-icon> Wake Lock: On';
        }

        // Add event listener for wake lock release
        this.wakeLock.addEventListener('release', () => {
          console.log('Wake lock released by system');
          this.wakeLock = null;

          // Update button text
          const wakeLockButton = this.shadowRoot.getElementById('wakeLockButton');
          if (wakeLockButton) {
            wakeLockButton.innerHTML = '<sl-icon name="display-fill" slot="prefix"></sl-icon> Wake Lock: Off';
          }

          // Try to re-acquire wake lock if timer is still running and wake lock is enabled
          if (this.timer && this.wakeLockEnabled) {
            this.requestWakeLock();
          }
        });
        return true;
      } catch (e) {
        console.warn('Wake lock request failed:', e);
        return false;
      }
    } else {
      console.warn('Wake Lock API not supported in this browser');
      return false;
    }
  }

  async startWorkout() {
    if (this.workoutSteps.length === 0) return;

    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn('Notification permission request failed:', e);
      }
    }

    // Request wake lock to keep screen on during workout if wake lock is enabled
    if (this.wakeLockEnabled) {
      await this.requestWakeLock();
    }

    // Dispatch workoutStarted event
    document.dispatchEvent(new CustomEvent('workoutStarted'));

    this.currentStep = 0;
    this.startCurrentStep();

    const startButton = this.shadowRoot.getElementById('startButton');
    const pauseButton = this.shadowRoot.getElementById('pauseButton');
    const stopButton = this.shadowRoot.getElementById('stopButton');

    startButton.disabled = true;
    pauseButton.disabled = false;
    stopButton.disabled = false;
  }

  startCurrentStep() {
    const step = this.workoutSteps[this.currentStep];
    if (!step) {
      this.stopWorkout();
      return;
    }

    // Dispatch step change event
    document.dispatchEvent(new CustomEvent('workoutStepChanged', {
      detail: { stepIndex: this.currentStep }
    }));

    this.timeRemaining = this.convertToSeconds(step.duration);
    this.stepStartTime = Date.now();
    this.expectedEndTime = this.stepStartTime + this.timeRemaining * 1000;
    this.updateDisplay();

    // Send notification for new activity
    if (step.activity && 'Notification' in window && Notification.permission === 'granted') {
      const durationStr = step.duration.unit === 'minutes'
        ? `${step.duration.value} minute${step.duration.value > 1 ? 's' : ''}`
        : `${step.duration.value} second${step.duration.value > 1 ? 's' : ''}`;
      const message = `${step.activity.trim()} for ${durationStr}`;

      // Debug log
      console.log('Attempting to play audio for:', message);

      // Speech synthesis with enhanced settings
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(message);
        utter.lang = 'en-US';
        utter.volume = 1.0; // Maximum volume
        utter.rate = 0.9; // Slightly slower for clarity
        utter.pitch = 1.0;

        // Debug log for speech synthesis
        console.log('Speech synthesis available, attempting to speak');

        utter.onstart = () => console.log('Speech started');
        utter.onend = () => console.log('Speech ended');
        utter.onerror = (event) => console.error('Speech error:', event);

        window.speechSynthesis.speak(utter);
      } else {
        console.warn('Speech synthesis not available');
      }

      // Vibration (if supported)
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }
    }

    this.timer = setInterval(() => this.tick(), 1000);
    this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibilityChangeBound);
  }

  tick() {
    const now = Date.now();
    this.timeRemaining = Math.max(0, Math.round((this.expectedEndTime - now) / 1000));
    this.updateDisplay();
    if (this.timeRemaining <= 0) {
      clearInterval(this.timer);
      document.removeEventListener('visibilitychange', this.handleVisibilityChangeBound);
      this.currentStep++;
      if (this.currentStep < this.workoutSteps.length) {
        this.startCurrentStep();
      } else {
        this.stopWorkout();
      }
    }
  }

  async handleVisibilityChange() {
    if (!document.hidden) {
      // When returning to the app, immediately update the timer
      this.tick();

      // Re-acquire wake lock if it was released when document became hidden and wake lock is enabled
      if (this.timer && !this.wakeLock && this.wakeLockEnabled) {
        await this.requestWakeLock();
      }
    }
  }

  updateDisplay() {
    const timerDisplay = this.shadowRoot.getElementById('timerDisplay');
    const progressBar = this.shadowRoot.getElementById('progressBar');

    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const step = this.workoutSteps[this.currentStep];
    const totalDuration = this.convertToSeconds(step.duration);
    const progress = ((totalDuration - this.timeRemaining) / totalDuration) * 100;
    progressBar.style.width = `${progress}%`;
  }

  async togglePause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;

      // Release wake lock when paused
      if (this.wakeLock) {
        try {
          this.wakeLock.release();
          this.wakeLock = null;
          console.log('Wake lock released on pause');
        } catch (e) {
          console.error('Error releasing wake lock on pause:', e);
        }
      }

      const pauseButton = this.shadowRoot.getElementById('pauseButton');
      pauseButton.textContent = 'Resume';
    } else {
      // Re-acquire wake lock when resumed if wake lock is enabled
      if (this.wakeLockEnabled) {
        await this.requestWakeLock();
      }

      this.timer = setInterval(() => this.tick(), 1000);

      const pauseButton = this.shadowRoot.getElementById('pauseButton');
      pauseButton.textContent = 'Pause';
    }
  }

  async toggleWakeLock() {
    this.wakeLockEnabled = !this.wakeLockEnabled;
    const wakeLockButton = this.shadowRoot.getElementById('wakeLockButton');

    if (!this.wakeLockEnabled && this.wakeLock) {
      // Disable wake lock
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake lock manually released');
        wakeLockButton.innerHTML = '<sl-icon name="display-fill" slot="prefix"></sl-icon> Wake Lock: Off';
      } catch (e) {
        console.error('Error releasing wake lock:', e);
      }
    } else if (this.wakeLockEnabled && this.timer && !this.wakeLock) {
      // Enable wake lock if timer is running
      const success = await this.requestWakeLock();
      if (success) {
        wakeLockButton.innerHTML = '<sl-icon name="display" slot="prefix"></sl-icon> Wake Lock: On';
      }
    } else {
      // Just update the button text
      wakeLockButton.innerHTML = this.wakeLockEnabled 
        ? '<sl-icon name="display" slot="prefix"></sl-icon> Wake Lock: On'
        : '<sl-icon name="display-fill" slot="prefix"></sl-icon> Wake Lock: Off';
    }
  }

  stopWorkout() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.handleVisibilityChangeBound) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChangeBound);
    }

    // Release wake lock when workout stops
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake lock released');
      } catch (e) {
        console.error('Error releasing wake lock:', e);
      }
    }

    // Dispatch workout stopped event
    document.dispatchEvent(new CustomEvent('workoutStopped'));

    const startButton = this.shadowRoot.getElementById('startButton');
    const pauseButton = this.shadowRoot.getElementById('pauseButton');
    const stopButton = this.shadowRoot.getElementById('stopButton');

    startButton.disabled = false;
    pauseButton.disabled = true;
    stopButton.disabled = true;

    const currentActivity = this.shadowRoot.getElementById('currentActivity');
    const timerDisplay = this.shadowRoot.getElementById('timerDisplay');
    const progressBar = this.shadowRoot.getElementById('progressBar');

    currentActivity.textContent = 'Workout Complete';
    timerDisplay.textContent = '00:00';
    progressBar.style.width = '0%';

    // Announce workout completion
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance('Workout complete! Great job!');
      utter.lang = 'en-US';
      utter.volume = 1.0;
      utter.rate = 0.9;
      utter.pitch = 1.0;

      // Debug log for speech synthesis
      console.log('Announcing workout completion');

      utter.onstart = () => console.log('Completion announcement started');
      utter.onend = () => console.log('Completion announcement ended');
      utter.onerror = (event) => console.error('Completion announcement error:', event);

      window.speechSynthesis.speak(utter);
    }

    // Vibration for completion
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]); // Triple vibration for completion
    }
  }
}

customElements.define('workout-timer', WorkoutTimer); 
