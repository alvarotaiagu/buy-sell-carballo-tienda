// Páginas propias (content.pages): «Véndenos lo tuyo», reparación, liberación, matrículas, reparto.
// Sin movimiento. La de vender lleva el morado del logo (el lado «S€ll» del interruptor).
import { cargarDatos, esc, param, textoRicoHTML, tituloHTML } from './datos.js';
import { initChrome } from './chrome.js';
import { banderas } from './movimiento.js';
import { T } from './textos.js';

async function arrancar() {
  const main = document.querySelector('main');
  let datos;
  try {
    datos = await cargarDatos();
  } catch (err) {
    console.error(err);
    main.insertAdjacentHTML('afterbegin', `<p class="wrap aviso-error" role="alert">${T.errorDatos}</p>`);
    return;
  }
  banderas();
  initChrome(datos, { pagina: 'pagina' });
  const slug = param('s');
  const pg = (datos.contenido.pages || []).find((x) => x.slug === slug);
  if (!pg) {
    main.innerHTML = `<div class="wrap perdido"><span class="hueco hueco-grande" aria-hidden="true"></span><h1>${T.noEncontradoT}</h1><p>${T.noEncontradoTxt}</p><a class="btn" href="index.html">${T.volver}</a></div>`;
    return;
  }
  const vender = datos.tema.motif && datos.tema.motif.vender;
  const esVender = vender && vender.href === '/' + pg.slug;
  document.title = `${pg.title.replace(/\*/g, '')} · ${datos.tienda.nombre}`;
  main.innerHTML = `
    <article class="pagina${esVender ? ' pagina-vender' : ''}">
      <header class="pagina-cab"><div class="wrap">
        <nav class="migas" aria-label="${T.estasEn}"><a href="index.html">${T.inicio}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(pg.title.replace(/\*/g, ''))}</span></nav>
        <h1>${tituloHTML(pg.title)}</h1>
        ${esVender ? '<svg class="pagina-euro" aria-hidden="true" focusable="false"><use href="#bs-euro" width="100%" height="100%"/></svg>' : ''}
      </div></header>
      <div class="wrap pagina-cuerpo texto-rico">${textoRicoHTML(pg.body, { primera: 'entradilla' })}</div>
    </article>`;
}

arrancar();
