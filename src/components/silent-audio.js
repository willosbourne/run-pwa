class SilentAudio extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isInitialized = false;
    this.initializationAttempts = 0;
    this.maxAttempts = 3;
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
    // Listen for the start of a workout
    document.addEventListener('workoutStarted', () => {
      this.attemptInitializeAudio();
    });

    // Listen for any user interaction
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    userInteractionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.attemptInitializeAudio();
      }, { once: true });
    });
  }

  async attemptInitializeAudio() {
    if (this.isInitialized || this.initializationAttempts >= this.maxAttempts) return;
    
    this.initializationAttempts++;
    console.log(`Attempting to initialize audio (attempt ${this.initializationAttempts})`);

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Resume the context if it's suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!this.oscillator) {
        this.oscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();

        // Set up a very low frequency (1 Hz) and volume
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(1, this.audioContext.currentTime);
        
        // Set gain to a very low value (effectively silent)
        this.gainNode.gain.setValueAtTime(0.0001, this.audioContext.currentTime);

        // Connect the nodes
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        // Start the oscillator
        this.oscillator.start();
      }

      this.isInitialized = true;
      console.log('Silent audio initialized successfully');
    } catch (error) {
      console.error('Error initializing silent audio:', error);
      
      // If initialization fails, try again on next user interaction
      this.isInitialized = false;
      this.audioContext = null;
      this.oscillator = null;
      this.gainNode = null;
    }
  }

  stopAudio() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {
        console.warn('Error stopping oscillator:', e);
      }
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {
        console.warn('Error disconnecting gain node:', e);
      }
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
    }
    this.isInitialized = false;
    this.initializationAttempts = 0;
  }
}

customElements.define('silent-audio', SilentAudio); 