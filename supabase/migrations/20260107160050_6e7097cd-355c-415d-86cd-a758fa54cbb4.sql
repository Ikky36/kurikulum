
-- Create elearning_classes table for class management
CREATE TABLE public.elearning_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'class_only' CHECK (visibility IN ('class_only', 'instructors_only', 'public')),
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_group_id, course_id)
);

-- Create elearning_sessions table for attendance sessions (meetings)
CREATE TABLE public.elearning_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elearning_class_id UUID NOT NULL REFERENCES public.elearning_classes(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(elearning_class_id, session_number)
);

-- Create elearning_attendance table for student attendance
CREATE TABLE public.elearning_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elearning_session_id UUID NOT NULL REFERENCES public.elearning_sessions(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'alpha' CHECK (status IN ('hadir', 'izin', 'alpha')),
  notes TEXT,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(elearning_session_id, student_profile_id)
);

-- Create elearning_materials table for course materials
CREATE TABLE public.elearning_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elearning_class_id UUID NOT NULL REFERENCES public.elearning_classes(id) ON DELETE CASCADE,
  llo_id UUID REFERENCES public.llos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'document', 'link')),
  content TEXT,
  file_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create elearning_assignments table for assignments/quizzes
CREATE TABLE public.elearning_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elearning_class_id UUID NOT NULL REFERENCES public.elearning_classes(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  llo_id UUID REFERENCES public.llos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('tugas', 'quiz')),
  submission_type TEXT CHECK (submission_type IN ('link_video', 'link_document', 'file_upload', 'online')),
  due_date TIMESTAMP WITH TIME ZONE,
  max_attempts INTEGER DEFAULT 1,
  time_limit_minutes INTEGER,
  is_safe_exam_mode BOOLEAN NOT NULL DEFAULT false,
  seb_config_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create elearning_quiz_questions table for quiz questions
CREATE TABLE public.elearning_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.elearning_assignments(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'multiple_choice', 'true_false', 'matching', 'short_answer', 
    'drag_drop_text', 'drag_drop_image', 'drag_drop_markers', 'select_missing_word'
  )),
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  options JSONB,
  correct_answer JSONB,
  feedback TEXT,
  ai_feedback TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create elearning_submissions table for student submissions
CREATE TABLE public.elearning_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.elearning_assignments(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  submission_url TEXT,
  submission_content TEXT,
  answers JSONB,
  score NUMERIC,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by_profile_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.elearning_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for elearning_classes
CREATE POLICY "Admins can manage elearning_classes"
ON public.elearning_classes FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their elearning_classes"
ON public.elearning_classes FOR ALL
USING (instructor_profile_id = auth.uid());

CREATE POLICY "Students can view their enrolled elearning_classes"
ON public.elearning_classes FOR SELECT
USING (
  visibility = 'public' OR
  (visibility = 'class_only' AND EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.class_group_id = elearning_classes.class_group_id
    AND cs.student_profile_id = auth.uid()
  )) OR
  (visibility = 'instructors_only' AND EXISTS (
    SELECT 1 FROM public.course_instructors ci
    WHERE ci.course_id = elearning_classes.course_id
    AND ci.instructor_profile_id = auth.uid()
  ))
);

-- RLS Policies for elearning_sessions
CREATE POLICY "Admins can manage elearning_sessions"
ON public.elearning_sessions FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their elearning_sessions"
ON public.elearning_sessions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.elearning_classes ec
  WHERE ec.id = elearning_sessions.elearning_class_id
  AND ec.instructor_profile_id = auth.uid()
));

CREATE POLICY "Anyone can view elearning_sessions"
ON public.elearning_sessions FOR SELECT USING (true);

-- RLS Policies for elearning_attendance
CREATE POLICY "Admins can manage elearning_attendance"
ON public.elearning_attendance FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage attendance for their sessions"
ON public.elearning_attendance FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.elearning_sessions es
  JOIN public.elearning_classes ec ON ec.id = es.elearning_class_id
  WHERE es.id = elearning_attendance.elearning_session_id
  AND ec.instructor_profile_id = auth.uid()
));

CREATE POLICY "Students can view their own attendance"
ON public.elearning_attendance FOR SELECT
USING (student_profile_id = auth.uid());

-- RLS Policies for elearning_materials
CREATE POLICY "Admins can manage elearning_materials"
ON public.elearning_materials FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their elearning_materials"
ON public.elearning_materials FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.elearning_classes ec
  WHERE ec.id = elearning_materials.elearning_class_id
  AND ec.instructor_profile_id = auth.uid()
));

CREATE POLICY "Students can view published materials in their classes"
ON public.elearning_materials FOR SELECT
USING (is_published = true AND EXISTS (
  SELECT 1 FROM public.elearning_classes ec
  JOIN public.class_students cs ON cs.class_group_id = ec.class_group_id
  WHERE ec.id = elearning_materials.elearning_class_id
  AND cs.student_profile_id = auth.uid()
));

-- RLS Policies for elearning_assignments
CREATE POLICY "Admins can manage elearning_assignments"
ON public.elearning_assignments FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their elearning_assignments"
ON public.elearning_assignments FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.elearning_classes ec
  WHERE ec.id = elearning_assignments.elearning_class_id
  AND ec.instructor_profile_id = auth.uid()
));

CREATE POLICY "Students can view published assignments in their classes"
ON public.elearning_assignments FOR SELECT
USING (is_published = true AND EXISTS (
  SELECT 1 FROM public.elearning_classes ec
  JOIN public.class_students cs ON cs.class_group_id = ec.class_group_id
  WHERE ec.id = elearning_assignments.elearning_class_id
  AND cs.student_profile_id = auth.uid()
));

-- RLS Policies for elearning_quiz_questions
CREATE POLICY "Admins can manage quiz_questions"
ON public.elearning_quiz_questions FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their quiz_questions"
ON public.elearning_quiz_questions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.elearning_assignments ea
  JOIN public.elearning_classes ec ON ec.id = ea.elearning_class_id
  WHERE ea.id = elearning_quiz_questions.assignment_id
  AND ec.instructor_profile_id = auth.uid()
));

CREATE POLICY "Students can view quiz_questions for published assignments"
ON public.elearning_quiz_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.elearning_assignments ea
  JOIN public.elearning_classes ec ON ec.id = ea.elearning_class_id
  JOIN public.class_students cs ON cs.class_group_id = ec.class_group_id
  WHERE ea.id = elearning_quiz_questions.assignment_id
  AND ea.is_published = true
  AND cs.student_profile_id = auth.uid()
));

-- RLS Policies for elearning_submissions
CREATE POLICY "Admins can manage elearning_submissions"
ON public.elearning_submissions FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can view and grade submissions for their assignments"
ON public.elearning_submissions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.elearning_assignments ea
  JOIN public.elearning_classes ec ON ec.id = ea.elearning_class_id
  WHERE ea.id = elearning_submissions.assignment_id
  AND ec.instructor_profile_id = auth.uid()
));

CREATE POLICY "Students can manage their own submissions"
ON public.elearning_submissions FOR ALL
USING (student_profile_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_elearning_classes_updated_at
BEFORE UPDATE ON public.elearning_classes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elearning_sessions_updated_at
BEFORE UPDATE ON public.elearning_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elearning_attendance_updated_at
BEFORE UPDATE ON public.elearning_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elearning_materials_updated_at
BEFORE UPDATE ON public.elearning_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elearning_assignments_updated_at
BEFORE UPDATE ON public.elearning_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elearning_quiz_questions_updated_at
BEFORE UPDATE ON public.elearning_quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_elearning_submissions_updated_at
BEFORE UPDATE ON public.elearning_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
