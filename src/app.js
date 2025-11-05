import databaseService from './services/database.js';

// Initialize the app
class RunApp {
  constructor() {
    this.currentWorkoutData = null;
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
    await this.initializeDatabase();

    // Set up event listeners
    this.setupEventListeners();
  }

  async initializeDatabase() {
    try {
      await databaseService.initialize();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  setupEventListeners() {
    // Get the workout instructions component
    const workoutInstructions = document.querySelector('workout-instructions');
    const workoutTimer = document.querySelector('workout-timer');
    const locationTracker = document.querySelector('location-tracker');

    // Listen for custom event when workout is parsed
    workoutInstructions.addEventListener('workoutParsed', (event) => {
      workoutTimer.setWorkoutSteps(event.detail.steps);
      // Store the workout instructions for later saving
      this.currentWorkoutData = {
        workoutSteps: event.detail.steps,
        workoutText: workoutInstructions.shadowRoot.getElementById('workoutText').value
      };
    });

    // Listen for workout completion to save run data
    document.addEventListener('workoutCompleted', async (event) => {
      await this.saveRunData(event.detail);
    });
  }

  async saveRunData(workoutData) {
    try {
      const runData = {
        datetime: new Date().toISOString(),
        distance: workoutData.totalDistance,
        distanceUnit: 'km',
        duration: workoutData.totalDuration,
        durationUnit: 'seconds',
        workoutPlan: this.currentWorkoutData?.workoutText || '',
        workoutSteps: this.currentWorkoutData?.workoutSteps || [],
        stepDistances: workoutData.stepDistances || [],
        locations: workoutData.locations || []
      };

      const id = await databaseService.saveRun(runData);
      console.log('Run data saved with id:', id);

      // Dispatch event to notify other components
      document.dispatchEvent(new CustomEvent('runSaved', {
        detail: { id, runData }
      }));
    } catch (error) {
      console.error('Failed to save run data:', error);
    }
  }
}

// Create and export the app instance
const app = new RunApp();
export default app; 