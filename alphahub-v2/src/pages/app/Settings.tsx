import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Settings() {
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>
        <Card className="glass-card">
          <CardHeader><CardTitle>Account Settings</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Settings options coming soon.</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
