import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, ExternalLink, Video, Gift } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NPSPopupProps {
  clientId: string;
  clientName: string;
  onComplete?: () => void;
}

type NPSStep = 'score' | 'feedback' | 'review_offer' | 'thank_you';

export function NPSPopup({ clientId, clientName, onComplete }: NPSPopupProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<NPSStep>('score');
  const [score, setScore] = useState<number | null>(null);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if we should show the NPS popup
  useEffect(() => {
    checkShouldShowNPS();
  }, [clientId]);

  const checkShouldShowNPS = async () => {
    try {
      // Check when client was last prompted
      const { data: client } = await supabase
        .from('clients')
        .select('last_nps_prompt_at, nps_prompt_count, status')
        .eq('id', clientId)
        .single();

      if (!client) return;

      // Only show to active/live clients
      if (client.status !== 'active' && client.status !== 'live') return;

      const lastPrompt = client.last_nps_prompt_at ? new Date(client.last_nps_prompt_at) : null;
      const now = new Date();

      // Don't prompt more than once per 30 days
      if (lastPrompt) {
        const daysSinceLastPrompt = Math.floor((now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastPrompt < 30) return;
      }

      // Show the popup
      setIsOpen(true);

      // Update last prompt time
      await supabase
        .from('clients')
        .update({ 
          last_nps_prompt_at: now.toISOString(),
          nps_prompt_count: (client.nps_prompt_count || 0) + 1
        })
        .eq('id', clientId);
    } catch (error) {
      console.error('Error checking NPS eligibility:', error);
    }
  };

  const handleScoreSelect = (selectedScore: number) => {
    setScore(selectedScore);
    setStep('feedback');
  };

  const handleSubmitFeedback = async () => {
    if (score === null) return;
    setIsSubmitting(true);

    try {
      // Insert NPS response
      const { data: npsResponse, error } = await supabase
        .from('nps_responses')
        .insert({
          client_id: clientId,
          score,
          feedback: feedback.trim() || null,
          google_review_offered: score >= 9,
          video_review_offered: score >= 9,
        })
        .select()
        .single();

      if (error) throw error;

      // If promoter (9-10), show review offer
      if (score >= 9) {
        setStep('review_offer');
      } else {
        setStep('thank_you');
        setTimeout(() => {
          setIsOpen(false);
          onComplete?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting NPS:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewComplete = () => {
    setStep('thank_you');
    setTimeout(() => {
      setIsOpen(false);
      onComplete?.();
    }, 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    onComplete?.();
  };

  const getScoreLabel = (s: number) => {
    if (s <= 6) return 'Not likely';
    if (s <= 8) return 'Neutral';
    return 'Very likely';
  };

  const getScoreColor = (s: number, isActive: boolean) => {
    if (!isActive) return 'bg-muted hover:bg-muted/80';
    if (s <= 6) return 'bg-destructive text-destructive-foreground';
    if (s <= 8) return 'bg-warning text-warning-foreground';
    return 'bg-success text-success-foreground';
  };

  const firstName = clientName?.split(' ')[0] || 'there';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Score Selection Step */}
          {step === 'score' && (
            <motion.div
              key="score"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">Hey {firstName}! 👋</h2>
                  <p className="text-muted-foreground mt-1">
                    How likely are you to recommend Alpha Agent to a friend or colleague?
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleScoreSelect(num)}
                      onMouseEnter={() => setHoveredScore(num)}
                      onMouseLeave={() => setHoveredScore(null)}
                      className={`
                        w-9 h-9 rounded-lg font-medium text-sm transition-all
                        ${getScoreColor(num, hoveredScore !== null ? num <= hoveredScore : false)}
                      `}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Feedback Step */}
          {step === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score!, true)}`}>
                      Score: {score}
                    </div>
                    <span className="text-sm text-muted-foreground">{getScoreLabel(score!)}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {score! >= 9 
                      ? "Awesome! What do you love most about Alpha Agent?" 
                      : score! >= 7 
                        ? "Thanks! What could we do better?" 
                        : "We appreciate your honesty. How can we improve?"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                placeholder="Your feedback helps us improve..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setStep('score')}>
                  Back
                </Button>
                <Button onClick={handleSubmitFeedback} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Review Offer Step (for promoters) */}
          {step === 'review_offer' && (
            <motion.div
              key="review_offer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20">
                  <Star className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-semibold">Thank you for your support! 🎉</h2>
                <p className="text-muted-foreground">
                  We'd love for you to share your experience! You can earn account credits for reviews.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-4 rounded-lg border bg-card/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <ExternalLink className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Google Review</h3>
                      <p className="text-sm text-muted-foreground">Share your experience on Google</p>
                    </div>
                    <div className="flex items-center gap-1 text-success text-sm font-medium">
                      <Gift className="w-4 h-4" />
                      $50 Credit
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review" target="_blank" rel="noopener noreferrer">
                      Leave Google Review
                    </a>
                  </Button>
                </div>

                <div className="p-4 rounded-lg border bg-card/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Video className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Video Review</h3>
                      <p className="text-sm text-muted-foreground">Record a short video testimonial</p>
                    </div>
                    <div className="flex items-center gap-1 text-success text-sm font-medium">
                      <Gift className="w-4 h-4" />
                      $50 Credit
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Schedule a quick recording session with your success manager to earn this credit.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="ghost" onClick={handleReviewComplete}>
                  Maybe Later
                </Button>
              </div>
            </motion.div>
          )}

          {/* Thank You Step */}
          {step === 'thank_you' && (
            <motion.div
              key="thank_you"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20"
              >
                <Star className="w-8 h-8 text-success" />
              </motion.div>
              <h2 className="text-xl font-semibold">Thank you for your feedback!</h2>
              <p className="text-muted-foreground">
                Your input helps us serve you better.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
