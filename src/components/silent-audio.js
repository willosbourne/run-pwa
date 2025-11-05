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
    this.currentObjectURL = null;
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
      <audio id="silentAudio" preload="auto"></audio>
    `;
  }

  setupEventListeners() {
    // Listen for workout parsed to get all steps
    document.addEventListener('workoutParsed', (event) => {
      this.workoutSteps = event.detail.steps || [];
    });

    // Listen for the start of a workout
    document.addEventListener('workoutStarted', async () => {
      this.currentStep = 0;

      if (this.isInitialized) {
        this.isPlaying = true;
        await this.playStepAudio();
      } else {
        await this.attemptInitializeAudio();
      }
    });

    // Listen for step changes
    document.addEventListener('workoutStepChanged', (event) => {
      this.currentStep = event.detail.stepIndex;
      if (this.isInitialized && this.isPlaying) {
        this.playStepAudio();
      }
    });

    // Listen for workout stopped
    document.addEventListener('workoutStopped', () => {
      this.stopAudio();
    });

    // Listen for any user interaction
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    userInteractionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.attemptInitializeAudio();
      }, { once: true });
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying && this.audioElement?.paused) {
        this.audioElement.play().catch(e => {
          console.warn('Error resuming audio after visibility change:', e);
        });
      }
    });
  }

  async attemptInitializeAudio() {
    if (this.isInitialized || this.initializationAttempts >= this.maxAttempts) {
      return;
    }

    this.initializationAttempts++;

    try {
      // Set up audio session for iOS - use mixWithOthers without duckOthers
      // This allows the silent audio to play alongside music/podcasts without lowering their volume
      if (window.webkit?.messageHandlers?.audioSession) {
        window.webkit.messageHandlers.audioSession.postMessage({
          category: 'playback',
          options: ['mixWithOthers']
        });
      }

      // Set up audio element if not already set up
      if (!this.audioElement) {
        this.audioElement = this.shadowRoot.getElementById('silentAudio');
        this.audioElement.setAttribute('playsinline', '');
        this.audioElement.setAttribute('webkit-playsinline', '');

        // Set volume to 0 (silent)
        this.audioElement.volume = 0;
      }

      // Create AudioContext if not already created (for generating audio data)
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      this.isInitialized = true;

      // Initialize Media Session API if available
      this.initializeMediaSession();

      // Only start playing audio if we have a valid current step
      if (this.currentStep !== null) {
        await this.playStepAudio();
      }

    } catch (error) {
      console.error('Error initializing audio:', error);
      this.isInitialized = false;
      this.audioContext = null;
      this.audioElement = null;
    }
  }

  /**
   * Generate a silent audio buffer with the specified duration
   */
  generateSilentBuffer(durationSeconds) {
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = sampleRate * durationSeconds;
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);

    // The buffer is already filled with zeros (silence) by default
    // No need to explicitly set values

    return buffer;
  }

  /**
   * Play audio for the current workout step
   */
  async playStepAudio() {
    if (!this.audioContext || !this.audioElement || this.currentStep === null) {
      return;
    }

    // Get current step information
    const step = this.workoutSteps[this.currentStep];
    if (!step) {
      return;
    }

    // Handle different step types - the parsed steps have duration as {value, unit}
    let duration, stepName;
    if (step.type === 'activity') {
      // Extract duration from activity step
      if (step.duration && typeof step.duration === 'object') {
        const durationValue = step.duration.value;
        const durationUnit = step.duration.unit;
        duration = durationUnit === 'minutes' ? durationValue * 60 : durationValue;
      } else {
        duration = step.duration || 60;
      }
      stepName = step.activity || `Step ${this.currentStep + 1}`;
    } else {
      duration = 60;
      stepName = `Step ${this.currentStep + 1}`;
    }

    // Revoke previous object URL to free memory
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }

    // Generate silent audio buffer for this step's duration
    const buffer = this.generateSilentBuffer(duration);

    // Convert AudioBuffer to WAV blob
    const wavBlob = this.audioBufferToWav(buffer);

    // Create object URL for the blob
    this.currentObjectURL = URL.createObjectURL(wavBlob);

    // Set the audio element source and play
    this.audioElement.src = this.currentObjectURL;

    try {
      await this.audioElement.play();
      this.isPlaying = true;

      // Update Media Session metadata
      this.updateMediaSession(stepName, duration);
    } catch (error) {
      console.error('Error playing step audio:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Convert AudioBuffer to WAV blob
   */
  audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = this.interleave(buffer);
    const dataLength = data.length * bytesPerSample;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    this.floatTo16BitPCM(view, 44, data);

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Interleave channels (for WAV format)
   */
  interleave(buffer) {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    }

    const length = buffer.length * buffer.numberOfChannels;
    const result = new Float32Array(length);

    let inputIndex = 0;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        result[inputIndex++] = buffer.getChannelData(channel)[i];
      }
    }
    return result;
  }

  /**
   * Write string to DataView
   */
  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Convert float audio samples to 16-bit PCM
   */
  floatTo16BitPCM(view, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  /**
   * Initialize Media Session API for showing step info in OS controls
   */
  initializeMediaSession() {
    if (!('mediaSession' in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Workout in Progress',
        artist: 'Run PWA',
        album: 'Workout',
      });
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
    } catch (error) {
      console.warn('Error updating Media Session:', error);
    }
  }

  stopAudio() {

    // Stop and clear audio element
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.src = '';
      } catch (e) {
        console.warn('Error stopping audio element:', e);
      }
    }

    // Revoke object URL to free memory
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
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