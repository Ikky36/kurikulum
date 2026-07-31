ALTER TABLE public.ta_requirements DROP CONSTRAINT IF EXISTS ta_requirements_req_type_check;

ALTER TABLE public.ta_requirements ADD CONSTRAINT ta_requirements_req_type_check CHECK (req_type IN ('document', 'course', 'min_sks', 'min_semester', 'predicate', 'auto_fill'));
