CREATE TABLE IF NOT EXISTS public.course_prerequisites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(course_id, prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS public.krs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'draft', 'pending', 'approved', 'rejected'
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(student_id, academic_year_id, semester_id)
);

CREATE TABLE IF NOT EXISTS public.krs_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  krs_id uuid NOT NULL REFERENCES public.krs(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  elearning_class_id uuid REFERENCES public.elearning_classes(id) ON DELETE SET NULL,
  is_retake boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(krs_id, course_id)
);

-- RLS
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.krs_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.course_prerequisites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for admins" ON public.course_prerequisites FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin'))
);

CREATE POLICY "Enable read access for all authenticated users" ON public.krs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for students and admins" ON public.krs FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin')));
CREATE POLICY "Enable update for students and admins" ON public.krs FOR UPDATE TO authenticated USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin', 'dosen')));
CREATE POLICY "Enable delete for admins" ON public.krs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin')));

CREATE POLICY "Enable read access for all authenticated users" ON public.krs_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for students and admins" ON public.krs_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM krs WHERE krs.id = krs_id AND (krs.student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin'))))
);
CREATE POLICY "Enable update for students and admins" ON public.krs_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM krs WHERE krs.id = krs_id AND (krs.student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin', 'dosen'))))
);
CREATE POLICY "Enable delete for students and admins" ON public.krs_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM krs WHERE krs.id = krs_id AND (krs.student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'sub_admin'))))
);
