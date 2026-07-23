import { SupabaseClient } from '@supabase/supabase-js';

export async function syncStudentElearningClasses(supabase: SupabaseClient<any, "public", any>, studentId: string, krsId: string, action: 'approve' | 'reset') {
  try {
    // 1. Dapatkan profil mahasiswa untuk mengetahui nama Rombel (class_group) mereka, dan data pendukung (fallback)
    const { data: profile } = await supabase
      .from('profiles')
      .select('class_group, sistem_kuliah_id, gender, program')
      .eq('id', studentId)
      .single();
      
    // 2. Ambil semua item KRS (mata kuliah yang diambil)
    const { data: krsItems } = await supabase
      .from('krs_items')
      .select('id, course_id')
      .eq('krs_id', krsId);
      
    if (!krsItems || krsItems.length === 0) return;
    
    const courseIds = krsItems.map((item: any) => item.course_id);
    
    // 3. Bersihkan data lama di class_students (keluarkan dari semua kelas untuk mata kuliah ini)
    const { data: allCourseClasses } = await supabase
      .from('class_groups')
      .select('id')
      .in('course_id', courseIds);
      
    if (allCourseClasses && allCourseClasses.length > 0) {
      const allCourseClassIds = allCourseClasses.map((c: any) => c.id);
      await supabase
        .from('class_students')
        .delete()
        .eq('student_profile_id', studentId)
        .in('class_group_id', allCourseClassIds);
    }

    if (action === 'reset') {
      // Jika reset, hapus juga relasi elearning_class_id di krs_items
      await supabase
        .from('krs_items')
        .update({ elearning_class_id: null })
        .eq('krs_id', krsId);
      return;
    }

    // 4. Jika approve, cari Rombel yang cocok (class_groups)
    if (action === 'approve') {
      let matchedClassGroupIds: string[] = [];

      for (const item of krsItems) {
        if (!item.course_id) continue;

        // Cari class_group untuk mata kuliah ini
        const { data: cgs } = await supabase
          .from('class_groups')
          .select('id, name, sistem_kuliah_id, gender_type, programs(name)')
          .eq('course_id', item.course_id);

        if (cgs && cgs.length > 0) {
          // Coba cari yang namanya sama persis dengan rombel mahasiswa
          let matchedCg = cgs.find((c: any) => profile?.class_group && c.name === profile?.class_group);
          
          // Jika tidak ada yang sama persis, gunakan fallback cerdas (cocokkan sistem, gender, program)
          if (!matchedCg) {
            matchedCg = cgs.find((c: any) => {
               const matchSistem = c.sistem_kuliah_id ? c.sistem_kuliah_id === profile?.sistem_kuliah_id : true;
               const matchGender = c.gender_type ? (c.gender_type === 'Campuran' || c.gender_type === profile?.gender) : true;
               const matchProgram = c.programs?.name ? c.programs.name === profile?.program : true;
               return matchSistem && matchGender && matchProgram;
            });
          }

          // Jika masih tidak ada yang cocok, ambil yang pertama sebagai fallback terakhir
          if (!matchedCg) {
            matchedCg = cgs[0];
          }

          // Simpan nama rombel ke profil mahasiswa jika profilnya belum punya atau berbeda (auto-fill)
          if (matchedCg && matchedCg.name !== profile?.class_group) {
            await supabase
              .from('profiles')
              .update({ class_group: matchedCg.name })
              .eq('id', studentId);
              
            // Update objek profile lokal agar iterasi berikutnya tidak perlu update db lagi
            if (profile) profile.class_group = matchedCg.name;
          }

          matchedClassGroupIds.push(matchedCg.id);

          // Cari elearning_classes yang terhubung dengan class_group ini
          const { data: eClasses } = await supabase
            .from('elearning_classes')
            .select('id')
            .eq('class_group_id', matchedCg.id)
            .limit(1);

          if (eClasses && eClasses.length > 0) {
            // Update krs_items agar mengarah ke elearning_class_id yang benar
            await supabase
              .from('krs_items')
              .update({ elearning_class_id: eClasses[0].id })
              .eq('id', item.id);
          }
        }
      }

      // Masukkan mahasiswa ke class_students agar dosen bisa melihat di presensi
      if (matchedClassGroupIds.length > 0) {
        const inserts = matchedClassGroupIds.map((classId: string) => ({
          class_group_id: classId,
          student_profile_id: studentId
        }));
        
        await supabase
          .from('class_students')
          .insert(inserts);
      }
    }
  } catch (err) {
    console.error('Error syncing elearning classes:', err);
  }
}
