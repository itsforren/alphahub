import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, DollarSign, Trophy, Sparkles, Pencil, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface HeroStatsCardProps {
  totalSubmittedPremium: number;
  totalIssuedPremium: number;
  submittedApps: number;
  issuedPaidCount: number;
  alphaRoi: number;
  adSpend: number;
  isLoading?: boolean;
  commissionContractPercent?: number;
  onCommissionChange?: (value: number) => void;
}

export function HeroStatsCard({
  totalSubmittedPremium,
  totalIssuedPremium,
  submittedApps,
  issuedPaidCount,
  alphaRoi,
  adSpend,
  isLoading,
  commissionContractPercent = 100,
  onCommissionChange,
}: HeroStatsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(commissionContractPercent));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(commissionContractPercent));
  }, [commissionContractPercent]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0 || numValue > 200) {
      setEditValue(String(commissionContractPercent));
      setIsEditing(false);
      return;
    }
    
    if (onCommissionChange && numValue !== commissionContractPercent) {
      setIsSaving(true);
      await onCommissionChange(numValue);
      setIsSaving(false);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(commissionContractPercent));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={cn(
        "relative overflow-hidden",
        "bg-gradient-to-br from-primary/10 via-background/80 to-purple-500/10",
        "backdrop-blur-xl border border-primary/20",
        "shadow-[0_0_40px_hsl(var(--primary)/0.15)]"
      )}>
        {/* Animated glow gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5 animate-pulse" 
          style={{ animationDuration: '3s' }} 
        />
        
        <CardContent className="relative z-10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-full bg-primary/20">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Your Alpha Results
            </h3>
          </div>

          {/* Commission Contract Pill */}
          {onCommissionChange && (
            <motion.div 
              className="flex justify-center mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className={cn(
                "relative inline-flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-500/10",
                "border border-emerald-500/30",
                "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
                "hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300"
              )}>
                {/* Animated glow ring */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-pulse" 
                  style={{ animationDuration: '2s' }} 
                />
                
                <Sparkles className="w-4 h-4 text-emerald-400 relative z-10" />
                <span className="text-sm text-muted-foreground relative z-10">Carrier Contract:</span>
                
                {isEditing ? (
                  <div className="flex items-center gap-1 relative z-10">
                    <input 
                      ref={inputRef}
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-14 bg-transparent border-b border-emerald-500 text-emerald-400 font-bold text-center outline-none"
                      min="0"
                      max="200"
                      step="1"
                    />
                    <span className="text-emerald-400 font-bold">%</span>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="ml-1 p-1 rounded-full hover:bg-emerald-500/20 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1 rounded-full hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors group relative z-10 flex items-center"
                  >
                    {commissionContractPercent}%
                    <Pencil className="inline ml-1.5 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Submitted Business */}
            <div className="text-center md:text-left space-y-1">
              <p className="text-sm text-muted-foreground">Total Submitted Business</p>
              {isLoading ? (
                <div className="h-9 bg-muted/50 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(totalSubmittedPremium)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submittedApps} application{submittedApps !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>
            
            {/* Total Issued & Paid */}
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">Total Issued & Paid</p>
              {isLoading ? (
                <div className="h-9 bg-muted/50 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-emerald-500">
                    {formatCurrency(totalIssuedPremium)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {issuedPaidCount} polic{issuedPaidCount !== 1 ? 'ies' : 'y'}
                  </p>
                </>
              )}
            </div>
            
            {/* ALPHA ROI */}
            <div className="text-center md:text-right space-y-1">
              <p className="text-sm text-muted-foreground">ALPHA ROI</p>
              {isLoading ? (
                <div className="h-9 bg-muted/50 rounded animate-pulse" />
              ) : (
                <>
                  <p className={cn(
                    "text-3xl font-bold",
                    alphaRoi >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {alphaRoi >= 0 ? '+' : ''}{alphaRoi.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on {formatCurrency(adSpend)} ad spend
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
