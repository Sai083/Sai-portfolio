/* api.js - API client service */

const PortfolioAPI = (() => {
  // Automatically switch base URL between local dev (localhost) and production (Render)
  const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : "https://cnf-backend.onrender.com"; // REPLACE with actual Render production URL when deployed

  console.log(`[API] Base URL configured to: ${API_BASE}`);

  /**
   * Helper to perform fetch requests with JSON parsing and headers
   */
  async function request(endpoint, options = {}) {
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

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`[API] Error on ${endpoint}:`, error);
      throw error;
    }
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
