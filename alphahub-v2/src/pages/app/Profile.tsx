import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProfilePhotoUpload } from '@/components/portal/ProfilePhotoUpload';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user?.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
      refreshProfile();
    }
    setIsLoading(false);
  };

  const handlePhotoUpload = async (url: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user?.id);

    if (error) {
      throw error;
    }
    refreshProfile();
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-8">Profile</h1>

        <Card className="glass-card mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-6 mb-6">
              <ProfilePhotoUpload
                currentImageUrl={profile?.avatar_url || null}
                name={profile?.name || 'User'}
                clientId={user?.id || ''}
                onUpload={handlePhotoUpload}
                size="lg"
              />
              <div>
                <h2 className="text-xl font-semibold text-foreground">{profile?.name || 'User'}</h2>
                <p className="text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Hover over photo to change</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email || ''} disabled className="bg-secondary/50 opacity-50" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
