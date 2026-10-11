// Pencatat kunjungan ANONIM: hanya kode acak di browser + halaman + hari. Tanpa IP, tanpa nama.
// Menghormati sinyal "Do Not Track". Satu kunjungan per pengunjung per halaman per hari (diatur di database).
(function () {
  try {
    if (!window.sbClient) return;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    if (/^(localhost|127\.)/.test(location.hostname)) return;
    let vid = null;
    try { vid = localStorage.getItem('msp_vid'); } catch (_) {}
    if (!vid) {
      const a = new Uint8Array(16);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256));
      vid = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem('msp_vid', vid); } catch (_) {}
    }
    window._mspVid = vid;
    let hal = location.pathname.replace(/\/index\.html$/, '/').replace(/^\/+/, '') || 'index.html';
    if (hal === '') hal = 'index.html';
    if (/berita-detail/.test(hal)) {
      const id = new URLSearchParams(location.search).get('id');
      if (id) hal += '?id=' + id;
    }
    window.sbClient.rpc('catat_kunjungan', { p_visitor: vid, p_halaman: hal }).then(() => {}, () => {});
  } catch (_) { /* pencatatan tidak boleh mengganggu halaman */ }
})();
