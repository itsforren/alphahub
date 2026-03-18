import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, ExternalLink, Calendar, GraduationCap, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}

function ActionCard({ icon, title, description, href, color }: ActionCardProps) {
  return (
    <motion.a
      variants={item}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`glass-card p-5 flex items-start gap-4 group cursor-pointer hover:border-${color}-500/30 transition-all duration-300`}
    >
      <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
    </motion.a>
  );
}

export default function SuccessStep() {
  useEffect(() => {
    // Fire confetti if available
    import('@/lib/confetti').then((mod) => {
      mod.fireConfetti?.();
      setTimeout(() => mod.fireFireworks?.(), 500);
    }).catch(() => {
      // confetti lib not available, skip
    });
  }, []);

  return (
    <motion.div
      className="max-w-lg w-full mx-auto text-center"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Celebration */}
      <motion.div variants={item} className="mb-6">
        <div className="flex justify-center mb-4">
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <PartyPopper className="w-10 h-10 text-blue-400" />
          </motion.div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">You're all set!</h1>
        <p className="text-white/50">
          Your account is ready. Here's what to do next.
        </p>
      </motion.div>

      {/* Action cards */}
      <div className="space-y-3">
        <ActionCard
          icon={<LogIn className="w-5 h-5 text-blue-400" />}
          title="Sign into Alpha Agent CRM"
          description="Access your CRM dashboard to manage leads and contacts"
          href="https://app.alphaagentcrm.com"
          color="blue"
        />
        <ActionCard
          icon={<Calendar className="w-5 h-5 text-purple-400" />}
          title="Connect Zoom & Google Calendar"
          description="Set up your calendars so leads can book calls with you"
          href="https://app.alphaagentcrm.com"
          color="purple"
        />
        <ActionCard
          icon={<GraduationCap className="w-5 h-5 text-emerald-400" />}
          title="Start the Course"
          description="Learn how to maximize your lead generation with Alpha Agent"
          href="/hub/courses"
          color="emerald"
        />
      </div>

      {/* Go to dashboard */}
      <motion.div variants={item} className="mt-8">
        <Button
          asChild
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl border-0"
        >
          <a href="/hub">Go to your Dashboard</a>
        </Button>
      </motion.div>
    </motion.div>
  );
}
