function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

async function loadDashBerita() {
  const bl = document.getElementById('dashBeritaList');
  const pl = document.getElementById('dashPengumumanList');
  if (!window.sbClient) {
    bl.innerHTML = '<p class="muted">Koneksi database belum tersedia.</p>';
    pl.innerHTML = '<p class="muted">Koneksi database belum tersedia.</p>';
    return;
  }
  try {
    const { data, error } = await window.sbClient
      .from('berita')
      .select('id, judul, kategori, tanggal_publish')
      .eq('published', true)
      .order('tanggal_publish', { ascending: false })
      .limit(30);
    if (error) throw error;
    const peng = (data || []).filter(b => b.kategori === 'Pengumuman').slice(0, 6);
    const ber = (data || []).filter(b => b.kategori !== 'Pengumuman').slice(0, 6);
    bl.innerHTML = ber.length ? ber.map(b => `
      <a href="berita-detail.html?id=${encodeURIComponent(b.id)}" class="highlight-item">
        <div class="highlight-item-body">
          <span class="highlight-kat">${esc(b.kategori || 'Berita')}</span>
          <h4>${esc(b.judul)}</h4>
          <span class="highlight-tgl">${new Date(b.tanggal_publish).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </a>`).join('') : '<p class="muted">Belum ada berita dipublikasikan.</p>';
    pl.innerHTML = peng.length ? peng.map(b => {
      const t = new Date(b.tanggal_publish);
      return `<a href="berita-detail.html?id=${encodeURIComponent(b.id)}" class="pengumuman-item">
        <div class="pengumuman-date"><span class="pd-day">${t.getDate()}</span><span class="pd-mon">${BLN[t.getMonth()]}</span></div>
        <span class="pengumuman-judul">${esc(b.judul)}</span></a>`;
    }).join('') : '<p class="muted">Belum ada pengumuman.</p>';
  } catch (e) {
    console.error(e);
    bl.innerHTML = '<p class="muted">Belum ada berita dipublikasikan.</p>';
    pl.innerHTML = '<p class="muted">Belum ada pengumuman.</p>';
  }
}

async function loadDashAgenda() {
  const box = document.getElementById('dashAgenda');
  try {
    const d = await (await fetch('js/data/agenda.json')).json();
    if (d.tahun_akademik) document.getElementById('dashTahunAkademik').textContent = 'TA ' + d.tahun_akademik;
    if (d.tautan_resmi && /^https?:\/\//.test(d.tautan_resmi.url)) {
      const a = document.getElementById('dashKalenderLink');
      a.href = d.tautan_resmi.url; a.textContent = d.tautan_resmi.label + ' →';
    }
    const valid = x => x && x.mulai && !String(x.kegiatan || '').startsWith('[DATA');
    const items = [...(d.agenda || []).map(a => ({ kegiatan: a.judul || a.kegiatan, mulai: a.tanggal || a.mulai, selesai: a.selesai, ket: a.keterangan })),
                   ...(d.kalender || []).map(k => ({ kegiatan: k.kegiatan, mulai: k.mulai, selesai: k.selesai, ket: k.semester ? 'Semester ' + k.semester : '' }))]
      .filter(valid).sort((a, b) => a.mulai.localeCompare(b.mulai));
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = items.filter(i => (i.selesai || i.mulai) >= today).slice(0, 8);
    box.innerHTML = upcoming.length ? upcoming.map(i => {
      const t = new Date(i.mulai + 'T00:00:00');
      return `<div class="dash-agenda-item">
        <div class="dash-agenda-date"><span class="d">${t.getDate()}</span><span class="m">${BLN[t.getMonth()]}</span></div>
        <div><h4>${esc(i.kegiatan)}</h4><p>${esc(i.ket || '')}${i.selesai && i.selesai !== i.mulai ? ' · s.d. ' + esc(i.selesai) : ''}</p></div></div>`;
    }).join('') : '<p class="muted">Belum ada agenda terjadwal. Lihat kalender akademik resmi Unsrat melalui tautan di kanan atas.</p>';
  } catch (e) {
    console.error(e);
    box.innerHTML = '<p class="muted">Agenda belum dapat dimuat.</p>';
  }
}

loadDashBerita();
loadDashAgenda();
