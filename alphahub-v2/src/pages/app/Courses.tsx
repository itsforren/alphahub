import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Play, Lock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  isEnrolled: boolean;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export default function Courses() {
  const { user, role } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      // Fetch all published courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          status,
          modules (
            id,
            lessons (id)
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (!coursesData) {
        setCourses([]);
        return;
      }

      // Get user's enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user?.id)
        .is('revoked_at', null);

      const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);

      // Calculate progress for each course
      const coursesWithProgress = await Promise.all(
        coursesData.map(async (course: any) => {
          const totalLessons = course.modules?.reduce(
            (acc: number, mod: any) => acc + (mod.lessons?.length || 0),
            0
          ) || 0;

          let completedLessons = 0;
          let progress = 0;

          if (totalLessons > 0) {
            const lessonIds = course.modules?.flatMap(
              (mod: any) => mod.lessons?.map((l: any) => l.id) || []
            ) || [];

            const { count } = await supabase
              .from('lesson_progress')
              .select('*', { count: 'exact', head: true })
              .in('lesson_id', lessonIds)
              .eq('user_id', user?.id)
              .eq('status', 'completed');

            completedLessons = count || 0;
            progress = Math.round((completedLessons / totalLessons) * 100);
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            cover_image_url: course.cover_image_url,
            status: course.status,
            isEnrolled: enrolledCourseIds.has(course.id),
            progress,
            totalLessons,
            completedLessons,
          };
        })
      );

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrolledCourses = courses.filter(c => c.isEnrolled);
  const availableCourses = courses.filter(c => !c.isEnrolled);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">Courses</h1>
        <p className="text-muted-foreground">
          Access your enrolled courses and explore new learning opportunities
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-0">
                <Skeleton className="h-48 rounded-t-xl" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Enrolled Courses */}
          {enrolledCourses.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-10"
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">
                My Courses ({enrolledCourses.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link to={`/hub/courses/${course.id}`}>
                      <Card className="glass-card-hover h-full group">
                        <CardContent className="p-0">
                          <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-xl overflow-hidden">
                            {course.cover_image_url ? (
                              <img 
                                src={course.cover_image_url} 
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center fallback-icon ${course.cover_image_url ? 'hidden' : ''} absolute inset-0`}>
                              <BookOpen className="w-16 h-16 text-primary/30" />
                            </div>


                            {course.progress === 100 && (
                              <div className="absolute top-3 right-3 bg-success text-success-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </div>
                            )}
                          </div>
                          <div className="p-5">
                            <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">
                              {course.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                              {course.description || 'No description available'}
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {course.completedLessons} / {course.totalLessons} lessons
                                </span>
                                <span className="text-primary font-medium">{course.progress}%</span>
                              </div>
                              <Progress value={course.progress} className="h-2" />
                              <Button 
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                {course.progress === 0 ? 'Start Course' : 'Continue Learning'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Available Courses */}
          {availableCourses.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Available Courses ({availableCourses.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <Card className="glass-card h-full opacity-75">
                      <CardContent className="p-0">
                        <div className="relative h-48 bg-gradient-to-br from-muted/50 to-muted/20 rounded-t-xl overflow-hidden">
                          {course.cover_image_url ? (
                            <img 
                              src={course.cover_image_url} 
                              alt={course.title}
                              className="w-full h-full object-cover grayscale"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center fallback-icon ${course.cover_image_url ? 'hidden' : ''} absolute inset-0`}>
                            <BookOpen className="w-16 h-16 text-muted-foreground/30" />
                          </div>


                          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                            <div className="bg-secondary/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">
                                Access Required
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-1">
                            {course.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                            {course.description || 'No description available'}
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {course.totalLessons} lessons
                          </p>
                          <Button 
                            variant="outline"
                            className="w-full"
                            disabled
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Request Access
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {courses.length === 0 && (
            <Card className="glass-card">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Courses Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  There are no courses available at the moment. Check back later for new content.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
