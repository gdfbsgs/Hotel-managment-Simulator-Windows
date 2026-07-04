import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DollarSign, Sparkles } from 'lucide-react';

interface AnimatedMoneyProps {
  money: number;
}

interface EarningParticle {
  id: string;
  amount: number;
  x: number; // small random offset
}

export const AnimatedMoney: React.FC<AnimatedMoneyProps> = ({ money }) => {
  const [displayValue, setDisplayValue] = useState(money);
  const [particles, setParticles] = useState<EarningParticle[]>([]);
  const prevMoneyRef = useRef(money);

  useEffect(() => {
    const prevMoney = prevMoneyRef.current;
    if (money === prevMoney) return;

    // Track difference
    const diff = money - prevMoney;
    if (diff > 0) {
      // Add a floating earnings indicator particle
      const newParticle: EarningParticle = {
        id: `earn-${Date.now()}-${Math.random()}`,
        amount: diff,
        x: (Math.random() - 0.5) * 30 // random horizontal drift
      };
      setParticles((prev) => [...prev, newParticle]);
    }

    // Smooth count-up/down animation
    const startTime = performance.now();
    const duration = 800; // ms

    let animationFrameId: number;

    const updateValue = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      const nextValue = Math.round(prevMoney + (money - prevMoney) * easeProgress);
      
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(money);
        prevMoneyRef.current = money;
      }
    };

    animationFrameId = requestAnimationFrame(updateValue);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [money]);

  // Clean up old particles after their animation completes
  const handleParticleComplete = (id: string) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  const isEarning = money > prevMoneyRef.current;

  return (
    <div className="relative flex items-center">
      {/* Floating Earnings Indicators */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 pointer-events-none z-50">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10, scale: 0.8, x: p.x }}
              animate={{ opacity: 1, y: -45, scale: 1.1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              onAnimationComplete={() => handleParticleComplete(p.id)}
              className="absolute whitespace-nowrap text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5"
            >
              <Sparkles size={10} className="text-amber-400 animate-pulse" />
              +${p.amount.toLocaleString()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Money Counter Pill */}
      <motion.div
        animate={isEarning ? {
          scale: [1, 1.08, 1],
          borderColor: ["#bbf7d0", "#86efac", "#bbf7d0"],
          backgroundColor: ["#f0fdf4", "#dcfce7", "#f0fdf4"]
        } : {}}
        transition={{ duration: 0.4 }}
        className="text-emerald-700 font-bold text-xs bg-emerald-100/80 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1 shadow-sm select-none"
        id="navbar-money-display"
      >
        <DollarSign size={13} className="text-emerald-600 shrink-0" />
        <span className="font-mono tracking-tight font-extrabold text-emerald-800">
          {displayValue.toLocaleString()}
        </span>
      </motion.div>
    </div>
  );
};
