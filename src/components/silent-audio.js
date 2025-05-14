class SilentAudio extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
  }

  connectedCallback() {
    this.render();
    this.initializeAudio();
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

  async initializeAudio() {
    try {
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
    } catch (error) {
      console.error('Error initializing silent audio:', error);
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
  }
}

customElements.define('silent-audio', SilentAudio); 