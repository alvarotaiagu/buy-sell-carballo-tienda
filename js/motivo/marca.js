// Motivo «vitrina» · piezas de la marca que usa el motivo:
// - `logo.short` (el óvalo sin letras) como fondo de la etiqueta de precio: --logo-ovalo y su proporción --ovalo-ar.
// - La € de `logo.main` (`<g class="euro">`), clonada una vez como <symbol id="bs-euro"> para los precios.
// Así la € de los precios es la del logo, no una fuente (encargo §3.1).
const NS = 'http://www.w3.org/2000/svg';
let lista = null;

export function prepararMarca(tema) {
  const raiz = document.documentElement;
  const logo = (tema && tema.logo) || {};
  // absoluta: una url() relativa dentro de una variable se resuelve contra la hoja que la usa, no contra la página
  if (logo.short) raiz.style.setProperty('--logo-ovalo', `url("${new URL(logo.short, document.baseURI).href}")`);
  if (lista) return lista;
  const texto = (u) => (u ? fetch(u).then((r) => (r.ok ? r.text() : '')).catch(() => '') : Promise.resolve(''));
  lista = Promise.all([texto(logo.main), texto(logo.short)]).then(([main, corto]) => {
    const vb = /viewBox="([^"]+)"/.exec(corto);
    if (vb) {
      const [, , w, h] = vb[1].trim().split(/[\s,]+/).map(Number);
      if (w && h) raiz.style.setProperty('--ovalo-ar', `${w} / ${h}`);
    }
    if (main) clonarEuro(main);
  });
  return lista;
}

function clonarEuro(svgTexto) {
  const doc = new DOMParser().parseFromString(svgTexto, 'image/svg+xml');
  const fuente = doc.documentElement;
  if (!fuente || fuente.nodeName !== 'svg' || !doc.querySelector('.euro')) return;
  // se monta el logo entero (invisible) para medir la € con las transformaciones de sus grupos
  const vivo = document.importNode(fuente, true);
  vivo.removeAttribute('id');
  vivo.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  vivo.setAttribute('aria-hidden', 'true');
  vivo.style.cssText = 'position:absolute;left:-10000px;top:0;width:400px;height:auto;visibility:hidden;pointer-events:none';
  document.body.append(vivo);
  try {
    const euro = vivo.querySelector('.euro');
    const m = vivo.getScreenCTM().inverse().multiply(euro.getScreenCTM());
    const b = euro.getBBox();
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    const caja = document.createElementNS(NS, 'svg');
    caja.setAttribute('aria-hidden', 'true');
    caja.setAttribute('focusable', 'false');
    caja.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    const simbolo = document.createElementNS(NS, 'symbol');
    simbolo.id = 'bs-euro';
    simbolo.setAttribute('viewBox', [x0, y0, w, h].map((n) => n.toFixed(2)).join(' '));
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((n) => +n.toFixed(4)).join(' ')})`);
    g.setAttribute('fill', 'currentColor');
    for (const hijo of [...euro.childNodes]) {
      const c = hijo.cloneNode(true);
      if (c.removeAttribute) { c.removeAttribute('fill'); c.removeAttribute('class'); }
      g.append(c);
    }
    simbolo.append(g);
    caja.append(simbolo);
    document.body.prepend(caja);
    document.documentElement.style.setProperty('--euro-ar', `${w.toFixed(2)} / ${h.toFixed(2)}`);
    document.documentElement.classList.add('con-euro');
  } catch (e) {
    console.warn('No se ha podido clonar la € del logo', e);
  } finally {
    vivo.remove();
  }
}
