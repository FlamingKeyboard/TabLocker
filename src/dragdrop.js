// Drag and drop functionality for TabLocker

/**
 * Initialize drag and drop functionality for tab items
 * @param {HTMLElement} container - The container element for all draggable items
 * @param {Function} onReorder - Callback function when items are reordered
 */
export function initDragAndDrop(container, onReorder) {
  console.log('Initializing drag and drop functionality');
  
  // Store references to dragged elements
  let draggedItem = null;
  let sourceSessionId = null;
  let sourceIndex = null;
  
  // Function to add drag-hint elements to all session items
  function addDragHints() {
    const sessionItems = container.querySelectorAll('.session-item');
    sessionItems.forEach(sessionItem => {
      // Only add if it doesn't already exist
      if (!sessionItem.querySelector('.drag-hint')) {
        const dragHint = document.createElement('div');
        dragHint.className = 'drag-hint';
        dragHint.textContent = 'Drag tabs to reorder or move between sessions';
        sessionItem.appendChild(dragHint);
      }
    });
  }
  
  // Add drag hints
  addDragHints();
  
  // Add event listeners to all tab items
  function setupDragListeners() {
    const tabItems = container.querySelectorAll('.tab-item');
    
    tabItems.forEach(item => {
      // Remove existing listeners to prevent duplicates
      item.removeEventListener('dragstart', handleDragStart);
      item.removeEventListener('dragend', handleDragEnd);
      
      // Add draggable attribute
      item.setAttribute('draggable', 'true');
      
      // Add new listeners
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
    });
    
    // Add event listeners to all tab lists
    const tabLists = container.querySelectorAll('.tab-list');
    
    tabLists.forEach(list => {
      // Remove existing listeners to prevent duplicates
      list.removeEventListener('dragover', handleDragOver);
      list.removeEventListener('dragenter', handleDragEnter);
      list.removeEventListener('dragleave', handleDragLeave);
      list.removeEventListener('drop', handleDrop);
      
      // Add new listeners
      list.addEventListener('dragover', handleDragOver);
      list.addEventListener('dragenter', handleDragEnter);
      list.addEventListener('dragleave', handleDragLeave);
      list.addEventListener('drop', handleDrop);
    });
  }
  
  // Set up initial listeners
  setupDragListeners();
  
  // Handle the start of a drag operation
  function handleDragStart(e) {
    console.log('Drag started');
    draggedItem = e.target;
    draggedItem.classList.add('dragging');
    
    // Get the session ID and index
    const sessionItem = draggedItem.closest('.session-item');
    sourceSessionId = sessionItem.getAttribute('data-session-id');
    sourceIndex = parseInt(draggedItem.getAttribute('data-index'));
    
    // Set the drag image (optional)
    if (e.dataTransfer.setDragImage) {
      const dragImage = draggedItem.cloneNode(true);
      dragImage.style.opacity = '0.8';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
    
    // Set the data transfer
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sourceIndex.toString());
    
    // Add a class to the body to indicate dragging is in progress
    document.body.classList.add('dragging-in-progress');
  }
  
  // Handle the end of a drag operation
  function handleDragEnd(e) {
    console.log('Drag ended');
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    
    // Remove drag-over class from all tab lists
    const tabLists = container.querySelectorAll('.tab-list');
    tabLists.forEach(list => {
      list.classList.remove('drag-over');
    });
    
    // Remove the dragging class from the body
    document.body.classList.remove('dragging-in-progress');
  }
  
  // Handle dragover event
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  // Handle dragenter event
  function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }
  
  // Handle dragleave event
  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }
  
  // Handle drop event
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove drag-over class
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedItem) return;
    
    // Get the target session ID
    const targetSessionItem = e.currentTarget.closest('.session-item');
    const targetSessionId = targetSessionItem.getAttribute('data-session-id');
    
    // Determine the target index
    let targetIndex;
    const tabItems = Array.from(e.currentTarget.querySelectorAll('.tab-item'));
    
    // If dropping directly on a tab list with no items
    if (tabItems.length === 0) {
      targetIndex = 0;
    } else {
      // Find the closest tab item to the drop position
      const mouseY = e.clientY;
      
      // Find the tab item closest to the drop position
      let closestItem = null;
      let closestDistance = Infinity;
      
      tabItems.forEach(item => {
        const rect = item.getBoundingClientRect();
        const itemMiddle = rect.top + rect.height / 2;
        const distance = Math.abs(mouseY - itemMiddle);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestItem = item;
        }
      });
      
      if (closestItem) {
        const rect = closestItem.getBoundingClientRect();
        const itemMiddle = rect.top + rect.height / 2;
        
        // If the mouse is above the middle of the closest item, insert before it
        // Otherwise, insert after it
        if (mouseY < itemMiddle) {
          targetIndex = parseInt(closestItem.getAttribute('data-index'));
        } else {
          targetIndex = parseInt(closestItem.getAttribute('data-index')) + 1;
        }
      } else {
        // Fallback to the end of the list
        targetIndex = tabItems.length;
      }
    }
    
    // Create the reorder info object
    const reorderInfo = {
      sourceSessionId,
      targetSessionId,
      sourceIndex,
      targetIndex
    };
    
    console.log('Drop event with reorder info:', reorderInfo);
    
    // Call the onReorder callback
    onReorder(reorderInfo);
    
    // Show visual feedback
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'drop-feedback';
    feedbackElement.textContent = 'Tab moved!';
    feedbackElement.style.position = 'absolute';
    feedbackElement.style.left = `${e.clientX}px`;
    feedbackElement.style.top = `${e.clientY}px`;
    feedbackElement.style.backgroundColor = '#4285f4';
    feedbackElement.style.color = 'white';
    feedbackElement.style.padding = '8px 12px';
    feedbackElement.style.borderRadius = '4px';
    feedbackElement.style.zIndex = '1000';
    feedbackElement.style.opacity = '0';
    feedbackElement.style.transition = 'opacity 0.3s';
    
    document.body.appendChild(feedbackElement);
    
    // Animate the feedback
    setTimeout(() => {
      feedbackElement.style.opacity = '1';
    }, 0);
    
    setTimeout(() => {
      feedbackElement.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(feedbackElement);
      }, 300);
    }, 1500);
  }
  
  // Re-initialize when sessions change
  return {
    refresh: () => {
      console.log('Refreshing drag and drop listeners');
      setupDragListeners();
      addDragHints();
    }
  };
}

/**
 * Reorder tabs within or between sessions
 * @param {Object} sessions - The current sessions data
 * @param {Object} reorderInfo - Information about the reorder operation
 * @returns {Object} - The updated sessions data
 */
export function reorderTabs(sessions, reorderInfo) {
  console.log('Reordering tabs with info:', reorderInfo);
  
  // Create a deep copy of the sessions array
  const updatedSessions = JSON.parse(JSON.stringify(sessions));
  
  // Find the source and target sessions
  const sourceSession = updatedSessions.find(s => s.id === reorderInfo.sourceSessionId);
  const targetSession = updatedSessions.find(s => s.id === reorderInfo.targetSessionId);
  
  if (!sourceSession || !targetSession) {
    console.error('Source or target session not found');
    return sessions;
  }
  
  // Get the tab to move
  const [tabToMove] = sourceSession.tabs.splice(reorderInfo.sourceIndex, 1);
  
  // Insert the tab at the target position
  targetSession.tabs.splice(reorderInfo.targetIndex, 0, tabToMove);
  
  return updatedSessions;
}
