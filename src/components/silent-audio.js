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
    console.log('🔊 SilentAudio component connected');
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
    console.log('🔊 Setting up silent-audio event listeners');

    // Listen for workout parsed to get all steps
    document.addEventListener('workoutParsed', (event) => {
      console.log('🔊 Workout parsed event received, steps:', event.detail.steps);
      this.workoutSteps = event.detail.steps || [];
      console.log('🔊 Stored workout steps:', this.workoutSteps);
    });

    // Listen for the start of a workout
    document.addEventListener('workoutStarted', async () => {
      console.log('🔊 ✅ WORKOUT STARTED EVENT RECEIVED!');
      console.log('🔊 Current workout steps:', this.workoutSteps);
      this.currentStep = 0;
      console.log('🔊 Set currentStep to 0');

      if (this.isInitialized) {
        console.log('🔊 Already initialized, starting audio playback directly');
        this.isPlaying = true;
        await this.playStepAudio();
      } else {
        console.log('🔊 Not initialized yet, attempting initialization...');
        await this.attemptInitializeAudio();
      }
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
      if (!document.hidden && this.isPlaying && this.audioElement?.paused) {
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
      // Set up audio session for iOS - use mixWithOthers without duckOthers
      // This allows the silent audio to play alongside music/podcasts without lowering their volume
      if (window.webkit?.messageHandlers?.audioSession) {
        console.log('Setting up iOS audio session');
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

        // Set up audio element event listeners
        this.audioElement.addEventListener('playing', () => {
          console.log('Silent audio started playing');
        });

        this.audioElement.addEventListener('ended', () => {
          console.log('Silent audio track ended');
          // The workout-timer will trigger the next step
        });

        this.audioElement.addEventListener('error', (e) => {
          console.error('Silent audio error:', e);
        });

        // Set volume to 0.1 (10% - audible but quiet for testing)
        this.audioElement.volume = 0.1;
      }

      // Create AudioContext if not already created (for generating audio data)
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext created');
      }

      this.isInitialized = true;
      console.log('Audio system initialized successfully');

      // Initialize Media Session API if available
      this.initializeMediaSession();

      // Only start playing audio if we have a valid current step
      // (i.e., if this was called from workoutStarted, not just from user interaction)
      if (this.currentStep !== null) {
        console.log('🔊 Current step is set, starting audio playback');
        await this.playStepAudio();
      } else {
        console.log('🔊 No current step yet, waiting for workout to start');
      }

    } catch (error) {
      console.error('Error initializing audio:', error);

      // If initialization fails, try again on next user interaction
      this.isInitialized = false;
      this.audioContext = null;
      this.audioElement = null;
    }
  }

  /**
   * Generate an audio buffer with a gentle tone for the specified duration
   * Using a low-volume, low-frequency tone so it's audible but not intrusive
   */
  generateSilentBuffer(durationSeconds) {
    const sampleRate = this.audioContext.sampleRate;
    const numSamples = sampleRate * durationSeconds;
    const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);

    const channelData = buffer.getChannelData(0);
    const frequency = 220; // A3 note - a gentle, low frequency
    const volume = 0.05; // Very quiet - 5% volume

    // Generate a sine wave tone
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * volume;
    }

    return buffer;
  }

  /**
   * Play audio for the current workout step
   */
  async playStepAudio() {
    console.log('🔊 playStepAudio called');
    console.log('🔊 audioContext exists:', !!this.audioContext);
    console.log('🔊 audioElement exists:', !!this.audioElement);
    console.log('🔊 currentStep:', this.currentStep);
    console.log('🔊 workoutSteps length:', this.workoutSteps.length);

    if (!this.audioContext || !this.audioElement || this.currentStep === null) {
      console.error('🔊 ❌ Cannot play step audio: missing requirements');
      return;
    }

    // Get current step information
    const step = this.workoutSteps[this.currentStep];
    console.log('🔊 Current step object:', JSON.stringify(step));

    if (!step) {
      console.error('🔊 ❌ Current step not found at index:', this.currentStep);
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

    console.log(`🔊 Playing audio for: ${stepName} (${duration}s)`);

    // Revoke previous object URL to free memory
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }

    // Generate audio buffer for this step's duration
    console.log('Generating audio buffer...');
    const buffer = this.generateSilentBuffer(duration);
    console.log(`Buffer created: ${buffer.length} samples, ${buffer.duration}s`);

    // Convert AudioBuffer to WAV blob
    console.log('Converting buffer to WAV blob...');
    const wavBlob = this.audioBufferToWav(buffer);
    console.log(`WAV blob created: ${wavBlob.size} bytes, type: ${wavBlob.type}`);

    // Create object URL for the blob
    this.currentObjectURL = URL.createObjectURL(wavBlob);
    console.log(`Object URL created: ${this.currentObjectURL}`);

    // Set the audio element source and play
    this.audioElement.src = this.currentObjectURL;

    try {
      console.log('About to call play() on audio element...');
      await this.audioElement.play();
      this.isPlaying = true;
      console.log(`✅ Audio playing successfully for step: ${stepName} (${duration}s)`);
      console.log(`Audio element state: paused=${this.audioElement.paused}, currentTime=${this.audioElement.currentTime}, duration=${this.audioElement.duration}`);

      // Update Media Session metadata
      this.updateMediaSession(stepName, duration);
    } catch (error) {
      console.error('❌ Error playing step audio:', error);
      console.error('Error details:', error.name, error.message);
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