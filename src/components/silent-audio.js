class SilentAudio extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audioElement = null;
    this.audioContext = null;
    this.audioSource = null;
    this.isInitialized = false;
    this.initializationAttempts = 0;
    this.maxAttempts = 3;
    this.currentStep = null;
    this.workoutSteps = [];
    this.isPlaying = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.stopAudio();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
        }
      </style>
    `;
  }

  setupEventListeners() {
    console.log('Setting up silent-audio event listeners');

    // Listen for workout parsed to get all steps
    document.addEventListener('workoutParsed', (event) => {
      console.log('Workout parsed event received');
      this.workoutSteps = event.detail.steps || [];
    });

    // Listen for the start of a workout
    document.addEventListener('workoutStarted', () => {
      console.log('Workout started event received');
      this.currentStep = 0;
      this.attemptInitializeAudio();
    });

    // Listen for step changes
    document.addEventListener('workoutStepChanged', (event) => {
      console.log('Workout step changed event received', event.detail);
      this.currentStep = event.detail.stepIndex;
      if (this.isInitialized && this.isPlaying) {
        this.playStepAudio();
      }
    });

    // Listen for workout stopped
    document.addEventListener('workoutStopped', () => {
      console.log('Workout stopped event received');
      this.stopAudio();
    });

    // Listen for any user interaction
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    userInteractionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        console.log(`User interaction (${eventType}) received`);
        this.attemptInitializeAudio();
      }, { once: true });
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying && this.audioContext?.state === 'suspended') {
        console.log('Resuming audio after visibility change');
        this.audioContext.resume().catch(e => {
          console.warn('Error resuming audio after visibility change:', e);
        });
      }
    });
  }

  async attemptInitializeAudio() {
    if (this.isInitialized || this.initializationAttempts >= this.maxAttempts) {
      console.log(`Skipping audio initialization: isInitialized=${this.isInitialized}, attempts=${this.initializationAttempts}`);
      return;
    }

    this.initializationAttempts++;
    console.log(`Attempting to initialize audio (attempt ${this.initializationAttempts})`);

    try {
      // Set up audio session for iOS
      if (window.webkit?.messageHandlers?.audioSession) {
        console.log('Setting up iOS audio session');
        window.webkit.messageHandlers.audioSession.postMessage({
          category: 'playback',
          options: ['mixWithOthers', 'duckOthers']
        });
      }

      // Create AudioContext if not already created
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext created');
      }

      // Resume context if suspended (required by browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      }

      this.isInitialized = true;
      this.isPlaying = true;
      console.log('Audio system initialized successfully');

      // Initialize Media Session API if available
      this.initializeMediaSession();

      // Start playing audio for the current step
      this.playStepAudio();

    } catch (error) {
      console.error('Error initializing audio:', error);

      // If initialization fails, try again on next user interaction
      this.isInitialized = false;
      this.audioContext = null;
    }
  }

  /**
   * Generate a silent audio buffer with the specified duration
   */
  generateSilentBuffer(durationSeconds) {
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = sampleRate * durationSeconds;
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);

    // The buffer is already filled with zeros (silence), but we can be explicit
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = 0;
    }

    return buffer;
  }

  /**
   * Play audio for the current workout step
   */
  playStepAudio() {
    if (!this.audioContext || this.currentStep === null) {
      console.log('Cannot play step audio: context or step not ready');
      return;
    }

    // Get current step information
    const step = this.workoutSteps[this.currentStep];
    if (!step) {
      console.warn('Current step not found:', this.currentStep);
      return;
    }

    const duration = step.duration || 60; // Default to 60 seconds if not specified
    const stepName = step.description || step.name || `Step ${this.currentStep + 1}`;

    console.log(`Playing silent audio for step: ${stepName} (${duration}s)`);

    // Stop current audio source if playing
    if (this.audioSource) {
      try {
        this.audioSource.stop();
        this.audioSource.disconnect();
      } catch (e) {
        // Ignore errors from already stopped sources
      }
    }

    // Generate silent buffer for this step's duration
    const buffer = this.generateSilentBuffer(duration);

    // Create buffer source
    this.audioSource = this.audioContext.createBufferSource();
    this.audioSource.buffer = buffer;
    this.audioSource.connect(this.audioContext.destination);

    // Set up event for when this audio completes
    this.audioSource.onended = () => {
      console.log('Step audio completed');
      // Note: The workout-timer will trigger the next step, which will call playStepAudio again
    };

    // Start playing
    this.audioSource.start(0);

    // Update Media Session metadata
    this.updateMediaSession(stepName, duration);
  }

  /**
   * Initialize Media Session API for showing step info in OS controls
   */
  initializeMediaSession() {
    if (!('mediaSession' in navigator)) {
      console.log('Media Session API not supported');
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Workout in Progress',
        artist: 'Run PWA',
        album: 'Workout',
      });

      console.log('Media Session initialized');
    } catch (error) {
      console.warn('Error initializing Media Session:', error);
    }
  }

  /**
   * Update Media Session with current step information
   */
  updateMediaSession(stepName, duration) {
    if (!('mediaSession' in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: stepName,
        artist: 'Run PWA',
        album: 'Workout',
      });

      console.log(`Media Session updated: ${stepName} (${duration}s)`);
    } catch (error) {
      console.warn('Error updating Media Session:', error);
    }
  }

  stopAudio() {
    console.log('Stopping audio');

    // Stop current audio source
    if (this.audioSource) {
      try {
        this.audioSource.stop();
        this.audioSource.disconnect();
      } catch (e) {
        // Ignore errors from already stopped sources
      }
      this.audioSource = null;
    }

    // Close audio context
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.isPlaying = false;
    this.initializationAttempts = 0;
    this.currentStep = null;
  }
}

customElements.define('silent-audio', SilentAudio); 