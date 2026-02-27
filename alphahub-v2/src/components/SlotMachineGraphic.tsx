import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, DollarSign, Coins, Hand } from "lucide-react";
import { useState, useCallback } from "react";

const SlotMachineGraphic = () => {
  const badOutcomes = [
    "Bad Lead",
    "Wrong Number",
    "Not Interested",
    "Fake Info",
    "Shared 5+ Ways",
    "Dead End",
    "No Answer",
    "Hung Up",
    "Already Bought",
  ];

  const [isSpinning, setIsSpinning] = useState(false);
  const [reelResults, setReelResults] = useState([
    "Bad Lead",
    "Wrong Number",
    "Not Interested",
    "Fake Info",
    "Shared 5+ Ways",
    "???",
  ]);
  const [showResult, setShowResult] = useState(false);
  const [pullCount, setPullCount] = useState(0);

  const pullLever = useCallback(() => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setShowResult(false);
    setPullCount(prev => prev + 1);

    // Generate random bad outcomes for each reel
    const newResults = Array(6).fill(null).map((_, index) => {
      // Last reel has a chance to show "???" for false hope
      if (index === 5 && Math.random() > 0.7) {
        return "???";
      }
      return badOutcomes[Math.floor(Math.random() * badOutcomes.length)];
    });

    // Staggered stop timing for each reel
    const stopTimes = [800, 1000, 1200, 1400, 1600, 2000];
    
    stopTimes.forEach((time, index) => {
      setTimeout(() => {
        setReelResults(prev => {
          const updated = [...prev];
          updated[index] = newResults[index];
          return updated;
        });
      }, time);
    });

    // Show result after all reels stop
    setTimeout(() => {
      setIsSpinning(false);
      setShowResult(true);
    }, 2200);
  }, [isSpinning]);

  return (
    <section className="py-24 px-4 relative overflow-hidden bg-black">
      {/* Casino Background with blurred slot machines */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/30 via-black to-black" />
        {/* Blurred casino machines in background */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-20 h-32 bg-gradient-to-b from-zinc-700 to-zinc-900 rounded-lg blur-sm"
              style={{
                left: `${10 + (i % 4) * 25}%`,
                top: `${20 + Math.floor(i / 4) * 50}%`,
                transform: `rotate(${(i - 4) * 3}deg)`,
              }}
            />
          ))}
        </div>
        {/* Smoke/fog effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        {/* Dark vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_black_100%)]" />
      </div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium mb-6">
            <AlertTriangle className="w-4 h-4" />
            The Vendor Gamble
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            The <span className="text-red-500">Slot Machine</span> of Lead Vendors
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Agents gambling with their business every time they buy shared leads
          </p>
          {pullCount > 0 && (
            <p className="text-sm text-zinc-500 mt-2">
              You've pulled the lever {pullCount} time{pullCount > 1 ? 's' : ''} — still no wins
            </p>
          )}
        </motion.div>

        {/* Slot Machine */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Outer Glow - Red danger aura */}
          <div className="absolute -inset-8 bg-red-600/20 rounded-3xl blur-3xl" />
          <motion.div 
            animate={{ opacity: isSpinning ? [0.1, 0.4, 0.1] : 0.1 }}
            transition={{ duration: 0.3, repeat: isSpinning ? Infinity : 0 }}
            className="absolute -inset-4 bg-red-500/10 rounded-3xl blur-2xl" 
          />
          
          {/* Machine Frame - Chrome/Metallic look */}
          <div className="relative bg-gradient-to-b from-zinc-800 via-zinc-900 to-black rounded-3xl p-2 border-4 border-red-900/50 shadow-[0_0_60px_rgba(220,38,38,0.3)]">
            {/* Inner chrome bezel */}
            <div className="bg-gradient-to-b from-zinc-700 to-zinc-900 rounded-2xl p-6 border-2 border-zinc-600">
              
              {/* Top Red Glow Strip */}
              <motion.div 
                animate={{ opacity: isSpinning ? [0.8, 1, 0.8] : 0.8 }}
                transition={{ duration: 0.2, repeat: isSpinning ? Infinity : 0 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-48 h-4 bg-red-500 rounded-full blur-xl" 
              />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-32 h-2 bg-red-400 rounded-full blur-md" />
              
              {/* Machine Header */}
              <div className="text-center mb-6">
                <motion.div 
                  animate={{ scale: isSpinning ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 0.2, repeat: isSpinning ? Infinity : 0 }}
                  className="relative inline-flex items-center gap-3 bg-gradient-to-r from-red-800 via-red-600 to-red-800 px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 border-red-500/50"
                >
                  <DollarSign className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                  <span className="text-2xl md:text-3xl font-black text-white tracking-wider drop-shadow-lg">LEAD VENDOR SLOTS</span>
                  <DollarSign className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                  {/* Glowing lights on header */}
                  <motion.div 
                    animate={{ opacity: isSpinning ? [1, 0.3, 1] : [1, 0.5, 1] }}
                    transition={{ duration: isSpinning ? 0.1 : 1, repeat: Infinity }}
                    className="absolute -top-1 left-4 w-2 h-2 bg-yellow-400 rounded-full" 
                  />
                  <motion.div 
                    animate={{ opacity: isSpinning ? [0.3, 1, 0.3] : [0.5, 1, 0.5] }}
                    transition={{ duration: isSpinning ? 0.1 : 1, repeat: Infinity }}
                    className="absolute -top-1 right-4 w-2 h-2 bg-yellow-400 rounded-full" 
                  />
                </motion.div>
              </div>

              {/* Reels Container - Dark screen */}
              <div className="bg-black rounded-2xl p-4 md:p-6 border-4 border-zinc-800 shadow-inner relative overflow-hidden">
                {/* Screen reflection */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                  {reelResults.map((result, index) => {
                    const isLoss = result !== "???";
                    const reelStopTime = [800, 1000, 1200, 1400, 1600, 2000][index];
                    
                    return (
                      <div key={index} className="relative">
                        {/* Reel Window */}
                        <div className={`
                          h-20 md:h-28 rounded-lg flex items-center justify-center text-center p-2 relative overflow-hidden
                          ${isLoss 
                            ? 'bg-gradient-to-b from-red-900 via-red-950 to-black border-2 border-red-700/80 shadow-[inset_0_0_20px_rgba(220,38,38,0.3)]' 
                            : 'bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 border-2 border-zinc-500 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]'
                          }
                        `}>
                          {/* Spinning effect */}
                          <AnimatePresence mode="wait">
                            {isSpinning ? (
                              <motion.div
                                key="spinning"
                                className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
                              >
                                {/* Fast scrolling text effect */}
                                <motion.div
                                  animate={{ y: [0, -200] }}
                                  transition={{ 
                                    duration: 0.15, 
                                    repeat: Math.floor(reelStopTime / 150),
                                    ease: "linear"
                                  }}
                                  className="flex flex-col gap-2"
                                >
                                  {[...Array(10)].map((_, i) => (
                                    <span key={i} className="text-red-300/60 font-bold text-[10px] md:text-xs whitespace-nowrap">
                                      {badOutcomes[i % badOutcomes.length]}
                                    </span>
                                  ))}
                                </motion.div>
                              </motion.div>
                            ) : (
                              <motion.span
                                key="result"
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={`
                                  font-bold text-[10px] md:text-sm relative z-10 leading-tight
                                  ${isLoss ? 'text-red-300' : 'text-zinc-300 text-lg'}
                                `}
                              >
                                {result}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          
                          {/* Reel highlight */}
                          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white/10 to-transparent" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Flashing Result Display */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="mt-6 text-center"
                    >
                      <motion.div
                        animate={{ 
                          boxShadow: [
                            "0 0 20px rgba(220, 38, 38, 0.5)",
                            "0 0 40px rgba(220, 38, 38, 0.8)",
                            "0 0 20px rgba(220, 38, 38, 0.5)"
                          ]
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-2 border-red-500 rounded-lg px-6 py-3"
                      >
                        <AlertTriangle className="w-6 h-6 text-yellow-400 animate-pulse" />
                        <span className="text-lg md:text-xl font-black text-white tracking-wide">RESULT: HOUSE WINS AGAIN</span>
                        <AlertTriangle className="w-6 h-6 text-yellow-400 animate-pulse" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Interactive Lever */}
              <div className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2 hidden md:block">
                <motion.button
                  onClick={pullLever}
                  disabled={isSpinning}
                  whileHover={{ scale: isSpinning ? 1 : 1.05 }}
                  whileTap={{ scale: isSpinning ? 1 : 0.95 }}
                  animate={{ rotate: isSpinning ? [-30, 0] : 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative origin-bottom cursor-pointer disabled:cursor-not-allowed group"
                >
                  {/* Click hint */}
                  {!isSpinning && pullCount === 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: [-10, -20, -10] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -left-24 top-0 flex items-center gap-1 text-yellow-400 text-xs font-bold whitespace-nowrap"
                    >
                      <Hand className="w-4 h-4" />
                      PULL ME!
                    </motion.div>
                  )}
                  
                  {/* Lever arm - Chrome */}
                  <div className="w-5 h-40 bg-gradient-to-r from-zinc-300 via-zinc-100 to-zinc-400 rounded-full shadow-xl relative group-hover:from-zinc-200 group-hover:via-white group-hover:to-zinc-300 transition-colors">
                    <div className="absolute inset-y-0 left-1.5 w-1 bg-white/40 rounded-full" />
                  </div>
                  {/* Lever ball - Glowing red */}
                  <motion.div 
                    className="absolute -top-7 left-1/2 -translate-x-1/2"
                    animate={{ 
                      boxShadow: isSpinning 
                        ? "0 0 50px rgba(220,38,38,1)" 
                        : ["0 0 30px rgba(220,38,38,0.8)", "0 0 50px rgba(220,38,38,1)", "0 0 30px rgba(220,38,38,0.8)"]
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-red-400 via-red-600 to-red-900 rounded-full border-4 border-red-400/50 group-hover:from-red-300 group-hover:via-red-500 group-hover:to-red-800 transition-colors">
                      <div className="absolute top-1.5 left-2.5 w-4 h-4 bg-white/40 rounded-full blur-sm" />
                    </div>
                  </motion.div>
                </motion.button>
              </div>

              {/* Mobile Pull Button */}
              <motion.button
                onClick={pullLever}
                disabled={isSpinning}
                whileHover={{ scale: isSpinning ? 1 : 1.02 }}
                whileTap={{ scale: isSpinning ? 1 : 0.98 }}
                className="mt-4 w-full md:hidden bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-bold py-4 rounded-xl border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSpinning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    SPINNING...
                  </>
                ) : (
                  <>
                    <Hand className="w-5 h-5" />
                    PULL THE LEVER
                  </>
                )}
              </motion.button>

              {/* Money Tray - Money going in, nothing out */}
              <div className="mt-6 bg-gradient-to-b from-zinc-900 to-black rounded-xl p-4 border-2 border-zinc-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-900/10 to-transparent" />
                
                {/* Animated coins going in */}
                <div className="flex items-center justify-center gap-4 relative">
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ y: [0, 20], opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.2 }}
                    >
                      <Coins className="w-5 h-5 text-yellow-500" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 20], opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.3, delay: 0.1 }}
                    >
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 20], opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.25, delay: 0.2 }}
                    >
                      <Coins className="w-5 h-5 text-yellow-500" />
                    </motion.div>
                  </div>
                  
                  <div className="text-center">
                    <span className="text-zinc-500 text-sm">Your money goes in...</span>
                    <span className="text-red-500 font-black text-lg ml-2">Nothing comes out</span>
                  </div>
                  
                  {/* Empty output side */}
                  <div className="w-16 h-8 border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center">
                    <span className="text-zinc-700 text-xs">EMPTY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Caption */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center max-w-2xl mx-auto"
        >
          <p className="text-lg md:text-xl text-zinc-400 italic">
            "Every time you buy leads, you pull the lever and pray.
          </p>
          <p className="text-xl md:text-2xl font-bold text-red-400 mt-2">
            Vendors know the odds — and the house always wins."
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SlotMachineGraphic;
