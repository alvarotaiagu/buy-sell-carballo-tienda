// Bloque `about` (content.about): quiénes son y sus servicios (en el texto, 008 §5).
// La foto de la tienda va enmarcada y apoyada en una balda, como los cuadros.
import { esc, tituloHTML, textoRicoHTML } from '../datos.js';

export function init(sec, { datos, bloque }) {
  const a = datos.contenido.about;
  if (!a || !a.enabled) { sec.remove(); return {}; }
  sec.classList.add('b-about');
  sec.setAttribute('aria-labelledby', `${bloque.id}-t`);
  sec.innerHTML = `
    <div class="wrap about-in">
      ${a.image ? `<figure class="about-foto"><span class="foto-enmarcada"><img src="${esc(a.image)}" alt="${esc(a._alt || '')}" width="${a._ancho || 900}" height="${a._alto || 1125}" loading="lazy" decoding="async"></span><i class="balda balda-corta" aria-hidden="true"></i></figure>` : ''}
      <div class="about-txt">
        ${a.kicker ? `<p class="kicker">${esc(a.kicker)}</p>` : ''}
        <h2 id="${bloque.id}-t">${tituloHTML(a.title)}</h2>
        <div class="texto-rico">${textoRicoHTML(a.body, { primera: 'entradilla' })}</div>
      </div>
    </div>`;
  return {};
}
