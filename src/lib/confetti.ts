import confetti from 'canvas-confetti';

const Z = 99999; // Must be above z-50 overlays

export function fireConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;

  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e', '#eab308', '#3b82f6', '#FFD700'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.65 },
      colors,
      zIndex: Z,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.65 },
      colors,
      zIndex: Z,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

export function fireFireworks() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 35, spread: 360, ticks: 80, zIndex: Z };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 60 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF6347', '#4169E1', '#8b5cf6'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#FFD700', '#FF6347', '#4169E1', '#22c55e'],
    });
  }, 200);
}

export function fireLensFlare() {
  // Big center burst — lens flare effect
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { x: 0.5, y: 0.4 },
    startVelocity: 45,
    gravity: 0.6,
    ticks: 120,
    zIndex: Z,
    colors: ['#ffffff', '#FFD700', '#fef08a', '#fbbf24', '#f59e0b'],
    shapes: ['circle'],
    scalar: 1.2,
  });
  // Side bursts
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 70,
      origin: { x: 0.15, y: 0.5 },
      startVelocity: 40,
      zIndex: Z,
      colors: ['#6366f1', '#a855f7', '#ffffff'],
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 70,
      origin: { x: 0.85, y: 0.5 },
      startVelocity: 40,
      zIndex: Z,
      colors: ['#3b82f6', '#22c55e', '#ffffff'],
    });
  }, 200);
}
