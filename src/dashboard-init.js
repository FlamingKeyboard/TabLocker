// Dashboard initialization script
document.addEventListener('DOMContentLoaded', () => {
  // Check if the tablocker.js has loaded properly
  if (typeof window.init === 'function') {
    window.init();
  } else {
    // Fallback if the main script hasn't loaded
    const contentDiv = document.getElementById('dashboardContent');
    if (contentDiv) {
      contentDiv.innerHTML = `
        <div class="dashboard-empty-state">
          <div class="dashboard-empty-state-icon">⚠️</div>
          <div class="dashboard-empty-state-text">
            There was an error loading the dashboard. 
            <br><br>
            Please try reloading the page or check the console for errors.
          </div>
          <button id="reloadButton" class="dashboard-button">Reload Page</button>
        </div>
      `;
      
      // Add event listener to reload button
      const reloadButton = document.getElementById('reloadButton');
      if (reloadButton) {
        reloadButton.addEventListener('click', () => {
          location.reload();
        });
      }
    }
  }
});
