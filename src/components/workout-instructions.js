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
        
        .workout-input {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }
        
        @media (min-width: 768px) {
          .workout-input {
            flex-direction: row;
          }
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
      this.dispatchEvent(new CustomEvent('workoutParsed', {
        detail: { steps: parsedWorkout },
        bubbles: true,
        composed: true
      }));
    });
  }

  parseInstructions(instructions) {
    const steps = [];
    const parts = this.splitInstructions(instructions);
    let stepsToRepeat = [];

    parts.forEach(part => {
      const cleanPart = part.trim().toLowerCase();

      if (this.isRepeatInstruction(cleanPart)) {
        // Handle different types of repeat instructions
        const repeatInfo = this.parseRepeatInstruction(cleanPart);
        if (repeatInfo) {
          if (repeatInfo.type === 'count') {
            // "Repeat X times" - repeat the accumulated steps X times
            steps.push({
              type: 'repeat-count',
              count: repeatInfo.count,
              stepsToRepeat: [...stepsToRepeat]
            });
            stepsToRepeat = [];
          } else if (repeatInfo.type === 'duration') {
            // "Repeat for X minutes" - repeat until duration is met
            steps.push({
              type: 'repeat-duration',
              duration: repeatInfo.duration,
              stepsToRepeat: [...stepsToRepeat]
            });
            stepsToRepeat = [];
          }
        }
      } else {
        // Handle regular activity steps
        const stepInfo = this.parseActivityStep(cleanPart);
        if (stepInfo) {
          const step = {
            type: 'activity',
            activity: stepInfo.activity,
            duration: stepInfo.duration
          };
          steps.push(step);
          stepsToRepeat.push(step);
        }
      }
    });

    return steps;
  }

  splitInstructions(instructions) {
    // Split by commas, periods, "then", "and" while preserving the context
    return instructions.split(/[,.]|\s+(?:then|and)\s+/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  isRepeatInstruction(text) {
    return /repeat|again/i.test(text);
  }

  parseRepeatInstruction(text) {
    // Check for "repeat X times" pattern
    const countMatch = text.match(/(repeat|do|again)\s+(\d+)\s*(?:x|times?)/i);
    if (countMatch) {
      return {
        type: 'count',
        count: parseInt(countMatch[2])
      };
    }

    // Check for "repeat for X minutes/seconds" pattern
    const durationMatch = text.match(/(repeat|do|again)\s+(?:for\s+)?(\d+)\s*(m|min|minutes?|s|sec|seconds?)/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[2]);
      const unit = durationMatch[3].toLowerCase().startsWith('m') ? 'minutes' : 'seconds';
      return {
        type: 'duration',
        duration: { value, unit }
      };
    }

    // Default to single repeat if just "repeat" is mentioned
    if (/repeat|again/i.test(text)) {
      return {
        type: 'count',
        count: 2
      };
    }

    return null;
  }

  parseActivityStep(text) {
    const duration = this.extractDuration(text);
    if (!duration) return null;

    // Extract activity name more intelligently
    const activity = this.extractActivity(text);
    if (!activity) return null;

    return { activity, duration };
  }

  extractDuration(text) {
    // Improved regex to handle more duration formats
    const patterns = [
      // "60 seconds", "2 minutes", "1 min", "30s"
      /(\d+)\s*(m|min|minutes?|s|sec|seconds?)(?:\s|$)/i,
      // "for 60s", "for 2 min"
      /for\s+(\d+)\s*(m|min|minutes?|s|sec|seconds?)/i,
      // "1:30" (1 minute 30 seconds)
      /(\d+):(\d{2})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[0].includes(':')) {
          // Handle MM:SS format
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          const totalSeconds = minutes * 60 + seconds;
          return { value: totalSeconds, unit: 'seconds' };
        } else {
          const value = parseInt(match[1]);
          const unitStr = match[2] || 's';
          const unit = unitStr.toLowerCase().startsWith('m') ? 'minutes' : 'seconds';
          return { value, unit };
        }
      }
    }

    return null;
  }

  extractActivity(text) {
    // Remove duration patterns and clean up the activity name
    let activity = text
      // Remove duration patterns
      .replace(/\d+:\d{2}/g, '')
      .replace(/for\s+\d+\s*(m|min|minutes?|s|sec|seconds?)/gi, '')
      .replace(/\d+\s*(m|min|minutes?|s|sec|seconds?)/gi, '')
      // Remove "for" at the end
      .replace(/\s+for\s*$/i, '')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();

    // Common activity mappings
    const activityMap = {
      'run': 'Run',
      'jog': 'Jog',
      'walk': 'Walk',
      'sprint': 'Sprint',
      'rest': 'Rest',
      'recover': 'Recover',
      'warm up': 'Warm up',
      'warmup': 'Warm up',
      'cool down': 'Cool down',
      'cooldown': 'Cool down',
      'easy': 'Easy pace',
      'moderate': 'Moderate pace',
      'hard': 'Hard pace',
      'fast': 'Fast pace'
    };

    // Check if we have a known activity
    const lowerActivity = activity.toLowerCase();
    for (const [key, value] of Object.entries(activityMap)) {
      if (lowerActivity.includes(key)) {
        return value;
      }
    }

    // If not found in map, capitalize first letter of each word
    if (activity) {
      return activity.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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
        const durationStr = this.formatDuration(step.duration);
        stepElement.innerHTML = `
          <sl-icon name="arrow-right-circle"></sl-icon>
          <span>${step.activity} for ${durationStr}</span>
        `;
      } else if (step.type === 'repeat-count') {
        const stepsStr = step.stepsToRepeat.length === 1 ? 'step' : 'steps';
        stepElement.innerHTML = `
          <sl-icon name="arrow-repeat"></sl-icon>
          <span>Repeat previous ${step.stepsToRepeat.length} ${stepsStr} ${step.count} times</span>
        `;
      } else if (step.type === 'repeat-duration') {
        const durationStr = this.formatDuration(step.duration);
        const stepsStr = step.stepsToRepeat.length === 1 ? 'step' : 'steps';
        stepElement.innerHTML = `
          <sl-icon name="arrow-repeat"></sl-icon>
          <span>Repeat previous ${step.stepsToRepeat.length} ${stepsStr} for ${durationStr}</span>
        `;
      }

      workoutSteps.appendChild(stepElement);
    });
  }

  formatDuration(duration) {
    if (duration.unit === 'seconds' && duration.value >= 60) {
      const minutes = Math.floor(duration.value / 60);
      const seconds = duration.value % 60;
      if (seconds === 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    return `${duration.value} ${duration.unit}`;
  }
}

customElements.define('workout-instructions', WorkoutInstructions); 