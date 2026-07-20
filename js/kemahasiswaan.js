async function loadKemahasiswaan() {
  try {
    const res = await fetch('js/data/kemahasiswaan.json');
    const data = await res.json();

    document.getElementById('masaStudiTren').textContent = data.masa_studi.tren;

    const table = document.getElementById('mahasiswaTable');
    table.innerHTML = `
      <thead><tr><th>Tahun</th><th>Periode</th><th>Pendaftar</th><th>Mahasiswa Baru</th><th>Mahasiswa Aktif</th></tr></thead>
      <tbody>
        ${data.per_tahun.map(t => `
          <tr>
            <td>${t.tahun}</td><td>${t.label_ts}</td>
            <td>${t.pendaftar}</td><td>${t.mahasiswa_baru}</td><td><strong>${t.mahasiswa_aktif}</strong></td>
          </tr>`).join('')}
      </tbody>`;

    document.getElementById('ptwCard').innerHTML = `<h3>Kelulusan Tepat Waktu</h3><p>${data.masa_studi.lulus_tepat_waktu}</p>`;
    document.getElementById('dayaTampungCard').innerHTML = `<h3>Daya Tampung Resmi: ${data.masa_studi.daya_tampung_resmi}/tahun</h3><p>${data.masa_studi.catatan_daya_tampung}</p>`;

    const layananTable = document.getElementById('layananTable');
    layananTable.innerHTML = `
      <thead><tr><th>Layanan</th><th>Dasar Hukum</th><th>Mekanisme</th><th>Waktu Layanan</th></tr></thead>
      <tbody>
        ${data.layanan.map(l => `
          <tr>
            <td><strong>${l.nama}</strong></td>
            <td>${l.dasar_hukum}</td>
            <td>${l.mekanisme}</td>
            <td>${l.waktu_layanan}</td>
          </tr>
        `).join('')}
      </tbody>`;

    document.getElementById('prestasiList').innerHTML = data.prestasi_terpilih.map(p => `
      <div class="kegiatan-item">
        <h4>${p.nama}</h4>
        <p>${p.capaian}</p>
      </div>
    `).join('');

    renderOrganisasi(data.organisasi_list);
  } catch (e) {
    console.error('Gagal memuat data kemahasiswaan:', e);
  }
}

function ytEmbedId(url) {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
  return m ? m[1] : null;
}

function renderOrganisasi(list) {
  const wrap = document.getElementById('organisasiList');
  if (!wrap || !Array.isArray(list)) return;

  wrap.innerHTML = list.map((org, idx) => {
    const logo = (org.logo && org.logo.trim())
      ? `<img src="${org.logo}" alt="Logo ${org.nama}">`
      : `<span>${org.nama}</span>`;

    const deskripsi = (org.deskripsi || []).map(p => `<p>${p}</p>`).join('');

    const identitas = (org.identitas || []).map(i =>
      `<tr><td style="width:36%;"><strong>${i.label}</strong></td><td>${i.nilai}</td></tr>`).join('');

    const bidang = (org.bidang_kegiatan || []).map(b =>
      `<article class="card"><h3>${b.judul}</h3><p>${b.isi}</p></article>`).join('');

    const sosmed = (org.media_sosial && org.media_sosial.length)
      ? `<div class="himasuper-sosmed"><span class="himasuper-sosmed-label">Media sosial resmi:</span> ${
          org.media_sosial.map(m => `<a href="${m.url}" target="_blank" rel="noopener" class="himasuper-sosmed-link">${m.platform}</a>`).join('')
        }</div>`
      : '';

    const video = (org.video && org.video.length)
      ? `<h3 class="himasuper-subtitle">Dokumentasi Video</h3>
         <div class="video-grid">${
            org.video.map(u => {
              const id = ytEmbedId(u);
              return id ? `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}" title="Video ${org.nama}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '';
            }).join('')
         }</div>`
      : '';

    return `
      <div class="organisasi-block${idx > 0 ? ' organisasi-block-sep' : ''}">
        <div class="himasuper-head">
          <div class="himasuper-logo">${logo}</div>
          <div class="himasuper-head-text">
            <h3>${org.nama} — ${org.nama_lengkap}</h3>
            <p class="himasuper-sub">Berdiri ${org.tanggal_berdiri} · Organisasi kemahasiswaan FPIK UNSRAT</p>
          </div>
        </div>
        <div class="himasuper-deskripsi">${deskripsi}</div>
        <h3 class="himasuper-subtitle">Identitas Organisasi</h3>
        <div class="table-wrap"><table class="data-table"><tbody>${identitas}</tbody></table></div>
        <h3 class="himasuper-subtitle">Bidang Kegiatan &amp; Program Kerja</h3>
        <div class="cards-grid">${bidang}</div>
        <p class="himasuper-penutup">${org.penutup || ''}</p>
        ${sosmed}
        ${video}
      </div>`;
  }).join('');
}
loadKemahasiswaan();
