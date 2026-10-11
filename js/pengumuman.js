// Arsip Pengumuman: pencarian, filter kategori/status, urutan, pin, paginasi (10/halaman)
const PER_HALAMAN = 10;
let _all = [];
const _st = { q: '', kat: 'semua', status: 'semua', urut: 'terbaru', page: 1 };

async function loadPengumuman() {
  const list = document.getElementById('pengList');
  const sel = document.getElementById('pengKat');
  sel.innerHTML = '<option value="semua">Semua kategori</option>' + SUB_KATEGORI.map(s => `<option>${escHtml(s)}</option>`).join('');
  if (!window.sbClient) { list.innerHTML = '<p class="muted">Koneksi database belum tersedia.</p>'; return; }
  try {
    const { data, error } = await window.sbClient.from('berita').select('*').eq('published', true).order('tanggal_publish', { ascending: false });
    if (error) throw error;
    _all = (data || []).filter(b => parseKategori(b.kategori).jenis === 'Pengumuman');
    render();
  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="muted">Belum ada pengumuman.</p>';
  }
}

function ringkas(b) {
  return (b.konten || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
}
function tgl(d) { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function kartu(b, pinned) {
  const p = parseKategori(b.kategori), i = infoPengumuman(b), t = new Date(b.tanggal_publish);
  return `<a class="peng-card${i.berakhir ? ' is-ended' : ''}${pinned ? ' is-pinned' : ''}" href="berita-detail.html?id=${encodeURIComponent(b.id)}">
    <div class="pengumuman-date"><span class="pd-day">${t.getDate()}</span><span class="pd-mon">${BLN[t.getMonth()]}</span></div>
    <div class="peng-body">
      <div><span class="kat-tag ${katClass(p.sub)}">${escHtml(p.sub)}</span>${badgePengumuman(i)}</div>
      <h3>${escHtml(b.judul)}</h3>
      <p>${escHtml(ringkas(b))}</p>
      ${b.tanggal_berakhir ? `<small>${i.berakhir ? 'Berakhir' : 'Berlaku s.d.'} ${tgl(b.tanggal_berakhir)}</small>` : ''}
    </div></a>`;
}

function render() {
  const q = _st.q.toLowerCase();
  let rows = _all.filter(b => {
    const p = parseKategori(b.kategori), i = infoPengumuman(b);
    if (_st.kat !== 'semua' && p.sub !== _st.kat) return false;
    if (_st.status === 'aktif' && i.berakhir) return false;
    if (_st.status === 'berakhir' && !i.berakhir) return false;
    if (q && !(b.judul + ' ' + ringkas(b)).toLowerCase().includes(q)) return false;
    return true;
  });
  if (_st.urut === 'deadline') {
    rows.sort((a, b) => {
      const ia = infoPengumuman(a), ib = infoPengumuman(b);
      if (ia.berakhir !== ib.berakhir) return ia.berakhir ? 1 : -1;
      if (!!a.tanggal_berakhir !== !!b.tanggal_berakhir) return a.tanggal_berakhir ? -1 : 1;
      return (a.tanggal_berakhir || '').localeCompare(b.tanggal_berakhir || '');
    });
  }
  // Blok disematkan (maks. 3, hanya yang masih aktif) di atas halaman 1
  const pins = (_st.page === 1 && _st.urut === 'terbaru') ? rows.filter(b => b.disematkan && !infoPengumuman(b).berakhir).slice(0, 3) : [];
  const sisa = rows.filter(b => !pins.includes(b));
  const hal = Math.max(1, Math.ceil(sisa.length / PER_HALAMAN));
  if (_st.page > hal) _st.page = hal;
  const slice = sisa.slice((_st.page - 1) * PER_HALAMAN, _st.page * PER_HALAMAN);

  document.getElementById('pengSemat').innerHTML = pins.length
    ? '<h2 class="peng-sec-title">Disematkan</h2><div class="peng-list">' + pins.map(b => kartu(b, true)).join('') + '</div><h2 class="peng-sec-title">Semua pengumuman</h2>' : '';
  document.getElementById('pengList').innerHTML = slice.length || pins.length
    ? slice.map(b => kartu(b, false)).join('')
    : '<p class="muted">Tidak ada pengumuman yang cocok dengan filter.</p>';
  document.getElementById('pengPager').innerHTML = hal > 1
    ? Array.from({ length: hal }, (_, n) => `<button type="button" class="${n + 1 === _st.page ? 'active' : ''}" data-p="${n + 1}">${n + 1}</button>`).join('') : '';
}

document.getElementById('pengCari').addEventListener('input', e => { _st.q = e.target.value.trim(); _st.page = 1; render(); });
document.getElementById('pengKat').addEventListener('change', e => { _st.kat = e.target.value; _st.page = 1; render(); });
document.getElementById('pengStatus').addEventListener('change', e => { _st.status = e.target.value; _st.page = 1; render(); });
document.getElementById('pengUrut').addEventListener('change', e => { _st.urut = e.target.value; _st.page = 1; render(); });
document.getElementById('pengPager').addEventListener('click', e => {
  const b = e.target.closest('button[data-p]'); if (!b) return;
  _st.page = parseInt(b.dataset.p, 10); render(); window.scrollTo({ top: 300, behavior: 'smooth' });
});
loadPengumuman();
