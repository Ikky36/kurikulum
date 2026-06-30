
-- Create a separate secrets table for Safe Exam Browser passwords
CREATE TABLE IF NOT EXISTS public.elearning_assignment_seb_secrets (
  assignment_id uuid PRIMARY KEY REFERENCES public.elearning_assignments(id) ON DELETE CASCADE,
  seb_password text,
  seb_quit_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.elearning_assignment_seb_secrets TO authenticated;
GRANT ALL ON public.elearning_assignment_seb_secrets TO service_role;

ALTER TABLE public.elearning_assignment_seb_secrets ENABLE ROW LEVEL SECURITY;

-- Only admins / sub_admins and the owning class instructor (or assigned course_instructors)
-- can read or modify the SEB passwords. Sibling-class dosen get no access.
CREATE POLICY "Admins manage seb secrets"
ON public.elearning_assignment_seb_secrets
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

CREATE POLICY "Owning instructor manages seb secrets"
ON public.elearning_assignment_seb_secrets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.elearning_assignments a
    JOIN public.elearning_classes ec ON ec.id = a.elearning_class_id
    WHERE a.id = elearning_assignment_seb_secrets.assignment_id
      AND (
        ec.instructor_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.course_instructors ci
          WHERE ci.course_id = ec.course_id
            AND ci.instructor_profile_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.elearning_assignments a
    JOIN public.elearning_classes ec ON ec.id = a.elearning_class_id
    WHERE a.id = elearning_assignment_seb_secrets.assignment_id
      AND (
        ec.instructor_profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.course_instructors ci
          WHERE ci.course_id = ec.course_id
            AND ci.instructor_profile_id = auth.uid()
        )
      )
  )
);

CREATE TRIGGER set_updated_at_seb_secrets
BEFORE UPDATE ON public.elearning_assignment_seb_secrets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data
INSERT INTO public.elearning_assignment_seb_secrets (assignment_id, seb_password, seb_quit_password)
SELECT id, seb_password, seb_quit_password
FROM public.elearning_assignments
WHERE seb_password IS NOT NULL OR seb_quit_password IS NOT NULL
ON CONFLICT (assignment_id) DO NOTHING;

-- Drop sensitive columns from the broadly-readable table
ALTER TABLE public.elearning_assignments DROP COLUMN IF EXISTS seb_password;
ALTER TABLE public.elearning_assignments DROP COLUMN IF EXISTS seb_quit_password;
