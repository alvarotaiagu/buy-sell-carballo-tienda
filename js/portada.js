// Portada: la monta la lista `home` de tema.json, en su orden (como la plataforma).
// Cada bloque tiene su módulo; las variantes del motivo «vitrina» viven en js/motivo/.
// Movimiento completo: GSAP + ScrollTrigger + Lenis (solo en esta página y en la cabecera de categoría).
import { cargarDatos } from './datos.js';
import { initChrome } from './chrome.js';
import { banderas, iniciarLenis, esperarGSAP } from './movimiento.js';
import { T } from './textos.js';

const MODULOS = {
  'hero:vitrina': () => import('./motivo/vitrina.js'),
  'categories:zonas': () => import('./motivo/zonas.js'),
  'products:peana': () => import('./motivo/peana.js'),
  banner: () => import('./bloques/banner.js'),
  about: () => import('./bloques/about.js'),
  visit: () => import('./bloques/visit.js'),
};

async function arrancar() {
  const main = document.querySelector('main');
  let datos;
  try {
    [datos] = await Promise.all([cargarDatos(), esperarGSAP()]);
  } catch (err) {
    console.error(err);
    main.insertAdjacentHTML('afterbegin', `<p class="wrap aviso-error" role="alert">${T.errorDatos}</p>`);
    return;
  }
  const flags = banderas();
  initChrome(datos, { pagina: 'portada' });
  const t = datos.tienda;
  if (t.seo && t.seo.titulo) document.title = t.seo.titulo;

  const ctx = { datos, ...flags };
  const home = datos.tema.home || [];
  // las secciones se crean en el orden del tema; con la balda (canto del vidrio) entre ellas
  const secciones = home.map((b, k) => {
    const s = document.createElement('section');
    s.id = b.id;
    s.dataset.block = b.type;
    if (b.variant) s.dataset.variant = b.variant;
    if (b.type === 'hero') { s.className = 'hero hero-vitrina'; s.setAttribute('aria-labelledby', 'hero-t'); }
    main.append(s);
    if (k > 0 && b.type !== 'hero' && home[k - 1].type !== 'hero') s.insertAdjacentHTML('beforebegin', '<div class="balda-sep wrap" aria-hidden="true"><i class="balda"></i></div>');
    return s;
  });
  const clave = (b) => (b.variant && MODULOS[`${b.type}:${b.variant}`] ? `${b.type}:${b.variant}` : b.type);
  const mods = await Promise.all(home.map((b) => (MODULOS[clave(b)] ? MODULOS[clave(b)]().catch((e) => (console.error(e), null)) : null)));
  home.forEach((b, k) => {
    const s = secciones[k];
    if (!mods[k]) { s.remove(); return; }
    try { mods[k].init(s, { ...ctx, bloque: b }); } catch (e) { console.error(`bloque ${b.id}`, e); }
  });

  iniciarLenis(flags);
  if (flags.motion) aparecer();
}

/** Los títulos de sección suben un poco al llegar. Nunca se ocultan: solo se desplazan. */
function aparecer() {
  const { gsap, ScrollTrigger } = window;
  if (!ScrollTrigger) return;
  gsap.utils.toArray('main .b-cab, main .about-txt, main .banner-txt, main .visit-datos').forEach((el) => {
    gsap.from(el, { y: 26, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

arrancar();
