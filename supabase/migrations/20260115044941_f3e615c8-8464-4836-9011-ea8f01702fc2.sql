
-- Drop the old function with different parameter order and recreate with correct one
DROP FUNCTION IF EXISTS public.grade_quiz_submission(uuid, jsonb);

-- Recreate function with correct parameter order (p_answers first, p_assignment_id second)
CREATE OR REPLACE FUNCTION public.grade_quiz_submission(p_answers jsonb, p_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_options jsonb;
  v_pair record;
  v_expected_mapping jsonb;
  v_left_val text;
  v_right_val text;
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
    v_options := v_question.options;
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
      -- For matching questions, build expected mapping from options and compare
      IF v_user_answer IS NOT NULL AND v_options IS NOT NULL THEN
        -- Build the correct mapping from options array
        -- Options format: [{"left": "A", "right": "1"}, {"left": "B", "right": "2"}]
        v_expected_mapping := '{}'::jsonb;
        
        IF jsonb_typeof(v_options) = 'array' THEN
          FOR v_pair IN SELECT * FROM jsonb_array_elements(v_options)
          LOOP
            v_left_val := v_pair.value->>'left';
            v_right_val := v_pair.value->>'right';
            IF v_left_val IS NOT NULL AND v_right_val IS NOT NULL THEN
              v_expected_mapping := v_expected_mapping || jsonb_build_object(v_left_val, v_right_val);
            END IF;
          END LOOP;
        END IF;
        
        -- Now compare user answer with expected mapping
        -- User answer format: {"left_text": "right_text", ...}
        IF jsonb_typeof(v_user_answer) = 'object' AND jsonb_typeof(v_expected_mapping) = 'object' THEN
          -- Check if both have same number of keys
          v_is_correct := (
            (SELECT COUNT(*) FROM jsonb_each_text(v_user_answer)) = 
            (SELECT COUNT(*) FROM jsonb_each_text(v_expected_mapping))
          );
          
          IF v_is_correct THEN
            -- Check each key-value pair
            FOR v_pair IN SELECT * FROM jsonb_each_text(v_user_answer)
            LOOP
              IF v_expected_mapping->>v_pair.key IS NULL OR v_expected_mapping->>v_pair.key != v_pair.value THEN
                v_is_correct := false;
                EXIT;
              END IF;
            END LOOP;
          END IF;
        ELSE
          v_is_correct := false;
        END IF;
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
