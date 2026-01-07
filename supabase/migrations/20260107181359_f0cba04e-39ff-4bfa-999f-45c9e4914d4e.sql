-- Add question_code column to elearning_quiz_questions table
ALTER TABLE public.elearning_quiz_questions 
ADD COLUMN IF NOT EXISTS question_code TEXT;

-- Create question bank table for reusing questions across assignments
CREATE TABLE public.question_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_code TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false', 'matching', 'short_answer', 
    'drag_drop_text', 'drag_drop_image', 'drag_drop_markers', 'select_missing_word'
  )),
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  options JSONB,
  correct_answer JSONB,
  feedback TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  tags TEXT[] DEFAULT '{}',
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on question_code per course
CREATE UNIQUE INDEX question_bank_course_code_idx ON public.question_bank(course_id, question_code);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_bank
CREATE POLICY "Admins can manage question_bank"
ON public.question_bank
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their own questions"
ON public.question_bank
FOR ALL
USING (instructor_profile_id = auth.uid());

CREATE POLICY "Instructors can view shared questions in their courses"
ON public.question_bank
FOR SELECT
USING (
  is_shared = true 
  AND EXISTS (
    SELECT 1 FROM course_instructors ci 
    WHERE ci.course_id = question_bank.course_id 
    AND ci.instructor_profile_id = auth.uid()
  )
);

-- Create updated_at trigger for question_bank
CREATE TRIGGER update_question_bank_updated_at
BEFORE UPDATE ON public.question_bank
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();