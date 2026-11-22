// Motivo «vitrina» · la etiqueta ovalada del precio (pegatina del logo, boceto B) y el hueco sin foto.
// El óvalo es `logo.short`; la € es la pieza `euro` de `logo.main` (marca.js). El precio, en --text.
import { importe, euros, enRebaja, aConsultar, esc } from '../datos.js';
import { T } from '../textos.js';

/**
 * Etiqueta con el precio. tam: 'p' (tarjetas), 'm' (peana, cesta), 'g' (ficha, hoja de la vitrina).
 * Lleva su texto accesible dentro; lo visible va con aria-hidden.
 */
export function etiquetaHTML(p, { tam = 'm' } = {}) {
  if (aConsultar(p)) {
    return `<span class="etiqueta etiqueta-${tam} etiqueta-consulta"><span class="sr-only">${T.aConsultar}</span><span class="etq-precio" aria-hidden="true"><span class="etq-txt">${T.aConsultarCorto}</span></span></span>`;
  }
  const num = importe(p.precio_cents);
  const reb = enRebaja(p);
  const sr = reb ? `${T.antes}${euros(p.precio_anterior_cents)}, ${T.ahora}${euros(p.precio_cents)}` : `${T.precio}${euros(p.precio_cents)}`;
  const largo = num.replace(/\D/g, '').length >= 5 ? ' etiqueta-larga' : '';
  return `<span class="etiqueta etiqueta-${tam}${reb ? ' etiqueta-rebaja' : ''}${largo}"><span class="sr-only">${esc(sr)}</span><span class="etq-precio" aria-hidden="true"><span class="etq-num">${esc(num)}</span><svg class="etq-euro" focusable="false"><use href="#bs-euro" width="100%" height="100%"/></svg><span class="etq-e">€</span></span>${
    reb ? `<s class="etq-antes" aria-hidden="true">${esc(euros(p.precio_anterior_cents))}</s>` : ''}</span>`;
}

/** Hueco de un artículo o categoría sin foto: el óvalo del logo, tenue. */
export const huecoHTML = () => '<span class="hueco" aria-hidden="true"></span>';
