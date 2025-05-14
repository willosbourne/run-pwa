class SilentAudio extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isInitialized = false;
  }

  connectedCallback() {
    this.render();
    // Don't initialize audio immediately - wait for user interaction
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
      if (!this.isInitialized) {
        this.initializeAudio();
      } else {
        this.resumeAudio();
      }
    });

    // Also initialize on any click in the document
    document.addEventListener('click', () => {
      if (!this.isInitialized) {
        this.initializeAudio();
      }
    }, { once: true });
  }

  async initializeAudio() {
    try {
      if (this.isInitialized) return;

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
      this.isInitialized = true;

      console.log('Silent audio initialized successfully');
    } catch (error) {
      console.error('Error initializing silent audio:', error);
    }
  }

  async resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('Audio context resumed');
      } catch (error) {
        console.error('Error resuming audio context:', error);
      }
    }
  }

  stopAudio() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
}

customElements.define('silent-audio', SilentAudio); 