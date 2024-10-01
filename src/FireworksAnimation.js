import React, { useRef, useEffect, useState } from 'react';

const FireworksAnimation = () => {
  const canvasRef = useRef(null);
  const [audioContext, setAudioContext] = useState(null);
  const [theme, setTheme] = useState('default');
  const fireworks = useRef([]);
  const particles = useRef([]);
  const stars = useRef([]);

  const themes = {
    default: {
      background: 'rgba(0, 0, 51, 1)',
      backgroundFade: (alpha) => `rgba(0, 0, 51, ${alpha})`,
      firework: (alpha) => `rgba(255, 255, 255, ${alpha})`,
      particle: (hue, alpha) => `hsla(${hue}, 100%, 50%, ${alpha})`,
    },
    sunset: {
      background: 'rgba(30, 10, 10, 1)',
      backgroundFade: (alpha) => `rgba(30, 10, 10, ${alpha})`,
      firework: (alpha) => `rgba(255, 153, 0, ${alpha})`,
      particle: (hue, alpha) =>
        `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 100)}, 0, ${alpha})`,
    },
    ocean: {
      background: 'rgba(0, 26, 51, 1)',
      backgroundFade: (alpha) => `rgba(0, 26, 51, ${alpha})`,
      firework: (alpha) => `rgba(0, 255, 255, ${alpha})`,
      particle: (hue, alpha) =>
        `rgba(0, ${Math.floor(Math.random() * 155) + 100}, ${Math.floor(Math.random() * 155) + 100}, ${alpha})`,
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let isDrawing = false;
    let drawStartX, drawStartY;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars.current = createStars();
    };

    const createStars = () => {
      const starsArray = [];
      for (let i = 0; i < 200; i++) {
        starsArray.push(new Star());
      }
      return starsArray;
    };

    const createLaunchSound = () => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    const createExplosionSound = (isWillow) => {
      if (!audioContext) return;
      const duration = isWillow ? 1.5 : 0.8;
      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;

      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(150, audioContext.currentTime);
      lowpass.frequency.linearRampToValueAtTime(30, audioContext.currentTime + duration);

      const highpass = audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(30, audioContext.currentTime);

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-10, audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      compressor.knee.setValueAtTime(40, audioContext.currentTime);
      compressor.attack.setValueAtTime(0, audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, audioContext.currentTime);

      source.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(audioContext.destination);

      source.start();
      source.stop(audioContext.currentTime + duration);
    };

    class Firework {
      constructor(x, y, targetX, targetY, isWillow = false) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = 5;
        this.angle = Math.atan2(targetY - y, targetX - x);
        this.velocity = {
          x: Math.cos(this.angle) * this.speed,
          y: Math.sin(this.angle) * this.speed,
        };
        this.brightness = 255;
        this.radius = 3;
        this.isWillow = isWillow;
        this.trail = [];
        createLaunchSound();
      }

      update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.brightness -= 2;
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > 20) this.trail.shift();
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = themes[theme].firework(this.brightness / 255);
        ctx.fill();

        this.trail.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(
            point.x,
            point.y,
            this.radius * (index / this.trail.length),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = themes[theme].firework(point.alpha * (index / this.trail.length));
          ctx.fill();
          point.alpha -= 0.05;
        });
      }

      explode() {
        createExplosionSound(this.isWillow);
        const particleCount = this.isWillow ? 800 : Math.floor(Math.random() * 150) + 150;
        const angleIncrement = (Math.PI * 2) / particleCount;
        const hue = this.isWillow ? 60 : Math.random() * 360;

        for (let i = 0; i < particleCount; i++) {
          let angle = angleIncrement * i;
          if (this.isWillow) {
            angle = Math.random() * Math.PI * 2;
          } else if (Math.random() < 0.3) {
            angle += Math.sin(i * 5) * 0.5;
          } else if (Math.random() < 0.6) {
            const r = Math.sin(i * 2) * 0.5 + 1;
            angle *= r;
          }
          particles.current.push(new Particle(this.x, this.y, angle, hue, this.isWillow));
        }
      }
    }

    class Particle {
      constructor(x, y, angle, hue, isWillow) {
        this.x = x;
        this.y = y;
        this.initialSpeed = isWillow ? Math.random() * 6 + 2 : Math.random() * 5 + 2;
        this.speed = this.initialSpeed;
        this.radius = isWillow ? Math.random() * 2 + 1 : Math.random() * 3 + 2;
        this.angle = angle;
        this.velocity = {
          x: Math.cos(angle) * this.speed,
          y: Math.sin(angle) * this.speed,
        };
        this.hue = hue;
        this.brightness = 255;
        this.alpha = 1;
        this.decay = isWillow ? Math.random() * 0.001 + 0.0005 : Math.random() * 0.01 + 0.005;
        this.isWillow = isWillow;
        this.gravity = isWillow ? 0.02 : 0.05;
        this.life = 100;
        this.twinkle = Math.random() * 10;
      }

      update() {
        this.life -= 0.5;
        if (this.isWillow) {
          if (this.life > 70) {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
          } else {
            this.velocity.y += this.gravity;
            this.x += this.velocity.x * 0.1;
            this.y += this.velocity.y * 0.5;
          }
        } else {
          this.velocity.x *= 0.99;
          this.velocity.y *= 0.99;
          this.x += this.velocity.x;
          this.y += this.velocity.y;
          this.y += this.gravity;
        }

        this.alpha -= this.decay;
        this.twinkle += 0.3;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        if (this.isWillow) {
          const twinkleIntensity = Math.sin(this.twinkle) * 0.5 + 0.5;
          const r = 255;
          const g = Math.floor(215 + twinkleIntensity * 40);
          const b = Math.floor(140 + twinkleIntensity * 60);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
        } else {
          ctx.fillStyle = themes[theme].particle(this.hue, this.alpha);
        }

        ctx.fill();

        if (this.isWillow && Math.random() < 0.3) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.2})`;
          ctx.fill();
        }
      }
    }

    class Star {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5;
        this.blinkSpeed = Math.random() * 0.05 + 0.01;
        this.brightness = Math.random();
      }

      update() {
        this.brightness += Math.sin(Date.now() * this.blinkSpeed) * 0.05;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.fill();
      }
    }

    const createFirework = (x, y, isWillow = false) => {
      fireworks.current.push(new Firework(x, canvas.height, x, y, isWillow));
    };

    const animate = () => {
      ctx.fillStyle = themes[theme].backgroundFade(0.1);
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.current.forEach((star) => {
        star.update();
        star.draw();
      });

      fireworks.current.forEach((firework, index) => {
        firework.update();
        firework.draw();

        const distance = Math.hypot(
          firework.x - firework.targetX,
          firework.y - firework.targetY
        );
        if (distance < 5 || firework.brightness <= 0) {
          firework.explode();
          fireworks.current.splice(index, 1);
        }
      });

      particles.current.forEach((particle, index) => {
        particle.update();
        particle.draw();

        if (particle.alpha <= 0) {
          particles.current.splice(index, 1);
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseDown = (e) => {
      isDrawing = true;
      drawStartX = e.clientX;
      drawStartY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      ctx.beginPath();
      ctx.arc(
        drawStartX,
        drawStartY,
        Math.hypot(e.clientX - drawStartX, e.clientY - drawStartY),
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();
    };

    const handleMouseUp = (e) => {
      if (isDrawing) {
        const radius = Math.hypot(e.clientX - drawStartX, e.clientY - drawStartY);
        if (radius > 10) {
          createFirework(drawStartX, drawStartY, true);
        } else {
          createFirework(e.clientX, e.clientY);
        }
        isDrawing = false;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioContext, theme]);

  useEffect(() => {
    const handleClick = () => {
      if (!audioContext) {
        const newAudioContext =
          new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(newAudioContext);
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [audioContext]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: themes[theme].background,
          cursor: 'crosshair',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <select
  value={theme}
  onChange={(e) => setTheme(e.target.value)}
  style={{
    padding: '5px 10px',
    fontSize: '16px',
    backgroundColor: 'white', // Changed to white
    color: 'black', // Changed to black
    border: '1px solid rgba(0, 0, 0, 0.5)', // Adjusted border color for visibility
    borderRadius: '5px',
    cursor: 'pointer',
  }}
>
  <option value="default">Default Theme</option>
  <option value="sunset">Sunset Theme</option>
  <option value="ocean">Ocean Theme</option>
</select>

        <div
          style={{
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            borderRadius: '5px',
            fontSize: '14px',
          }}
        >
          Click to launch fireworks
          <br />
          Click and drag for willow effect
        </div>
      </div>
    </div>
  );
};

export default FireworksAnimation;
