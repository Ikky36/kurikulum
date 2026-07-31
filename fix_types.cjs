const fs = require('fs');
let content = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');

const quizPartsType = `
        elearning_quiz_parts: {
          Row: {
            assignment_id: string
            created_at: string
            id: string
            name: string
            order_index: number | null
            total_points: number | null
            updated_at: string
          }
          Insert: {
            assignment_id: string
            created_at?: string
            id?: string
            name: string
            order_index?: number | null
            total_points?: number | null
            updated_at?: string
          }
          Update: {
            assignment_id?: string
            created_at?: string
            id?: string
            name?: string
            order_index?: number | null
            total_points?: number | null
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "elearning_quiz_parts_assignment_id_fkey"
              columns: ["assignment_id"]
              isOneToOne: false
              referencedRelation: "elearning_assignments"
              referencedColumns: ["id"]
            },
          ]
        }`;

// Find elearning_quiz_questions index
const questionsIndex = content.indexOf('elearning_quiz_questions: {');
if (questionsIndex !== -1 && content.indexOf('elearning_quiz_parts: {') === -1) {
    content = content.slice(0, questionsIndex) + quizPartsType.trim() + '\n        ' + content.slice(questionsIndex);
}

// Add part_id
content = content.replace(/options: Json \| null\r?\n\s+order_index: number/g, 'options: Json | null\n            order_index: number\n            part_id: string | null');
content = content.replace(/options\?: Json \| null\r?\n\s+order_index\?: number/g, 'options?: Json | null\n            order_index?: number\n            part_id?: string | null');

if (content.indexOf('elearning_quiz_questions_part_id_fkey') === -1) {
  const partIdRel = `,
            {
              foreignKeyName: "elearning_quiz_questions_part_id_fkey"
              columns: ["part_id"]
              isOneToOne: false
              referencedRelation: "elearning_quiz_parts"
              referencedColumns: ["id"]
            }`;
  content = content.replace(/referencedColumns: \["id"\]\r?\n\s+\},\r?\n\s+\]\r?\n\s+\}\r?\n\s+elearning_sessions/g, 'referencedColumns: ["id"]\n            }' + partIdRel + '\n          ]\n        }\n        elearning_sessions');
}

// Add weight_percentage
if (content.indexOf('weight_percentage?: number | null') === -1) {
  content = content.replace(/title: string\r?\n\s+updated_at: string\r?\n\s+\}/g, 'title: string\n            updated_at: string\n            weight_percentage: number | null\n          }');
  content = content.replace(/title: string\r?\n\s+updated_at\?: string\r?\n\s+\}/g, 'title: string\n            updated_at?: string\n            weight_percentage?: number | null\n          }');
  content = content.replace(/title\?: string\r?\n\s+updated_at\?: string\r?\n\s+\}/g, 'title?: string\n            updated_at?: string\n            weight_percentage?: number | null\n          }');
}

fs.writeFileSync('src/integrations/supabase/types.ts', content);
