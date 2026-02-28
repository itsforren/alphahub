import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserCourseProgress {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  courseId: string;
  courseTitle: string;
  startedAt: string | null;
  completedAt: string | null;
  totalTimeSpentSeconds: number;
  lessonsCompleted: number;
  totalLessons: number;
  completionRate: number;
  daysToComplete: number | null;
  daysSinceStart: number | null;
  lastActivityAt: string | null;
}

export interface LessonRatingData {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface CourseAnalyticsSummary {
  courseId: string;
  courseTitle: string;
  totalEnrollments: number;
  completedUsers: number;
  averageCompletionRate: number;
  averageTimeSpentSeconds: number;
  averageRating: number;
  totalRatings: number;
}

export function useCourseAnalytics(courseId?: string) {
  return useQuery({
    queryKey: ['course-analytics', courseId],
    queryFn: async (): Promise<{
      userProgress: UserCourseProgress[];
      lessonRatings: LessonRatingData[];
      summary: CourseAnalyticsSummary | null;
    }> => {
      // Fetch all courses if no specific courseId
      const coursesQuery = courseId
        ? supabase.from('courses').select('id, title').eq('id', courseId)
        : supabase.from('courses').select('id, title');
      
      const { data: courses } = await coursesQuery;
      if (!courses?.length) {
        return { userProgress: [], lessonRatings: [], summary: null };
      }

      const targetCourseIds = courses.map(c => c.id);

      // Fetch all modules and lessons for these courses
      const { data: modules } = await supabase
        .from('modules')
        .select('id, title, course_id, lessons(id, title)')
        .in('course_id', targetCourseIds);

      // Create lesson to course/module mapping
      const lessonMap = new Map<string, { courseId: string; moduleTitle: string; lessonTitle: string }>();
      const courseLessonCounts = new Map<string, number>();

      modules?.forEach(m => {
        const lessons = m.lessons || [];
        courseLessonCounts.set(m.course_id, (courseLessonCounts.get(m.course_id) || 0) + lessons.length);
        lessons.forEach((l: any) => {
          lessonMap.set(l.id, {
            courseId: m.course_id,
            moduleTitle: m.title,
            lessonTitle: l.title,
          });
        });
      });

      // Fetch lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('user_id, lesson_id, status, completed_at, time_spent_seconds, started_at');

      // Fetch course user progress
      const { data: courseProgress } = await supabase
        .from('course_user_progress')
        .select('*')
        .in('course_id', targetCourseIds);

      // Fetch lesson ratings
      const { data: ratings } = await supabase
        .from('lesson_ratings')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch user profiles for names
      const allUserIds = new Set<string>();
      lessonProgress?.forEach(lp => allUserIds.add(lp.user_id));
      courseProgress?.forEach(cp => allUserIds.add(cp.user_id));
      ratings?.forEach(r => allUserIds.add(r.user_id));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', Array.from(allUserIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Calculate user progress for each course
      const userProgressMap = new Map<string, UserCourseProgress>();

      lessonProgress?.forEach(lp => {
        const lessonInfo = lessonMap.get(lp.lesson_id);
        if (!lessonInfo) return;
        if (courseId && lessonInfo.courseId !== courseId) return;

        const key = `${lp.user_id}-${lessonInfo.courseId}`;
        const existing = userProgressMap.get(key) || {
          userId: lp.user_id,
          userName: profileMap.get(lp.user_id)?.name || null,
          userEmail: profileMap.get(lp.user_id)?.email || null,
          courseId: lessonInfo.courseId,
          courseTitle: courses.find(c => c.id === lessonInfo.courseId)?.title || '',
          startedAt: null,
          completedAt: null,
          totalTimeSpentSeconds: 0,
          lessonsCompleted: 0,
          totalLessons: courseLessonCounts.get(lessonInfo.courseId) || 0,
          completionRate: 0,
          daysToComplete: null,
          daysSinceStart: null,
          lastActivityAt: null,
        };

        existing.totalTimeSpentSeconds += lp.time_spent_seconds || 0;
        
        if (lp.status === 'completed') {
          existing.lessonsCompleted += 1;
        }

        if (lp.started_at && (!existing.startedAt || new Date(lp.started_at) < new Date(existing.startedAt))) {
          existing.startedAt = lp.started_at;
        }

        if (lp.completed_at && (!existing.lastActivityAt || new Date(lp.completed_at) > new Date(existing.lastActivityAt))) {
          existing.lastActivityAt = lp.completed_at;
        }

        userProgressMap.set(key, existing);
      });

      // Merge with course_user_progress data
      courseProgress?.forEach(cp => {
        const key = `${cp.user_id}-${cp.course_id}`;
        const existing = userProgressMap.get(key);
        if (existing) {
          existing.totalTimeSpentSeconds = Math.max(existing.totalTimeSpentSeconds, cp.total_time_spent_seconds || 0);
          if (cp.started_at) existing.startedAt = cp.started_at;
          if (cp.completed_at) existing.completedAt = cp.completed_at;
          if (cp.last_activity_at) existing.lastActivityAt = cp.last_activity_at;
        }
      });

      // Calculate derived fields
      const userProgress: UserCourseProgress[] = Array.from(userProgressMap.values()).map(up => {
        const completionRate = up.totalLessons > 0 ? (up.lessonsCompleted / up.totalLessons) * 100 : 0;
        
        let daysToComplete: number | null = null;
        let daysSinceStart: number | null = null;

        if (up.startedAt) {
          const startDate = new Date(up.startedAt);
          const now = new Date();
          daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          if (up.completedAt) {
            const endDate = new Date(up.completedAt);
            daysToComplete = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        return {
          ...up,
          completionRate,
          daysToComplete,
          daysSinceStart,
        };
      });

      // Process ratings
      const lessonRatings: LessonRatingData[] = (ratings || [])
        .filter(r => {
          const lessonInfo = lessonMap.get(r.lesson_id);
          return lessonInfo && (!courseId || lessonInfo.courseId === courseId);
        })
        .map(r => {
          const lessonInfo = lessonMap.get(r.lesson_id)!;
          const profile = profileMap.get(r.user_id);
          return {
            lessonId: r.lesson_id,
            lessonTitle: lessonInfo.lessonTitle,
            moduleTitle: lessonInfo.moduleTitle,
            userId: r.user_id,
            userName: profile?.name || null,
            userEmail: profile?.email || null,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at,
          };
        });

      // Calculate summary
      let summary: CourseAnalyticsSummary | null = null;
      if (courseId && courses.length === 1) {
        const courseUsers = userProgress.filter(up => up.courseId === courseId);
        const courseRatings = lessonRatings.filter(r => lessonMap.get(r.lessonId)?.courseId === courseId);

        summary = {
          courseId,
          courseTitle: courses[0].title,
          totalEnrollments: courseUsers.length,
          completedUsers: courseUsers.filter(u => u.completionRate === 100).length,
          averageCompletionRate: courseUsers.length > 0
            ? courseUsers.reduce((sum, u) => sum + u.completionRate, 0) / courseUsers.length
            : 0,
          averageTimeSpentSeconds: courseUsers.length > 0
            ? courseUsers.reduce((sum, u) => sum + u.totalTimeSpentSeconds, 0) / courseUsers.length
            : 0,
          averageRating: courseRatings.length > 0
            ? courseRatings.reduce((sum, r) => sum + r.rating, 0) / courseRatings.length
            : 0,
          totalRatings: courseRatings.length,
        };
      }

      return { userProgress, lessonRatings, summary };
    },
    staleTime: 30000,
  });
}
