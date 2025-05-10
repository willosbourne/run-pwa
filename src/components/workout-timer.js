class WorkoutTimer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.currentStep = 0;
    this.timeRemaining = 0;
    this.timer = null;
    this.workoutSteps = [];
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
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const startButton = this.shadowRoot.getElementById('startButton');
    const pauseButton = this.shadowRoot.getElementById('pauseButton');
    const stopButton = this.shadowRoot.getElementById('stopButton');

    startButton.addEventListener('click', () => this.startWorkout());
    pauseButton.addEventListener('click', () => this.togglePause());
    stopButton.addEventListener('click', () => this.stopWorkout());
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

  startWorkout() {
    if (this.workoutSteps.length === 0) return;
    
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

    this.timeRemaining = this.convertToSeconds(step.duration);
    this.updateDisplay();
    
    const currentActivity = this.shadowRoot.getElementById('currentActivity');
    currentActivity.textContent = step.activity;
    
    this.timer = setInterval(() => this.tick(), 1000);
  }

  tick() {
    this.timeRemaining--;
    this.updateDisplay();
    
    if (this.timeRemaining <= 0) {
      clearInterval(this.timer);
      this.currentStep++;
      
      if (this.currentStep < this.workoutSteps.length) {
        this.startCurrentStep();
      } else {
        this.stopWorkout();
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

  togglePause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      
      const pauseButton = this.shadowRoot.getElementById('pauseButton');
      pauseButton.textContent = 'Resume';
    } else {
      this.timer = setInterval(() => this.tick(), 1000);
      
      const pauseButton = this.shadowRoot.getElementById('pauseButton');
      pauseButton.textContent = 'Pause';
    }
  }

  stopWorkout() {
    clearInterval(this.timer);
    this.timer = null;
    
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
  }
}

customElements.define('workout-timer', WorkoutTimer); 