-- Create table for document annotations (overlay-based)
CREATE TABLE public.document_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.elearning_submissions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.elearning_materials(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Position data for overlay (percentage-based for responsiveness)
  x_percent NUMERIC NOT NULL,
  y_percent NUMERIC NOT NULL,
  width_percent NUMERIC NOT NULL DEFAULT 10,
  height_percent NUMERIC NOT NULL DEFAULT 5,
  -- Annotation content
  annotation_type TEXT NOT NULL DEFAULT 'highlight', -- 'highlight', 'comment', 'both'
  highlight_color TEXT DEFAULT '#ffff00',
  comment_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure either submission_id or material_id is set
  CONSTRAINT document_annotation_target CHECK (
    (submission_id IS NOT NULL AND material_id IS NULL) OR 
    (submission_id IS NULL AND material_id IS NOT NULL)
  )
);

-- Create table for video timestamp comments
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES public.elearning_submissions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.elearning_materials(id) ON DELETE CASCADE,
  author_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Timestamp in seconds
  timestamp_seconds NUMERIC NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure either submission_id or material_id is set
  CONSTRAINT video_comment_target CHECK (
    (submission_id IS NOT NULL AND material_id IS NULL) OR 
    (submission_id IS NULL AND material_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_annotations
CREATE POLICY "Users can view annotations on accessible content"
ON public.document_annotations FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create annotations"
ON public.document_annotations FOR INSERT
WITH CHECK (auth.uid() = author_profile_id);

CREATE POLICY "Authors can update their own annotations"
ON public.document_annotations FOR UPDATE
USING (auth.uid() = author_profile_id);

CREATE POLICY "Authors can delete their own annotations"
ON public.document_annotations FOR DELETE
USING (auth.uid() = author_profile_id);

-- RLS Policies for video_comments
CREATE POLICY "Users can view video comments on accessible content"
ON public.video_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create video comments"
ON public.video_comments FOR INSERT
WITH CHECK (auth.uid() = author_profile_id);

CREATE POLICY "Authors can update their own video comments"
ON public.video_comments FOR UPDATE
USING (auth.uid() = author_profile_id);

CREATE POLICY "Authors can delete their own video comments"
ON public.video_comments FOR DELETE
USING (auth.uid() = author_profile_id);

-- Create indexes for better query performance
CREATE INDEX idx_document_annotations_submission ON public.document_annotations(submission_id);
CREATE INDEX idx_document_annotations_material ON public.document_annotations(material_id);
CREATE INDEX idx_video_comments_submission ON public.video_comments(submission_id);
CREATE INDEX idx_video_comments_material ON public.video_comments(material_id);
CREATE INDEX idx_video_comments_timestamp ON public.video_comments(timestamp_seconds);

-- Create trigger for updated_at
CREATE TRIGGER update_document_annotations_updated_at
BEFORE UPDATE ON public.document_annotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_comments_updated_at
BEFORE UPDATE ON public.video_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();