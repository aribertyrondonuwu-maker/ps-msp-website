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
      .select('*')
      .eq('published', true)
      .order('tanggal_publish', { ascending: false })
      .limit(30);
    if (error) throw error;
    const peng = (data || []).filter(b => parseKategori(b.kategori).jenis === 'Pengumuman' && !infoPengumuman(b).berakhir)
      .sort((x, y) => (!!y.disematkan) - (!!x.disematkan)).slice(0, 6);
    const ber = (data || []).filter(b => parseKategori(b.kategori).jenis !== 'Pengumuman').slice(0, 6);
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
        <span class="pengumuman-judul">${esc(b.judul)}${badgePengumuman(infoPengumuman(b))}</span></a>`;
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


// ── Statistik kunjungan & komentar terbaru ──
const NAMA_HALAMAN = {
  'index.html': 'Beranda', '': 'Beranda', 'dashboard.html': 'Dashboard', 'berita.html': 'Berita', 'pengumuman.html': 'Pengumuman',
  'profil.html': 'Profil', 'akreditasi.html': 'Akreditasi', 'kurikulum.html': 'Kurikulum', 'pendidikan.html': 'Pendidikan & Pengajaran',
  'tridharma.html': 'Tridharma', 'sarana.html': 'Sarana & Prasarana', 'kemahasiswaan.html': 'Kemahasiswaan', 'alumni.html': 'Alumni',
  'forum-alumni.html': 'Forum Alumni', 'mutu.html': 'Penjaminan Mutu', 'zona-integritas.html': 'Zona Integritas',
  'layanan-pengaduan.html': 'Layanan Pengaduan', 'galeri-media.html': 'Galeri Media', 'tautan.html': 'Tautan Layanan',
  'penelitian-minat.html': 'Bidang Minat Penelitian', 'dosen-detail.html': 'Profil Dosen', 'index-en.html': 'Home (EN)'
};
const fmtAngka = n => Number(n || 0).toLocaleString('id-ID');

async function loadStatistik() {
  if (!window.sbClient) return;
  try {
    const { data, error } = await window.sbClient.rpc('statistik_kunjungan');
    if (error) throw error;
    document.getElementById('visTotal').textContent = fmtAngka(data.total);
    document.getElementById('visUnik').textContent = fmtAngka(data.unik);
    document.getElementById('visHari').textContent = fmtAngka(data.hari_ini);
    document.getElementById('visBulan').textContent = fmtAngka(data.bulan_ini);
    const pop = data.populer || [];
    // judul berita untuk halaman berita-detail?id=...
    const ids = pop.map(p => (p.halaman.match(/berita-detail\.html\?id=([a-z0-9-]+)/) || [])[1]).filter(Boolean);
    let judul = {};
    if (ids.length) {
      const r = await window.sbClient.from('berita').select('id, judul').in('id', ids);
      (r.data || []).forEach(b => judul[b.id] = b.judul);
    }
    document.getElementById('visPopuler').innerHTML = pop.length ? pop.map(p => {
      const base = p.halaman.split('?')[0].replace(/\/$/, '');
      const id = (p.halaman.match(/\?id=([a-z0-9-]+)/) || [])[1];
      const nama = id ? (judul[id] || 'Berita/pengumuman') : (NAMA_HALAMAN[base] || base || 'Beranda');
      return `<li>${esc(nama)}<span>${fmtAngka(p.jumlah)} tampilan</span></li>`;
    }).join('') : '<li class="muted">Belum ada data.</li>';
  } catch (e) {
    console.error(e);
    document.getElementById('visPopuler').innerHTML = '<li class="muted">Statistik belum tersedia.</li>';
  }
}

async function loadKomentarTerbaru() {
  const box = document.getElementById('komTerbaru');
  if (!window.sbClient) return;
  try {
    const { data, error, count } = await window.sbClient.from('komentar')
      .select('id, nama, isi, created_at, berita_id', { count: 'exact' })
      .eq('status', 'disetujui').order('created_at', { ascending: false }).limit(3);
    if (error) throw error;
    document.getElementById('komTotal').textContent = '(' + fmtAngka(count) + ' disetujui)';
    box.innerHTML = (data || []).length ? data.map(k => `
      <div class="dash-kom"><strong>${esc(k.nama)}</strong>: ${esc(k.isi.length > 140 ? k.isi.slice(0, 140) + '…' : k.isi)}
      <small><a href="berita-detail.html?id=${encodeURIComponent(k.berita_id)}#komentar">Lihat di berita</a> · ${new Date(k.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div>`).join('')
      : '<p class="muted">Belum ada komentar.</p>';
  } catch (e) {
    console.error(e);
    box.innerHTML = '<p class="muted">Komentar belum tersedia.</p>';
  }
}
loadStatistik();
loadKomentarTerbaru();
