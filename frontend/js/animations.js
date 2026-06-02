/* animations.js - Typewriter and Scroll Animations */

document.addEventListener("DOMContentLoaded", () => {
  // --- TYPEWRITER ANIMATION ---
  const typingTarget = document.getElementById("typing-text");
  const roles = [
    "Data Analyst",
    "Business Intelligence Analyst",
    "Data Analytics Engineer",
    "AI & Data Analytics Professional"
  ];
  
  let roleIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function typeEffect() {
    const currentRole = roles[roleIdx];
    
    if (isDeleting) {
      // Remove characters
      typingTarget.textContent = currentRole.substring(0, charIdx - 1);
      charIdx--;
      typingSpeed = 50; // Deletes faster
    } else {
      // Add characters
      typingTarget.textContent = currentRole.substring(0, charIdx + 1);
      charIdx++;
      typingSpeed = 120; // Normal typing speed
    }

    // Handle typing cycle state transitions
    if (!isDeleting && charIdx === currentRole.length) {
      // Pause at full text
      isDeleting = true;
      typingSpeed = 2000; 
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      roleIdx = (roleIdx + 1) % roles.length;
      typingSpeed = 500; // Pause before typing new word
    }

    setTimeout(typeEffect, typingSpeed);
  }

  if (typingTarget) {
    typeEffect();
  }

  // --- SCROLL ACTIVE NAVIGATION HIGHLIGHTER ---
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-link");

  function highlightNavOnScroll() {
    let currentSectionId = "";
    
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      // Triggers slightly before the section reaches top center (200px offset)
      if (window.scrollY >= sectionTop - 220) {
        currentSectionId = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${currentSectionId}`) {
        link.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", highlightNavOnScroll);
  highlightNavOnScroll(); // Run once on startup

  // --- SCROLL REVEAL INTERSECTION OBSERVER ---
  const revealElements = document.querySelectorAll(".glass-card, .timeline-item, .skills-category");
  
  const observerOptions = {
    root: null, // Viewport
    threshold: 0.1, // Trigger when 10% visible
    rootMargin: "0px 0px -50px 0px" // Triggers slightly before entry
  };

  const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target); // Trigger animation only once
      }
    });
  }, observerOptions);

  revealElements.forEach((el) => {
    // Initial state before reveal
    el.style.opacity = "0";
    el.style.transform = "translateY(25px)";
    el.style.transition = "opacity 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
    scrollObserver.observe(el);
  });
});
