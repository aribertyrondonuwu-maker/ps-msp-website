async function loadKurikulum() {
  const subtitle = document.getElementById('kurikulumSubtitle');
  const ringkasanGrid = document.getElementById('ringkasanGrid');
  const semesterList = document.getElementById('semesterList');
  const pilihanList = document.getElementById('pilihanList');
  const footerNote = document.getElementById('dataFooterNote');

  try {
    const res = await fetch('js/data/kurikulum.json');
    const data = await res.json();
    const r = data.ringkasan;
    const meta = data._meta;
    const totalMinimal = r.total_sks_wajib + r.sks_pilihan_diambil_minimal;

    subtitle.textContent = `Kurikulum ${meta.kurikulum_berlaku} — minimal ${totalMinimal} SKS (${r.total_sks_wajib} sks wajib + ${r.sks_pilihan_diambil_minimal} sks pilihan) ditempuh dalam ${r.masa_studi_semester} semester, gelar ${r.gelar}.`;

    ringkasanGrid.innerHTML = `
      <article class="card"><h3>${r.total_sks_wajib} SKS</h3><p>Mata Kuliah Wajib (${r.jumlah_mk_wajib} MK)</p></article>
      <article class="card"><h3>${r.sks_pilihan_diambil_minimal} dari ${r.total_sks_pilihan_tersedia} SKS</h3><p>Pilihan diambil dari ${r.jumlah_mk_pilihan} MK tersedia</p></article>
      <article class="card"><h3>${totalMinimal} SKS</h3><p>Total Minimal Kelulusan</p></article>
      <article class="card"><h3>${r.profil_lulusan.length} Profil</h3><p>${r.profil_lulusan.join(', ')}</p></article>
    `;

    semesterList.innerHTML = data.semester.map((s, i) => `
      <div class="semester-card${i === 0 ? ' open' : ''}">
        <div class="semester-head" onclick="this.parentElement.classList.toggle('open')">
          <h3>Semester ${toRoman(s.no)}</h3>
          <span class="badge">${s.total_sks} SKS wajib</span>
        </div>
        <div class="semester-body">
          ${s.mata_kuliah.map(mk => `
            <div class="mk-row">
              <span class="mk-name"><span class="mk-code">${mk.kode}</span>${mk.nama}</span>
              <span class="mk-sks">${mk.sks} sks</span>
            </div>
          `).join('')}
          ${s.keterangan ? `<div class="semester-note">ℹ️ ${s.keterangan}</div>` : ''}
        </div>
      </div>
    `).join('');

    pilihanList.innerHTML = data.pilihan.map(p => `
      <article class="card">
        <h3>${p.nama}</h3>
        <p>${p.kode} · ${p.sks} sks · tersedia mulai Semester ${toRoman(p.semester_tersedia)}</p>
      </article>
    `).join('');

    footerNote.textContent = `Data terakhir diperbarui: ${meta.terakhir_diperbarui} · © Program Studi Manajemen Sumberdaya Perairan FPIK UNSRAT`;
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
