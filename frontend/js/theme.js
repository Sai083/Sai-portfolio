/* theme.js - Interactive Neural Network Canvas Background */

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = [];
  const maxParticles = Math.min(60, Math.floor((width * height) / 25000)); // Scales with screen size
  const maxDistance = 110;
  
  const mouse = {
    x: null,
    y: null,
    radius: 150
  };

  // Adjust canvas dimensions on window resize
  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Track mouse coordinates
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Clear mouse coordinates when leaving screen
  window.addEventListener("mouseout", () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Particle Class Definition
  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.radius = Math.random() * 2 + 1;
      
      // Indigo, Purple, Cyan shades
      const hue = Math.random() > 0.5 ? 180 : 280; // 180: Cyan, 280: Purple
      this.color = `hsla(${hue}, 100%, 65%, ${Math.random() * 0.4 + 0.3})`;
    }

    update() {
      // Bounce off walls
      if (this.x < 0 || this.x > width) this.vx = -this.vx;
      if (this.y < 0 || this.y > height) this.vy = -this.vy;

      // Update positions
      this.x += this.vx;
      this.y += this.vy;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  // Populate particles array
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  // Draw connecting edges
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      
      // Connect to other nodes
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

        if (dist < maxDistance) {
          const alpha = (1 - dist / maxDistance) * 0.15;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Connect to mouse cursor
      if (mouse.x !== null && mouse.y !== null) {
        const mDist = Math.hypot(p1.x - mouse.x, p1.y - mouse.y);
        if (mDist < mouse.radius) {
          const mAlpha = (1 - mDist / mouse.radius) * 0.25;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(180, 0, 255, ${mAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  // Animation Loop
  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update and draw particles
    particles.forEach((particle) => {
      particle.update();
      particle.draw();
    });

    drawLines();
    requestAnimationFrame(animate);
  }

  // Launch Matrix Effect
  animate();
});
