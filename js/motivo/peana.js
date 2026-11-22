// Motivo «vitrina» · bloque `products` variante «peana» (boceto C).
// Una pieza cada vez sobre la peana de madera con el logo grabado, bajo un foco, con su ficha
// corta. Se pasa con las flechas, arrastrando o con el teclado. NO se fija al scroll (eso es de
// «horizonte», encargo §2). Sin movimiento, el cambio es directo y todo se puede comprar.
import { esc, foto, productoURL, aConsultar, whatsappURL, primeraLinea, tituloHTML, enlace } from '../datos.js';
import { T } from '../textos.js';
import { etiquetaHTML, huecoHTML } from './etiqueta.js';
import { anadirACesta } from '../cesta.js';

const PEANA = 'assets/img/motivo/peana.svg';

export function init(sec, { datos, motion, bloque }) {
  const limite = bloque.limit || 6;
  const piezas = bloque.source === 'featured' ? datos.destacados().slice(0, limite) : datos.nuevos(limite);
  if (!piezas.length) { sec.remove(); return {}; }
  const h = datos.titulo(bloque.id);
  sec.classList.add('b-peana');
  sec.setAttribute('aria-labelledby', `${bloque.id}-t`);
  sec.setAttribute('aria-roledescription', 'carrusel');
  sec.innerHTML = `
    <div class="wrap peana-in">
      <div class="peana-txt">
        <div class="b-cab">${h.kicker ? `<p class="kicker">${esc(h.kicker)}</p>` : ''}<h2 id="${bloque.id}-t">${tituloHTML(h.title)}</h2></div>
        <div class="peana-ficha" data-ficha aria-live="polite"></div>
        <a class="enlace-flecha" href="${enlace('/novedades')}">${T.verNovedades} <span aria-hidden="true">→</span></a>
      </div>
      <div class="peana-escena" data-escena tabindex="0" role="group" aria-label="${esc(h.title.replace(/\*/g, ''))}">
        <i class="peana-foco" aria-hidden="true"></i>
        <div class="peana-base"><img src="${PEANA}" alt="" width="600" height="258" data-peana><div class="peana-pieza" data-pieza></div></div>
        <div class="peana-mandos">
          <button type="button" class="peana-flecha" data-ant aria-label="${T.anterior}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>
          <p class="peana-num mono" data-num></p>
          <button type="button" class="peana-flecha" data-sig aria-label="${T.siguiente}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
        </div>
        <ol class="peana-mini" data-mini>${piezas.map((p, i) => {
          const f = foto(p, 0);
          return `<li><button type="button" data-ir="${i}" aria-label="${esc(p.titulo)}">${f ? `<img src="${esc(f.srcset.split(' ')[0])}" alt="" width="${f.ancho}" height="${f.alto}" loading="lazy" decoding="async"${f.recorte ? '' : ' class="enmarcada"'}>` : huecoHTML()}</button></li>`;
        }).join('')}</ol>
      </div>
    </div>`;

  const escena = sec.querySelector('[data-escena]');
  const pieza = sec.querySelector('[data-pieza]');
  const ficha = sec.querySelector('[data-ficha]');
  const num = sec.querySelector('[data-num]');
  const minis = [...sec.querySelectorAll('[data-ir]')];
  let i = 0, ocupado = false;

  // la línea donde se apoyan las piezas: la dice peana.svg (data-superficie-y)
  fetch(PEANA).then((r) => (r.ok ? r.text() : '')).then((svg) => {
    const vb = /viewBox="([^"]+)"/.exec(svg), y = /data-superficie-y="([\d.]+)"/.exec(svg);
    if (!vb) return;
    const [, , w, hh] = vb[1].trim().split(/[\s,]+/).map(Number);
    escena.style.setProperty('--peana-ar', `${w} / ${hh}`);
    if (y) escena.style.setProperty('--superficie', (+y[1] / hh).toFixed(4));
  }).catch(() => {});

  function piezaHTML(p) {
    const f = foto(p, 0);
    if (!f) return `<span class="peana-obj peana-hueco">${huecoHTML()}</span>`;
    return `<span class="peana-obj${f.recorte ? '' : ' peana-enmarcada'}"><img src="${esc(f.src)}" srcset="${esc(f.srcset)}" sizes="(min-width: 900px) 30vw, 70vw" alt="${esc(p.titulo)}" width="${f.ancho}" height="${f.alto}" decoding="async"${i === 0 ? '' : ' loading="lazy"'}></span>`;
  }
  function fichaHTML(p) {
    const cat = datos.catPorId.get(p.categoria_id);
    const linea = primeraLinea(p);
    const consulta = aConsultar(p);
    const wa = whatsappURL(p);
    return `<p class="peana-cat mono">${esc(cat ? cat.nombre : '')}</p>
      <h3><a href="${productoURL(p)}">${esc(p.titulo)}</a></h3>
      ${linea ? `<p class="peana-linea">${esc(linea)}</p>` : ''}
      <div class="peana-precio">${etiquetaHTML(p, { tam: 'm' })}<span class="sello-uno mono">${T.unaUnidad}</span></div>
      <div class="peana-botones">
        ${consulta ? (wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener noreferrer">${T.preguntarWhatsapp}</a>` : '') : `<button type="button" class="btn" data-anadir="${esc(p.slug)}">${T.anadir}</button>`}
        <a class="btn btn-linea" href="${productoURL(p)}">${T.verArticulo}</a>
      </div>`;
  }
  function pintar() {
    const p = piezas[i];
    pieza.innerHTML = piezaHTML(p);
    ficha.innerHTML = fichaHTML(p);
    num.textContent = T.piezaN(i + 1, piezas.length);
    minis.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
  }

  async function ir(n, dir) {
    const sig = (n + piezas.length) % piezas.length;
    if (sig === i || ocupado) return;
    const anim = motion && Element.prototype.animate;
    if (!anim) { i = sig; pintar(); return; }
    ocupado = true;
    const sale = pieza.firstElementChild;
    const fuera = sale && sale.animate(
      [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dir * -38}%,-6%) rotate(${dir * -5}deg)`, opacity: 0 }],
      { duration: 260, easing: 'cubic-bezier(.55,0,.75,.3)', fill: 'forwards' },
    );
    ficha.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    if (fuera) await fuera.finished.catch(() => {});
    i = sig;
    pintar();
    // la pieza nueva baja hasta la peana y se asienta
    const entra = pieza.firstElementChild;
    entra.animate(
      [{ transform: `translate(${dir * 30}%,-14%)`, opacity: 0 }, { transform: 'translate(0,1.2%)', opacity: 1, offset: 0.8 }, { transform: 'translate(0,0)', opacity: 1 }],
      { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
    ficha.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' });
    ocupado = false;
  }

  sec.querySelector('[data-ant]').addEventListener('click', () => ir(i - 1, -1));
  sec.querySelector('[data-sig]').addEventListener('click', () => ir(i + 1, 1));
  minis.forEach((b) => b.addEventListener('click', () => { const n = +b.dataset.ir; ir(n, n > i ? 1 : -1); }));
  escena.addEventListener('keydown', (e) => {
    if (e.target.closest('button') && !e.target.matches('[data-ant],[data-sig]')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(i - 1, -1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(i + 1, 1); }
  });
  // arrastrar: solo en horizontal (el vertical sigue siendo el scroll de la página)
  let x0 = null, y0 = 0;
  escena.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; });
  escena.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) ir(dx < 0 ? i + 1 : i - 1, dx < 0 ? 1 : -1);
  });
  escena.addEventListener('pointercancel', () => (x0 = null));
  ficha.addEventListener('click', (e) => {
    const b = e.target.closest('[data-anadir]');
    if (!b) return;
    anadirACesta(b.dataset.anadir, ficha.querySelector('.etiqueta'));
  });

  pintar();
  return {};
}
