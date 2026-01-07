-- Add SEB configuration columns to elearning_assignments table
ALTER TABLE public.elearning_assignments 
ADD COLUMN IF NOT EXISTS seb_password TEXT,
ADD COLUMN IF NOT EXISTS seb_quit_password TEXT,
ADD COLUMN IF NOT EXISTS show_answer_mode TEXT DEFAULT 'after_quiz' CHECK (show_answer_mode IN ('after_each', 'after_quiz', 'never'));

-- Add comment for clarity
COMMENT ON COLUMN public.elearning_assignments.seb_password IS 'Password required to access the quiz via SEB';
COMMENT ON COLUMN public.elearning_assignments.seb_quit_password IS 'Password required to quit SEB during the quiz';
COMMENT ON COLUMN public.elearning_assignments.show_answer_mode IS 'When to show correct answers: after_each question, after_quiz completion, or never';