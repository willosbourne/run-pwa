class SilentAudio extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audioElement = null;
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
      <audio id="silentAudio" loop preload="auto">
        <source src="/audio/silent.mp3" type="audio/mpeg">
      </audio>
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
      if (!document.hidden && this.audioElement?.paused) {
        console.log('Resuming audio after visibility change');
        this.audioElement.play().catch(e => {
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

      if (!this.audioElement) {
        this.audioElement = this.shadowRoot.getElementById('silentAudio');
        this.audioElement.setAttribute('playsinline', '');
        this.audioElement.setAttribute('webkit-playsinline', '');
        
        // Set up audio element event listeners
        this.audioElement.addEventListener('playing', () => {
          console.log('Silent audio started playing');
        });
        
        this.audioElement.addEventListener('pause', () => {
          console.log('Silent audio paused');
        });
        
        this.audioElement.addEventListener('error', (e) => {
          console.error('Silent audio error:', e);
        });

        // Set volume to 0 (silent)
        this.audioElement.volume = 0;
      }

      // Start playing the silent audio
      try {
        await this.audioElement.play();
        console.log('Silent audio playing successfully');
        this.isInitialized = true;
      } catch (error) {
        console.error('Error playing silent audio:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error initializing silent audio:', error);
      
      // If initialization fails, try again on next user interaction
      this.isInitialized = false;
      this.audioElement = null;
    }
  }

  stopAudio() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {
        console.warn('Error stopping audio:', e);
      }
    }
    this.isInitialized = false;
    this.initializationAttempts = 0;
  }
}

customElements.define('silent-audio', SilentAudio); 