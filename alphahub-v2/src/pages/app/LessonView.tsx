import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Download } from 'lucide-react';
import { VideoPlayer } from '@/components/ui/video-player';
import { LessonRatingDialog } from '@/components/courses/LessonRatingDialog';
import { motion } from 'framer-motion';

interface LessonResource {
  title?: string;
  url: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  bunny_embed_url: string | null;
  duration_seconds: number | null;
  resources: LessonResource[];
  module_id: string;
}

export default function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [prevLesson, setPrevLesson] = useState<string | null>(null);
  const [nextLesson, setNextLesson] = useState<string | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  
  // Time tracking refs
  const startTimeRef = useRef<Date | null>(null);
  const timeSpentRef = useRef<number>(0);
  const saveIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (lessonId && courseId) {
      fetchLesson();
      startTimeTracking();
    }
    
    return () => {
      // Save time spent when leaving
      saveTimeSpent();
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [lessonId, courseId]);

  // Auto-save time every 30 seconds
  useEffect(() => {
    saveIntervalRef.current = setInterval(() => {
      saveTimeSpent();
    }, 30000);

    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [lessonId, user?.id]);

  const startTimeTracking = () => {
    startTimeRef.current = new Date();
    timeSpentRef.current = 0;
  };

  const saveTimeSpent = async () => {
    if (!user?.id || !lessonId || !startTimeRef.current) return;

    const now = new Date();
    const sessionTime = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
    timeSpentRef.current += sessionTime;
    startTimeRef.current = now; // Reset for next interval

    if (timeSpentRef.current <= 0) return;

    try {
      // Check if progress exists
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('id, time_spent_seconds')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('lesson_progress')
          .update({
            time_spent_seconds: (existing.time_spent_seconds || 0) + timeSpentRef.current,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('lesson_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            time_spent_seconds: timeSpentRef.current,
            started_at: new Date().toISOString(),
            status: 'in_progress',
          });
      }

      // Also update course-level progress
      await updateCourseProgress();

      timeSpentRef.current = 0; // Reset after saving
    } catch (error) {
      console.error('Error saving time:', error);
    }
  };

  const updateCourseProgress = async () => {
    if (!user?.id || !courseId) return;

    try {
      const { data: existing } = await supabase
        .from('course_user_progress')
        .select('id, total_time_spent_seconds')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('course_user_progress')
          .update({
            total_time_spent_seconds: (existing.total_time_spent_seconds || 0) + timeSpentRef.current,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('course_user_progress')
          .insert({
            user_id: user.id,
            course_id: courseId,
            total_time_spent_seconds: timeSpentRef.current,
            started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error updating course progress:', error);
    }
  };

  const fetchLesson = async () => {
    try {
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (!lessonData) {
        navigate(`/hub/courses/${courseId}`);
        return;
      }

      // Parse resources properly
      const rawResources = lessonData.resources;
      const resources: LessonResource[] = Array.isArray(rawResources) 
        ? rawResources.map((r: unknown) => {
            const resource = r as Record<string, unknown>;
            return {
              title: typeof resource.title === 'string' ? resource.title : undefined,
              url: typeof resource.url === 'string' ? resource.url : '',
            };
          }).filter(r => r.url)
        : [];

      setLesson({
        ...lessonData,
        resources,
      });

      // Get progress
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('status')
        .eq('lesson_id', lessonId)
        .eq('user_id', user?.id)
        .maybeSingle();

      setIsCompleted(progress?.status === 'completed');

      // Check if already rated
      const { data: existingRating } = await supabase
        .from('lesson_ratings')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('user_id', user?.id)
        .maybeSingle();

      setHasRated(!!existingRating);

      // Get adjacent lessons for navigation
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, order_index, modules!inner(course_id, order_index)')
        .eq('modules.course_id', courseId)
        .order('modules(order_index)')
        .order('order_index');

      if (allLessons) {
        const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
        if (currentIndex > 0) setPrevLesson(allLessons[currentIndex - 1].id);
        if (currentIndex < allLessons.length - 1) setNextLesson(allLessons[currentIndex + 1].id);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    if (!user?.id || !lessonId) return;
    
    // Save any pending time first
    await saveTimeSpent();
    
    try {
      // First check if progress exists
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('lesson_progress')
          .update({
            status: 'completed',
            progress_percent: 100,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('lesson_progress')
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            status: 'completed',
            progress_percent: 100,
            completed_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setIsCompleted(true);
      toast({ title: 'Lesson completed!', description: 'Great job! Keep going.' });
      
      // Show rating dialog if not already rated
      if (!hasRated) {
        setShowRatingDialog(true);
      } else if (nextLesson) {
        navigate(`/hub/courses/${courseId}/${nextLesson}`);
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({ title: 'Error', description: 'Failed to mark lesson as complete', variant: 'destructive' });
    }
  };

  const handleRatingSubmitted = () => {
    setHasRated(true);
    if (nextLesson) {
      navigate(`/hub/courses/${courseId}/${nextLesson}`);
    }
  };

  if (loading) {
    return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="aspect-video mb-6" />
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link to={`/hub/courses/${courseId}`}>
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Course
          </Button>
        </Link>

        <VideoPlayer 
          src={lesson.bunny_embed_url} 
          type="iframe"
          className="mb-6"
          fallbackMessage="No video available for this lesson"
        />

        {/* Lesson Info */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
            {isCompleted && (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle className="w-5 h-5" /> Completed
              </div>
            )}
          </div>
          {lesson.description && (
            <p className="text-muted-foreground">{lesson.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex gap-2">
            {prevLesson && (
              <Link to={`/hub/courses/${courseId}/${prevLesson}`}>
                <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Previous</Button>
              </Link>
            )}
          </div>
          <div className="flex gap-2">
            {!isCompleted && (
              <Button onClick={markComplete} className="bg-primary text-primary-foreground">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            )}
            {nextLesson && (
              <Link to={`/hub/courses/${courseId}/${nextLesson}`}>
                <Button variant={isCompleted ? "default" : "outline"}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Resources / Downloads */}
        {lesson.resources && lesson.resources.length > 0 && (
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Downloadable Resources
              </h3>
              <div className="space-y-2">
                {lesson.resources.map((resource, i) => (
                  <a 
                    key={i} 
                    href={resource.url} 
                    download={resource.title || 'download'}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-foreground truncate">{resource.title || 'Download File'}</span>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Rating Dialog */}
      {user && lesson && (
        <LessonRatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          userId={user.id}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
}
