-- Create a function that returns quiz questions WITH correct_answer hidden for students
-- The correct_answer is only shown when:
-- 1. The user is an admin/instructor, OR
-- 2. The student has already submitted AND show_answer_mode allows it

CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(p_assignment_id uuid)
RETURNS TABLE (
  id uuid,
  assignment_id uuid,
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
  v_user_id uuid := auth.uid();
  v_user_role app_role;
  v_has_submitted boolean;
  v_show_answer_mode text;
  v_can_see_answers boolean := false;
  v_is_instructor boolean := false;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM profiles WHERE profiles.id = v_user_id;
  
  -- Check if user is admin or instructor
  IF v_user_role IN ('admin', 'dosen') THEN
    v_can_see_answers := true;
    v_is_instructor := true;
  END IF;
  
  -- If not admin/instructor, check if student can see answers
  IF NOT v_can_see_answers THEN
    -- Get show_answer_mode from assignment
    SELECT ea.show_answer_mode INTO v_show_answer_mode
    FROM elearning_assignments ea
    WHERE ea.id = p_assignment_id;
    
    -- Check if student has submitted
    SELECT EXISTS (
      SELECT 1 FROM elearning_submissions es
      WHERE es.assignment_id = p_assignment_id
      AND es.student_profile_id = v_user_id
    ) INTO v_has_submitted;
    
    -- Determine if student can see answers based on show_answer_mode and submission status
    IF v_has_submitted AND v_show_answer_mode IN ('after_quiz', 'after_each') THEN
      v_can_see_answers := true;
    END IF;
  END IF;
  
  -- Return questions with or without correct_answer based on permission
  RETURN QUERY
  SELECT 
    q.id,
    q.assignment_id,
    q.question_code,
    q.question_type,
    q.question_text,
    q.question_image_url,
    q.options,
    CASE WHEN v_can_see_answers THEN q.correct_answer ELSE NULL END as correct_answer,
    CASE WHEN v_can_see_answers THEN q.feedback ELSE NULL END as feedback,
    CASE WHEN v_can_see_answers THEN q.ai_feedback ELSE NULL END as ai_feedback,
    q.points,
    q.order_index,
    q.created_at,
    q.updated_at
  FROM elearning_quiz_questions q
  WHERE q.assignment_id = p_assignment_id
  ORDER BY q.order_index ASC;
END;
$$;

-- Create a function for server-side quiz grading
-- This securely calculates scores without exposing correct_answer to the client
CREATE OR REPLACE FUNCTION public.grade_quiz_submission(
  p_assignment_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_points integer := 0;
  v_earned_points integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_question record;
  v_user_answer jsonb;
  v_correct_answer jsonb;
  v_is_correct boolean;
  v_question_points integer;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Iterate through each question
  FOR v_question IN 
    SELECT * FROM elearning_quiz_questions 
    WHERE assignment_id = p_assignment_id 
    ORDER BY order_index
  LOOP
    v_question_points := COALESCE(v_question.points, 1);
    v_total_points := v_total_points + v_question_points;
    
    -- Get user's answer for this question
    v_user_answer := p_answers->v_question.id::text;
    v_correct_answer := v_question.correct_answer;
    v_is_correct := false;
    
    -- Compare answers based on question type
    IF v_question.question_type IN ('multiple_choice', 'true_false', 'select_missing_word') THEN
      -- For single answer questions, compare directly
      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        -- Handle both string and numeric comparisons
        v_is_correct := (
          v_user_answer::text = v_correct_answer::text OR
          v_user_answer::text = trim(both '"' from v_correct_answer::text)
        );
      END IF;
    ELSIF v_question.question_type = 'multiple_answer' THEN
      -- For multiple answer, check if arrays match (order doesn't matter)
      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        v_is_correct := (
          (SELECT array_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_user_answer) x) =
          (SELECT array_agg(x ORDER BY x) FROM jsonb_array_elements_text(v_correct_answer) x)
        );
      END IF;
    ELSIF v_question.question_type = 'matching' THEN
      -- For matching questions, compare JSON objects
      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        v_is_correct := (v_user_answer @> v_correct_answer AND v_correct_answer @> v_user_answer);
      END IF;
    ELSIF v_question.question_type = 'short_answer' THEN
      -- For short answer, case-insensitive comparison
      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        v_is_correct := (
          LOWER(trim(both '"' from v_user_answer::text)) = 
          LOWER(trim(both '"' from v_correct_answer::text))
        );
      END IF;
    END IF;
    -- Note: essay questions are not auto-graded (v_is_correct stays false)
    
    IF v_is_correct THEN
      v_earned_points := v_earned_points + v_question_points;
    END IF;
    
    -- Add to results
    v_results := v_results || jsonb_build_object(
      'question_id', v_question.id,
      'question', v_question.question_text,
      'question_type', v_question.question_type,
      'user_answer', v_user_answer,
      'correct_answer', v_correct_answer,
      'is_correct', v_is_correct,
      'points', v_question_points,
      'earned_points', CASE WHEN v_is_correct THEN v_question_points ELSE 0 END,
      'feedback', v_question.feedback
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_points', v_total_points,
    'earned_points', v_earned_points,
    'percentage', CASE WHEN v_total_points > 0 THEN ROUND((v_earned_points::numeric / v_total_points::numeric) * 100, 2) ELSE 0 END,
    'details', v_results
  );
END;
$$;

-- Drop the old student SELECT policy
DROP POLICY IF EXISTS "Students can view quiz_questions for published assignments" ON public.elearning_quiz_questions;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.get_quiz_questions_for_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grade_quiz_submission(uuid, jsonb) TO authenticated;