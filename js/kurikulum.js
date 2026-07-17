async function loadKurikulum() {
  const subtitle = document.getElementById('kurikulumSubtitle');
  const ringkasanGrid = document.getElementById('ringkasanGrid');
  const semesterList = document.getElementById('semesterList');
  const footerNote = document.getElementById('dataFooterNote');

  try {
    const res = await fetch('js/data/kurikulum.json');
    const data = await res.json();
    const r = data.ringkasan;
    const meta = data._meta;

    subtitle.textContent = `Kurikulum ${meta.kurikulum_berlaku} — ${r.total_sks} SKS ditempuh dalam ${r.masa_studi_semester} semester, gelar ${r.gelar}. Mencakup ${r.jumlah_mk_total} mata kuliah yang dipetakan ke ${r.jumlah_cpl} CPL utama (${r.jumlah_sub_cpl} sub-CPL) dan ${r.jumlah_profil_lulusan} profil lulusan.`;

    ringkasanGrid.innerHTML = `
      <article class="card"><h3>${r.sks_wajib_prodi} SKS</h3><p>Mata Kuliah Wajib Prodi</p></article>
      <article class="card"><h3>${r.sks_wajib_nasional + r.sks_wajib_institusi} SKS</h3><p>Wajib Nasional & Institusi</p></article>
      <article class="card"><h3>${r.sks_pilihan_minimal} dari ${r.sks_pilihan_tersedia} SKS</h3><p>Mata Kuliah Pilihan</p></article>
      <article class="card"><h3>${r.profil_lulusan.length} Profil</h3><p>${r.profil_lulusan.join(', ')}</p></article>
    `;

    semesterList.innerHTML = data.semester.map((s, i) => `
      <div class="semester-card${i === 0 ? ' open' : ''}">
        <div class="semester-head" onclick="this.parentElement.classList.toggle('open')">
          <h3>Semester ${toRoman(s.no)}</h3>
          <span class="badge">${s.total_sks} SKS · ${s.jenis}</span>
        </div>
        <div class="semester-body">
          ${s.keterangan ? `<p class="semester-keterangan">${s.keterangan}</p>` : ''}
          ${s.mata_kuliah.map(mk => `
            <div class="mk-row">
              <span class="mk-name"><span class="mk-code">${mk.kode}</span>${mk.nama}</span>
              <span class="mk-sks">${mk.sks} sks</span>
            </div>
          `).join('')}
          ${s.catatan ? `<div class="semester-note">⚠️ ${s.catatan}</div>` : ''}
        </div>
      </div>
    `).join('');

    footerNote.textContent = `Data terakhir diperbarui: ${meta.terakhir_diperbarui} · Sumber: ${meta.sumber} · © Program Studi Manajemen Sumberdaya Perairan FPIK UNSRAT`;
  } catch (e) {
    subtitle.textContent = '[DATA DIPERLUKAN: js/data/kurikulum.json belum tersedia atau gagal dimuat]';
    console.error(e);
  }
}

function toRoman(num) {
  const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  return romans[num - 1] || num;
}

loadKurikulum();
