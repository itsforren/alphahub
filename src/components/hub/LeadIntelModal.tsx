import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, CheckCircle2, ArrowRight, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Inline pill version (for use in PillLinks row)
export function LeadIntelPillInline({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border-amber-500/30 ${className || ''}`}
      >
        <Lightbulb className="w-4 h-4" />
        Lead Intel
      </button>
      <LeadIntelModalContent open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// Floating pill version (for layout-level placement)
export function LeadIntelPill() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white text-sm font-medium shadow-lg shadow-blue-500/20 backdrop-blur-sm border border-white/10 hover:shadow-blue-500/30 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <Lightbulb className="w-4 h-4" />
        Lead Intel
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </motion.button>
      <LeadIntelModalContent open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function LeadIntelModalContent({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-4 md:inset-x-auto md:inset-y-8 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:w-full z-50 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Lead Intel</h2>
                    <p className="text-xs text-white/40">Understand your leads before you call</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/40 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Body */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-6 space-y-8 text-sm leading-relaxed">

                  {/* Overview */}
                  <section>
                    <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      Why the Lead Filled Out the IUL Form
                    </h3>
                    <p className="text-white/70">
                      Before this person ever became a lead, they went through a short <strong className="text-white">educational funnel</strong> designed to open their eyes to a smarter, tax-free way to grow wealth — the <strong className="text-white">Indexed Universal Life (IUL)</strong> strategy.
                    </p>
                    <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <p className="text-white/80 italic text-center font-medium">
                        "Discover the Wealth Secrets of the IUL — what most financial advisors will never tell you."
                      </p>
                    </div>
                    <p className="text-white/60 mt-3">
                      This message positioned the IUL as a hidden financial advantage used by the wealthy for over a century, while contrasting it against traditional retirement accounts like 401(k)s and IRAs.
                    </p>
                  </section>

                  <div className="border-t border-white/5" />

                  {/* What the Prospect Learned */}
                  <section>
                    <h3 className="text-base font-semibold text-white mb-3">What the Prospect Learned</h3>
                    <p className="text-white/70 mb-3">
                      The funnel explained that <strong className="text-white">most people are stuck</strong> in outdated retirement strategies because:
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Their financial advisors either don\'t understand the IUL',
                        'Are bound to recommend products that benefit their company',
                        'Don\'t want to lose commissions by helping clients avoid tax-heavy investments',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-white/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-white/60 mt-3">
                      The page highlighted how <strong className="text-white">less than 0.1% of Americans</strong> have an IUL, yet it's been quietly used by banks, presidents, and wealthy families for generations.
                    </p>
                  </section>

                  <div className="border-t border-white/5" />

                  {/* Emotional Hook */}
                  <section>
                    <h3 className="text-base font-semibold text-white mb-3">The Emotional Hook</h3>
                    <p className="text-white/70 mb-3">By this point, the lead began asking themselves:</p>
                    <div className="space-y-2">
                      {[
                        '"Why has nobody ever told me this before?"',
                        '"Why am I paying taxes on something that could be tax-free?"',
                        '"If the wealthy use this, why don\'t I?"',
                      ].map((q, i) => (
                        <div key={i} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 text-white/70 italic">
                          {q}
                        </div>
                      ))}
                    </div>
                    <p className="text-white/60 mt-3">
                      This curiosity and mild frustration built <strong className="text-white">trust and urgency</strong>. They started to feel like they'd just uncovered a financial "secret" the elite have always known.
                    </p>
                  </section>

                  <div className="border-t border-white/5" />

                  {/* Comparison Table */}
                  <section>
                    <h3 className="text-base font-semibold text-white mb-3">The Comparison</h3>
                    <p className="text-white/60 mb-4">The funnel clearly compared a typical 401(k)/IRA to an IUL:</p>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/3">
                            <th className="text-left px-4 py-3 text-white/50 font-medium">Traditional 401(k)/IRA</th>
                            <th className="text-left px-4 py-3 text-emerald-400 font-medium">IUL (Compound Interest Account)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[
                            ['Pay taxes on growth or withdrawals', 'No taxes on growth or withdrawals'],
                            ['Market risk — can lose money', 'Guaranteed floor — never lose money'],
                            ['Contribution limits', 'Flexible funding options'],
                            ['Locked until retirement', 'Access money anytime, no penalties'],
                            ['Must report income to IRS', 'Withdrawals not reported as income'],
                          ].map(([trad, iul], i) => (
                            <tr key={i}>
                              <td className="px-4 py-3 text-white/40">{trad}</td>
                              <td className="px-4 py-3 text-white/70">{iul}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-white/60 mt-3">
                      This side-by-side visual made the IUL seem like the clear winner — a <strong className="text-white">smarter, safer, and tax-free</strong> wealth-building tool.
                    </p>
                  </section>

                  <div className="border-t border-white/5" />

                  {/* Final Push */}
                  <section>
                    <h3 className="text-base font-semibold text-white mb-3">The Final Push</h3>
                    <p className="text-white/60 mb-3">
                      At the end of the page, they were told that the <strong className="text-white">IUL isn't just for the wealthy</strong>, but <strong className="text-white">you must qualify</strong> to set one up correctly.
                    </p>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/15 text-center">
                      <p className="text-white font-semibold text-base">
                        "Take the 22-Second Assessment to See If You Qualify."
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      {[
                        ['Easy', 'just 22 seconds'],
                        ['Exclusive', 'not everyone qualifies'],
                        ['Safe and smart', 'used by the rich, endorsed by history'],
                      ].map(([bold, rest], i) => (
                        <div key={i} className="flex items-center gap-3 text-white/60">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span><strong className="text-white">{bold}</strong> — {rest}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-white/60 mt-4">
                      So by the time they filled out the form, they already believed:
                    </p>
                    <ul className="mt-2 space-y-2">
                      {[
                        'The IUL is real, safe, and used by wealthy people',
                        'It can grow their money tax-free and protect their family',
                        'They should at least see if they qualify before missing out',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-white/60">
                          <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                          <span className="italic">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="border-t border-white/5" />

                  {/* Agent Takeaway */}
                  <section className="pb-4">
                    <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      Agent Takeaway
                    </h3>
                    <p className="text-white/70 mb-3">When speaking with these leads:</p>
                    <div className="space-y-3">
                      {[
                        ['Educated & primed', 'They\'ve already been through the funnel. They understand what an IUL is and why it matters.'],
                        ['Curious & hopeful', 'They\'re not cold leads. They\'re financially curious individuals who feel like they just discovered something exclusive.'],
                        ['Your job', 'Confirm what they saw is true, explain how it works for them personally, and book a deeper consultation.'],
                      ].map(([title, desc], i) => (
                        <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                          <p className="font-medium text-white mb-1">{title}</p>
                          <p className="text-white/60 text-xs">{desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/15">
                      <p className="text-white/80 font-medium text-center">
                        They're not just random leads — they're financially curious individuals who feel like they just discovered something exclusive.
                      </p>
                    </div>
                  </section>

                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
