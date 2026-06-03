/* api.js - API client service */

const PortfolioAPI = (() => {
  // Automatically switch base URL between local dev (localhost) and production (Render)
  const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "https://sai-portfolio-backend-yph0.onrender.com"; // Live Render backend URL

  console.log(`[API] Base URL configured to: ${API_BASE}`);

  // Track backend readiness (Render free tier cold starts can take 30-180s)
  let _backendAwake = false;

  /**
   * Helper to perform fetch requests with JSON parsing, headers, and automatic retry
   * for Render cold-start failures (free tier spins down after inactivity).
   */
  async function request(endpoint, options = {}, retries = 3) {
    const url = `${API_BASE}${endpoint}`;
    
    // Set headers
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Request failed with status ${response.status}`);
        }
        
        _backendAwake = true;
        return data;
      } catch (error) {
        const isNetworkError = error.message === "Failed to fetch" || error.name === "TypeError";
        
        if (isNetworkError && attempt < retries) {
          // Exponential backoff: 2s, 4s, ...
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[API] Attempt ${attempt}/${retries} failed on ${endpoint}. Backend may be waking up. Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error(`[API] Error on ${endpoint} (attempt ${attempt}/${retries}):`, error);
        throw error;
      }
    }
  }

  /**
   * Pre-warms the Render backend so subsequent API calls succeed faster.
   * Call this on page load to reduce cold-start latency for real user actions.
   */
  async function warmUpBackend() {
    if (_backendAwake) return;
    try {
      console.log("[API] Sending warm-up ping to backend...");
      const res = await fetch(`${API_BASE}/api/portfolio`, { method: "GET" });
      if (res.ok) {
        _backendAwake = true;
        console.log("[API] Backend is awake and responsive.");
      }
    } catch (e) {
      console.log("[API] Backend warm-up ping failed (may still be cold). Requests will retry automatically.");
    }
  }

  // Immediately start warming up the backend when the page loads
  if (API_BASE.includes("onrender.com")) {
    warmUpBackend();
  }

  return {
    /**
     * Submit contact form message
     * @param {Object} formData - {name, company, email, position, message}
     */
    submitContact: (formData) => {
      return request("/api/contact", {
        method: "POST",
        body: JSON.stringify(formData)
      });
    },

    /**
     * Authenticate admin
     * @param {string} password
     */
    login: (password) => {
      return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password })
      });
    },

    /**
     * Fetch all recruiter submissions (Requires token)
     */
    getMessages: (token, searchQuery = "") => {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
      return request(`/api/recruiter/messages${query}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    },

    /**
     * Update recruiter candidate application status (Requires token)
     */
    updateMessageStatus: (token, messageId, status, interviewDate = null) => {
      return request(`/api/recruiter/messages/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({ status, interview_date: interviewDate }),
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    },

    /**
     * Delete contact message (Requires token)
     */
    deleteMessage: (token, messageId) => {
      return request(`/api/recruiter/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    },

    /**
     * Query AI chatbot
     * @param {string} message
     */
    sendChatMessage: (message) => {
      return request("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message })
      });
    }
  };
})();
