if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              showUpdateNotification();
            }
          });
        });
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });

    // Listen for controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary-color);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 16px;
  `;
  
  notification.innerHTML = `
    <span>A new version is available!</span>
    <sl-button size="small" variant="primary">Update Now</sl-button>
  `;
  
  document.body.appendChild(notification);
  
  const updateButton = notification.querySelector('sl-button');
  updateButton.addEventListener('click', () => {
    window.location.reload();
  });
} 