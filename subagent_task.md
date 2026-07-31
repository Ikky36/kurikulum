# Refactor QuizManager and QuizPlayer for Quiz Parts

We just introduced `elearning_quiz_parts` table to support parts (Bagian) inside a Quiz.
You need to refactor `src/components/elearning/QuizManager.tsx` and `src/components/quiz/QuizPlayer.tsx`.

## Context
- `elearning_assignments` now has `weight_percentage: number | null`
- `elearning_quiz_parts` exists with `id`, `assignment_id`, `name`, `total_points`, `order_index`.
- `elearning_quiz_questions` now has `part_id: string | null`.
- Hooks available in `src/hooks/useElearningMaterials.ts`: `useQuizParts`, `useCreateQuizPart`, `useUpdateQuizPart`, `useDeleteQuizPart`, `useUpdateAssignmentWeight`.
- `useQuizQuestions` and `useQuizQuestionsForInstructor` now return objects that include `part_id`.

## Tasks for QuizManager.tsx
1. Add an input at the top of the component to edit `weight_percentage` (use `useUpdateAssignmentWeight`). The default is 0. Show a saving spinner when updating.
2. Fetch `quizParts` using `useQuizParts(assignmentId)`.
3. If there are no parts, show a button "Tambah Bagian Pertama" which creates a part named "Bagian 1".
4. Group the `questions` array by `part_id`. Questions with `part_id === null` should go to a default group or the first part.
5. Render a list of Parts. For each part:
   - Show a header with the Part's name (editable via `useUpdateQuizPart`).
   - Show a "Total Poin" input (editable via `useUpdateQuizPart`) for that specific part.
   - Show the existing `QuestionsListWithBulk` for that part's questions.
   - Move the buttons to add questions ("+ Tambah Manual", "Bank Soal", "Generate AI", "Dari Materi") to be INSIDE each part, so that when a question is added, its `part_id` is set to that part.
6. The AI Generation, Excel Import, and Bank Soal injection logic currently just pushes to `questions`. You MUST update them so they accept a `targetPartId` and include it when calling `batchCreate.mutateAsync`.

## Tasks for QuizPlayer.tsx
1. Fetch `quizParts` using `useQuizParts`.
2. Group the questions by `part_id`.
3. In the UI, visually separate the questions by part, showing a heading like "Bagian 1" before the questions of that part.
