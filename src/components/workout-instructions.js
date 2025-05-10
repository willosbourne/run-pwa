class WorkoutInstructions extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: var(--spacing-md);
        }
        
        .workout-input {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }
        
        .workout-display {
          background: var(--background-color);
          border: 1px solid var(--primary-color);
          border-radius: 4px;
          padding: var(--spacing-md);
          margin-top: var(--spacing-md);
        }
        
        .workout-step {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }
      </style>
      
      <div class="container">
        <div class="workout-input">
          <sl-input 
            id="workoutText" 
            placeholder="Enter workout instructions (e.g., 'Jog for 60s, walk for 90s, repeat for 20 minutes')"
            style="flex: 1;"
          ></sl-input>
          <sl-button variant="primary" id="parseButton">Parse Instructions</sl-button>
        </div>
        
        <div class="workout-display" id="workoutDisplay">
          <h3>Workout Plan</h3>
          <div id="workoutSteps"></div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const parseButton = this.shadowRoot.getElementById('parseButton');
    const workoutText = this.shadowRoot.getElementById('workoutText');
    
    parseButton.addEventListener('click', () => {
      const instructions = workoutText.value;
      const parsedWorkout = this.parseInstructions(instructions);
      this.displayWorkout(parsedWorkout);
    });
  }

  parseInstructions(instructions) {
    // Basic parsing logic - this will be expanded
    const steps = [];
    const parts = instructions.toLowerCase().split(',');
    
    parts.forEach(part => {
      if (part.includes('repeat')) {
        // Handle repeat instruction
        const duration = this.extractDuration(part);
        if (duration) {
          steps.push({
            type: 'repeat',
            duration: duration
          });
        }
      } else {
        // Handle regular steps
        const duration = this.extractDuration(part);
        const activity = part.replace(/\d+\s*(min|s|sec|seconds?|minutes?)/g, '').trim();
        
        if (duration && activity) {
          steps.push({
            type: 'activity',
            activity: activity,
            duration: duration
          });
        }
      }
    });
    
    return steps;
  }

  extractDuration(text) {
    const timeRegex = /(\d+)\s*(min|s|sec|seconds?|minutes?)/;
    const match = text.match(timeRegex);
    
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].startsWith('min') ? 'minutes' : 'seconds';
      return { value, unit };
    }
    
    return null;
  }

  displayWorkout(steps) {
    const workoutSteps = this.shadowRoot.getElementById('workoutSteps');
    workoutSteps.innerHTML = '';
    
    steps.forEach((step, index) => {
      const stepElement = document.createElement('div');
      stepElement.className = 'workout-step';
      
      if (step.type === 'activity') {
        stepElement.innerHTML = `
          <sl-icon name="arrow-right-circle"></sl-icon>
          <span>${step.activity} for ${step.duration.value} ${step.duration.unit}</span>
        `;
      } else if (step.type === 'repeat') {
        stepElement.innerHTML = `
          <sl-icon name="arrow-repeat"></sl-icon>
          <span>Repeat previous steps for ${step.duration.value} ${step.duration.unit}</span>
        `;
      }
      
      workoutSteps.appendChild(stepElement);
    });
  }
}

customElements.define('workout-instructions', WorkoutInstructions); 