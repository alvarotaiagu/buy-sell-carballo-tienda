// Categoría (/c/[slug]), novedades, rebajas y búsqueda: el listado de la plataforma, tematizado.
// Lo único que se mueve es la cabecera: el material de la zona entra una vez (GSAP, sin Lenis).
import { cargarDatos, esc, param, porCreado, categoriaURL, enlace, tituloHTML } from './datos.js';
import { initChrome } from './chrome.js';
import { banderas, esperarGSAP } from './movimiento.js';
import { tarjetaHTML } from './tarjeta.js';
import { pintarMaterial } from './motivo/material.js';
import { muestraMaterial } from './motivo/materiales.js';
import { T } from './textos.js';

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
  initChrome(datos, { pagina: 'categoria' });

  const c = param('c') || 'novedades';
  const q = (param('q') || '').trim();
  const cat = datos.catPorSlug.get(c);
  let titulo, kicker = '', desc = '', lista, material;
  if (cat) {
    titulo = cat.nombre; kicker = T.departamentos; desc = cat.descripcion || '';
    lista = datos.deCategoria(cat); material = datos.materialDe(cat);
  } else if (c === 'rebajas') {
    titulo = T.rebajas; lista = datos.rebajados(); material = 'vidrio';
  } else if (c === 'buscar') {
    titulo = T.buscar; material = 'mostrador';
    const palabras = normal(q).split(/\s+/).filter(Boolean);
    lista = palabras.length
      ? datos.visibles.filter((p) => { const t = normal(`${p.titulo} ${p.descripcion} ${datos.catPorId.get(p.categoria_id)?.nombre}`); return palabras.every((w) => t.includes(w)); })
      : [];
  } else {
    titulo = T.novedades; lista = [...datos.visibles].sort(porCreado); material = 'vidrio';
  }
  document.title = `${titulo} · ${datos.tienda.nombre}`;

  const raiz = datos.categorias.filter((x) => !x.padre && x.visible !== false);
  main.innerHTML = `
    <header class="cat-cab">
      <div class="wrap cat-cab-in">
        <nav class="migas" aria-label="${T.estasEn}"><a href="index.html">${T.inicio}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(titulo)}</span></nav>
        ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}
        <h1>${tituloHTML(titulo)}</h1>
        ${desc ? `<p class="cat-desc">${esc(desc)}</p>` : ''}
        ${c === 'buscar' ? `<form class="buscador" role="search" action="categoria.html"><input type="hidden" name="c" value="buscar"><label class="sr-only" for="q">${T.buscarEn(esc(datos.tienda.nombre))}</label><input id="q" name="q" type="search" value="${esc(q)}" placeholder="${T.buscarPlaceholder}" autocomplete="off"><button class="btn" type="submit">${T.buscar}</button></form>` : ''}
      </div>
    </header>
    <div class="wrap">
      <ul class="chips" aria-label="${T.departamentos}">${raiz.map((z) => `<li><a href="${categoriaURL(z)}"${z.slug === c ? ' aria-current="page"' : ''}>${muestraMaterial(datos.materialDe(z))}${esc(z.nombre)}</a></li>`).join('')}</ul>
      <div class="listado-barra">
        <p class="listado-num mono" aria-live="polite">${c === 'buscar' && q ? esc(T.resultados(lista.length, q)) : T.articulos(lista.length)}</p>
        ${lista.length > 1 ? `<label class="orden"><span>${T.ordenar}</span><select data-orden>${Object.entries(T.orden).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>` : ''}
      </div>
      <ul class="rejilla" data-rejilla></ul>
      ${lista.length ? '' : `<div class="listado-vacio"><p>${c === 'buscar' && q ? T.sinResultados : c === 'buscar' ? '' : T.vacio}</p>${c === 'buscar' ? '' : `<a class="enlace-flecha" href="${enlace('/novedades')}">${T.verNovedades} <span aria-hidden="true">→</span></a>`}</div>`}
    </div>`;

  pintarMaterial(main.querySelector('.cat-cab'), material, flags);

  const rejilla = main.querySelector('[data-rejilla]');
  const pintar = (orden) => {
    const l = [...lista];
    if (orden === 'barato') l.sort((a, b) => (a.precio_cents ?? Infinity) - (b.precio_cents ?? Infinity));
    if (orden === 'caro') l.sort((a, b) => (b.precio_cents ?? -1) - (a.precio_cents ?? -1));
    if (orden === 'nuevo') l.sort(porCreado);
    rejilla.innerHTML = l.map((p, i) => tarjetaHTML(p, datos, { pronto: i < 4 })).join('');
  };
  pintar(cat || c === 'novedades' ? 'nuevo' : '');
  const sel = main.querySelector('[data-orden]');
  if (sel) sel.addEventListener('change', () => pintar(sel.value));
  if (c === 'buscar' && !q) main.querySelector('#q').focus();
}

arrancar();
