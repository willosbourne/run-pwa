// IndexedDB service for storing run data
class DatabaseService {
  constructor() {
    this.dbName = 'RunPWA';
    this.version = 1;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database failed to open');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for runs if it doesn't exist
        if (!db.objectStoreNames.contains('runs')) {
          const objectStore = db.createObjectStore('runs', {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes for querying
          objectStore.createIndex('datetime', 'datetime', { unique: false });
          objectStore.createIndex('distance', 'distance', { unique: false });

          console.log('Runs object store created');
        }
      };
    });
  }

  async saveRun(runData) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['runs'], 'readwrite');
      const objectStore = transaction.objectStore('runs');

      // Add timestamp if not present
      if (!runData.datetime) {
        runData.datetime = new Date().toISOString();
      }

      const request = objectStore.add(runData);

      request.onsuccess = () => {
        console.log('Run saved successfully with id:', request.result);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error saving run:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllRuns() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['runs'], 'readonly');
      const objectStore = transaction.objectStore('runs');
      const request = objectStore.getAll();

      request.onsuccess = () => {
        // Sort by datetime descending (most recent first)
        const runs = request.result.sort((a, b) =>
          new Date(b.datetime) - new Date(a.datetime)
        );
        resolve(runs);
      };

      request.onerror = () => {
        console.error('Error getting runs:', request.error);
        reject(request.error);
      };
    });
  }

  async getRun(id) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['runs'], 'readonly');
      const objectStore = transaction.objectStore('runs');
      const request = objectStore.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error getting run:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteRun(id) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['runs'], 'readwrite');
      const objectStore = transaction.objectStore('runs');
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log('Run deleted successfully');
        resolve();
      };

      request.onerror = () => {
        console.error('Error deleting run:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
