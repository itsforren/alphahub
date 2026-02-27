import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClickableText } from '@/components/ui/clickable-text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trophy, TrendingUp, HelpCircle, MessageSquare, DollarSign, Send, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

type PostType = 'win' | 'update' | 'question' | 'sale' | 'announcement';

interface CommunityPost {
  id: string;
  user_id: string;
  type: PostType;
  title: string | null;
  body: string;
  amount: number | null;
  client_initials: string | null;
  is_pinned: boolean;
  created_at: string;
  profile: {
    name: string | null;
    avatar_url: string | null;
  } | null;
  comment_count: number;
}

const postTypeConfig: Record<PostType, { icon: typeof Trophy; color: string; label: string }> = {
  win: { icon: Trophy, color: 'text-yellow-500 bg-yellow-500/10', label: 'Win' },
  sale: { icon: DollarSign, color: 'text-green-500 bg-green-500/10', label: 'Sale' },
  update: { icon: TrendingUp, color: 'text-blue-500 bg-blue-500/10', label: 'Update' },
  question: { icon: HelpCircle, color: 'text-purple-500 bg-purple-500/10', label: 'Question' },
  announcement: { icon: MessageSquare, color: 'text-primary bg-primary/10', label: 'Announcement' },
};

export default function CommunityFeed() {
  const { user, profile, isMember, isAdmin } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [newPost, setNewPost] = useState({ type: 'update' as PostType, title: '', body: '', amount: '' });
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('community_posts')
        .select('*, profiles:user_id(name, avatar_url)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data } = await query;

      if (data) {
        // Get comment counts
        const postsWithCounts = await Promise.all(
          data.map(async (post: any) => {
            const { count } = await supabase
              .from('community_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);

            return {
              ...post,
              profile: post.profiles,
              comment_count: count || 0,
            };
          })
        );
        setPosts(postsWithCounts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.body.trim()) {
      toast({ title: 'Error', description: 'Post body is required', variant: 'destructive' });
      return;
    }

    setIsPosting(true);
    try {
      const { error } = await supabase.from('community_posts').insert({
        user_id: user?.id,
        type: newPost.type,
        title: newPost.title || null,
        body: newPost.body,
        amount: newPost.type === 'sale' && newPost.amount ? parseFloat(newPost.amount) : null,
      });

      if (error) throw error;

      setNewPost({ type: 'update', title: '', body: '', amount: '' });
      fetchPosts();
      toast({ title: 'Post created!' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isMember) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Community Access Required</h2>
            <p className="text-muted-foreground">
              You need to be a member to access the community.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground mb-2">Community</h1>
        <p className="text-muted-foreground mb-8">Share wins, updates, and connect with members</p>

        {/* Post Composer */}
        <Card className="glass-card mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {getInitials(profile?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Select value={newPost.type} onValueChange={(v) => setNewPost({ ...newPost, type: v as PostType })}>
                    <SelectTrigger className="w-32 bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="win">🏆 Win</SelectItem>
                      <SelectItem value="sale">💰 Sale</SelectItem>
                      <SelectItem value="update">📈 Update</SelectItem>
                      <SelectItem value="question">❓ Question</SelectItem>
                      {isAdmin && <SelectItem value="announcement">📢 Announcement</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Title (optional)"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="flex-1 bg-secondary/50"
                  />
                </div>
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost.body}
                  onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                  className="bg-secondary/50 min-h-[80px]"
                />
                {newPost.type === 'sale' && (
                  <Input
                    type="number"
                    placeholder="Sale amount ($)"
                    value={newPost.amount}
                    onChange={(e) => setNewPost({ ...newPost, amount: e.target.value })}
                    className="w-40 bg-secondary/50"
                  />
                )}
                <div className="flex justify-end">
                  <Button onClick={createPost} disabled={isPosting} className="bg-primary text-primary-foreground">
                    {isPosting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'win', 'sale', 'update', 'question'] as const).map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type)}
              className={filter === type ? 'bg-primary text-primary-foreground' : ''}
            >
              {type === 'all' ? 'All' : postTypeConfig[type].label}
            </Button>
          ))}
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : posts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to share something!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {posts.map((post) => {
                const config = postTypeConfig[post.type];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="glass-card hover:border-border/80 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {getInitials(post.profile?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">{post.profile?.name || 'Member'}</span>
                              <Badge variant="outline" className={`${config.color} border-0 text-xs`}>
                                <Icon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                              {post.is_pinned && <Badge variant="secondary" className="text-xs">Pinned</Badge>}
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {post.title && <h3 className="font-semibold text-foreground mb-1">{post.title}</h3>}
                            <ClickableText text={post.body} className="text-foreground/90" />
                            {post.type === 'sale' && post.amount && (
                              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                <span className="font-bold text-green-500">${post.amount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                                <MessageCircle className="w-4 h-4" />
                                {post.comment_count} comments
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
