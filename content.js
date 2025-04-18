let mouseX = 0;
let mouseY = 0;
let currentPopup = null;
let isMouseOverPopup = false;

// Debug message handler
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "debug_log") {
    console.log("[DEBUG]", message.message);
  }
});

// Mouse tracking with improved positioning
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  
  // Reposition popup if mouse moves while visible
  if (currentPopup && !isMouseOverPopup) {
    positionPopup(currentPopup, mouseX, mouseY);
  }
});

// Enhanced text selection handler
document.addEventListener('mouseup', async (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    await showExplanation(selectedText, mouseX, mouseY);
  }
});

async function showExplanation(text, x, y) {
  showLoadingIndicator(x, y);
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: "explain_text", 
      text: text 
    });
    
    if (response?.explanation) {
      showPopup(response.explanation, x, y);
    } else if (response?.error) {
      showError(response.error, x, y);
    }
  } catch (error) {
    showError("Failed to get explanation", x, y);
  }
}

// Improved popup functions
function showPopup(explanation, x, y) {
  removeExistingPopup();
  
  const popup = document.createElement('div');
  popup.id = 'explainer-popup';
  popup.innerHTML = `
    <div class="popup-content">
      <div class="popup-header">Detailed Explanation</div>
      <div class="popup-body">${explanation}</div>
      <div class="popup-footer">Click anywhere to close</div>
    </div>
  `;
  
  stylePopup(popup);
  positionPopup(popup, x, y);
  setupPopupInteractions(popup);
  document.body.appendChild(popup);
  currentPopup = popup;
}

function showLoadingIndicator(x, y) {
  removeExistingPopup();
  
  const loader = document.createElement('div');
  loader.id = 'explainer-popup';
  loader.innerHTML = `
    <div class="popup-content">
      <div class="popup-header">Processing</div>
      <div class="popup-body">
        <div class="loader"></div>
        <div>Analyzing selection...</div>
      </div>
    </div>
  `;
  
  stylePopup(loader);
  positionPopup(loader, x, y);
  document.body.appendChild(loader);
  currentPopup = loader;
}

function showError(error, x, y) {
  removeExistingPopup();
  
  const errorPopup = document.createElement('div');
  errorPopup.id = 'explainer-popup';
  errorPopup.innerHTML = `
    <div class="popup-content error">
      <div class="popup-header">Error</div>
      <div class="popup-body">${error}</div>
    </div>
  `;
  
  stylePopup(errorPopup);
  positionPopup(errorPopup, x, y);
  document.body.appendChild(errorPopup);
  currentPopup = errorPopup;
}

// Styling and positioning
function stylePopup(element) {
  element.style.position = 'fixed';
  element.style.background = '#2d3748';
  element.style.color = 'white';
  element.style.border = '1px solid #4a5568';
  element.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
  element.style.zIndex = '2147483647'; // Maximum z-index
  element.style.maxWidth = '400px';
  element.style.borderRadius = '12px';
  element.style.transition = 'opacity 0.2s, transform 0.2s';
  element.style.opacity = '0';
  element.style.pointerEvents = 'auto';
  element.style.overflow = 'hidden';
  
  // Inject CSS for inner elements
  const style = document.createElement('style');
  style.textContent = `
    .popup-content {
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    .popup-header {
      padding: 12px 16px;
      font-weight: 600;
      font-size: 16px;
      background: #4a5568;
      border-bottom: 1px solid #4a5568;
    }
    .popup-body {
      padding: 16px;
      font-size: 15px;
      line-height: 1.5;
      max-height: 60vh;
      overflow-y: auto;
    }
    .popup-footer {
      padding: 8px 16px;
      font-size: 12px;
      color: #a0aec0;
      text-align: center;
      border-top: 1px solid #4a5568;
    }
    .error {
      background: #742a2a;
    }
    .error .popup-header {
      background: #9b2c2c;
    }
    .loader {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    element.style.opacity = '1';
  }, 10);
}

function positionPopup(element, x, y) {
  // Calculate position to avoid going off-screen
  const popupWidth = 400;
  const popupHeight = 200;
  
  let left = x + 20;
  let top = y + 20;
  
  if (left + popupWidth > window.innerWidth) {
    left = x - popupWidth - 10;
  }
  
  if (top + popupHeight > window.innerHeight) {
    top = y - popupHeight - 10;
  }
  
  element.style.left = `${Math.max(10, left)}px`;
  element.style.top = `${Math.max(10, top)}px`;
}

function setupPopupInteractions(popup) {
  // Track mouse entering/leaving popup
  popup.addEventListener('mouseenter', () => {
    isMouseOverPopup = true;
  });
  
  popup.addEventListener('mouseleave', () => {
    isMouseOverPopup = false;
  });
  
  // Close on click anywhere
  document.addEventListener('click', function clickHandler(e) {
    if (e.target !== popup && !popup.contains(e.target)) {
      removeExistingPopup();
      document.removeEventListener('click', clickHandler);
    }
  });
}

function removeExistingPopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  isMouseOverPopup = false;
}