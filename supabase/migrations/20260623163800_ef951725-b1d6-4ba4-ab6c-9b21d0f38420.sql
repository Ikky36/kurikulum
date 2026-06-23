CREATE OR REPLACE FUNCTION public.get_assignment_leaderboard(p_assignment_id uuid, p_class_id uuid)
RETURNS TABLE (
  student_profile_id uuid,
  full_name text,
  nim text,
  photo_url text,
  best_score numeric,
  attempts integer,
  submitted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cls AS (
    SELECT class_group_id FROM public.elearning_classes WHERE id = p_class_id
  ),
  roster AS (
    SELECT cs.student_profile_id
    FROM public.class_students cs
    JOIN cls ON cs.class_group_id = cls.class_group_id
  ),
  agg AS (
    SELECT
      s.student_profile_id,
      MAX(s.score) AS best_score,
      COUNT(*)::int AS attempts,
      MAX(s.submitted_at) AS submitted_at
    FROM public.elearning_submissions s
    WHERE s.assignment_id = p_assignment_id
    GROUP BY s.student_profile_id
  )
  SELECT
    p.id AS student_profile_id,
    p.full_name,
    p.nim,
    p.photo_url,
    a.best_score,
    COALESCE(a.attempts, 0) AS attempts,
    a.submitted_at
  FROM roster r
  JOIN public.profiles p ON p.id = r.student_profile_id
  LEFT JOIN agg a ON a.student_profile_id = r.student_profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_assignment_leaderboard(uuid, uuid) TO authenticated;