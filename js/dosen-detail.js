async function loadDosenDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('dosenContent');

  if (!id) {
    content.innerHTML = '<div class="container coming-soon"><h2>Dosen tidak ditemukan</h2><p class="muted">Silakan kembali ke halaman <a href="index.html#dosen">Dosen</a>.</p></div>';
    return;
  }

  try {
    const res = await fetch('js/data/dosen-detail.json');
    const data = await res.json();
    const d = data.profil[id];

    if (!d) {
      content.innerHTML = '<div class="container coming-soon"><h2>Profil belum tersedia</h2><p class="muted">Dosen dengan id tersebut belum terdaftar.</p></div>';
      return;
    }

    document.title = `${d.nama} — PS MSP FPIK UNSRAT`;
    document.getElementById('dosenAvatar').textContent = d.nama.replace(/^(Dr\.|Ir\.|Prof\.|M\.Sc\.|M\.Si\.|Ph\.D\.|,)/g, '').trim().split(' ').map(w => w[0]).slice(0,2).join('');
    if (window.sbClient) {
      try {
        const { data: fotoRow } = await window.sbClient.from('site_settings').select('value').eq('key', `dosen_foto:${id}`).maybeSingle();
        if (fotoRow && fotoRow.value) {
          const avatarEl = document.getElementById('dosenAvatar');
          avatarEl.innerHTML = `<img src="${fotoRow.value}" alt="${d.nama}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
      } catch (e) { /* pakai inisial */ }
    }
    document.getElementById('dosenJabatan').textContent = d.jabatan + (d.peran ? ` · ${d.peran}` : '');
    document.getElementById('dosenNama').textContent = d.nama;
    document.getElementById('dosenKeahlian').textContent = d.keahlian;

    if (!d.status_lengkap) {
      content.innerHTML = `
        <div class="coming-soon">
          <h2>Profil lengkap segera hadir</h2>
          <p class="muted">Riwayat pendidikan, publikasi, dan mata kuliah yang diampu untuk ${d.nama} sedang disusun. Sementara ini, lihat ringkasan kepakaran beliau di halaman <a href="index.html#dosen">Dosen</a>.</p>
        </div>`;
      return;
    }

    let html = `
      <div class="detail-block">
        <h2>Tentang</h2>
        <p>${d.bio}</p>
      </div>`;

    if (d.riwayat_pendidikan?.length) {
      html += `<div class="detail-block"><h2>Riwayat Pendidikan</h2>`;
      d.riwayat_pendidikan.forEach(r => {
        html += `<div class="timeline-item"><strong>${r.jenjang}</strong><br>${r.institusi}${r.bidang && r.bidang !== '—' ? ' — ' + r.bidang : ''}</div>`;
      });
      html += `</div>`;
    }

    if (d.tema_riset_aktif?.length) {
      html += `<div class="detail-block"><h2>Tema Riset Aktif</h2><div class="pill-list">`;
      d.tema_riset_aktif.forEach(t => html += `<span class="pill">${t}</span>`);
      html += `</div></div>`;
    }

    if (d.inovasi_unggulan?.length) {
      html += `<div class="detail-block"><h2>Inovasi Unggulan</h2>`;
      d.inovasi_unggulan.forEach(inv => {
        html += `<div class="timeline-item"><strong>${inv.judul}</strong> (${inv.tahun})<br>${inv.deskripsi}</div>`;
      });
      html += `</div>`;
    }

    if (d.rekognisi?.length) {
      html += `<div class="detail-block"><h2>Rekognisi &amp; Aktivitas Ilmiah</h2><ul class="rekognisi-list">`;
      d.rekognisi.forEach(r => html += `<li>${r}</li>`);
      html += `</ul></div>`;
    }

    if (d.organisasi_keilmuan?.length) {
      html += `<div class="detail-block"><h2>Keterlibatan dalam Organisasi Keilmuan</h2><ul class="rekognisi-list">`;
      d.organisasi_keilmuan.forEach(r => html += `<li>${r}</li>`);
      html += `</ul></div>`;
    }

    if (d.mata_kuliah_diampu?.length && !d.mata_kuliah_diampu[0].startsWith('[DATA')) {
      html += `<div class="detail-block"><h2>Mata Kuliah Diampu</h2><div class="pill-list">`;
      d.mata_kuliah_diampu.forEach(mk => html += `<span class="pill">${mk}</span>`);
      html += `</div></div>`;
    }

    if (d.sertifikasi?.length) {
      html += `<div class="detail-block"><h2>Sertifikasi</h2><div class="pill-list">`;
      d.sertifikasi.forEach(s => html += `<span class="pill">${s}</span>`);
      html += `</div></div>`;
    }

    content.innerHTML = `<div class="container">${html}</div>`;
  } catch (e) {
    content.innerHTML = '<div class="container coming-soon"><h2>[DATA DIPERLUKAN]</h2><p class="muted">Gagal memuat data dosen.</p></div>';
    console.error(e);
  }
}

loadDosenDetail();
