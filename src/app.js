// Initialize the app
class RunApp {
  constructor() {
    this.initializeApp();
  }

  async initializeApp() {
    // Check if geolocation is available
    if ('geolocation' in navigator) {
      console.log('Geolocation is available');
    } else {
      console.error('Geolocation is not available');
    }

    // Initialize IndexedDB
    this.initializeDatabase();

    // Set up event listeners
    this.setupEventListeners();
  }

  initializeDatabase() {
    // TODO: Set up IndexedDB for storing run data
    console.log('Database initialization will be implemented');
  }

  setupEventListeners() {
    // Get the workout instructions component
    const workoutInstructions = document.querySelector('workout-instructions');
    const workoutTimer = document.querySelector('workout-timer');

    // Listen for custom event when workout is parsed
    workoutInstructions.addEventListener('workoutParsed', (event) => {
      workoutTimer.setWorkoutSteps(event.detail.steps);
    });
  }
}

// Start the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new RunApp();
}); 