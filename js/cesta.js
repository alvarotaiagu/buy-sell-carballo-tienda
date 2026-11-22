// ─────────────────────────────────────────────────────────────
// Cesta (la de la plataforma, tematizada). En localStorage solo va [{ slug, cantidad }];
// precio, foto y existencias se leen siempre de los datos. De cada artículo hay una unidad:
// la cesta no deja pasar de 1. Sin GSAP: transiciones CSS y el «despegar» del motivo.
// La barra de envío gratis es una balda de vidrio por la que avanza la etiqueta.
// ─────────────────────────────────────────────────────────────
import { euros, esc, foto, productoURL, aConsultar, agotado, enlace, param } from './datos.js';
import { T } from './textos.js';
import { despegar } from './motivo/despegar.js';
import { huecoHTML } from './motivo/etiqueta.js';

const CLAVE = 'bs-cesta';
let datos = null;
let memoria = null;
let ultimoFoco = null;
let cajon, velo, cuerpo, subtotalEl, envioEl, mensaje, btnTramitar;

/* ── almacenamiento ── */
function leer() {
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    return Array.isArray(l) ? l.filter((x) => x && typeof x.slug === 'string' && x.cantidad > 0) : [];
  } catch {
    return [];
  }
}
function guardar(l) {
  memoria = l;
  try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* navegación privada: solo en memoria */ }
  pintar();
}
const lineas = () => (memoria ??= leer());
export const unidades = () => lineas().reduce((s, l) => s + l.cantidad, 0);
export const enCesta = (slug) => lineas().some((l) => l.slug === slug);

/** Umbral de envío gratis: el de la tienda; en el prototipo, ?envio-gratis=<euros> para verlo (README). */
function umbral() {
  const q = Number(param('envio-gratis'));
  if (q > 0) return Math.round(q * 100);
  return datos.tienda.envio_gratis_desde_cents ?? null;
}

/**
 * Añade un artículo (una unidad). Con `origen` (la etiqueta del precio) hace «despegar» hasta
 * el icono de la cesta y luego abre el cajón. Devuelve false si no se puede (sin precio, vendido
 * o ya en la cesta: en ese caso abre el cajón con el aviso).
 */
export async function anadirACesta(slug, origen) {
  const p = datos && datos.prodPorSlug.get(slug);
  if (!p || aConsultar(p) || agotado(p)) return false;
  if (enCesta(slug)) {
    abrirCesta(T.yaEnCesta);
    return false;
  }
  const destino = document.querySelector('.cab [data-abrir-cesta]');
  const etq = origen && (origen.classList.contains('etiqueta') ? origen : origen.querySelector('.etiqueta'));
  await despegar(etq, destino);
  guardar([...lineas(), { slug, cantidad: 1 }]);
  abrirCesta();
  return true;
}
function quitar(slug) {
  guardar(lineas().filter((l) => l.slug !== slug));
}

/* ── icono de la cabecera ── */
export const iconoCesta = () =>
  '<svg class="icono-cesta" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>';

function pintarBotones() {
  const n = unidades();
  document.querySelectorAll('[data-abrir-cesta]').forEach((b) => {
    const num = b.querySelector('.cesta-num');
    if (num) { num.textContent = n; num.hidden = n === 0; }
    b.setAttribute('aria-label', T.cestaAria(n));
  });
}

/* ── cajón ── */
function montar() {
  velo = document.createElement('div');
  velo.className = 'cajon-velo';
  velo.hidden = true;
  cajon = document.createElement('div');
  cajon.className = 'cajon';
  cajon.id = 'cesta';
  cajon.hidden = true;
  cajon.setAttribute('role', 'dialog');
  cajon.setAttribute('aria-modal', 'true');
  cajon.setAttribute('aria-labelledby', 'cesta-t');
  cajon.setAttribute('data-lenis-prevent', '');
  cajon.innerHTML = `
    <div class="cajon-cab"><h2 id="cesta-t">${T.tuCesta}</h2><button class="cajon-cerrar" type="button" aria-label="${T.cerrarCesta}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p class="cajon-mensaje" role="status" data-mensaje hidden></p>
    <div class="cajon-envio" data-envio hidden></div>
    <div class="cajon-cuerpo" data-cuerpo></div>
    <div class="cajon-pie">
      <div class="subtotal"><span>${T.subtotal}</span><span class="mono" data-subtotal></span></div>
      <p class="cajon-nota">${T.impuestos} ${T.entregaAlTramitar}</p>
      <ul class="cajon-entrega" data-entrega></ul>
      <button class="btn btn-bloque" type="button" data-tramitar>${T.tramitar}</button>
    </div>`;
  document.body.append(velo, cajon);
  cuerpo = cajon.querySelector('[data-cuerpo]');
  subtotalEl = cajon.querySelector('[data-subtotal]');
  envioEl = cajon.querySelector('[data-envio]');
  mensaje = cajon.querySelector('[data-mensaje]');
  btnTramitar = cajon.querySelector('[data-tramitar]');

  cajon.querySelector('.cajon-cerrar').addEventListener('click', cerrarCesta);
  velo.addEventListener('click', cerrarCesta);
  btnTramitar.addEventListener('click', () => avisar(T.prototipoPago));
  cuerpo.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-quitar]');
    if (!b) return;
    quitar(b.dataset.quitar);
    cajon.querySelector('.cajon-cerrar').focus();
  });
  cajon.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarCesta();
    if (e.key !== 'Tab') return;
    const f = [...cajon.querySelectorAll('a[href],button:not([disabled])')].filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
  pintarEntrega();
}

function avisar(txt) {
  mensaje.hidden = !txt;
  mensaje.textContent = txt || '';
}

/** Cómo se entrega: lo que tiene encendido la tienda (features). */
function pintarEntrega() {
  const t = datos.tienda;
  const f = t.features || {};
  const dir = t.direccion ? [t.direccion.calle, t.direccion.localidad].filter(Boolean).join(', ') : '';
  const items = [];
  if (f.pickup !== false) items.push([T.recogida, dir]);
  // `_entrega`: resumen solo del prototipo; en la plataforma sale de las zonas de reparto (011) y de las tarifas (004)
  const e = t._entrega || {};
  if (f.local_delivery) items.push([T.repartoLocal, e.reparto || '']);
  items.push([T.envio, e.envio || '']);
  cajon.querySelector('[data-entrega]').innerHTML = items
    .map(([k, v]) => `<li><b>${esc(k)}</b>${v ? ` <span>${esc(v)}</span>` : ''}</li>`)
    .join('');
}

function pintar() {
  pintarBotones();
  if (!cuerpo) return;
  const ls = lineas();
  let subtotal = 0;
  const filas = ls.map((l) => {
    const p = datos.prodPorSlug.get(l.slug);
    if (!p) return '';
    const vendido = agotado(p) || aConsultar(p);
    if (!vendido) subtotal += p.precio_cents;
    const f = foto(p, 0);
    const img = f
      ? `<img src="${esc(f.srcset.split(' ')[0])}" alt="" width="${f.ancho}" height="${f.alto}" loading="lazy" decoding="async"${f.recorte ? '' : ' class="enmarcada"'}>`
      : huecoHTML();
    return `<div class="linea">
      <a class="linea-foto" href="${productoURL(p)}" tabindex="-1" aria-hidden="true">${img}</a>
      <div class="linea-txt">
        <h3><a href="${productoURL(p)}">${esc(p.titulo)}</a></h3>
        <p class="linea-uno mono">${T.unaUnidad}</p>
        ${vendido ? `<p class="aviso-stock">${aConsultar(p) ? `${esc(p.titulo)} ya no tiene precio en la web: pregúntanos por él.` : 'Se ha vendido: quítalo de la cesta.'}</p>` : ''}
        <button type="button" class="linea-quitar" data-quitar="${esc(p.slug)}">${T.quitar}<span class="sr-only"> ${esc(p.titulo)}</span></button>
      </div>
      <span class="linea-precio mono">${vendido ? '' : esc(euros(p.precio_cents))}</span>
    </div>`;
  });
  cuerpo.innerHTML = ls.length
    ? filas.join('')
    : `<div class="cajon-vacio">${huecoHTML()}<p>${T.cestaVacia}</p><a class="enlace-flecha" href="${enlace('/novedades')}">${T.verNovedades} <span aria-hidden="true">→</span></a></div>`;
  subtotalEl.textContent = euros(subtotal);
  btnTramitar.disabled = subtotal === 0;

  const u = umbral();
  envioEl.hidden = u == null;
  if (u != null) {
    const falta = u - subtotal;
    const txt = subtotal === 0 ? T.envioGratisDesde(`<b>${euros(u)}</b>`) : falta > 0 ? T.envioFalta(`<b>${euros(falta)}</b>`) : `<b>${T.envioConseguido}</b>`;
    const p = Math.min(1, subtotal / u);
    envioEl.innerHTML = `<p>${txt}</p><div class="envio-balda${p >= 1 ? ' llena' : ''}" style="--p:${p.toFixed(3)}" aria-hidden="true"><i class="envio-vidrio"></i><i class="envio-etq"></i></div>`;
  }
}

export function abrirCesta(aviso = '') {
  avisar(aviso);
  if (!cajon.hidden) return;
  ultimoFoco = document.activeElement;
  velo.hidden = false;
  cajon.hidden = false;
  document.documentElement.classList.add('cajon-abierto');
  document.dispatchEvent(new Event('cesta:abierta'));
  requestAnimationFrame(() => requestAnimationFrame(() => { velo.classList.add('abierto'); cajon.classList.add('abierto'); }));
  cajon.querySelector('.cajon-cerrar').focus({ preventScroll: true });
}
export function cerrarCesta() {
  if (cajon.hidden) return;
  velo.classList.remove('abierto');
  cajon.classList.remove('abierto');
  document.documentElement.classList.remove('cajon-abierto');
  document.dispatchEvent(new Event('cesta:cerrada'));
  setTimeout(() => { velo.hidden = true; cajon.hidden = true; }, 320);
  if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus({ preventScroll: true });
}

export function initCesta(d) {
  datos = d;
  montar();
  document.querySelectorAll('[data-abrir-cesta]').forEach((b) => b.addEventListener('click', () => abrirCesta()));
  addEventListener('storage', (e) => { if (e.key === CLAVE) { memoria = null; pintar(); } });
  pintar();
}
