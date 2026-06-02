/* dashboard.js - Recruiter Dashboard UI Controller */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const loginOverlay = document.getElementById("db-login-overlay");
  const loginForm = document.getElementById("db-login-form");
  const passwordInput = document.getElementById("db-password-input");
  const loginError = document.getElementById("db-login-error");
  
  const dashboardContent = document.getElementById("dashboard-content");
  const messagesBody = document.getElementById("db-messages-body");
  const searchInput = document.getElementById("db-search-input");
  const refreshBtn = document.getElementById("db-refresh-btn");
  const exportCsvBtn = document.getElementById("db-export-csv-btn");
  const logoutBtn = document.getElementById("db-logout-btn");

  let sessionToken = localStorage.getItem("sai_portfolio_token");
  let messagesList = []; // Caches current list for exporting

  // Initialize Session State
  if (sessionToken) {
    showDashboard();
  } else {
    showLogin();
  }

  // Login handler
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = passwordInput.value;
      if (!password) return;

      try {
        const data = await PortfolioAPI.login(password);
        if (data.success) {
          sessionToken = data.token;
          localStorage.setItem("sai_portfolio_token", sessionToken);
          loginError.textContent = "";
          passwordInput.value = "";
          showDashboard();
        }
      } catch (error) {
        loginError.textContent = error.message || "Invalid administrator password.";
      }
    });
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("sai_portfolio_token");
      sessionToken = null;
      showLogin();
    });
  }

  // Refresh handler
  if (refreshBtn) {
    refreshBtn.addEventListener("click", fetchMessages);
  }

  // Search input handler
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchMessages, 300); // 300ms debounce
    });
  }

  // Export CSV handler
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", exportToCSV);
  }

  // Toggle Visibility Functions
  function showDashboard() {
    if (loginOverlay) loginOverlay.style.display = "none";
    fetchMessages();
  }

  function showLogin() {
    if (loginOverlay) loginOverlay.style.display = "flex";
    if (messagesBody) messagesBody.innerHTML = "";
  }

  /**
   * Fetches recruiter logs from backend and calls renderer
   */
  async function fetchMessages() {
    if (!sessionToken) return;
    
    const query = searchInput ? searchInput.value : "";
    if (messagesBody) {
      messagesBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Querying database logs...</td></tr>`;
    }

    try {
      const data = await PortfolioAPI.getMessages(sessionToken, query);
      if (data.success) {
        messagesList = data.messages;
        renderMessagesTable(data.messages);
      }
    } catch (error) {
      if (error.message.includes("Unauthorized")) {
        // Session expired or invalid
        localStorage.removeItem("sai_portfolio_token");
        sessionToken = null;
        showLogin();
      } else {
        if (messagesBody) {
          messagesBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--status-pending);">Failed to fetch messages: ${error.message}</td></tr>`;
        }
      }
    }
  }

  /**
   * Renders rows in the recruiter messages table
   */
  function renderMessagesTable(messages) {
    if (!messagesBody) return;

    if (messages.length === 0) {
      messagesBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No recruiter messages found matching the criteria.</td></tr>`;
      return;
    }

    messagesBody.innerHTML = messages.map((msg) => {
      const formattedDate = new Date(msg.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const scheduleValue = msg.interview_date || "";

      return `
        <tr data-id="${msg.id}">
          <td>${escapeHTML(msg.name)}</td>
          <td>${escapeHTML(msg.company)}</td>
          <td><a href="mailto:${escapeHTML(msg.email)}" style="color: var(--color-cyan); text-decoration: none;">${escapeHTML(msg.email)}</a></td>
          <td>${escapeHTML(msg.position)}</td>
          <td style="max-width: 200px; white-space: normal; font-size: 0.85rem;">${escapeHTML(msg.message)}</td>
          <td>
            <select class="form-control db-status-select" style="padding: 0.35rem 0.5rem; font-size: 0.8rem; background: rgba(0,0,0,0.5);">
              <option value="Pending Review" ${msg.status === "Pending Review" ? "selected" : ""}>Pending</option>
              <option value="Contacted" ${msg.status === "Contacted" ? "selected" : ""}>Contacted</option>
              <option value="Interview Scheduled" ${msg.status === "Interview Scheduled" ? "selected" : ""}>Scheduled</option>
              <option value="Archived" ${msg.status === "Archived" ? "selected" : ""}>Archived</option>
            </select>
          </td>
          <td>
            <input type="datetime-local" class="form-control db-date-input" value="${scheduleValue}" 
              style="padding: 0.35rem 0.5rem; font-size: 0.8rem; background: rgba(0,0,0,0.5); width: 160px; ${msg.status !== 'Interview Scheduled' ? 'display:none;' : ''}">
            <span class="db-date-display" style="${msg.status === 'Interview Scheduled' ? 'display:none;' : ''}">${msg.interview_date ? formatDate(msg.interview_date) : '-'}</span>
          </td>
          <td>
            <button class="btn btn-secondary db-delete-btn" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; border-color: rgba(255,0,0,0.3); color: #ff5555;">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join("");

    // Bind event listeners to dropdowns and buttons
    bindTableActions();
  }

  /**
   * Bind event listeners to status selects, date inputs, and delete buttons
   */
  function bindTableActions() {
    // Status Change
    document.querySelectorAll(".db-status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const row = e.target.closest("tr");
        const msgId = row.dataset.id;
        const newStatus = e.target.value;
        const dateInput = row.querySelector(".db-date-input");
        const dateDisplay = row.querySelector(".db-date-display");

        // Toggle calendar display based on status
        if (newStatus === "Interview Scheduled") {
          dateInput.style.display = "inline-block";
          dateDisplay.style.display = "none";
        } else {
          dateInput.style.display = "none";
          dateDisplay.style.display = "inline";
          dateInput.value = ""; // Clear schedule
        }

        await updateMessage(msgId, newStatus, dateInput.value);
      });
    });

    // Date Schedule Change
    document.querySelectorAll(".db-date-input").forEach((input) => {
      input.addEventListener("change", async (e) => {
        const row = e.target.closest("tr");
        const msgId = row.dataset.id;
        const statusSelect = row.querySelector(".db-status-select");
        const newDate = e.target.value;

        await updateMessage(msgId, statusSelect.value, newDate);
      });
    });

    // Delete Log entry
    document.querySelectorAll(".db-delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest("tr");
        const msgId = row.dataset.id;
        const recruiterName = row.cells[0].textContent;

        if (confirm(`Are you sure you want to delete the message log from ${recruiterName}?`)) {
          try {
            const data = await PortfolioAPI.deleteMessage(sessionToken, msgId);
            if (data.success) {
              row.remove();
            }
          } catch (error) {
            alert(`Error deleting message: ${error.message}`);
          }
        }
      });
    });
  }

  /**
   * Performs the update API call
   */
  async function updateMessage(id, status, interviewDate) {
    try {
      await PortfolioAPI.updateMessageStatus(sessionToken, id, status, interviewDate);
      console.log(`[Dashboard] Message ${id} updated to ${status}`);
    } catch (error) {
      alert(`Failed to update database status: ${error.message}`);
      fetchMessages(); // Rollback UI state
    }
  }

  /**
   * Generates and downloads a CSV file representing current inquiries
   */
  function exportToCSV() {
    if (messagesList.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["ID", "Recruiter Name", "Company", "Email", "Position", "Message", "Status", "Interview Scheduled", "Received At"];
    const csvRows = [headers.join(",")];

    for (const msg of messagesList) {
      const values = [
        msg.id,
        escapeCsvValue(msg.name),
        escapeCsvValue(msg.company),
        escapeCsvValue(msg.email),
        escapeCsvValue(msg.position),
        escapeCsvValue(msg.message),
        escapeCsvValue(msg.status),
        escapeCsvValue(msg.interview_date || "N/A"),
        escapeCsvValue(msg.created_at)
      ];
      csvRows.push(values.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bhukya_sai_recruiters_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- UTILITY FUNCTIONS ---
  function escapeCsvValue(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""'); // double quotes escaping
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      str = `"${str}"`;
    }
    return str;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
});
