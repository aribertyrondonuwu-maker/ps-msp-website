// ═══════════════════════════════════════════════════════════════════
//  Forum Alumni — percakapan modern: avatar identicon, reply berantai
// ═══════════════════════════════════════════════════════════════════

const FORUM_READY = true; // Supabase terhubung

// ── Avatar identicon SVG deterministik dari nama ──
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function identicon(nama) {
  const h = hashStr(nama || 'anon');
  const hue = h % 360;
  const bg = `hsl(${hue},45%,92%)`;
  const fg = `hsl(${hue},55%,42%)`;
  // grid 5x5 simetris
  let cells = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if ((h >> (y * 3 + x)) & 1) {
        const mx = 4 - x;
        cells += `<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="${fg}"/>`;
        if (mx !== x) cells += `<rect x="${mx * 10}" y="${y * 10}" width="10" height="10" fill="${fg}"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 50 50" class="forum-avatar-svg" style="background:${bg}">${cells}</svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function waktuRelatif(iso) {
  const d = new Date(iso), now = new Date();
  const detik = Math.floor((now - d) / 1000);
  if (detik < 60) return 'baru saja';
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`;
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
  if (detik < 604800) return `${Math.floor(detik / 86400)} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

let _forumData = [];

async function loadForum() {
  const list = document.getElementById('forumList');
  if (FORUM_READY && window.sbClient) {
    try {
      const { data, error } = await window.sbClient
        .from('alumni_diskusi')
        .select('id, nama, angkatan, pesan, created_at, parent_id')
        .eq('approved', true)
        .order('created_at', { ascending: true })
        .limit(300);
      if (error) throw error;
      _forumData = data || [];
      renderForum();
      return;
    } catch (e) {
      console.error(e);
      list.innerHTML = '<p class="muted">Gagal memuat percakapan. Muat ulang halaman untuk mencoba lagi.</p>';
      return;
    }
  }
  list.innerHTML = '<p class="muted">Menghubungkan ke server…</p>';
}

function renderForum() {
  const list = document.getElementById('forumList');
  if (!_forumData.length) {
    list.innerHTML = '<div class="forum-empty"><p>Belum ada percakapan.</p><p class="muted">Jadilah yang pertama menyapa sesama alumni MSP!</p></div>';
    updateForumCount(0);
    return;
  }

  // pisahkan induk & balasan
  const induk = _forumData.filter(d => !d.parent_id);
  const balasanByParent = {};
  _forumData.filter(d => d.parent_id).forEach(d => {
    (balasanByParent[d.parent_id] = balasanByParent[d.parent_id] || []).push(d);
  });

  // induk terbaru di atas
  induk.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  list.innerHTML = induk.map(d => {
    const balasan = (balasanByParent[d.id] || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const balasanHtml = balasan.map(r => renderPesan(r, true)).join('');
    return `
      <div class="forum-thread">
        ${renderPesan(d, false)}
        ${balasanHtml ? `<div class="forum-replies">${balasanHtml}</div>` : ''}
      </div>`;
  }).join('');

  updateForumCount(_forumData.length);
}

function renderPesan(d, isReply) {
  const angkatan = d.angkatan ? `<span class="forum-angkatan">Angkatan ${escapeHtml(d.angkatan)}</span>` : '';
  const replyBtn = !isReply
    ? `<button class="forum-reply-btn" onclick="bukaFormBalas('${d.id}','${escapeHtml(d.nama).replace(/'/g, "\\'")}')">↩ Balas</button>`
    : '';
  return `
    <div class="forum-msg${isReply ? ' is-reply' : ''}">
      <div class="forum-avatar">${identicon(d.nama)}</div>
      <div class="forum-msg-body">
        <div class="forum-msg-head">
          <span class="forum-nama">${escapeHtml(d.nama)}</span>
          ${angkatan}
          <span class="forum-waktu">${waktuRelatif(d.created_at)}</span>
        </div>
        <div class="forum-pesan">${escapeHtml(d.pesan)}</div>
        <div class="forum-msg-actions">${replyBtn}</div>
        <div class="forum-reply-form-slot" id="replyslot-${d.id}"></div>
      </div>
    </div>`;
}

function updateForumCount(n) {
  const el = document.getElementById('forumCount');
  if (el) el.textContent = n;
}

// ── Form balas inline ──
let _replyAktif = null;
function bukaFormBalas(parentId, namaTarget) {
  // tutup form balas lain yang terbuka
  if (_replyAktif && _replyAktif !== parentId) {
    const prev = document.getElementById('replyslot-' + _replyAktif);
    if (prev) prev.innerHTML = '';
  }
  const slot = document.getElementById('replyslot-' + parentId);
  if (!slot) return;
  if (slot.innerHTML.trim()) { slot.innerHTML = ''; _replyAktif = null; return; }
  _replyAktif = parentId;
  slot.innerHTML = `
    <form class="forum-reply-form" onsubmit="return kirimBalasan(event,'${parentId}')">
      <input type="text" placeholder="Nama" required maxlength="80" class="fr-nama">
      <input type="text" placeholder="Angkatan (opsional)" maxlength="20" class="fr-angkatan">
      <textarea placeholder="Tulis balasan untuk ${escapeHtml(namaTarget)}…" required maxlength="500" rows="2" class="fr-pesan"></textarea>
      <div class="forum-reply-form-actions">
        <button type="submit" class="btn btn-primary btn-sm">Kirim Balasan</button>
        <button type="button" class="btn-outline-dark btn-sm-outline" onclick="document.getElementById('replyslot-${parentId}').innerHTML='';">Batal</button>
      </div>
      <p class="fr-status form-note"></p>
    </form>`;
}

async function kirimBalasan(e, parentId) {
  e.preventDefault();
  const form = e.target;
  const nama = form.querySelector('.fr-nama').value.trim();
  const angkatan = form.querySelector('.fr-angkatan').value.trim();
  const pesan = form.querySelector('.fr-pesan').value.trim();
  const status = form.querySelector('.fr-status');
  if (!nama || !pesan) return false;
  if (FORUM_READY && window.sbClient) {
    try {
      const { error } = await window.sbClient.from('alumni_diskusi').insert([{ nama, angkatan, pesan, parent_id: parentId }]);
      if (error) throw error;
      status.textContent = '✅ Balasan terkirim, menunggu peninjauan admin.';
      form.querySelector('.fr-nama').value = '';
      form.querySelector('.fr-angkatan').value = '';
      form.querySelector('.fr-pesan').value = '';
    } catch (err) {
      status.textContent = '⚠️ Gagal mengirim balasan.';
      console.error(err);
    }
  }
  return false;
}

// ── Form utama (pesan baru / thread baru) ──
let _forumCooldown = false;
const _forumForm = document.getElementById('forumForm');
if (_forumForm) {
  _forumForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (_forumCooldown) return;
    const nama = document.getElementById('forumNama').value.trim();
    const angkatan = document.getElementById('forumAngkatan').value.trim();
    const pesan = document.getElementById('forumPesan').value.trim();
    const status = document.getElementById('forumStatus');
    const btn = _forumForm.querySelector('button[type="submit"]');
    if (!nama || !pesan) return;
    if (pesan.length > 500 || nama.length > 80) { status.textContent = '⚠️ Teks terlalu panjang.'; return; }

    const labelAsli = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim…'; }
    if (FORUM_READY && window.sbClient) {
      try {
        const { error } = await window.sbClient.from('alumni_diskusi').insert([{ nama, angkatan, pesan }]);
        if (error) throw error;
        status.textContent = '✅ Pesan terkirim, menunggu peninjauan admin sebelum tampil.';
        _forumForm.reset();
      } catch (err) {
        status.textContent = '⚠️ Gagal mengirim, coba lagi nanti.';
        console.error(err);
      }
    } else {
      status.textContent = '⚠️ Koneksi ke server belum siap. Muat ulang halaman.';
    }
    // cooldown 5 detik cegah spam
    _forumCooldown = true;
    let sisa = 5;
    if (btn) {
      const timer = setInterval(() => {
        sisa--;
        if (sisa <= 0) { clearInterval(timer); _forumCooldown = false; btn.disabled = false; btn.textContent = labelAsli; }
        else { btn.textContent = `Tunggu ${sisa}s…`; }
      }, 1000);
    } else {
      setTimeout(() => { _forumCooldown = false; }, 5000);
    }
  });
}

loadForum();
