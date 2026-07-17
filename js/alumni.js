// ── Pengurus & Kegiatan (statis dari JSON) ──────────────────────────────
async function loadPengurusKegiatan() {
  try {
    const res = await fetch('js/data/alumni-pengurus.json');
    const data = await res.json();

    const pengurusGrid = document.getElementById('pengurusGrid');
    pengurusGrid.innerHTML = data.pengurus.map(p => `
      <article class="card">
        <h3>${p.peran}</h3>
        <p>${p.nama}${p.angkatan ? ' · Angkatan ' + p.angkatan : ''}</p>
      </article>
    `).join('');

    const kegiatanList = document.getElementById('kegiatanList');
    kegiatanList.innerHTML = data.kegiatan.map(k => `
      <div class="kegiatan-item">
        ${k.tahun ? `<div class="tahun">${k.tahun}</div>` : ''}
        <h4>${k.judul}</h4>
        <p>${k.deskripsi}</p>
      </div>
    `).join('');
  } catch (e) {
    console.error('Gagal memuat data alumni:', e);
  }
}
loadPengurusKegiatan();

// ── Diskusi / Komentar ───────────────────────────────────────────────────
// MODE PRATINJAU: berjalan in-memory (tidak permanen) sampai Supabase
// dihubungkan. Setelah setup Supabase (lihat references/tech-stack.md,
// tabel `alumni_diskusi`), ganti fungsi submitDiskusi() & loadDiskusi()
// di bawah untuk memanggil window.supabase.from('alumni_diskusi')... dst.

const DISKUSI_SUPABASE_READY = false; // ubah ke true setelah supabase-client.js terhubung
let _diskusiDemoStore = [
  { nama: 'Tim PS MSP', angkatan: '', pesan: 'Selamat datang di ruang diskusi alumni! Silakan berbagi kabar atau info lowongan kerja di sini.', created_at: new Date().toISOString() }
];

async function loadDiskusi() {
  const list = document.getElementById('diskusiList');
  if (DISKUSI_SUPABASE_READY && window.supabase) {
    try {
      const { data, error } = await window.supabase
        .from('alumni_diskusi')
        .select('nama, angkatan, pesan, created_at')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      renderDiskusi(data);
      return;
    } catch (e) {
      console.error(e);
    }
  }
  renderDiskusi(_diskusiDemoStore);
}

function renderDiskusi(items) {
  const list = document.getElementById('diskusiList');
  if (!items.length) {
    list.innerHTML = '<p class="muted">Belum ada diskusi. Jadilah yang pertama menulis pesan!</p>';
    return;
  }
  list.innerHTML = items.map(d => `
    <div class="diskusi-item">
      <div class="meta"><strong>${escapeHtml(d.nama)}</strong>${d.angkatan ? ' · Angkatan ' + escapeHtml(d.angkatan) : ''} · ${new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      <div class="pesan">${escapeHtml(d.pesan)}</div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('diskusiForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nama = document.getElementById('diskusiNama').value.trim();
  const angkatan = document.getElementById('diskusiAngkatan').value.trim();
  const pesan = document.getElementById('diskusiPesan').value.trim();
  const status = document.getElementById('diskusiStatus');
  if (!nama || !pesan) return;

  if (DISKUSI_SUPABASE_READY && window.supabase) {
    try {
      const { error } = await window.supabase.from('alumni_diskusi').insert([{ nama, angkatan, pesan }]);
      if (error) throw error;
      status.textContent = '✅ Pesan terkirim, menunggu peninjauan admin sebelum tampil.';
    } catch (err) {
      status.textContent = '⚠️ Gagal mengirim, coba lagi nanti.';
      console.error(err);
      return;
    }
  } else {
    // Mode pratinjau: tampil langsung di sesi ini saja, tidak tersimpan permanen
    _diskusiDemoStore.unshift({ nama, angkatan, pesan, created_at: new Date().toISOString() });
    status.textContent = 'ℹ️ Mode pratinjau — pesan tampil sementara di sesi ini. Setelah Supabase terhubung, pesan asli akan tersimpan & melalui moderasi admin.';
    renderDiskusi(_diskusiDemoStore);
  }

  document.getElementById('diskusiForm').reset();
});

loadDiskusi();
