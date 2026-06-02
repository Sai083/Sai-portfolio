/* chat.js - AI Assistant Chat UI Controller with Voice Recognition & Synthesis */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const chatDrawer = document.getElementById("chat-drawer");
  const chatLauncher = document.getElementById("chat-launcher");
  const chatCloseBtn = document.getElementById("chat-close-btn");
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const suggestionContainer = document.getElementById("chat-suggestions");
  
  // Voice Assistant Elements
  const chatMicBtn = document.getElementById("chat-mic-btn");
  const chatTtsBtn = document.getElementById("chat-tts-btn");
  const chatVoiceWave = document.getElementById("chat-voice-wave");

  // Initial Welcome Flag
  let isWelcomeSent = false;

  // Voice States
  let isTtsEnabled = localStorage.getItem("chat-tts-enabled") === "true";
  let isSpeaking = false;
  let isListening = false;

  // TTS Speaker Icons
  const speakerOffIcon = chatTtsBtn ? chatTtsBtn.querySelector(".speaker-off-icon") : null;
  const speakerOnIcon = chatTtsBtn ? chatTtsBtn.querySelector(".speaker-on-icon") : null;

  // Initialize TTS Toggle State UI
  function updateTtsUI() {
    if (chatTtsBtn) {
      if (isTtsEnabled) {
        chatTtsBtn.classList.add("active");
        if (speakerOnIcon) speakerOnIcon.style.display = "inline";
        if (speakerOffIcon) speakerOffIcon.style.display = "none";
      } else {
        chatTtsBtn.classList.remove("active");
        if (speakerOnIcon) speakerOnIcon.style.display = "none";
        if (speakerOffIcon) speakerOffIcon.style.display = "inline";
      }
    }
  }
  updateTtsUI();

  // Speech Voice Selector
  let speechVoice = null;
  function loadVoice() {
    if (typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    // Prioritize natural English voices
    speechVoice = voices.find(v => v.lang.includes("en-US") && v.name.includes("Google")) ||
                  voices.find(v => v.lang.includes("en-GB") && v.name.includes("Google")) ||
                  voices.find(v => v.lang.includes("en-US") && v.name.includes("Natural")) ||
                  voices.find(v => v.lang.includes("en-US")) ||
                  voices.find(v => v.lang.startsWith("en")) ||
                  voices[0];
  }
  
  if (typeof speechSynthesis !== 'undefined') {
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoice;
    }
    loadVoice();
  }

  // Toggle Text-to-Speech Settings
  if (chatTtsBtn) {
    chatTtsBtn.addEventListener("click", () => {
      isTtsEnabled = !isTtsEnabled;
      localStorage.setItem("chat-tts-enabled", isTtsEnabled);
      updateTtsUI();
      if (!isTtsEnabled && typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
        isSpeaking = false;
        updateWaveState();
      }
    });
  }

  // Speak response aloud
  function speakResponse(text) {
    if (!isTtsEnabled || typeof speechSynthesis === 'undefined') return;
    
    // Cancel any ongoing speaking
    speechSynthesis.cancel();
    
    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (speechVoice) utterance.voice = speechVoice;
    
    // Normal human speed and pitch configurations
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      isSpeaking = true;
      updateWaveState();
    };

    utterance.onend = () => {
      isSpeaking = false;
      updateWaveState();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      updateWaveState();
    };

    speechSynthesis.speak(utterance);
  }

  // Clean Markdown/HTML out of the synthesized output
  function cleanTextForSpeech(text) {
    return text
      .replace(/<\/?[^>]+(>|$)/g, "") // strip HTML tags
      .replace(/\*\*?/g, "")          // strip markdown bold asterisks
      .replace(/[-*]\s+/g, "")        // strip markdown list dashes
      .replace(/\n+/g, " ")           // replace linebreaks with space
      .trim();
  }

  // Update Visual Audio Wave State
  function updateWaveState() {
    if (!chatVoiceWave) return;
    if (isListening || isSpeaking) {
      chatVoiceWave.style.display = "flex";
      const labelSpan = chatVoiceWave.querySelector("span:last-child");
      if (labelSpan) {
        labelSpan.textContent = isListening ? "Listening..." : "Speaking...";
      }
    } else {
      chatVoiceWave.style.display = "none";
    }
  }

  // Speech Recognition (Speech-to-Text) Initialization
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      if (chatMicBtn) chatMicBtn.classList.add("recording");
      chatInput.placeholder = "Listening for query...";
      updateWaveState();
    };

    recognition.onend = () => {
      isListening = false;
      if (chatMicBtn) chatMicBtn.classList.remove("recording");
      chatInput.placeholder = "Ask about Sai's projects, experience, skills...";
      updateWaveState();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInput.value = transcript;
      submitUserQuery(transcript);
      chatInput.value = "";
    };

    recognition.onerror = (event) => {
      console.warn("Speech Recognition Error:", event.error);
      isListening = false;
      if (chatMicBtn) chatMicBtn.classList.remove("recording");
      updateWaveState();

      if (event.error === "not-allowed") {
        appendMessage("ai", "⚠️ **Microphone Access Denied**: Please allow microphone access in your browser address bar. *Note: Voice features require a secure connection (localhost or HTTPS).*");
      } else if (event.error === "audio-capture") {
        appendMessage("ai", "⚠️ **Audio Capture Failed**: No microphone was detected. Please check your system settings and make sure a mic is plugged in.");
      } else if (event.error !== "no-speech") {
        appendMessage("ai", `⚠️ **Voice Assistant Error**: Unable to complete speech recognition (${event.error}).`);
      }
    };

    if (chatMicBtn) {
      chatMicBtn.addEventListener("click", () => {
        if (isListening) {
          recognition.stop();
        } else {
          // Stop speaking while listening to input
          if (typeof speechSynthesis !== 'undefined') {
            speechSynthesis.cancel();
            isSpeaking = false;
            updateWaveState();
          }
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to start Speech Recognition:", e);
          }
        }
      });
    }
  } else {
    // Hide microphone button if SpeechRecognition API is unsupported (e.g. Firefox/Opera without polyfills)
    if (chatMicBtn) {
      chatMicBtn.style.display = "none";
    }
  }

  // Toggle Chat Drawer
  function openChat() {
    chatDrawer.classList.add("open");
    chatInput.focus();
    
    // Send initial greeting if not already sent
    if (!isWelcomeSent) {
      const greeting = "Hello! I am Bhukya Sai's AI Assistant. I can tell you about Sai's education, skills, work experience, projects, or certifications. Ask me anything!\n\n🔊 **Voice Tip**: Click the speaker icon in the top right of this drawer to enable vocal responses!";
      appendMessage("ai", greeting);
      isWelcomeSent = true;
    }
  }

  function closeChat() {
    chatDrawer.classList.remove("open");
    // Cancel speaking when closing drawer
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    isSpeaking = false;
    if (isListening && recognition) {
      recognition.stop();
    }
    updateWaveState();
  }

  if (chatLauncher) chatLauncher.addEventListener("click", openChat);
  if (chatCloseBtn) chatCloseBtn.addEventListener("click", closeChat);

  // Close drawer on escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatDrawer.classList.contains("open")) {
      closeChat();
    }
  });

  // Suggestion Chip Handler
  if (suggestionContainer) {
    suggestionContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("suggestion-chip")) {
        const question = e.target.textContent;
        submitUserQuery(question);
      }
    });
  }

  // Form Submit Handler
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;
      
      submitUserQuery(message);
      chatInput.value = "";
    });
  }

  /**
   * Main submission process
   */
  async function submitUserQuery(query) {
    // Cancel any speaking
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
      isSpeaking = false;
      updateWaveState();
    }

    // Append user message
    appendMessage("user", query);

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    try {
      // Query backend api
      const data = await PortfolioAPI.sendChatMessage(query);
      
      // Remove typing indicator
      typingIndicator.remove();
      
      // Append AI response
      appendMessage("ai", data.response);
    } catch (error) {
      typingIndicator.remove();
      appendMessage("ai", "Sorry, I encountered a connection issue. Please make sure the local Flask server is running or try again.");
      console.error(error);
    }
  }

  /**
   * Appends a chat bubble to the feed and scrolls to bottom
   */
  function appendMessage(sender, text) {
    const msgElement = document.createElement("div");
    msgElement.className = `chat-msg chat-msg-${sender}`;
    
    if (sender === "ai") {
      msgElement.innerHTML = formatAIResponse(text);
      // Trigger voice output
      speakResponse(text);
    } else {
      msgElement.textContent = text;
    }
    
    chatMessages.appendChild(msgElement);
    
    // Auto Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Creates and appends the typing dot loader
   */
  function showTypingIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "chat-msg chat-msg-ai chat-typing";
    indicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
  }

  /**
   * Simple formatter converting linebreaks and basic markdown (bold, lists) to HTML
   */
  function formatAIResponse(text) {
    // Escape HTML
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Markdown bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Markdown bullet lists
    formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>");
    formatted = formatted.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Line breaks
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }
});
