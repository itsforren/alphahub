import { useMemo } from 'react';
import { motion } from 'framer-motion';

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        startX: Math.random() * 100,
        size: Math.random() * 4 + 1.5,
        duration: Math.random() * 10 + 8,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1,
        drift: (Math.random() - 0.5) * 50,
        color: i % 3 === 0
          ? 'bg-blue-400'
          : i % 3 === 1
            ? 'bg-purple-400'
            : 'bg-indigo-400',
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{ left: `${p.startX}%`, width: p.size, height: p.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -900],
            x: [0, p.drift, p.drift * 0.5],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingBackground() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Deep void base */}
      <div className="absolute inset-0 bg-[#050510]" />

      {/* Aurora blobs */}
      <div className="aurora-container">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
      </div>

      {/* Extra gradient mesh for depth */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), ' +
            'radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)',
        }}
      />

      {/* Floating particles */}
      <FloatingParticles />
    </div>
  );
}
