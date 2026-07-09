const val1 = 'Proses pengumpulan informasi atau data melalui berbagai sumber untuk memahami sejauh mana peserta didik telah mencapai tujuan pembelajaran.';
const url = 'https://xextgvbezemfnhjugcuz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleHRndmJlemVtZm5oanVnY3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzA4NDkyNiwiZXhwIjoyMDk4NjYwOTI2fQ.oErcl3JsNJpSAMWvgG4LyzYolzvma0c7qamnyeakq1c';
const auth = { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } };

fetch(url + '/rest/v1/rpc/grade_quiz_submission', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...auth.headers
  },
  body: JSON.stringify({ 
    p_answers: { "d7db6f3c-4095-4721-8d77-53b0b9794d91": "Proses pemberian nilai atau keputusan (judgment) mengenai keberhasilan suatu program atau proses pembelajaran berdasarkan data hasil asesmen.", "4218e91d-b895-49af-831b-bbb68eef42c4": "اَلِاخْتِبَارُ ( al-ikhtibār )" },
    p_assignment_id: 'b615d7ba-fe94-446c-aa41-1cd8c7ee6544'
  })
})
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
