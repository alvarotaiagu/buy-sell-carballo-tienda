/* Motivo «vitrina» · hero (variante `vitrina`).
   Pinta el hero entero desde los datos: titular, bajada, dos botones y la vitrina con baldas de
   vidrio y los artículos destacados posados. Tres piezas:
     1. Vitrina: baldas, sombra de contacto, reflejo, una sola luz (de arriba) y paralaje con el ratón.
     2. Encendido: la luz entra de izquierda a derecha y cada cosa se asienta. Es una capa por encima:
        ni el titular ni los artículos se ocultan nunca (son los candidatos a LCP).
     3. Abrir la vitrina: la puerta se desliza, lo demás se desenfoca y sale una hoja (API Popover).
   Sin texto de negocio: todo sale de `datos`. Los literales de abajo son los de la interfaz común. */
import { esc, foto, enlace, productoURL, aConsultar, whatsappURL } from '../datos.js';
import { etiquetaHTML, huecoHTML } from './etiqueta.js';
import { anadirACesta } from '../cesta.js';

const TXT = {
  vitrina: 'Artículos destacados',
  cerrar: 'Cerrar',
  anadir: 'Añadir a la cesta',
  whatsapp: 'Preguntar por WhatsApp',
  ver: 'Ver el artículo',
};

const MAX_ARTICULOS = 9;
const SIZES_BALDA = '(max-width: 760px) 30vw, 17vw';
const SIZES_HOJA = '(max-width: 760px) 70vw, 320px';
const SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
const ICO_FLECHA = `<svg ${SVG}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const ICO_CERRAR = `<svg ${SVG}><path d="M6 6l12 12M18 6 6 18"/></svg>`;
// brillos del cristal: posición, ancho y fuerza de cada banda (en % del ancho de la puerta)
const BRILLOS = [[7, 10, .9], [47, 3.4, .75], [54, 15, .38], [88, 5, .7]];

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const num = (v) => String(+(+v).toFixed(4));
const trocear = (lista, n) => {
  const filas = [];
  for (let i = 0; i < lista.length; i += n) filas.push(lista.slice(i, i + n));
  return filas;
};
const CON_MASCARA = typeof CSS !== 'undefined' && !!CSS.supports
  && (CSS.supports('mask-image', 'none') || CSS.supports('-webkit-mask-image', 'none'));

/* ---------- De producto a pieza de la vitrina ---------- */

// tipo: 'recorte' (sin fondo, posado), 'marco' (foto normal: cuadro apoyado) o 'hueco' (sin foto)
function preparar(p, i) {
  const f = foto(p, 0);
  let tipo = 'hueco', ar = 1.6, k = .5;
  if (f) {
    const bruto = f.ancho > 0 && f.alto > 0 ? f.ancho / f.alto : 1;
    if (f.recorte) { tipo = 'recorte'; ar = limitar(bruto, .16, 2.4); k = .8; }
    else { tipo = 'marco'; ar = limitar(bruto, .72, 1.4); k = .72; }
  }
  return { p, f, tipo, ar, k, i, parte: 1 };
}

// Reparto en tramos y baldas. Lo que va de pie (recortes muy altos) se apoya en el suelo del
// tramo de la derecha, como en la tienda; el resto, de dos en dos sobre las baldas de vidrio.
// El mismo reparto vale para escritorio y móvil: la hoja de estilos cambia las medidas.
function repartir(arts) {
  if (!arts.length) return { forma: 'uno', tramos: [{ tipo: 'baldas', filas: [[], []] }] };
  // de pie van, como mucho, los dos recortes más espigados (un trombón, una tabla), no un móvil
  const espigados = arts.filter((a) => a.tipo === 'recorte' && a.ar < .42).sort((a, b) => a.ar - b.ar).slice(0, 2);
  const altos = arts.filter((a) => espigados.includes(a)), resto = arts.filter((a) => !espigados.includes(a));
  if (altos.length && resto.length >= 2) {
    altos.forEach((a) => { a.k = limitar(.5 + .1 / a.ar, .62, .86); });
    return { forma: 'pie', tramos: [
      { tipo: 'baldas', filas: trocear(resto, resto.length > 6 ? 3 : 2) },
      { tipo: 'pie', filas: [altos] },
    ] };
  }
  if (arts.length <= 3) return { forma: 'uno', tramos: [{ tipo: 'baldas', filas: [arts] }] };
  const nB = Math.max(1, Math.round(arts.length / 3)), nA = arts.length - nB;
  return { forma: 'dos', tramos: [
    { tipo: 'baldas', filas: trocear(arts.slice(0, nA), nA > 6 ? 3 : 2) },
    { tipo: 'baldas', filas: trocear(arts.slice(nA), 1), cierra: true },
  ] };
}

// Cuánto ancho de la balda le toca a cada pieza: a medias entre «a partes iguales» y «según lo
// ancha que es», para que una motosierra no quede enana al lado de un móvil. Suma 1: nunca desborda.
function medir(fila) {
  const pesos = fila.map((a) => a.k * a.ar);
  const suma = pesos.reduce((s, v) => s + v, 0) || 1;
  fila.forEach((a, j) => { a.parte = (1 / fila.length + pesos[j] / suma) / 2; });
}

/* ---------- HTML ---------- */

function imgHTML(f, sizes, prioridad) {
  const medidas = f.ancho > 0 && f.alto > 0 ? ` width="${Math.round(f.ancho)}" height="${Math.round(f.alto)}"` : '';
  const juego = f.srcset ? ` srcset="${esc(f.srcset)}" sizes="${sizes}"` : '';
  const carga = prioridad ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
  return `<img src="${esc(f.src)}"${juego}${medidas} alt="" draggable="false"${carga}>`;
}

// La pieza apoyada: sombra de contacto, reflejo en el vidrio y la foto con su velo de luz.
function figuraHTML(a, sizes, prioridad) {
  if (a.tipo === 'hueco') {
    return `<i class="vt-som vt-som--tenue"></i><span class="vt-prod"><span class="vt-fig vt-fig--hueco">${huecoHTML()}</span></span>`;
  }
  if (a.tipo === 'marco') {
    return '<i class="vt-som"></i>'
      + `<span class="vt-ref" aria-hidden="true"><span class="vt-fig"><span class="vt-cuadro">${imgHTML(a.f, sizes, false)}</span></span></span>`
      + `<span class="vt-prod"><span class="vt-fig"><span class="vt-cuadro">${imgHTML(a.f, sizes, prioridad)}<i class="vt-luz"></i></span></span></span>`;
  }
  return '<i class="vt-som"></i>'
    + `<span class="vt-ref" aria-hidden="true"><span class="vt-fig">${imgHTML(a.f, sizes, false)}</span></span>`
    + `<span class="vt-prod"><span class="vt-fig vt-fig--recorte">${imgHTML(a.f, sizes, prioridad)}<i class="vt-luz"></i></span></span>`;
}

function articuloHTML(a, prioridad) {
  const estilo = [
    `--ar:${num(a.ar)}`, `--k:${num(a.k)}`, `--parte:${num(a.parte)}`,
    `--kp:${num(.14 + ((a.i * 37) % 5) * .06)}`,   // cuánto se queda atrás con el paralaje
    `--tx:${50 + ((a.i * 29) % 4) * 6}%`,           // dónde cae la etiqueta, al pie
    `--tr:${a.i % 2 ? 2.5 : -3}deg`,
  ].join(';');
  // Nombre accesible: el título (oculto a la vista) y el precio, que ya viene dentro de la etiqueta.
  return `<button type="button" class="vt-articulo vt-articulo--${a.tipo}" data-i="${a.i}" style="${estilo}"`
    + ' aria-haspopup="dialog" popovertarget="vt-hoja" popovertargetaction="show">'
    + `<span class="sr-only">${esc(a.p.titulo)}. </span>`
    + figuraHTML(a, SIZES_BALDA, prioridad)
    + `<span class="vt-eti">${etiquetaHTML(a.p, { tam: 'p' })}</span>`
    + `<span class="vt-nombre" aria-hidden="true">${esc(a.p.titulo)}</span>`
    + '</button>';
}

function tramosHTML(tramos) {
  let primera = true;
  return tramos.map((t) => {
    const baldas = t.filas.map((fila) => {
      medir(fila);
      const prioridad = primera;   // solo la primera balda carga con prioridad; el resto, perezosa
      primera = false;
      const clase = t.tipo === 'pie' ? 'vt-balda vt-balda--suelo' : 'vt-balda';
      return `<div class="${clase}" style="--n:${Math.max(1, fila.length)}">${fila.map((a) => articuloHTML(a, prioridad)).join('')}</div>`;
    }).join('');
    return `<div class="vt-tramo vt-tramo--${t.tipo}${t.cierra ? ' vt-tramo--cierra' : ''}" style="--filas:${t.filas.length}">${baldas}</div>`;
  }).join('');
}

/* ---------- El módulo ---------- */

export function init(sec, ctx = {}) {
  if (!sec) return { destruir() {} };
  const datos = ctx.datos || {};
  const gsap = typeof window !== 'undefined' ? window.gsap : null;
  const motion = ctx.motion === true && !!gsap;

  const hero = (datos.contenido && datos.contenido.hero) || {};
  const vender = datos.tema && datos.tema.motif && datos.tema.motif.vender;
  const productos = (typeof datos.destacados === 'function' ? datos.destacados() : []) || [];
  const arts = productos.slice(0, MAX_ARTICULOS).map(preparar);
  const reparto = repartir(arts);

  const botonesCta = [
    hero.cta_label ? `<a class="btn" href="${esc(enlace('/novedades'))}">${esc(hero.cta_label)}${ICO_FLECHA}</a>` : '',
    vender && vender.label ? `<a class="btn btn-motivo" href="${esc(enlace(vender.href || '/'))}">${esc(vender.label)}</a>` : '',
  ].join('');

  sec.innerHTML = '<div class="vt-comp">'
    + '<div class="vt-txt">'
    + (hero.kicker ? `<p class="vt-kicker">${esc(hero.kicker)}</p>` : '')
    + `<h1 class="vt-tit" id="hero-t">${esc(hero.title || '')}</h1>`
    + (hero.subtitle ? `<p class="vt-sub">${esc(hero.subtitle)}</p>` : '')
    + (botonesCta ? `<div class="vt-cta">${botonesCta}</div>` : '')
    + '</div>'
    + `<div class="vt-vitrina" role="group" aria-label="${TXT.vitrina}" data-forma="${reparto.forma}">`
    + '<i class="vt-pared"></i><i class="vt-led"></i><i class="vt-suelo"></i>'
    + tramosHTML(reparto.tramos)
    + '<i class="vt-riel"></i><i class="vt-zocalo"></i>'
    + '<div class="vt-cristal" aria-hidden="true"><div class="vt-puerta"><div class="vt-brillos">'
    + BRILLOS.map(([l, an, o]) => `<i style="--l:${l};--an:${an};--o:${o}"></i>`).join('')
    + '</div><b class="vt-tirador"></b></div></div>'
    + '</div>'
    + '</div>'
    + '<div class="vt-penumbra" aria-hidden="true"><i></i></div>'
    + '<div class="vt-hoja" id="vt-hoja" popover role="dialog" aria-labelledby="vt-hoja-t">'
    + `<button type="button" class="vt-cerrar">${ICO_CERRAR}<span>${TXT.cerrar}</span></button>`
    + '<div class="vt-hoja-cuerpo"></div>'
    + '</div>';

  const q = (s) => sec.querySelector(s);
  const vit = q('.vt-vitrina'), hoja = q('.vt-hoja'), cuerpo = q('.vt-hoja-cuerpo'), btnCerrar = q('.vt-cerrar');
  const botones = [...vit.querySelectorAll('.vt-articulo')];
  const ctrl = new AbortController(), signal = ctrl.signal;
  const conPopover = typeof hoja.showPopover === 'function';
  let muerto = false, elegido = null, ultimo = null, tl = null, espera = 0, raf = 0, visible = true, io = null;

  /* --- Una sola luz: el velo (claro arriba, sombra fría abajo) se recorta con la silueta del
         propio recorte. La máscara es la misma imagen que ya se ha descargado (currentSrc).
         Si la foto viene de otro dominio sin CORS, la máscara no carga y el velo no se ve. --- */
  function iluminar(raiz) {
    if (!CON_MASCARA) return;
    raiz.querySelectorAll('.vt-fig--recorte > img').forEach((img) => {
      const velo = img.nextElementSibling;
      if (!velo) return;
      const pon = () => {
        const u = img.currentSrc || img.src;
        if (!u) return;
        const v = 'url("' + u.replace(/["\\]/g, (c) => '%' + c.charCodeAt(0).toString(16)) + '")';
        velo.style.setProperty('-webkit-mask-image', v);
        velo.style.setProperty('mask-image', v);
      };
      if (img.complete && img.naturalWidth) pon();
      else img.addEventListener('load', pon, { once: true, signal });
    });
  }
  iluminar(vit);

  /* --- Abrir la vitrina: la hoja --- */
  function hojaHTML(a) {
    const p = a.p;
    const cat = datos.catPorId && datos.catPorId.get ? datos.catPorId.get(p.categoria_id) : null;
    const linea = String(p.descripcion || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean) || '';
    const accion = aConsultar(p)
      ? `<a class="btn" href="${esc(whatsappURL(p))}" target="_blank" rel="noopener noreferrer">${TXT.whatsapp}</a>`
      : `<button type="button" class="btn vt-anadir">${TXT.anadir}</button>`;
    return '<div class="vt-hoja-foto vt-balda" style="--n:1">'
      + `<div class="vt-pieza vt-pieza--${a.tipo}" style="--ar:${num(a.ar)};--k:.88;--parte:.9">${figuraHTML(a, SIZES_HOJA, false)}</div>`
      + '</div>'
      + '<div class="vt-hoja-txt">'
      + (cat && cat.nombre ? `<p class="vt-hoja-cat">${esc(cat.nombre)}</p>` : '')
      + `<h2 class="vt-hoja-nom" id="vt-hoja-t">${esc(p.titulo)}</h2>`
      + `<div class="vt-hoja-precio">${etiquetaHTML(p, { tam: 'g' })}</div>`
      + (linea ? `<p class="vt-hoja-desc">${esc(linea)}</p>` : '')
      + `<div class="vt-hoja-acc">${accion}<a class="btn btn-linea" href="${esc(productoURL(p))}">${TXT.ver}</a></div>`
      + '</div>';
  }

  const estaAbierta = () => (conPopover ? hoja.matches(':popover-open') : hoja.classList.contains('vt-hoja--abierta'));

  function elegir(b) {
    const a = arts[+b.dataset.i];
    if (!a) return false;
    if (elegido && elegido !== b) elegido.classList.remove('vt-elegido');
    elegido = b;
    b.classList.add('vt-elegido');
    hoja.classList.remove('vt-hoja--ya');
    cuerpo.innerHTML = hojaHTML(a);
    iluminar(cuerpo);
    hoja.scrollTop = 0;
    sec.classList.add('vt-abierta');   // la puerta se desliza y los demás se desenfocan (CSS)
    return true;
  }
  function abrir(b) {
    if (!elegir(b)) return;
    if (conPopover) { try { if (!estaAbierta()) hoja.showPopover(); } catch (_) { /* ya abierta */ } }
    else hoja.classList.add('vt-hoja--abierta');
    btnCerrar.focus({ preventScroll: true });
  }
  // la vitrina vuelve a su sitio: puerta cerrada y todo nítido
  function soltar() {
    sec.classList.remove('vt-abierta');
    if (elegido) elegido.classList.remove('vt-elegido');
    ultimo = elegido;
    elegido = null;
  }
  // el foco vuelve al artículo, salvo que ya se haya ido a otro sitio (otro botón, la cesta)
  function devolverFoco() {
    const act = document.activeElement;
    if (ultimo && ultimo.isConnected && (!act || act === document.body || hoja.contains(act))) {
      ultimo.focus({ preventScroll: true });
    }
  }
  function cerrar() {
    if (!estaAbierta()) return;
    if (conPopover) { try { hoja.hidePopover(); } catch (_) { /* ya cerrada */ } }
    else { hoja.classList.remove('vt-hoja--abierta'); soltar(); devolverFoco(); }
  }
  function anadir() {
    const b = elegido, a = b ? arts[+b.dataset.i] : null;
    if (!a) return;
    // La hoja vive en la capa superior del navegador y taparía la cesta y el vuelo de la etiqueta:
    // se cierra al momento y la etiqueta despega del artículo, en su balda.
    hoja.classList.add('vt-hoja--ya');
    cerrar();
    const origen = b.querySelector('.etiqueta') || b;
    try {
      const r = anadirACesta(a.p.slug, origen);
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (_) { /* la cesta avisa por su cuenta */ }
  }

  vit.addEventListener('click', (e) => {
    const b = e.target.closest('.vt-articulo');
    if (!b || !vit.contains(b)) return;
    e.preventDefault();   // la hoja la abre este módulo; `popovertarget` solo evita que el clic la cierre antes
    if (estaAbierta() && b === elegido) cerrar();
    else abrir(b);
  }, { signal });

  hoja.addEventListener('click', (e) => {
    if (e.target.closest('.vt-cerrar')) cerrar();
    else if (e.target.closest('.vt-anadir')) anadir();
  }, { signal });

  // Esc y el clic fuera los resuelve la API Popover; aquí solo se recoge el estado y el foco.
  hoja.addEventListener('beforetoggle', (e) => { if (e.newState === 'closed') soltar(); }, { signal });
  hoja.addEventListener('toggle', (e) => { if (e.newState === 'closed') devolverFoco(); }, { signal });

  // Tab da la vuelta dentro de la hoja mientras está abierta
  hoja.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...hoja.querySelectorAll('button, a[href]')];
    if (!f.length) return;
    const primero = f[0], final = f[f.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); final.focus(); }
    else if (!e.shiftKey && document.activeElement === final) { e.preventDefault(); primero.focus(); }
  }, { signal });

  if (!conPopover) {
    // navegador sin API Popover: la misma hoja, abierta y cerrada a mano
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && estaAbierta()) cerrar(); }, { signal });
    document.addEventListener('pointerdown', (e) => {
      if (estaAbierta() && !hoja.contains(e.target) && !(e.target.closest && e.target.closest('.vt-articulo'))) cerrar();
    }, { signal });
  }

  /* --- Teclado: Tab pasa por todos los artículos; las flechas saltan al vecino (izquierda y
         derecha dentro de la balda, arriba y abajo entre baldas). Se calcula con la posición real,
         así vale igual para el escritorio y para el móvil. --- */
  function vecino(b, dx, dy) {
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2;
    let mejor = null, coste = Infinity;
    botones.forEach((o) => {
      if (o === b) return;
      const s = o.getBoundingClientRect();
      const ox = s.left + s.width / 2 - cx, oy = s.bottom - r.bottom;   // las piezas de una balda comparten base
      const avance = dx ? ox * dx : oy * dy;
      if (avance < 8) return;
      const desvio = Math.abs(dx ? oy : ox);
      const c = avance + desvio * (dx ? 4 : 1.5);
      if (c < coste) { coste = c; mejor = o; }
    });
    return mejor;
  }
  vit.addEventListener('keydown', (e) => {
    const b = e.target.closest ? e.target.closest('.vt-articulo') : null;
    if (!b || e.altKey || e.ctrlKey || e.metaKey) return;
    let destino = null;
    if (e.key === 'ArrowRight') destino = vecino(b, 1, 0);
    else if (e.key === 'ArrowLeft') destino = vecino(b, -1, 0);
    else if (e.key === 'ArrowDown') destino = vecino(b, 0, 1);
    else if (e.key === 'ArrowUp') destino = vecino(b, 0, -1);
    else if (e.key === 'Home') destino = botones[0];
    else if (e.key === 'End') destino = botones[botones.length - 1];
    else return;
    if (!destino || destino === b) return;   // en el borde, la flecha sigue moviendo la página
    e.preventDefault();
    destino.focus();
  }, { signal });

  /* --- Paralaje: el ratón mueve el punto de vista (--mx y --my, de -1 a 1). Solo con movimiento
         y puntero fino. No hay bucle: un fotograma por cada movimiento, y nada si el hero no se ve. --- */
  const ponMira = (x, y) => { sec.style.setProperty('--mx', x); sec.style.setProperty('--my', y); };
  if (motion && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let px = 0, py = 0;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if (!visible) { if (raf) { cancelAnimationFrame(raf); raf = 0; } ponMira(0, 0); }
      }, { threshold: 0 });
      io.observe(sec);
    }
    sec.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !visible) return;
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = sec.getBoundingClientRect();
        if (!r.width || !r.height) return;
        ponMira((((px - r.left) / r.width - .5) * 2).toFixed(3), (((py - r.top) / r.height - .5) * 2).toFixed(3));
      });
    }, { signal, passive: true });
    sec.addEventListener('pointerleave', () => ponMira(0, 0), { signal });
  }

  /* --- Encendido: la penumbra (una capa translúcida por encima) se retira de izquierda a derecha,
         los tubos parpadean y cada cosa se asienta cuando le llega la luz. Nada se oculta: los
         artículos solo bajan unos píxeles hasta su sitio. Al acabar se limpia todo y manda el CSS. --- */
  function encender() {
    const pen = q('.vt-penumbra'), velo = pen.firstElementChild, led = q('.vt-led'), bri = q('.vt-brillos');
    const prods = botones.map((b) => b.querySelector('.vt-prod'));
    const soms = botones.map((b) => b.querySelector('.vt-som'));
    const tocados = [pen, velo, led, bri, ...prods, ...soms].filter(Boolean);
    const fin = () => {
      gsap.set(tocados, { clearProps: 'all' });
      sec.classList.add('vt-encendida');
      tl = null;
    };
    try {
      const r0 = sec.getBoundingClientRect();
      const D = 1.5, T0 = .15;
      // en qué segundo le llega la luz plena a un punto (f: 0 a la izquierda, 1 a la derecha)
      const cuando = (f) => T0 + D * Math.acos(1 - 2 * limitar((f + .86) / 2, 0, 1)) / Math.PI;
      // la penumbra empieza donde empieza la vitrina (en el móvil, debajo del texto)
      gsap.set(pen, { top: Math.max(0, vit.getBoundingClientRect().top - r0.top), opacity: 1 });
      gsap.set(velo, { xPercent: -66.667 });
      gsap.set(led, { opacity: .12 });
      gsap.set(prods, { y: -12 });
      gsap.set(soms, { scale: .6, opacity: .4 });
      gsap.set(bri, { opacity: 0, xPercent: -28 });
      tl = gsap.timeline({ paused: true, onComplete: fin });
      tl.to(velo, { xPercent: 0, duration: D, ease: 'sine.inOut' }, T0);
      tl.to(led, { keyframes: [
        { opacity: .8, duration: .1 }, { opacity: .4, duration: .07 }, { opacity: 1, duration: .32 },
      ], ease: 'none' }, T0 + D * .34);
      botones.forEach((b, i) => {
        const r = b.getBoundingClientRect();
        const t = Math.max(0, cuando((r.left + r.width / 2 - r0.left) / (r0.width || 1)) - .3);
        tl.to(prods[i], { keyframes: [
          { y: 0, duration: .32, ease: 'power2.in' },
          { y: -3, duration: .12, ease: 'power1.out' },
          { y: 0, duration: .14, ease: 'power1.in' },
        ] }, t);
        tl.to(soms[i], { scale: 1, opacity: 1, duration: .4, ease: 'power2.out' }, t + .14);
      });
      // al final, un brillo cruza el cristal
      tl.to(bri, { opacity: 1, xPercent: 0, duration: 1.1, ease: 'expo.out' }, T0 + D * .62);
      // espera a las fotos de la primera balda, sin pasarse: como mucho 0,7 s a media luz
      const primeras = [...vit.querySelectorAll('img[fetchpriority="high"]')].filter((im) => !im.complete);
      const arranca = () => { clearTimeout(espera); espera = 0; if (!muerto && tl) tl.play(); };
      if (!primeras.length) arranca();
      else {
        let faltan = primeras.length;
        const una = () => { faltan -= 1; if (faltan <= 0) arranca(); };
        primeras.forEach((im) => {
          im.addEventListener('load', una, { once: true, signal });
          im.addEventListener('error', una, { once: true, signal });
        });
        espera = setTimeout(arranca, 700);
      }
    } catch (_) {
      // si algo falla, la vitrina se queda encendida y quieta
      if (tl) { tl.kill(); tl = null; }
      fin();
    }
  }
  if (motion) encender();
  else sec.classList.add('vt-encendida');

  return {
    destruir() {
      if (muerto) return;
      muerto = true;
      ctrl.abort();
      clearTimeout(espera);
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      if (tl) { tl.kill(); tl = null; }
      try { if (conPopover && hoja.matches(':popover-open')) hoja.hidePopover(); } catch (_) { /* nada que cerrar */ }
      sec.classList.remove('vt-abierta', 'vt-encendida');
      sec.style.removeProperty('--mx');
      sec.style.removeProperty('--my');
      sec.replaceChildren();
    },
  };
}
