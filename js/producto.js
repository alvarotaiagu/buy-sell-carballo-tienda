// Ficha de producto (003 §3, la de la plataforma tematizada). Movimiento MÍNIMO: sin GSAP; solo
// «despegar» al añadir a la cesta (< 600 ms, Web Animations). Sin opciones: no hay selector.
// Galería con el recorte primero, sobre una balda de vidrio; las demás fotos, enmarcadas.
import { cargarDatos, esc, param, foto, categoriaURL, aConsultar, agotado, whatsappURL, telURL, textoRicoHTML, euros } from './datos.js';
import { initChrome, textoPolitica } from './chrome.js';
import { banderas } from './movimiento.js';
import { tarjetaHTML } from './tarjeta.js';
import { etiquetaHTML, huecoHTML } from './motivo/etiqueta.js';
import { anadirACesta, enCesta } from './cesta.js';
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
  initChrome(datos, { pagina: 'producto' });
  const p = datos.prodPorSlug.get(param('p'));
  // vendido + hide_sold_out = como si no existiera (la plataforma da 404 con «Puede que ya no esté a la venta»)
  if (!p || (datos.tienda.hide_sold_out !== false && agotado(p))) {
    main.innerHTML = `<div class="wrap perdido"><span class="hueco hueco-grande" aria-hidden="true"></span><h1>${T.productoNoT}</h1><p>${T.productoNoTxt}</p><a class="btn" href="index.html">${T.volver}</a></div>`;
    return;
  }
  const cat = datos.catPorId.get(p.categoria_id);
  document.title = `${p.titulo} · ${datos.tienda.nombre}`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = String(p.descripcion || p.titulo).replace(/\s+/g, ' ').slice(0, 155);

  const fotos = (p.fotos || []).map((_, i) => foto(p, i));
  const consulta = aConsultar(p);
  const wa = whatsappURL(p);
  const t = datos.tienda;
  const umbral = t.envio_gratis_desde_cents;

  main.innerHTML = `
    <div class="wrap ficha">
      <nav class="migas" aria-label="${T.estasEn}"><a href="index.html">${T.inicio}</a><span aria-hidden="true">/</span>${cat ? `<a href="${categoriaURL(cat)}">${esc(cat.nombre)}</a><span aria-hidden="true">/</span>` : ''}<span aria-current="page">${esc(p.titulo)}</span></nav>
      <div class="ficha-in">
        <section class="galeria" aria-label="${esc(T.fotosDe(p.titulo))}">
          <div class="galeria-vitrina" data-principal>${principal(fotos[0], p, 0, fotos.length)}</div>
          ${fotos.length > 1 ? `<ol class="galeria-mini">${fotos.map((f, i) => `<li><button type="button" data-foto="${i}" aria-label="${esc(T.fotoN(i + 1, fotos.length))}"${i === 0 ? ' aria-current="true"' : ''}><img src="${esc(f.srcset.split(' ')[0])}" alt="" width="${f.ancho}" height="${f.alto}" loading="lazy" decoding="async"${f.recorte ? '' : ' class="enmarcada"'}></button></li>`).join('')}</ol>` : ''}
        </section>
        <div class="ficha-info">
          ${cat ? `<p class="ficha-cat mono"><a href="${categoriaURL(cat)}">${esc(cat.nombre)}</a></p>` : ''}
          <h1>${esc(p.titulo)}</h1>
          <div class="ficha-precio">${etiquetaHTML(p, { tam: 'g' })}${p._ejemplo ? `<span class="insignia insignia-ejemplo" title="${esc(p._ejemplo)}">EJEMPLO</span>` : ''}</div>
          ${consulta ? '' : `<p class="ficha-iva">${T.impuestos}</p>`}
          <p class="sello-uno sello-uno-grande mono">${T.unaUnidad}</p>
          <div class="ficha-comprar">
            ${consulta
              ? `${wa ? `<a class="btn btn-bloque" href="${wa}" target="_blank" rel="noopener noreferrer">${T.preguntarArticulo}</a>` : ''}${t.telefono ? `<a class="btn btn-linea btn-bloque" href="${telURL(t.telefono)}">${T.llamar}</a>` : ''}`
              : `<button type="button" class="btn btn-bloque" data-anadir>${enCesta(p.slug) ? T.anadido : T.anadir}</button>`}
            <p class="ficha-mensaje" role="status" data-mensaje></p>
          </div>
          ${!consulta && wa ? `<a class="ficha-wa" href="${wa}" target="_blank" rel="noopener noreferrer">${T.preguntarWhatsapp}</a>` : ''}
          ${p.descripcion ? `<div class="ficha-desc texto-rico">${textoRicoHTML(p.descripcion, { primera: 'ficha-estado' })}</div>` : ''}
          <div class="ficha-politicas">
            <details><summary>${T.envio}</summary>${umbral ? `<p>${T.envioGratisDesde(euros(umbral))}</p>` : ''}${textoPolitica(datos, 'envio')}</details>
            <details><summary>${T.recogida}</summary>${textoPolitica(datos, 'recogida')}</details>
            <details><summary>${T.devoluciones}</summary>${textoPolitica(datos, 'devoluciones')}</details>
          </div>
        </div>
      </div>
    </div>
    <section class="relacionados" aria-labelledby="rel-t"><div class="wrap"><div class="balda-sep" aria-hidden="true"><i class="balda"></i></div><h2 id="rel-t">${T.tambien}</h2><ul class="rejilla" data-rel></ul></div></section>`;

  // «También te puede gustar»: de su zona, lo más nuevo (en la plataforma, los sugeridos o la categoría)
  const rel = (cat ? datos.deCategoria(cat) : datos.visibles).filter((x) => x.slug !== p.slug).slice(0, 4);
  const relSec = main.querySelector('.relacionados');
  if (rel.length) main.querySelector('[data-rel]').innerHTML = rel.map((x) => tarjetaHTML(x, datos)).join('');
  else relSec.remove();

  const caja = main.querySelector('[data-principal]');
  main.querySelectorAll('[data-foto]').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.foto;
    caja.innerHTML = principal(fotos[i], p, i, fotos.length);
    main.querySelectorAll('[data-foto]').forEach((x) => x.setAttribute('aria-current', String(x === b)));
  }));

  const btn = main.querySelector('[data-anadir]');
  if (btn) btn.addEventListener('click', async () => {
    const ok = await anadirACesta(p.slug, main.querySelector('.ficha-precio .etiqueta'));
    if (ok) btn.textContent = T.anadido;
  });
}

function principal(f, p, i, n) {
  if (!f) return `<span class="galeria-obj">${huecoHTML()}</span><i class="balda" aria-hidden="true"></i>`;
  return `<span class="galeria-obj${f.recorte ? '' : ' con-marco'}"><img src="${esc(f.src)}" srcset="${esc(f.srcset)}" sizes="(min-width: 900px) 50vw, 92vw" alt="${esc(i === 0 ? p.titulo : `${p.titulo}, ${T.fotoN(i + 1, n).toLowerCase()}`)}" width="${f.ancho}" height="${f.alto}" fetchpriority="${i === 0 ? 'high' : 'auto'}" decoding="async"></span><i class="balda" aria-hidden="true"></i>`;
}

arrancar();
