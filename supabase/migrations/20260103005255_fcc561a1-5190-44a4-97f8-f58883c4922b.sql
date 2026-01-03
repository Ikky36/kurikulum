-- Add foreign key relationships for PostgREST embedded queries

-- Add FK from course_instructors to profiles
ALTER TABLE public.course_instructors
ADD CONSTRAINT course_instructors_instructor_profile_id_fkey
FOREIGN KEY (instructor_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add FK from grades to profiles
ALTER TABLE public.grades
ADD CONSTRAINT grades_student_profile_id_fkey
FOREIGN KEY (student_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add FK from enrollments to profiles
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_student_profile_id_fkey
FOREIGN KEY (student_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;