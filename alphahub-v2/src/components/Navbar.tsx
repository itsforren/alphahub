import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Partner", path: "/partner" },
  { name: "About", path: "/about" },
  { name: "Blog", path: "/blog" },
];

// Static premium amount - updated monthly
const STATIC_PREMIUM_AMOUNT = 48862181.25;

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/10 backdrop-blur-md border-b border-border/10">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo - fixed width for balance */}
          <Link to="/" className="flex items-center gap-1 flex-shrink-0 w-32">
            <span className="text-xl font-light tracking-tight text-foreground">ALPHA</span>
            <span className="text-xl font-bold tracking-tight text-primary">AGENT</span>
          </Link>

          {/* Premium Counter - Absolutely centered */}
          <div className="hidden md:flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                Target Premium Issued PAID
              </span>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/50 hover:text-primary transition-colors">
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="max-w-[280px] p-4 bg-background/95 backdrop-blur-md border border-border/50 shadow-xl"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">How is this number calculated?</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This figure represents <span className="text-foreground font-medium">real, tracked commissions</span> from agents actively submitting business through the Alpha Agent CRM, combined with verbally confirmed policy placements.
                      </p>
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-[10px] text-muted-foreground/80 italic">
                          Updated monthly.
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold text-primary tabular-nums tracking-tight">
                {formatCurrency(STATIC_PREMIUM_AMOUNT)}
              </span>
            </div>
          </div>

          {/* Menu Toggle */}
          <div className="flex items-center gap-2">
            
            {/* Navigation Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-foreground hover:bg-primary/10 rounded-xl transition-colors border border-transparent hover:border-primary/20"
                onClick={() => setIsOpen(!isOpen)}
              >
                <motion.div
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isOpen ? <X size={22} /> : <Menu size={22} />}
                </motion.div>
              </motion.button>
              
              {/* Elegant Dropdown Menu */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-3 w-56 z-[100]"
                  >
                    <div className="bg-background border border-border/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-border/30 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation</p>
                      </div>
                      
                      {/* Links */}
                      <div className="py-2">
                        {navLinks.map((link, index) => (
                          <motion.div
                            key={link.path}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link
                              to={link.path}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-primary/10 hover:pl-6",
                                location.pathname === link.path
                                  ? "text-primary bg-primary/5 border-l-2 border-primary"
                                  : "text-foreground border-l-2 border-transparent"
                              )}
                            >
                              <span>{link.name}</span>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                      
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Premium Counter */}
        <div className="md:hidden flex items-center justify-center gap-1.5 pb-2 -mt-1">
          <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="text-[11px] font-bold text-primary tabular-nums">
            {formatCurrency(STATIC_PREMIUM_AMOUNT)}
          </span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0">
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="max-w-[240px] p-3 bg-background/95 backdrop-blur-md border border-border/50 shadow-xl"
              >
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-foreground">How is this calculated?</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Real tracked commissions from agents using Alpha Agent CRM + verbally confirmed placements. Updated monthly.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </nav>
  );
};