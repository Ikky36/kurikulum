import { SupabaseClient } from '@supabase/supabase-js';

export async function syncStudentElearningClasses(supabase: SupabaseClient<any, "public", any>, studentId: string, krsId: string, action: 'approve' | 'reset') {
  try {
    // 1. Dapatkan profil mahasiswa untuk mengetahui nama Rombel (class_group) mereka, dan data pendukung (fallback)
    const { data: profile, error: errProfile } = await supabase
      .from('profiles')
      .select('class_group, sistem_kuliah_id, gender, program')
      .eq('id', studentId)
      .single();
      
    if (errProfile) throw new Error('Gagal mengambil profil mahasiswa: ' + errProfile.message);
      
    // 2. Ambil semua item KRS (mata kuliah yang diambil)
    const { data: krsItems, error: errKrs } = await supabase
      .from('krs_items')
      .select('id, course_id')
      .eq('krs_id', krsId);
      
    if (errKrs) throw new Error('Gagal mengambil item KRS: ' + errKrs.message);
    if (!krsItems || krsItems.length === 0) return;
    
    // Jika reset, hapus relasi elearning_class_id di krs_items saja.
    if (action === 'reset') {
      const { error: errReset } = await supabase
        .from('krs_items')
        .update({ elearning_class_id: null })
        .eq('krs_id', krsId);
        
      if (errReset) throw new Error('Gagal mereset elearning_class_id di krs_items: ' + errReset.message);
      return;
    }

    if (action === 'approve') {
      // 3. Cari Rombel (class_group) yang cocok untuk mahasiswa ini secara global
      const { data: cgs, error: errCgs } = await supabase
        .from('class_groups')
        .select('id, name, sistem_kuliah_id, gender_type, programs(name)');

      if (errCgs) throw new Error('Gagal mengambil daftar kelas (rombel): ' + errCgs.message);

      let matchedCg: any = null;
      if (cgs && cgs.length > 0) {
        // Coba cari yang namanya sama persis dengan rombel mahasiswa
        matchedCg = cgs.find((c: any) => profile?.class_group && c.name === profile?.class_group);
        
        // Jika tidak ada yang sama persis, gunakan fallback cerdas (cocokkan sistem, gender, program)
        if (!matchedCg) {
          matchedCg = cgs.find((c: any) => {
             const matchSistem = c.sistem_kuliah_id ? c.sistem_kuliah_id === profile?.sistem_kuliah_id : true;
             const matchGender = c.gender_type ? (c.gender_type.toLowerCase() === 'campuran' || c.gender_type.toLowerCase() === profile?.gender?.toLowerCase()) : true;
             const matchProgram = c.programs?.name ? c.programs.name.toLowerCase() === profile?.program?.toLowerCase() : true;
             return matchSistem && matchGender && matchProgram;
          });
        }

        // Jika masih tidak ada yang cocok, ambil yang pertama sebagai fallback terakhir
        if (!matchedCg) {
          matchedCg = cgs[0];
        }

        // Simpan nama rombel ke profil mahasiswa jika profilnya belum punya atau berbeda (auto-fill)
        if (matchedCg && matchedCg.name !== profile?.class_group) {
          const { error: errUpdateProfile } = await supabase
            .from('profiles')
            .update({ class_group: matchedCg.name })
            .eq('id', studentId);
            
          if (errUpdateProfile) throw new Error('Gagal mengupdate profil mahasiswa: ' + errUpdateProfile.message);
        }

        // 4. Pastikan mahasiswa sudah terdaftar di Rombel ini (class_students) agar bisa presensi
        const { data: existingEnrollment, error: errCheck } = await supabase
          .from('class_students')
          .select('id')
          .eq('class_group_id', matchedCg.id)
          .eq('student_profile_id', studentId)
          .limit(1);

        if (errCheck) throw new Error('Gagal mengecek pendaftaran mahasiswa di kelas: ' + errCheck.message);

        if (!existingEnrollment || existingEnrollment.length === 0) {
          const { error: errInsert } = await supabase
            .from('class_students')
            .insert({ class_group_id: matchedCg.id, student_profile_id: studentId });
            
          if (errInsert) throw new Error('Gagal memasukkan mahasiswa ke Rombel (presensi): ' + errInsert.message);
        }

        // 5. Update krs_items dengan elearning_class_id yang sesuai
        for (const item of krsItems) {
          if (!item.course_id) continue;

          // Cari elearning_classes yang terhubung dengan class_group (rombel) DAN course_id (mata kuliah)
          const { data: eClasses, error: errEClasses } = await supabase
            .from('elearning_classes')
            .select('id')
            .eq('class_group_id', matchedCg.id)
            .eq('course_id', item.course_id)
            .limit(1);

          if (errEClasses) throw new Error('Gagal mencari relasi elearning_classes: ' + errEClasses.message);

          if (eClasses && eClasses.length > 0) {
            // Update krs_items agar mengarah ke elearning_class_id yang benar
            const { error: errUpdateKrsItem } = await supabase
              .from('krs_items')
              .update({ elearning_class_id: eClasses[0].id })
              .eq('id', item.id);
              
            if (errUpdateKrsItem) throw new Error('Gagal mengupdate krs_items elearning_class_id: ' + errUpdateKrsItem.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('Error syncing elearning classes:', err);
    throw err; // Lempar ke atas agar mutation React Query menangkapnya dan menampilkan Toast error
  }
}
