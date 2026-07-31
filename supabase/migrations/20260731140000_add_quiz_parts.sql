-- Create quiz parts table
CREATE TABLE IF NOT EXISTS public.elearning_quiz_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.elearning_assignments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_points NUMERIC DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.elearning_quiz_parts ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for elearning_quiz_parts
CREATE POLICY "Enable read access for authenticated users on elearning_quiz_parts" ON public.elearning_quiz_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users on elearning_quiz_parts" ON public.elearning_quiz_parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users on elearning_quiz_parts" ON public.elearning_quiz_parts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users on elearning_quiz_parts" ON public.elearning_quiz_parts FOR DELETE TO authenticated USING (true);

-- Add weight_percentage to elearning_assignments
ALTER TABLE public.elearning_assignments
ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC DEFAULT 0;

-- Add part_id to elearning_quiz_questions
ALTER TABLE public.elearning_quiz_questions
ADD COLUMN IF NOT EXISTS part_id UUID REFERENCES public.elearning_quiz_parts(id) ON DELETE SET NULL;

-- Update the RPC to include part_id
DROP FUNCTION IF EXISTS public.get_quiz_questions_for_student(uuid);
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(p_assignment_id uuid)
  RETURNS TABLE (
    id uuid,
    assignment_id uuid,
    part_id uuid,
    question_code text,
    question_type text,
    question_text text,
    question_image_url text,
    options jsonb,
    correct_answer jsonb,
    feedback text,
    ai_feedback text,
    points integer,
    order_index integer,
    created_at timestamptz,
    updated_at timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_assignment record;
  v_current_user uuid;
  v_is_instructor boolean;
  v_has_submitted boolean;
BEGIN
  v_current_user := auth.uid();
  
  -- Get assignment details
  SELECT * INTO v_assignment 
  FROM elearning_assignments 
  WHERE id = p_assignment_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if user is instructor (author of the class)
  SELECT EXISTS (
    SELECT 1 FROM elearning_classes c
    JOIN courses co ON c.course_id = co.id
    WHERE c.id = v_assignment.elearning_class_id
    AND co.created_by = v_current_user
  ) INTO v_is_instructor;
  
  -- Check if student has submitted
  SELECT EXISTS (
    SELECT 1 FROM elearning_submissions
    WHERE assignment_id = p_assignment_id
    AND student_profile_id = v_current_user
  ) INTO v_has_submitted;
  
  -- Return questions with conditional answers
  RETURN QUERY
  SELECT 
    q.id,
    q.assignment_id,
    q.part_id,
    q.question_code,
    q.question_type,
    q.question_text,
    q.question_image_url,
    q.options,
    -- Only show correct answer if:
    -- 1. User is instructor
    -- 2. Student has submitted AND show_answer_mode is 'after_submission'
    -- 3. Student has submitted AND show_answer_mode is 'after_deadline' AND deadline passed
    CASE 
      WHEN v_is_instructor THEN q.correct_answer
      WHEN v_has_submitted AND v_assignment.show_answer_mode = 'after_submission' THEN q.correct_answer
      WHEN v_has_submitted AND v_assignment.show_answer_mode = 'after_deadline' AND v_assignment.due_date < now() THEN q.correct_answer
      ELSE NULL
    END as correct_answer,
    q.feedback,
    q.ai_feedback,
    q.points,
    q.order_index,
    q.created_at,
    q.updated_at
  FROM elearning_quiz_questions q
  WHERE q.assignment_id = p_assignment_id
  ORDER BY q.order_index ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_student(uuid) TO authenticated;
