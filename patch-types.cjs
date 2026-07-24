const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, 'src', 'integrations', 'supabase', 'types.ts');
let content = fs.readFileSync(typesPath, 'utf8');

const replacement = `
        ta_requirements: {
          Row: {
            id: string
            name: string
            phase: string
            is_general: boolean
            type_id: string | null
            req_type: string
            req_value: Json | null
            is_required: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            name: string
            phase: string
            is_general?: boolean
            type_id?: string | null
            req_type: string
            req_value?: Json | null
            is_required?: boolean
            created_at?: string
            updated_at?: string
          }
          Update: {
            name?: string
            phase?: string
            is_general?: boolean
            type_id?: string | null
            req_type?: string
            req_value?: Json | null
            is_required?: boolean
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "ta_requirements_type_id_fkey"
              columns: ["type_id"]
              isOneToOne: false
              referencedRelation: "ta_types"
              referencedColumns: ["id"]
            }
          ]
        }
`;

// Very basic regex to replace the ta_settings block and ta_seminar_requirements block
content = content.replace(/ta_settings:\s*\{[\s\S]*?ta_seminar_requirements:\s*\{[\s\S]*?\]\n          }/, replacement.trim());

fs.writeFileSync(typesPath, content, 'utf8');
console.log('Patched successfully');
