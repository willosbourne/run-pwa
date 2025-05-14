// Initialize the app
class RunApp {
  constructor() {
    this.initializeApp();
  }

  async initializeApp() {
    // Check if geolocation is available
    if ('geolocation' in navigator) {
      try {
        // Request permission for geolocation
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          console.log('Geolocation permission granted');
        } else if (permission.state === 'prompt') {
          console.log('Geolocation permission will be requested when needed');
        } else {
          console.error('Geolocation permission denied');
        }
      } catch (error) {
        console.error('Error checking geolocation permission:', error);
      }
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
    const locationTracker = document.querySelector('location-tracker');

    // Listen for custom event when workout is parsed
    workoutInstructions.addEventListener('workoutParsed', (event) => {
      workoutTimer.setWorkoutSteps(event.detail.steps);
    });
  }
}

// Create and export the app instance
const app = new RunApp();
export default app; 