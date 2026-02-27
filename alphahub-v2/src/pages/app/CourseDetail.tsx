import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  BookOpen, 
  Play, 
  Lock, 
  CheckCircle, 
  Circle, 
  Clock,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  is_preview: boolean;
  order_index: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
  completedCount: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  modules: Module[];
  isEnrolled: boolean;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<string[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId, user]);

  const fetchCourse = async () => {
    try {
      // Fetch course with modules and lessons
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          modules (
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              description,
              duration_seconds,
              is_preview,
              order_index
            )
          )
        `)
        .eq('id', courseId)
        .maybeSingle();

      if (error || !courseData) {
        navigate('/hub/courses');
        return;
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('user_id', user?.id)
        .is('revoked_at', null)
        .maybeSingle();

      const isEnrolled = !!enrollment || isAdmin;

      // Get lesson progress
      const lessonIds = courseData.modules?.flatMap(
        (mod: any) => mod.lessons?.map((l: any) => l.id) || []
      ) || [];

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status')
        .in('lesson_id', lessonIds)
        .eq('user_id', user?.id);

      const progressMap = new Map(
        progressData?.map(p => [p.lesson_id, p.status]) || []
      );

      // Process modules and lessons
      const modules = (courseData.modules || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((mod: any) => {
          const lessons = (mod.lessons || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((lesson: any) => ({
              ...lesson,
              status: progressMap.get(lesson.id) || 'not_started',
            }));

          return {
            ...mod,
            lessons,
            completedCount: lessons.filter((l: Lesson) => l.status === 'completed').length,
          };
        });

      // Open first incomplete module by default
      const firstIncompleteModule = modules.find(
        (m: Module) => m.completedCount < m.lessons.length
      );
      if (firstIncompleteModule) {
        setOpenModules([firstIncompleteModule.id]);
      } else if (modules.length > 0) {
        setOpenModules([modules[0].id]);
      }

      setCourse({
        ...courseData,
        modules,
        isEnrolled,
      });
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const totalLessons = course?.modules.reduce((acc, mod) => acc + mod.lessons.length, 0) || 0;
  const completedLessons = course?.modules.reduce((acc, mod) => acc + mod.completedCount, 0) || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Find next lesson to continue
  const findNextLesson = (): { moduleId: string; lessonId: string } | null => {
    if (!course) return null;
    
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (lesson.status !== 'completed') {
          return { moduleId: mod.id, lessonId: lesson.id };
        }
      }
    }
    
    // If all completed, return first lesson
    if (course.modules[0]?.lessons[0]) {
      return { 
        moduleId: course.modules[0].id, 
        lessonId: course.modules[0].lessons[0].id 
      };
    }
    
    return null;
  };

  const nextLesson = findNextLesson();

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-20" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link to="/hub/courses">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          {/* Course Header */}
          <div className="relative h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl overflow-hidden mb-6">
            {course.cover_image_url ? (
              <img 
                src={course.cover_image_url} 
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-full h-full flex items-center justify-center fallback-icon ${course.cover_image_url ? 'hidden' : ''} absolute inset-0`}>
              <BookOpen className="w-24 h-24 text-primary/30" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">{course.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{course.modules.length} modules</span>
                <span>•</span>
                <span>{totalLessons} lessons</span>
              </div>
            </div>
          </div>

          {/* Progress & Continue */}
          {course.isEnrolled && (
            <Card className="glass-card mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Your Progress</p>
                    <p className="text-2xl font-bold text-foreground">
                      {completedLessons} / {totalLessons} lessons completed
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-primary">{progress}%</div>
                </div>
                <Progress value={progress} className="h-3 mb-4" />
                {nextLesson && (
                  <Link to={`/hub/courses/${course.id}/${nextLesson.lessonId}`}>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Play className="w-4 h-4 mr-2" />
                      {progress === 0 ? 'Start Course' : progress === 100 ? 'Review Course' : 'Continue Learning'}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Not Enrolled State */}
          {!course.isEnrolled && (
            <Card className="glass-card mb-6 border-primary/30">
              <CardContent className="p-6 text-center">
                <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Access Required
                </h3>
                <p className="text-muted-foreground mb-4">
                  You need to be enrolled in this course to access the content.
                  Contact an administrator to request access.
                </p>
                <Button variant="outline" disabled>
                  Request Access
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {course.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">About This Course</h2>
              <p className="text-muted-foreground leading-relaxed">{course.description}</p>
            </div>
          )}
        </motion.div>

        {/* Sidebar - Course Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="sticky top-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Course Content</h2>
            <Accordion 
              type="multiple" 
              value={openModules}
              onValueChange={setOpenModules}
              className="space-y-2"
            >
              {course.modules.map((module, moduleIndex) => (
                <AccordionItem 
                  key={module.id} 
                  value={module.id}
                  className="glass-card border-none"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {moduleIndex + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground text-sm">{module.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {module.completedCount}/{module.lessons.length} completed
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-2 pb-2 space-y-1">
                      {module.lessons.map((lesson) => {
                        const isAccessible = course.isEnrolled || lesson.is_preview;
                        
                        return (
                          <Link
                            key={lesson.id}
                            to={isAccessible ? `/hub/courses/${course.id}/${lesson.id}` : '#'}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg transition-colors",
                              isAccessible 
                                ? "hover:bg-secondary/50 cursor-pointer" 
                                : "opacity-50 cursor-not-allowed"
                            )}
                            onClick={(e) => !isAccessible && e.preventDefault()}
                          >
                            <div className="flex-shrink-0">
                              {lesson.status === 'completed' ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : lesson.status === 'in_progress' ? (
                                <Circle className="w-5 h-5 text-primary fill-primary/20" />
                              ) : isAccessible ? (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm truncate",
                                lesson.status === 'completed' 
                                  ? "text-muted-foreground" 
                                  : "text-foreground"
                              )}>
                                {lesson.title}
                              </p>
                              {lesson.duration_seconds && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(lesson.duration_seconds)}
                                </p>
                              )}
                            </div>
                            {isAccessible && (
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
