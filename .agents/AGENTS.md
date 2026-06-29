# Bloom Grade Project Rules

## 1. UI Consistency: Student Semester Badge
When building or modifying features that display a student's name in a list, table, or profile view, you MUST always include the `<StudentSemesterBadge studentId={student.id} />` component next to the student's name to dynamically show their current active semester.

Example:
```tsx
import { StudentSemesterBadge } from '@/components/ui/semester-badge';

// Inside your component mapping over students
<div className="flex items-center gap-2">
  <span className="font-medium">{student.full_name}</span>
  <StudentSemesterBadge studentId={student.id} />
</div>
```
Always verify if `StudentSemesterBadge` has been imported and correctly used whenever handling student list rendering.
