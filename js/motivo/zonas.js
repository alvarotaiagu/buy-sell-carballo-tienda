// Motivo «vitrina» · bloque `categories` variante «zonas» (boceto D, el menú).
// Cada departamento es una parcela con su material (motif.zonas del tema) y dos o tres de sus
// artículos recortados de pie encima. Todas pesan lo mismo. Al pasar el ratón, los artículos se
// levantan un poco. Con movimiento, el material de cada parcela entra al verla (una vez).
import { esc, categoriaURL, foto, tituloHTML } from '../datos.js';
import { T } from '../textos.js';
import { materialHTML, entrarMaterial } from './materiales.js';
import { huecoHTML } from './etiqueta.js';

export function init(sec, { datos, motion, bloque }) {
  const h = datos.titulo(bloque.id);
  const cats = datos.categorias.filter((c) => !c.padre && c.visible !== false);
  sec.classList.add('b-zonas');
  sec.innerHTML = `
    <div class="wrap">
      <div class="b-cab">${h.kicker ? `<p class="kicker">${esc(h.kicker)}</p>` : ''}<h2 id="${bloque.id}-t">${tituloHTML(h.title)}</h2></div>
      <ul class="zonas">${cats.map((c) => zona(c, datos)).join('')}</ul>
    </div>`;
  sec.setAttribute('aria-labelledby', `${bloque.id}-t`);

  if (motion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e, i) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        entrarMaterial(e.target, { motion, retraso: (i % 3) * 0.08 });
        const arts = e.target.querySelectorAll('.zona-art');
        window.gsap.fromTo(arts, { y: -18 }, { y: 0, duration: 0.8, ease: 'bounce.out', stagger: 0.07, delay: 0.25 + (i % 3) * 0.08, clearProps: 'transform' });
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    sec.querySelectorAll('.zona').forEach((z) => io.observe(z));
  }
  return {};
}

function zona(c, datos) {
  const arts = datos.deCategoria(c);
  // de pie sobre el material, solo los recortes (los demás saldrían como fotos enmarcadas)
  const recortes = arts.filter((p) => p._recorte).slice(0, 3);
  const piezas = recortes.length
    ? recortes.map((p, i) => {
        const f = foto(p, 0);
        return `<span class="zona-art" style="--i:${i}"><img src="${esc(f.srcset.split(' ')[0])}" alt="" width="${f.ancho}" height="${f.alto}" loading="lazy" decoding="async"></span>`;
      }).join('')
    : `<span class="zona-art zona-hueco">${huecoHTML()}</span>`;
  return `<li class="zona" data-material="${datos.materialDe(c)}">
    <a href="${categoriaURL(c)}">
      ${materialHTML(datos.materialDe(c))}
      <span class="zona-arts n${Math.max(1, recortes.length)}">${piezas}</span>
      <span class="zona-txt"><span class="zona-nombre">${esc(c.nombre)}</span><span class="zona-num mono">${T.articulos(arts.length)}</span></span>
    </a>
  </li>`;
}
