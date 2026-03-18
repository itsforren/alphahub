import confetti from 'canvas-confetti';

const Z = 99999;

// Elegant white/silver/gold confetti — slow, floaty, minimal
export function fireConfetti() {
  const colors = ['#ffffff', '#e2e8f0', '#cbd5e1', '#d4d4d8', '#f1f5f9'];

  // Gentle cascade from both sides
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 80,
    origin: { x: 0, y: 0.5 },
    colors,
    zIndex: Z,
    gravity: 0.4,
    ticks: 200,
    startVelocity: 20,
    scalar: 0.9,
    drift: 0.5,
  });
  confetti({
    particleCount: 40,
    angle: 120,
    spread: 80,
    origin: { x: 1, y: 0.5 },
    colors,
    zIndex: Z,
    gravity: 0.4,
    ticks: 200,
    startVelocity: 20,
    scalar: 0.9,
    drift: -0.5,
  });
}

// Soft shimmer burst from center — like light catching metallic paper
export function fireShimmer() {
  const metallics = ['#ffffff', '#f8fafc', '#e2e8f0', '#fef3c7', '#fefce8'];

  confetti({
    particleCount: 60,
    spread: 120,
    origin: { x: 0.5, y: 0.45 },
    startVelocity: 15,
    gravity: 0.3,
    ticks: 250,
    zIndex: Z,
    colors: metallics,
    shapes: ['circle'],
    scalar: 0.7,
  });
}

// Keep these for other uses but not used in agreement signing
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
