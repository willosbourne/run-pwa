class LocationTracker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.watchId = null;
    this.locations = [];
    this.currentWorkoutSteps = [];
    this.currentStepIndex = 0;
    this.isTracking = false;
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
        
        .distance-display {
          text-align: center;
          font-size: 1.5rem;
          margin: var(--spacing-md) 0;
        }
        
        .step-distances {
          margin-top: var(--spacing-md);
        }
        
        .step-distance {
          display: flex;
          justify-content: space-between;
          padding: var(--spacing-sm);
          border-bottom: 1px solid var(--background-color);
        }
      </style>
      
      <div class="container">
        <div class="distance-display">
          Total Distance: <span id="totalDistance">0.00</span> km
        </div>
        <div class="step-distances" id="stepDistances"></div>
      </div>
    `;
  }

  setupEventListeners() {
    document.addEventListener('workoutStarted', () => this.startTracking());
    document.addEventListener('workoutStopped', () => this.stopTracking());
    document.addEventListener('workoutStepChanged', (e) => {
      this.currentStepIndex = e.detail.stepIndex;
      this.updateStepDistances();
    });
  }

  startTracking() {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by your browser');
      return;
    }

    this.isTracking = true;
    this.locations = [];
    this.currentStepIndex = 0;

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleNewPosition(position),
      (error) => console.error('Error getting location:', error),
      options
    );
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.updateStepDistances();
  }

  handleNewPosition(position) {
    if (!this.isTracking) return;

    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timestamp: position.timestamp,
      stepIndex: this.currentStepIndex
    };

    this.locations.push(newLocation);
    this.updateTotalDistance();
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  updateTotalDistance() {
    let totalDistance = 0;
    for (let i = 1; i < this.locations.length; i++) {
      const prev = this.locations[i - 1];
      const curr = this.locations[i];
      totalDistance += this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
    }

    const totalDistanceElement = this.shadowRoot.getElementById('totalDistance');
    totalDistanceElement.textContent = totalDistance.toFixed(2);
  }

  updateStepDistances() {
    const stepDistancesElement = this.shadowRoot.getElementById('stepDistances');
    stepDistancesElement.innerHTML = '';

    // Group locations by step index
    const stepLocations = {};
    this.locations.forEach(location => {
      if (!stepLocations[location.stepIndex]) {
        stepLocations[location.stepIndex] = [];
      }
      stepLocations[location.stepIndex].push(location);
    });

    // Calculate and display distance for each step
    Object.entries(stepLocations).forEach(([stepIndex, locations]) => {
      let stepDistance = 0;
      for (let i = 1; i < locations.length; i++) {
        const prev = locations[i - 1];
        const curr = locations[i];
        stepDistance += this.calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
      }

      const stepElement = document.createElement('div');
      stepElement.className = 'step-distance';
      stepElement.innerHTML = `
        <span>Step ${parseInt(stepIndex) + 1}</span>
        <span>${stepDistance.toFixed(2)} km</span>
      `;
      stepDistancesElement.appendChild(stepElement);
    });
  }
}

customElements.define('location-tracker', LocationTracker); 