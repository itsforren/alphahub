import confetti from 'canvas-confetti';

const Z = 99999;

// Elegant full-screen celebration — white/silver/gold metallic with dollar bills
export function fireConfetti() {
  const metallics = ['#ffffff', '#e2e8f0', '#cbd5e1', '#f1f5f9', '#fef3c7', '#fefce8'];

  // Full-width cascade from left
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.3 },
    colors: metallics,
    zIndex: Z,
    gravity: 0.5,
    ticks: 300,
    startVelocity: 35,
    scalar: 1.1,
    drift: 1,
  });

  // Full-width cascade from right
  confetti({
    particleCount: 80,
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.3 },
    colors: metallics,
    zIndex: Z,
    gravity: 0.5,
    ticks: 300,
    startVelocity: 35,
    scalar: 1.1,
    drift: -1,
  });

  // Center burst
  confetti({
    particleCount: 60,
    spread: 160,
    origin: { x: 0.5, y: 0.4 },
    colors: metallics,
    zIndex: Z,
    gravity: 0.4,
    ticks: 300,
    startVelocity: 25,
    scalar: 1,
  });
}

// Shimmer — soft sparkle across the full screen
export function fireShimmer() {
  const whites = ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#fefce8'];

  // 5 burst points across the screen
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 100,
        origin: { x: 0.1 + i * 0.2, y: 0.35 },
        startVelocity: 18,
        gravity: 0.3,
        ticks: 250,
        zIndex: Z,
        colors: whites,
        shapes: ['circle'],
        scalar: 0.6,
      });
    }, i * 80);
  }
}

// Dollar bills falling elegantly across full screen
export function fireMoney() {
  const greens = ['#22c55e', '#16a34a', '#15803d', '#86efac', '#bbf7d0'];

  // Wave 1 — scattered across top
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      confetti({
        particleCount: 12,
        spread: 40,
        origin: { x: 0.05 + Math.random() * 0.9, y: -0.05 },
        gravity: 0.35,
        ticks: 400,
        startVelocity: 5,
        zIndex: Z,
        colors: greens,
        shapes: ['square'],
        scalar: 1.8,
        drift: (Math.random() - 0.5) * 2,
        flat: true,
      });
    }, i * 150);
  }

  // Wave 2 — more bills with slight delay
  setTimeout(() => {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 8,
          spread: 30,
          origin: { x: 0.1 + Math.random() * 0.8, y: -0.05 },
          gravity: 0.3,
          ticks: 450,
          startVelocity: 3,
          zIndex: Z,
          colors: greens,
          shapes: ['square'],
          scalar: 2.2,
          drift: (Math.random() - 0.5) * 1.5,
          flat: true,
        });
      }, i * 200);
    }
  }, 800);
}

// Full celebration sequence
export function fireCelebration() {
  // Phase 1: Shimmer sparkle across screen
  fireShimmer();

  // Phase 2: Big confetti burst
  setTimeout(() => fireConfetti(), 300);

  // Phase 3: Money falling
  setTimeout(() => fireMoney(), 600);

  // Phase 4: One more gentle confetti wave
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 180,
      origin: { x: 0.5, y: 0.3 },
      colors: ['#ffffff', '#e2e8f0', '#fef3c7'],
      zIndex: Z,
      gravity: 0.35,
      ticks: 350,
      startVelocity: 20,
      scalar: 0.9,
    });
  }, 2500);
}

// Keep for other uses
export function fireFireworks() {
  const defaults = { startVelocity: 35, spread: 360, ticks: 80, zIndex: Z };
  confetti({
    ...defaults,
    particleCount: 50,
    origin: { x: 0.5, y: 0.35 },
    colors: ['#ffffff', '#e2e8f0', '#fef3c7'],
  });
}

export function fireLensFlare() {
  fireShimmer();
}
