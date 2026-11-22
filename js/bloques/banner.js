// Bloque `banner` (content.banner). Aquí lleva a «Véndenos lo tuyo»: el morado del logo es lo de vender.
// Al fondo, la € del logo en grande (la pieza `euro`, como en los precios).
import { esc, enlace, tituloHTML } from '../datos.js';

export function init(sec, { datos, bloque }) {
  const b = datos.contenido.banner;
  if (!b || !b.enabled) { sec.remove(); return {}; }
  const vender = datos.tema.motif && datos.tema.motif.vender;
  const esVender = vender && b.link === vender.href;
  sec.classList.add('b-banner');
  if (esVender) sec.classList.add('b-banner-vender');
  sec.setAttribute('aria-labelledby', `${bloque.id}-t`);
  sec.innerHTML = `
    <div class="wrap">
      <div class="banner-in">
        <svg class="banner-euro" aria-hidden="true" focusable="false"><use href="#bs-euro" width="100%" height="100%"/></svg>
        <div class="banner-txt">
          ${b.kicker ? `<p class="kicker">${esc(b.kicker)}</p>` : ''}
          <h2 id="${bloque.id}-t">${tituloHTML(b.title)}</h2>
          ${b.text ? `<p class="banner-p">${esc(b.text)}</p>` : ''}
          ${b.link && b.cta_label ? `<a class="btn ${esVender ? 'btn-motivo' : ''}" href="${esc(enlace(b.link))}">${esc(b.cta_label)}</a>` : ''}
        </div>
        ${b.image ? `<figure class="banner-foto foto-enmarcada"><img src="${esc(b.image)}" alt="${esc(b.image_alt || '')}" loading="lazy" decoding="async" width="${b._ancho || 800}" height="${b._alto || 1000}"></figure>` : ''}
      </div>
    </div>`;
  return {};
}
