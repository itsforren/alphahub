-- Add time tracking fields to lesson_progress
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS time_spent_seconds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now();

-- Create lesson_ratings table for video feedback
CREATE TABLE public.lesson_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create course_user_progress table for aggregated course-level stats
CREATE TABLE public.course_user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  total_time_spent_seconds integer DEFAULT 0,
  last_activity_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS on new tables
ALTER TABLE public.lesson_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for lesson_ratings
CREATE POLICY "Users can manage their own ratings" 
ON public.lesson_ratings 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all ratings" 
ON public.lesson_ratings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for course_user_progress
CREATE POLICY "Users can manage their own course progress" 
ON public.course_user_progress 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all course progress" 
ON public.course_user_progress 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_lesson_ratings_lesson_id ON public.lesson_ratings(lesson_id);
CREATE INDEX idx_lesson_ratings_user_id ON public.lesson_ratings(user_id);
CREATE INDEX idx_course_user_progress_course_id ON public.course_user_progress(course_id);
CREATE INDEX idx_course_user_progress_user_id ON public.course_user_progress(user_id);