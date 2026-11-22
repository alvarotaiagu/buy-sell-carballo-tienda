// Tarjeta de producto (la de la plataforma, tematizada): la misma en la categoría, la búsqueda y
// «También te puede gustar». La foto se posa en una balda de vidrio (contain); el precio va en la
// etiqueta ovalada; sin foto, el hueco con el óvalo. Sin recorte, la foto va enmarcada.
import { esc, foto, productoURL, enRebaja, descuento, agotado } from './datos.js';
import { T } from './textos.js';
import { etiquetaHTML, huecoHTML } from './motivo/etiqueta.js';

const SIZES = '(min-width: 1100px) 22vw, (min-width: 760px) 30vw, 46vw';

export function tarjetaHTML(p, datos, { pronto = false } = {}) {
  const cat = datos.catPorId.get(p.categoria_id);
  const f = foto(p, 0);
  const ins = [];
  if (agotado(p)) ins.push(`<span class="insignia insignia-agotado">${T.agotado}</span>`);
  else if (enRebaja(p)) ins.push(`<span class="insignia insignia-rebaja">${T.dto(descuento(p))}</span>`);
  if (p._ejemplo) ins.push('<span class="insignia insignia-ejemplo">EJEMPLO</span>');
  const img = f
    ? `<img src="${esc(f.src)}" srcset="${esc(f.srcset)}" sizes="${SIZES}" alt="${esc(p.titulo)}" width="${f.ancho}" height="${f.alto}" loading="${pronto ? 'eager' : 'lazy'}" decoding="async">`
    : huecoHTML();
  return `<li class="tarjeta">
  <a class="tarjeta-enlace" href="${productoURL(p)}">
    <span class="tarjeta-vitrina${f && !f.recorte ? ' con-marco' : ''}">
      <span class="tarjeta-obj">${img}</span>
      <i class="balda" aria-hidden="true"></i>
      ${ins.length ? `<span class="insignias">${ins.join('')}</span>` : ''}
    </span>
    <span class="tarjeta-txt">
      <span class="tarjeta-cat mono">${esc(cat ? cat.nombre : '')}</span>
      <span class="tarjeta-tit">${esc(p.titulo)}</span>
    </span>
    ${etiquetaHTML(p, { tam: 'p' })}
  </a>
</li>`;
}
