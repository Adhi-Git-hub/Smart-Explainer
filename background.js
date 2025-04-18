const GOOGLE_API_KEY = "your api";
const MODEL_NAME = "gemini-1.5-flash";

// Debug function to force console logs to appear
function debugLog(...args) {
  console.log("[GEMINI DEBUG]", ...args);
  chrome.runtime.sendMessage({
    type: "debug_log", 
    message: args.join(" ")
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "explain_text") {
    debugLog("Received request for text:", request.text.substring(0, 30) + "...");
    
    callGeminiAPI(request.text)
      .then(explanation => {
        debugLog("API Success!");
        sendResponse({ explanation });
      })
      .catch(error => {
        debugLog("API FAILED:", error);
        sendResponse({ 
          error: `Gemini Error: ${error.message}` 
        });
      });
    
    return true; // Keep message channel open
  }
});

async function callGeminiAPI(text) {
  debugLog("Starting API call...");
  
  if (!GOOGLE_API_KEY) {
    throw new Error("API key is empty - edit background.js");
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GOOGLE_API_KEY}`;
  debugLog("API URL:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Provide a detailed 2-3 sentence explanation of the following: 
            "${text}"
            
            Explanation should include:
            1. Key context or answer(for sums)
            2. Main points
            3. Simple examples if applicable` }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200
        }
      })
    });

    debugLog("Received response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      debugLog("Full error response:", errorData);
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    debugLog("Full API response:", data);

    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!explanation) {
      throw new Error("No explanation in response");
    }

    return explanation.trim();
  } catch (error) {
    debugLog("Network/API Error:", error);
    throw new Error(error.message);
  }
}

// Force keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  debugLog("Service worker started");
});
setInterval(() => {
  debugLog("Keep-alive ping");
}, 1000 * 30);
