-- Create CLO-PLO relationship table with weights
CREATE TABLE public.clo_plos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clo_id uuid NOT NULL REFERENCES public.clos(id) ON DELETE CASCADE,
  plo_id uuid NOT NULL REFERENCES public.plos(id) ON DELETE CASCADE,
  weight_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(clo_id, plo_id)
);

-- Enable RLS
ALTER TABLE public.clo_plos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view CLO-PLO relationships"
ON public.clo_plos
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage CLO-PLO relationships"
ON public.clo_plos
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Instructors can manage their course CLO-PLO relationships"
ON public.clo_plos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clos
    WHERE clos.id = clo_plos.clo_id AND is_course_instructor(auth.uid(), clos.course_id)
  )
);