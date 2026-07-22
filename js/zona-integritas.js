async function loadZonaIntegritas() {
  try {
    const res = await fetch('js/data/zona-integritas.json');
    const data = await res.json();

    // ── Tentang ──
    const tentangEl = document.getElementById('ziTentang');
    if (tentangEl) tentangEl.innerHTML = data.tentang.deskripsi.map(p => `<p>${p}</p>`).join('');

    const dasarHukumEl = document.getElementById('ziDasarHukum');
    if (dasarHukumEl) dasarHukumEl.innerHTML = data.tentang.dasar_hukum.map(d => `<li>${d}</li>`).join('');

    // ── Enam Area Perubahan ──
    const areaGrid = document.getElementById('ziAreaGrid');
    if (areaGrid) {
      areaGrid.innerHTML = data.enam_area.map(a => `
        <article class="card">
          <h3>Area ${a.no} — ${a.nama}</h3>
          <p>${a.deskripsi}</p>
        </article>
      `).join('');
    }

    // ── Tim Kerja ZI ──
    document.getElementById('ziTimKerjaSumber').textContent = `Sumber: ${data.tim_kerja_zi.sumber}`;
    const pimpinanEl = document.getElementById('ziTimKerjaPimpinan');
    if (pimpinanEl) {
      pimpinanEl.innerHTML = data.tim_kerja_zi.pimpinan.map(p => `
        <article class="card"><h3>${p.peran}</h3><p>${p.nama}</p></article>
      `).join('');
    }
    const areaTableBody = document.getElementById('ziAreaTableBody');
    if (areaTableBody) {
      areaTableBody.innerHTML = data.tim_kerja_zi.tim_area.map(t => `
        <tr>
          <td><strong>Area ${t.no}</strong><br>${t.nama}</td>
          <td>${t.koordinator}</td>
          <td>${t.wakil}</td>
          <td>${t.anggota}</td>
        </tr>
      `).join('');
    }
    const pendukungEl = document.getElementById('ziTimPendukung');
    if (pendukungEl) {
      const sek = data.tim_kerja_zi.sekretariat;
      pendukungEl.innerHTML = `
        <h3 class="himasuper-subtitle">Sekretariat</h3>
        <p>Koordinator: ${sek.koordinator} · Wakil Koordinator: ${sek.wakil} · Anggota: ${sek.anggota}</p>
        <h3 class="himasuper-subtitle">Tim Survei ZI-WBK</h3>
        <p>${data.tim_kerja_zi.tim_survey.join(' · ')}</p>
        <h3 class="himasuper-subtitle">Tim Mahasiswa</h3>
        <p>${data.tim_kerja_zi.tim_mahasiswa.join(' · ')}</p>
      `;
    }

    // ── Render tim pendukung (SPIP, WBS, Pengaduan) — pola sama ──
    function renderTim(prefix, tim) {
      document.getElementById(`zi${prefix}Judul`).textContent = tim.judul;
      document.getElementById(`zi${prefix}Sumber`).textContent = `Sumber: ${tim.sumber}`;
      document.getElementById(`zi${prefix}Body`).innerHTML = `
        <div class="cards-grid" style="margin-bottom:20px;">
          <article class="card"><h3>Ketua</h3><p>${tim.ketua}</p></article>
          <article class="card"><h3>Sekretaris</h3><p>${tim.sekretaris}</p></article>
        </div>
        <h3 class="himasuper-subtitle">Anggota</h3>
        <ul class="rekognisi-list">${tim.anggota.map(a => `<li>${a}</li>`).join('')}</ul>
      `;
    }
    renderTim('Spip', data.tim_spip);
    renderTim('Wbs', data.tim_wbs);
    renderTim('Pengaduan', data.tim_pengaduan);

    // ── Portal Inspirasi ──
    document.getElementById('ziPortalDeskripsi').textContent = data.portal_inspirasi.deskripsi;

  } catch (e) {
    console.error('Gagal memuat data Zona Integritas:', e);
  }
}
loadZonaIntegritas();

// ── Scroll-spy sub-menu (sama seperti halaman Alumni) ──
(function submenuSpy() {
  const links = Array.from(document.querySelectorAll('#ziSubmenu .submenu-link[href^="#"]'));
  if (!links.length) return;
  const map = links.map(a => ({ link: a, sec: document.querySelector(a.getAttribute('href')) })).filter(x => x.sec);

  function onScroll() {
    const y = window.scrollY + 120;
    let current = map[0];
    for (const m of map) { if (m.sec.offsetTop <= y) current = m; }
    links.forEach(l => l.classList.remove('active'));
    if (current) current.link.classList.add('active');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
