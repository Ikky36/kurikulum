-- Fix grade_quiz_submission function to handle both index-based and text-based answers
-- Also add support for 'long_answer' and 'essay' question types (manual grading only)

CREATE OR REPLACE FUNCTION public.grade_quiz_submission(p_answers jsonb, p_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_options_parsed jsonb;
  v_pair record;
  v_expected_mapping jsonb;
  v_left_val text;
  v_right_val text;
  v_expected_key_count integer;
  v_correct_index integer;
  v_correct_option text;
  v_user_answer_text text;
  v_user_answer_num integer;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Iterate through each question
  FOR v_question IN
    SELECT * FROM public.elearning_quiz_questions
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
    IF v_question.question_type IN ('multiple_choice', 'select_missing_word') THEN
      -- Parse options if needed
      v_options_parsed := v_options;
      IF v_options_parsed IS NOT NULL AND jsonb_typeof(v_options_parsed) = 'string' THEN
        BEGIN
          v_options_parsed := (v_options_parsed #>> '{}')::jsonb;
        EXCEPTION WHEN others THEN
          v_options_parsed := '[]'::jsonb;
        END;
      END IF;

      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        -- Get the correct answer (should be an index)
        v_correct_index := NULL;
        v_correct_option := NULL;
        
        -- Try to extract correct index
        IF jsonb_typeof(v_correct_answer) = 'number' THEN
          v_correct_index := v_correct_answer::integer;
        ELSIF jsonb_typeof(v_correct_answer) = 'string' THEN
          BEGIN
            v_correct_index := (v_correct_answer #>> '{}')::integer;
          EXCEPTION WHEN others THEN
            -- correct_answer might be the text itself
            v_correct_option := v_correct_answer #>> '{}';
          END;
        END IF;

        -- Get the correct option text if we have an index
        IF v_correct_index IS NOT NULL AND v_options_parsed IS NOT NULL AND jsonb_typeof(v_options_parsed) = 'array' THEN
          v_correct_option := v_options_parsed->v_correct_index #>> '{}';
        END IF;

        -- Get user answer as text
        v_user_answer_text := NULL;
        IF jsonb_typeof(v_user_answer) = 'string' THEN
          v_user_answer_text := v_user_answer #>> '{}';
        ELSIF jsonb_typeof(v_user_answer) = 'number' THEN
          v_user_answer_num := v_user_answer::integer;
          IF v_options_parsed IS NOT NULL AND jsonb_typeof(v_options_parsed) = 'array' THEN
            v_user_answer_text := v_options_parsed->v_user_answer_num #>> '{}';
          END IF;
        END IF;

        -- Compare: user answer text vs correct option text, OR user index vs correct index
        IF v_user_answer_text IS NOT NULL AND v_correct_option IS NOT NULL THEN
          v_is_correct := (LOWER(TRIM(v_user_answer_text)) = LOWER(TRIM(v_correct_option)));
        END IF;
        
        -- Also check if user submitted index matching correct index
        IF NOT v_is_correct AND v_correct_index IS NOT NULL THEN
          BEGIN
            IF jsonb_typeof(v_user_answer) = 'number' THEN
              v_is_correct := (v_user_answer::integer = v_correct_index);
            ELSIF jsonb_typeof(v_user_answer) = 'string' THEN
              v_is_correct := ((v_user_answer #>> '{}')::integer = v_correct_index);
            END IF;
          EXCEPTION WHEN others THEN
            NULL;
          END;
        END IF;
      END IF;

    ELSIF v_question.question_type = 'true_false' THEN
      -- For true/false, handle both text and index answers
      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        -- Parse options (usually ["Benar", "Salah"] or similar)
        v_options_parsed := v_options;
        IF v_options_parsed IS NOT NULL AND jsonb_typeof(v_options_parsed) = 'string' THEN
          BEGIN
            v_options_parsed := (v_options_parsed #>> '{}')::jsonb;
          EXCEPTION WHEN others THEN
            v_options_parsed := '["Benar", "Salah"]'::jsonb;
          END;
        END IF;
        IF v_options_parsed IS NULL THEN
          v_options_parsed := '["Benar", "Salah"]'::jsonb;
        END IF;

        -- Get correct index/text
        v_correct_index := NULL;
        v_correct_option := NULL;
        
        IF jsonb_typeof(v_correct_answer) = 'number' THEN
          v_correct_index := v_correct_answer::integer;
        ELSIF jsonb_typeof(v_correct_answer) = 'string' THEN
          BEGIN
            v_correct_index := (v_correct_answer #>> '{}')::integer;
          EXCEPTION WHEN others THEN
            v_correct_option := LOWER(TRIM(v_correct_answer #>> '{}'));
          END;
        END IF;

        -- Get correct option text if we have index
        IF v_correct_index IS NOT NULL AND jsonb_typeof(v_options_parsed) = 'array' THEN
          v_correct_option := LOWER(TRIM(v_options_parsed->v_correct_index #>> '{}'));
        END IF;

        -- Get user answer text
        v_user_answer_text := NULL;
        IF jsonb_typeof(v_user_answer) = 'string' THEN
          v_user_answer_text := LOWER(TRIM(v_user_answer #>> '{}'));
        ELSIF jsonb_typeof(v_user_answer) = 'number' THEN
          v_user_answer_num := v_user_answer::integer;
          IF jsonb_typeof(v_options_parsed) = 'array' THEN
            v_user_answer_text := LOWER(TRIM(v_options_parsed->v_user_answer_num #>> '{}'));
          END IF;
        END IF;

        -- Compare user answer with correct answer
        IF v_user_answer_text IS NOT NULL AND v_correct_option IS NOT NULL THEN
          v_is_correct := (v_user_answer_text = v_correct_option);
        END IF;
        
        -- Also check index match if text comparison didn't work
        IF NOT v_is_correct AND v_correct_index IS NOT NULL THEN
          BEGIN
            IF jsonb_typeof(v_user_answer) = 'number' THEN
              v_is_correct := (v_user_answer::integer = v_correct_index);
            ELSIF jsonb_typeof(v_user_answer) = 'string' THEN
              v_is_correct := ((v_user_answer #>> '{}')::integer = v_correct_index);
            END IF;
          EXCEPTION WHEN others THEN
            NULL;
          END;
        END IF;
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
        v_options_parsed := v_options;

        IF jsonb_typeof(v_options_parsed) = 'string' THEN
          BEGIN
            v_options_parsed := (v_options_parsed #>> '{}')::jsonb;
          EXCEPTION WHEN others THEN
            v_options_parsed := '[]'::jsonb;
          END;
        END IF;

        v_expected_mapping := '{}'::jsonb;

        IF jsonb_typeof(v_options_parsed) = 'array' THEN
          FOR v_pair IN SELECT * FROM jsonb_array_elements(v_options_parsed)
          LOOP
            v_left_val := v_pair.value->>'left';
            v_right_val := v_pair.value->>'right';
            IF v_left_val IS NOT NULL AND v_right_val IS NOT NULL THEN
              v_expected_mapping := v_expected_mapping || jsonb_build_object(v_left_val, v_right_val);
            END IF;
          END LOOP;
        END IF;

        SELECT COUNT(*) INTO v_expected_key_count FROM jsonb_each_text(v_expected_mapping);

        IF v_expected_key_count = 0 THEN
          v_is_correct := false;
        ELSE
          IF jsonb_typeof(v_user_answer) = 'object' AND jsonb_typeof(v_expected_mapping) = 'object' THEN
            v_is_correct := (
              (SELECT COUNT(*) FROM jsonb_each_text(v_user_answer)) = v_expected_key_count
            );

            IF v_is_correct THEN
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
      END IF;

    ELSIF v_question.question_type = 'short_answer' THEN
      -- For short answer, case-insensitive comparison
      IF v_user_answer IS NOT NULL AND v_correct_answer IS NOT NULL THEN
        v_is_correct := (
          LOWER(trim(both '"' from v_user_answer::text)) =
          LOWER(trim(both '"' from v_correct_answer::text))
        );
      END IF;

    ELSIF v_question.question_type IN ('essay', 'long_answer') THEN
      -- Essay and long_answer questions require manual grading
      -- Mark as incorrect for auto-grading (teacher will grade manually)
      v_is_correct := false;
      -- Don't count essay/long_answer in auto-graded total
      v_total_points := v_total_points - v_question_points;

    END IF;

    -- Update earned points
    IF v_is_correct THEN
      v_earned_points := v_earned_points + v_question_points;
    END IF;

    -- Add to results array
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

  -- Return results
  RETURN jsonb_build_object(
    'total_points', v_total_points,
    'earned_points', v_earned_points,
    'percentage', CASE WHEN v_total_points > 0 THEN ROUND((v_earned_points::decimal / v_total_points::decimal) * 100, 2) ELSE 0 END,
    'details', v_results
  );
END;
$function$;

-- Update question_type constraint to include 'long_answer' and 'essay'
ALTER TABLE public.elearning_quiz_questions 
DROP CONSTRAINT IF EXISTS elearning_quiz_questions_question_type_check;

ALTER TABLE public.elearning_quiz_questions 
ADD CONSTRAINT elearning_quiz_questions_question_type_check 
CHECK (question_type IN (
  'multiple_choice', 'true_false', 'matching', 'short_answer', 
  'drag_drop_text', 'drag_drop_image', 'drag_drop_markers', 
  'select_missing_word', 'multiple_answer', 'essay', 'long_answer'
));

-- Also update question_bank table constraint
ALTER TABLE public.question_bank 
DROP CONSTRAINT IF EXISTS question_bank_question_type_check;

ALTER TABLE public.question_bank 
ADD CONSTRAINT question_bank_question_type_check 
CHECK (question_type IN (
  'multiple_choice', 'true_false', 'matching', 'short_answer', 
  'drag_drop_text', 'drag_drop_image', 'drag_drop_markers', 
  'select_missing_word', 'multiple_answer', 'essay', 'long_answer'
));