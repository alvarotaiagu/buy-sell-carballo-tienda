// ─────────────────────────────────────────────────────────────
// Datos de la tienda. Todo texto, producto, precio y ajuste sale de datos.json (la forma
// que lee scripts/lib/prototipo.ts de la plataforma) y de tema.json (el stores.theme).
// En la plataforma, esto es la base de datos; aquí, dos fetch.
// ─────────────────────────────────────────────────────────────

let promesa = null;

const leerJSON = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  });

export function cargarDatos() {
  // mismas peticiones que los <link rel=preload as=fetch> del <head> (no cambiar las opciones)
  if (!promesa) promesa = Promise.all([leerJSON('datos.json'), leerJSON('tema.json')]).then(([d, t]) => preparar(d, t));
  return promesa;
}

function preparar(d, tema) {
  const tienda = d.tienda || {};
  const ocultarVendido = tienda.hide_sold_out !== false;
  const catPorId = new Map(d.categorias.map((c) => [c.id, c]));
  const catPorSlug = new Map(d.categorias.map((c) => [c.slug, c]));
  const prodPorSlug = new Map(d.productos.map((p) => [p.slug, p]));
  // «lo vendido sale solo del catálogo» (hide_sold_out): los listados solo ven lo disponible
  const visibles = d.productos.filter((p) => !ocultarVendido || !agotado(p));
  const material = new Map(((tema.motif && tema.motif.zonas) || []).map((z) => [z.categoria, z.material]));
  return {
    ...d,
    tema,
    contenido: d.contenido || {},
    catPorId,
    catPorSlug,
    prodPorSlug,
    visibles,
    destacados: () => visibles.filter((p) => p.destacado),
    nuevos: (n) => [...visibles].sort(porCreado).slice(0, n),
    rebajados: () => visibles.filter(enRebaja),
    deCategoria: (cat) => visibles.filter((p) => p.categoria_id === cat.id),
    /** Material de la zona de una categoría (motivo «vitrina»); sin material, «balda». */
    materialDe: (cat) => material.get(cat.slug) || 'balda',
    titulo: (id) => (d.contenido && d.contenido.headings && d.contenido.headings[id]) || { kicker: '', title: '' },
  };
}

// ── importes (céntimos, IVA incluido) ──
const fmt2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: true });
/** 1990 → «19,90»; 39900 → «399»; 160000 → «1.600» (sin el símbolo: la € la pone la etiqueta) */
export function importe(cents) {
  // Intl no agrupa los miles de 4 cifras en español («1600»): se agrupa a mano
  const n = cents / 100;
  const s = cents % 100 === 0 ? fmt0.format(n) : fmt2.format(n);
  return s.replace(/^(\d)(\d{3})(?=,|$)/, '$1.$2');
}
/** 1990 → «19,90 €» (para textos y lectores de pantalla) */
export const euros = (cents) => importe(cents) + ' €';
export const aConsultar = (p) => p.precio_cents == null;
export const enRebaja = (p) => p.precio_anterior_cents != null && p.precio_cents != null && p.precio_anterior_cents > p.precio_cents;
export const descuento = (p) => (enRebaja(p) ? Math.round((1 - p.precio_cents / p.precio_anterior_cents) * 100) : 0);
export const stockTotal = (p) => p.variantes.reduce((s, v) => s + Math.max(0, v.stock), 0);
export const agotado = (p) => stockTotal(p) === 0;
// a igual fecha manda la posición en el catálogo (como `position` en la plataforma): sort es estable
export const porCreado = (a, b) => (b.creado || '').localeCompare(a.creado || '');

// ── fotos ──
/**
 * Foto n de un producto: { src, srcset, ancho, alto, recorte } o null.
 * Convenio del prototipo: fotos/<slug>-<n>.webp con -400 y -800 al lado; `_medidas` trae el
 * tamaño del grande y `_recorte` dice si la primera es un recorte sin fondo (§3.3 del encargo).
 * En la plataforma, el srcset lo hace el servicio de imágenes.
 */
export function foto(p, i = 0) {
  const src = p.fotos && p.fotos[i];
  if (!src) return null;
  const [ancho, alto] = (p._medidas && p._medidas[i]) || [1000, 1000];
  const base = src.replace(/\.(webp|png|jpe?g)$/i, '');
  const ext = src.slice(base.length);
  const srcset = [400, 800].filter((w) => w < ancho).map((w) => `${base}-${w}${ext} ${w}w`).concat(`${src} ${ancho}w`).join(', ');
  return { src, srcset, ancho, alto, recorte: i === 0 && !!p._recorte };
}

// ── enlaces: rutas de la plataforma → páginas del prototipo ──
const PAGINAS_SISTEMA = new Set(['novedades', 'rebajas', 'buscar']);
export function enlace(ruta) {
  if (!ruta) return 'index.html';
  if (/^(https?:|mailto:|tel:|#)/.test(ruta)) return ruta;
  const [camino, ancla = ''] = ruta.split('#');
  const a = ancla ? '#' + ancla : '';
  if (camino === '/' || camino === '') return 'index.html' + a;
  let m;
  if ((m = /^\/c\/([\w-]+)/.exec(camino))) return `categoria.html?c=${m[1]}${a}`;
  if ((m = /^\/p\/([\w-]+)/.exec(camino))) return `producto.html?p=${m[1]}${a}`;
  if ((m = /^\/([\w-]+)$/.exec(camino))) return PAGINAS_SISTEMA.has(m[1]) ? `categoria.html?c=${m[1]}${a}` : `pagina.html?s=${m[1]}${a}`;
  return ruta;
}
export const productoURL = (p) => `producto.html?p=${encodeURIComponent(p.slug)}`;
export const categoriaURL = (c) => `categoria.html?c=${encodeURIComponent(c.slug)}`;

// ── contacto ──
/** «Rúa Estrela, 18 bajo · 15100 Carballo (A Coruña)», como protoAddress de la plataforma. */
export function protoDireccion(d) {
  if (!d) return '';
  const pueblo = [d.cp, d.localidad].filter(Boolean).join(' ');
  return [d.calle, pueblo && d.provincia ? `${pueblo} (${d.provincia})` : pueblo].filter(Boolean).join(' · ');
}
const soloCifras = (t) => String(t || '').replace(/\D/g, '');
let tiendaActual = null;
export const fijarTienda = (t) => (tiendaActual = t);
export function whatsappURL(p, tienda = tiendaActual) {
  const n = soloCifras(tienda && tienda.whatsapp);
  if (!n) return null;
  const num = n.length === 9 ? '34' + n : n;
  const texto = p ? `Hola, me interesa «${p.titulo}» de la web. ¿Sigue disponible?` : 'Hola, os escribo desde la web.';
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
export const telURL = (t) => 'tel:+34' + soloCifras(t).slice(-9);

// ── texto ──
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Título con *cursiva* (D-026), ya escapado. */
export const tituloHTML = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

/** Texto con formato mínimo (008 §5): párrafos, **negrita** y [enlace](url), ya escapado. */
export function textoRicoHTML(s, { primera = '' } = {}) {
  const parrafos = String(s || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  return parrafos
    .map((p, i) => {
      let h = esc(p)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
          const url = enlace(href.replace(/&amp;/g, '&'));
          const ext = /^https?:/.test(url);
          return `<a href="${esc(url)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`;
        })
        .replace(/\n/g, '<br>');
      return `<p${i === 0 && primera ? ` class="${primera}"` : ''}>${h}</p>`;
    })
    .join('');
}

/** Primera línea de la descripción (el estado y lo que incluye, si el anuncio lo dice). */
export const primeraLinea = (p) => String(p.descripcion || '').split('\n')[0].trim();

export const param = (k) => new URLSearchParams(location.search).get(k);
