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
    this.audioElement = null;
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
      <audio id="silentAudio" loop></audio>
    `;
  }

  setupEventListeners() {
    console.log('Setting up silent-audio event listeners');
    
    // Listen for the start of a workout
    document.addEventListener('workoutStarted', () => {
      console.log('Workout started event received');
      this.attemptInitializeAudio();
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
      if (!document.hidden && this.audioContext?.state === 'suspended') {
        console.log('Resuming audio after visibility change');
        this.audioContext.resume();
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

      // Create audio element for iOS background audio
      if (!this.audioElement) {
        this.audioElement = this.shadowRoot.getElementById('silentAudio');
        this.audioElement.setAttribute('playsinline', '');
        this.audioElement.setAttribute('webkit-playsinline', '');
      }

      if (!this.audioContext) {
        console.log('Creating new AudioContext');
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext({
          latencyHint: 'interactive',
          sampleRate: 44100
        });
      }

      // Resume the context if it's suspended
      if (this.audioContext.state === 'suspended') {
        console.log('AudioContext is suspended, attempting to resume');
        await this.audioContext.resume();
        console.log('AudioContext resumed, new state:', this.audioContext.state);
      }

      if (!this.oscillator) {
        console.log('Creating new oscillator and gain node');
        this.oscillator = this.audioContext.createOscillator();
        this.gainNode = this.audioContext.createGain();

        // Set up a more audible frequency and volume for debugging
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3 note
        console.log('Set oscillator frequency to 220 Hz');
        
        // Set gain to an audible level for debugging
        this.gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        console.log('Set gain to 0.1 (10% volume)');

        // Connect the nodes
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        console.log('Connected audio nodes');

        // Start the oscillator
        this.oscillator.start();
        console.log('Started audible sine wave for debugging');

        // For iOS, also start the audio element
        if (this.audioElement) {
          this.audioElement.play().catch(e => {
            console.warn('Error playing audio element:', e);
          });
        }
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
    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch (e) {
        console.warn('Error pausing audio element:', e);
      }
    }
    this.isInitialized = false;
    this.initializationAttempts = 0;
  }
}

customElements.define('silent-audio', SilentAudio); 