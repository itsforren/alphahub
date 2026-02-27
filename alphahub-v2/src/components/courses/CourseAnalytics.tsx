import { useState } from 'react';
import { useCourseAnalytics, UserCourseProgress, LessonRatingData } from '@/hooks/useCourseAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Users, Clock, TrendingUp, MessageSquare, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CourseAnalyticsProps {
  courseId?: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function CourseAnalytics({ courseId }: CourseAnalyticsProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>(courseId || 'all');
  
  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, title').order('title');
      return data || [];
    },
  });

  const { data, isLoading } = useCourseAnalytics(selectedCourse === 'all' ? undefined : selectedCourse);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { userProgress = [], lessonRatings = [], summary } = data || {};

  return (
    <div className="space-y-6">
      {/* Course Selector */}
      {!courseId && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-muted-foreground">Filter by Course:</label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses?.map(course => (
                <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalEnrollments}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.completedUsers}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(summary.averageTimeSpentSeconds)}</p>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Rating ({summary.totalRatings})</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Progress
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Ratings & Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">User Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {userProgress.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No user data yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Days Active</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProgress.map((up, idx) => (
                      <UserProgressRow key={idx} progress={up} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Lesson Ratings & Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {lessonRatings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No ratings yet</p>
              ) : (
                <div className="space-y-4">
                  {lessonRatings.map((rating, idx) => (
                    <RatingCard key={idx} rating={rating} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserProgressRow({ progress }: { progress: UserCourseProgress }) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{progress.userName || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{progress.userEmail}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm">{progress.courseTitle}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Progress value={progress.completionRate} className="w-24 h-2" />
            <span className="text-xs text-muted-foreground">
              {Math.round(progress.completionRate)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.lessonsCompleted}/{progress.totalLessons} lessons
          </p>
        </div>
      </TableCell>
      <TableCell className="text-sm">{formatDuration(progress.totalTimeSpentSeconds)}</TableCell>
      <TableCell>
        <div className="text-sm">
          {progress.daysToComplete !== null ? (
            <span className="text-success">{progress.daysToComplete} days to complete</span>
          ) : progress.daysSinceStart !== null ? (
            <span>{progress.daysSinceStart} days since start</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {progress.completionRate === 100 ? (
          <Badge className="bg-success/20 text-success border-success/30">Completed</Badge>
        ) : progress.completionRate > 0 ? (
          <Badge className="bg-warning/20 text-warning border-warning/30">In Progress</Badge>
        ) : (
          <Badge variant="outline">Not Started</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function RatingCard({ rating }: { rating: LessonRatingData }) {
  return (
    <Card className="bg-secondary/20 border-secondary/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{rating.userName || 'Anonymous'}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(rating.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{rating.lessonTitle}</span>
              {' · '}{rating.moduleTitle}
            </p>
            {rating.comment && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-background/50 rounded-lg">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm">{rating.comment}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
