// Bloque `visit`: dirección, horario, cómo llegar y el mapa (Google Maps sin clave, al pulsar).
import { esc, protoDireccion, telURL, whatsappURL, tituloHTML } from '../datos.js';
import { T } from '../textos.js';
import { horarioFilas } from '../chrome.js';

export function init(sec, { datos, bloque }) {
  const t = datos.tienda;
  const h = datos.titulo(bloque.id);
  const dir = protoDireccion(t.direccion);
  const consulta = encodeURIComponent(`${t.nombre}, ${[t.direccion?.calle, t.direccion?.cp, t.direccion?.localidad].filter(Boolean).join(', ')}`);
  const wa = whatsappURL(null);
  sec.classList.add('b-visit');
  sec.id = 'visit';
  sec.setAttribute('aria-labelledby', `${bloque.id}-t`);
  sec.innerHTML = `
    <div class="wrap visit-in">
      <div class="visit-datos">
        ${h.kicker ? `<p class="kicker">${esc(h.kicker)}</p>` : ''}
        <h2 id="${bloque.id}-t">${tituloHTML(h.title)}</h2>
        <address>${esc(dir)}</address>
        <table class="horario">
          <caption>${T.horario}${t._horario_pendiente ? ` <span class="pendiente">[PENDIENTE: ${esc(t._horario_pendiente)}]</span>` : ''}</caption>
          <tbody>${horarioFilas(t).map(([d, hh]) => `<tr><th scope="row">${esc(d)}</th><td class="mono">${esc(hh)}</td></tr>`).join('')}</tbody>
        </table>
        <div class="visit-botones">
          <a class="btn" href="https://www.google.com/maps/dir/?api=1&amp;destination=${consulta}" target="_blank" rel="noopener noreferrer">${T.comoLlegar}</a>
          ${t.telefono ? `<a class="btn btn-linea" href="${telURL(t.telefono)}">${T.llamar}</a>` : ''}
          ${wa ? `<a class="btn btn-linea" href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
        </div>
      </div>
      <div class="visit-mapa">
        <button class="mapa-ok" type="button" data-src="https://www.google.com/maps?q=${consulta}&amp;output=embed" data-titulo="${esc(T.mapaDe(t.nombre))}">
          <span class="mapa-ovalo" aria-hidden="true"></span>
          <span class="mapa-txt">${T.verMapa}</span>
          <span class="mapa-nota">${T.notaMapa}</span>
        </button>
      </div>
    </div>`;
  const b = sec.querySelector('.mapa-ok');
  b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = b.dataset.src.replace(/&amp;/g, '&');
    f.title = b.dataset.titulo;
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    b.replaceWith(f);
  });
  return {};
}
