-- Expand admin-only RLS policies to include sub_admin for curriculum, class, and course management

-- academic_years
DROP POLICY IF EXISTS "Admins can manage academic_years" ON public.academic_years;
CREATE POLICY "Admins can manage academic_years" ON public.academic_years
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- curriculum_academic_years
DROP POLICY IF EXISTS "Admins can manage curriculum_academic_years" ON public.curriculum_academic_years;
CREATE POLICY "Admins can manage curriculum_academic_years" ON public.curriculum_academic_years
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- semesters
DROP POLICY IF EXISTS "Admins can manage semesters" ON public.semesters;
CREATE POLICY "Admins can manage semesters" ON public.semesters
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- sistem_kuliah
DROP POLICY IF EXISTS "Admins can manage sistem_kuliah" ON public.sistem_kuliah;
CREATE POLICY "Admins can manage sistem_kuliah" ON public.sistem_kuliah
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- instrumen_penilaian
DROP POLICY IF EXISTS "Admins can manage instrumen_penilaian" ON public.instrumen_penilaian;
CREATE POLICY "Admins can manage instrumen_penilaian" ON public.instrumen_penilaian
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- bahan_kajian_kelompok
DROP POLICY IF EXISTS "Admins can manage bahan_kajian_kelompok" ON public.bahan_kajian_kelompok;
CREATE POLICY "Admins can manage bahan_kajian_kelompok" ON public.bahan_kajian_kelompok
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- profil_lulusan
DROP POLICY IF EXISTS "Admins can manage profil_lulusan" ON public.profil_lulusan;
CREATE POLICY "Admins can manage profil_lulusan" ON public.profil_lulusan
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- plos
DROP POLICY IF EXISTS "Admins can manage PLOs" ON public.plos;
CREATE POLICY "Admins can manage PLOs" ON public.plos
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- course_plos
DROP POLICY IF EXISTS "Admins can manage course PLOs" ON public.course_plos;
CREATE POLICY "Admins can manage course PLOs" ON public.course_plos
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- course_profil_lulusan
DROP POLICY IF EXISTS "Admins can manage course_profil_lulusan" ON public.course_profil_lulusan;
CREATE POLICY "Admins can manage course_profil_lulusan" ON public.course_profil_lulusan
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- clos
DROP POLICY IF EXISTS "Admins can manage CLOs" ON public.clos;
CREATE POLICY "Admins can manage CLOs" ON public.clos
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- clo_plos
DROP POLICY IF EXISTS "Admins can manage CLO-PLO relationships" ON public.clo_plos;
CREATE POLICY "Admins can manage CLO-PLO relationships" ON public.clo_plos
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- llos
DROP POLICY IF EXISTS "Admins can manage LLOs" ON public.llos;
CREATE POLICY "Admins can manage LLOs" ON public.llos
FOR ALL USING (
  EXISTS (SELECT 1 FROM clos WHERE clos.id = llos.clo_id)
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
)
WITH CHECK (
  EXISTS (SELECT 1 FROM clos WHERE clos.id = llos.clo_id)
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
);

-- assessments
DROP POLICY IF EXISTS "Admins can manage assessments" ON public.assessments;
CREATE POLICY "Admins can manage assessments" ON public.assessments
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- assessment_llos
DROP POLICY IF EXISTS "Admins can manage assessment LLOs" ON public.assessment_llos;
CREATE POLICY "Admins can manage assessment LLOs" ON public.assessment_llos
FOR ALL USING (
  EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_llos.assessment_id)
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
)
WITH CHECK (
  EXISTS (SELECT 1 FROM assessments WHERE assessments.id = assessment_llos.assessment_id)
  AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role])
);

-- courses
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can insert courses" ON public.courses
FOR INSERT WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));
CREATE POLICY "Admins can update courses" ON public.courses
FOR UPDATE USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));
CREATE POLICY "Admins can delete courses" ON public.courses
FOR DELETE USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- class_groups
DROP POLICY IF EXISTS "Admins can manage class groups" ON public.class_groups;
CREATE POLICY "Admins can manage class groups" ON public.class_groups
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- elearning_sessions
DROP POLICY IF EXISTS "Admins can manage elearning_sessions" ON public.elearning_sessions;
CREATE POLICY "Admins can manage elearning_sessions" ON public.elearning_sessions
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));

-- elearning_materials
DROP POLICY IF EXISTS "Admins can manage elearning_materials" ON public.elearning_materials;
CREATE POLICY "Admins can manage elearning_materials" ON public.elearning_materials
FOR ALL USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'sub_admin'::app_role]));