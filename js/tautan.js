async function loadTautan() {
  const content = document.getElementById('tautanContent');
  try {
    const res = await fetch('js/data/tautan.json');
    const data = await res.json();

    content.innerHTML = `<div class="container">` + data.kategori.map(kat => `
      <div class="galeri-subsection">
        <h3>${kat.nama}</h3>
        <div class="cards-grid" style="margin-top:20px;">
          ${kat.tautan.map(t => `
            <a href="${t.url}" target="_blank" rel="noopener" class="card" style="display:block;">
              <h3>${t.label}</h3>
              <p>${t.keterangan}</p>
              <p class="card-link">Buka situs →</p>
            </a>
          `).join('')}
        </div>
      </div>
    `).join('') + `</div>`;
  } catch (e) {
    content.innerHTML = '<div class="container"><p class="muted">[DATA DIPERLUKAN: js/data/tautan.json gagal dimuat]</p></div>';
    console.error(e);
  }
}
loadTautan();
