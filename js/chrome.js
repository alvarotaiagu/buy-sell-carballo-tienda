// ─────────────────────────────────────────────────────────────
// Lo común a todas las páginas (la plantilla de la plataforma, tematizada): aviso superior,
// cabecera con el interruptor «Comprar | Vender» del motivo, departamentos, menú móvil, pie,
// aviso de cookies y textos legales. Todo lo de la tienda sale de datos.json y tema.json.
// ─────────────────────────────────────────────────────────────
import { esc, enlace, categoriaURL, telURL, whatsappURL, fijarTienda, protoDireccion, textoRicoHTML, param } from './datos.js';
import { T } from './textos.js';
import { initCesta, iconoCesta } from './cesta.js';
import { prepararMarca } from './motivo/marca.js';
import { muestraMaterial } from './motivo/materiales.js';

const PEND = (t) => `<span class="pendiente">[PENDIENTE${t ? ': ' + esc(t) : ''}]</span>`;

export function initChrome(datos, { pagina = '' } = {}) {
  const t = datos.tienda;
  fijarTienda(t);
  prepararMarca(datos.tema);
  const logo = datos.tema.logo || {};

  // favicon y logo de la cabecera, del tema
  const fav = document.querySelector('link[rel="icon"]');
  if (fav && logo.favicon) fav.href = logo.favicon;
  const cabLogo = document.querySelector('[data-logo]');
  if (cabLogo) {
    cabLogo.setAttribute('aria-label', `${t.nombre}, ${T.inicio.toLowerCase()}`);
    const img = cabLogo.querySelector('img');
    img.src = logo.horizontal || logo.main;
  }

  // aviso superior (content.announcement)
  const a = datos.contenido.announcement;
  const anuncio = document.querySelector('[data-anuncio]');
  if (anuncio && a && a.enabled && a.text) { anuncio.innerHTML = `<p>${esc(a.text)}</p>`; anuncio.hidden = false; }

  montarNav(datos);
  montarMenu(datos);
  montarInterruptor(datos, pagina);
  pintarPie(datos);
  montarLegales(datos);
  montarCookies();
  initCesta(datos);
  const cesta = document.querySelector('.cab [data-abrir-cesta]');
  if (cesta && !cesta.querySelector('.icono-cesta')) cesta.insertAdjacentHTML('afterbegin', iconoCesta());
  document.querySelectorAll('[data-buscar]').forEach((b) => { b.href = enlace('/buscar'); b.setAttribute('aria-label', T.buscar); });
}

/* ── navegación de escritorio: «Departamentos» (las zonas, con su material) y novedades ── */
function montarNav(datos) {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;
  const actual = param('c');
  const raiz = datos.categorias.filter((c) => !c.padre && c.visible !== false);
  nav.innerHTML = `<ul>
    <li class="nav-dep"><button type="button" class="nav-dep-btn" aria-expanded="false" aria-controls="nav-zonas">${T.departamentos}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
      <div class="nav-zonas" id="nav-zonas" hidden><ul>${raiz
        .map((c) => `<li><a href="${categoriaURL(c)}"${actual === c.slug ? ' aria-current="page"' : ''}>${muestraMaterial(datos.materialDe(c))}<span>${esc(c.nombre)}</span></a></li>`)
        .join('')}</ul></div></li>
    <li><a href="${enlace('/novedades')}"${actual === 'novedades' ? ' aria-current="page"' : ''}>${T.novedades}</a></li>
    ${datos.rebajados().length ? `<li><a class="nav-rebajas" href="${enlace('/rebajas')}"${actual === 'rebajas' ? ' aria-current="page"' : ''}>${T.rebajas}</a></li>` : ''}
  </ul>`;
  const btn = nav.querySelector('.nav-dep-btn');
  const panel = nav.querySelector('.nav-zonas');
  const abrir = (si) => { btn.setAttribute('aria-expanded', String(si)); panel.hidden = !si; };
  btn.addEventListener('click', () => abrir(panel.hidden));
  nav.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { abrir(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) abrir(false); });
  nav.addEventListener('focusout', (e) => { if (!nav.contains(e.relatedTarget)) abrir(false); });
}

/* ── interruptor «Comprar | Vender» (campo motif.vender del tema) ── */
function montarInterruptor(datos, pagina) {
  const v = datos.tema.motif && datos.tema.motif.vender;
  const caja = document.querySelectorAll('[data-cv]');
  if (!v) { caja.forEach((c) => c.remove()); return; }
  const hrefV = enlace(v.href);
  const enVender = pagina === 'pagina' && param('s') === v.href.replace(/^\//, '');
  caja.forEach((c) => {
    c.setAttribute('aria-label', T.comprarVender);
    c.classList.toggle('cv-vender', enVender);
    c.innerHTML = `<a href="index.html"${enVender ? '' : ' aria-current="page"'}>${T.comprar}</a><a href="${hrefV}"${enVender ? ' aria-current="page"' : ''}>${esc(v.label)}</a><i class="cv-mando" aria-hidden="true"></i>`;
    c.addEventListener('click', (e) => {
      const l = e.target.closest('a');
      if (!l || l.hasAttribute('aria-current') || e.metaKey || e.ctrlKey || e.shiftKey) return;
      // el mando se desliza antes de cambiar de página (180 ms); sin movimiento, al momento
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      c.classList.toggle('cv-vender');
      setTimeout(() => (location.href = l.href), 180);
    });
  });
}

/* ── menú móvil ── */
function montarMenu(datos) {
  const btn = document.querySelector('[data-menu]');
  if (!btn) return;
  const t = datos.tienda;
  btn.setAttribute('aria-label', T.abrirMenu);
  const raiz = datos.categorias.filter((c) => !c.padre && c.visible !== false);
  const paginas = (datos.contenido.pages || []);
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.id = 'menu';
  menu.hidden = true;
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-label', T.menu);
  menu.setAttribute('data-lenis-prevent', '');
  const wa = whatsappURL(null);
  menu.innerHTML = `
    <div class="menu-cab"><img src="${esc(datos.tema.logo.horizontal)}" alt="${esc(t.nombre)}" width="150" height="36"><button class="menu-cerrar" type="button" aria-label="${T.cerrarMenu}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <nav class="cv cv-menu" data-cv></nav>
    <nav aria-label="${T.departamentos}"><p class="menu-k mono">${T.departamentos}</p><ul class="menu-zonas">
      ${raiz.map((c) => `<li><a href="${categoriaURL(c)}">${muestraMaterial(datos.materialDe(c))}<span>${esc(c.nombre)}</span></a></li>`).join('')}
    </ul>
    <ul class="menu-otros"><li><a href="${enlace('/novedades')}">${T.novedades}</a></li>${paginas.map((p) => `<li><a href="${enlace('/' + p.slug)}">${esc(p.title)}</a></li>`).join('')}</ul></nav>
    <div class="menu-sub">${t.telefono ? `<a href="${telURL(t.telefono)}">${T.llamar} · ${esc(t.telefono)}</a>` : ''}${wa ? `<a href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}</div>`;
  document.querySelector('.cab').after(menu);
  const cerrar = () => {
    menu.classList.remove('abierto');
    btn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-abierto');
    document.dispatchEvent(new Event('cesta:cerrada'));
    setTimeout(() => (menu.hidden = true), 260);
    btn.focus({ preventScroll: true });
  };
  btn.addEventListener('click', () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('menu-abierto');
    document.dispatchEvent(new Event('cesta:abierta'));
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('abierto')));
    menu.querySelector('.menu-cerrar').focus({ preventScroll: true });
  });
  menu.querySelector('.menu-cerrar').addEventListener('click', cerrar);
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) cerrar(); });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrar();
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll('a[href],button')];
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
}

/* ── horario (settings.hours) en texto corto ── */
export function horarioFilas(t) {
  const sem = (t.horario && t.horario.semana) || {};
  const tramo = (d) => (sem[d] && sem[d].length ? sem[d].map(([a, b]) => `${a}–${b}`).join(T.y) : '');
  const lv = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const filas = [];
  if (lv.every((d) => tramo(d) === tramo('mon'))) filas.push([T.lunesViernes, tramo('mon') || T.cerrado]);
  else lv.forEach((d) => filas.push([T.dias[d], tramo(d) || T.cerrado]));
  ['sat', 'sun'].forEach((d) => filas.push([T.dias[d], tramo(d) || T.cerrado]));
  return filas;
}

/* ── pie (oscuro, con logo.on_dark y el canto de la balda arriba) ── */
function pintarPie(datos) {
  const pie = document.querySelector('[data-pie]');
  if (!pie) return;
  const t = datos.tienda;
  const raiz = datos.categorias.filter((c) => !c.padre && c.visible !== false);
  const paginas = datos.contenido.pages || [];
  const redes = [
    t.instagram && ['Instagram', t.instagram.startsWith('http') ? t.instagram : `https://www.instagram.com/${t.instagram.replace(/^@/, '')}/`],
    t.facebook && ['Facebook', t.facebook],
    whatsappURL(null) && ['WhatsApp', whatsappURL(null)],
  ].filter(Boolean);
  const horas = horarioFilas(t).map(([d, h]) => `${esc(d)} ${esc(h)}`).join('<br>');
  pie.innerHTML = `
    <div class="pie-in wrap">
      <div class="pie-marca">
        <img src="${esc(datos.tema.logo.on_dark)}" alt="${esc(t.nombre)}" width="180" height="113" loading="lazy">
        <address>${esc(protoDireccion(t.direccion))}<br>${t.telefono ? `<a href="${telURL(t.telefono)}">${esc(t.telefono)}</a><br>` : ''}${t.email ? `<a href="mailto:${esc(t.email)}">${esc(t.email)}</a>` : ''}</address>
        <p class="pie-horas">${horas}${t._horario_pendiente ? `<br>${PEND(t._horario_pendiente)}` : ''}</p>
      </div>
      <nav aria-label="${T.pieTienda}"><h2>${T.pieTienda}</h2><ul>
        <li><a href="${enlace('/novedades')}">${T.novedades}</a></li>
        ${raiz.map((c) => `<li><a href="${categoriaURL(c)}">${esc(c.nombre)}</a></li>`).join('')}
      </ul></nav>
      <nav aria-label="${T.pieServicios}"><h2>${T.pieServicios}</h2><ul>
        ${paginas.map((p) => `<li><a href="${enlace('/' + p.slug)}">${esc(p.title)}</a></li>`).join('')}
      </ul></nav>
      <div><h2>${T.pieAyuda}</h2><ul>
        <li><button type="button" data-legal="envios">${T.enviosYRecogida}</button></li>
        <li><button type="button" data-legal="devoluciones">${T.devoluciones}</button></li>
        <li><button type="button" data-legal="condiciones">${T.condiciones}</button></li>
      </ul>
      <h2 class="pie-h2b">${T.pieRedes}</h2><ul class="pie-redes">${redes.map(([n, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${n}</a></li>`).join('')}</ul></div>
    </div>
    <div class="pie-legal wrap"><span>© ${esc(t.nombre)}${datos.contenido.footer_note ? ' · ' + esc(datos.contenido.footer_note) : ''} · ${T.prototipo}</span>
      <span><button type="button" data-legal="aviso-legal">${T.avisoLegal}</button><button type="button" data-legal="privacidad">${T.privacidad}</button><button type="button" data-legal="cookies">${T.cookies}</button></span></div>`;
}

/* ── textos legales y de ayuda: en la plataforma son sus páginas legales; aquí, diálogos ── */
export function textoPolitica(datos, clave) {
  const t = datos.tienda;
  const p = t.politicas || {};
  if (clave === 'envio') return p.envio ? textoRicoHTML(p.envio) : `<p>${PEND('tarifas y plazos de envío')}</p>`;
  if (clave === 'recogida') return p.recogida ? textoRicoHTML(p.recogida) : `<p>${PEND('recogida')}</p>`;
  if (clave === 'devoluciones') {
    const dias = p.devolucion_dias ?? 14;
    return `<p>${T.desistimiento(dias)}</p>${p.devoluciones ? textoRicoHTML(p.devoluciones) : `<p>${PEND('condiciones de devolución')}</p>`}`;
  }
  return '';
}

function montarLegales(datos) {
  const t = datos.tienda;
  const l = t.legal || {};
  const titular = [l.razon_social, l.cif, l.domicilio_social].every(Boolean)
    ? `${esc(l.razon_social)}, NIF ${esc(l.cif)}, ${esc(l.domicilio_social)}`
    : `${esc(t.nombre)} ${PEND('razón social, NIF y domicilio fiscal')}`;
  const textos = {
    envios: [T.enviosYRecogida, textoPolitica(datos, 'envio') + textoPolitica(datos, 'recogida')],
    devoluciones: [T.devoluciones, textoPolitica(datos, 'devoluciones')],
    condiciones: [T.condiciones, `<p>Los precios llevan los impuestos incluidos. ${PEND('tipo de IVA y régimen: confirmar con su gestoría')}</p>${t._garantia ? textoRicoHTML(t._garantia) : `<p>${PEND('garantía de los artículos de segunda mano')}</p>`}`],
    'aviso-legal': [T.avisoLegal, `<p>Titular: ${titular}. ${esc(protoDireccion(t.direccion))}.</p><p>Esta web es un prototipo de la tienda online, sin publicar.</p>`],
    privacidad: [T.privacidad, `<p>Este prototipo no tiene formularios ni cuentas de cliente. La cesta se guarda solo en tu navegador.</p><p>${PEND('el texto de privacidad lo pone la plantilla de la plataforma con los datos del titular')}</p>`],
    cookies: [T.cookies, `<p>No usamos cookies propias ni de terceros, ni analítica.</p><p>Guardamos en el almacenamiento local de tu navegador tu cesta (<code>bs-cesta</code>) y que ya has visto este aviso (<code>bs-cookies-vistas</code>).</p><p>El mapa de Google solo se carga si lo pides pulsando el botón; desde ese momento Google puede usar sus propias cookies.</p>`],
  };
  const dlg = document.createElement('dialog');
  dlg.className = 'legal';
  dlg.setAttribute('aria-labelledby', 'legal-t');
  dlg.setAttribute('data-lenis-prevent', '');
  document.body.append(dlg);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-legal]');
    if (!b || !textos[b.dataset.legal]) return;
    e.preventDefault();
    const [titulo, html] = textos[b.dataset.legal];
    dlg.innerHTML = `<div class="legal-in"><h2 id="legal-t">${titulo}</h2>${html}<form method="dialog"><button class="btn btn-linea">${T.cerrar}</button></form></div>`;
    dlg.showModal();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

/* ── aviso de cookies (siempre; «no aparece» = ya aceptado) ── */
function montarCookies() {
  const CLAVE = 'bs-cookies-vistas';
  let visto = false;
  try { visto = localStorage.getItem(CLAVE) === '1'; } catch { /* sin almacenamiento */ }
  if (visto) return;
  const c = document.createElement('div');
  c.className = 'cookies';
  c.setAttribute('role', 'region');
  c.setAttribute('aria-label', T.cookies);
  c.innerHTML = `<p>${T.cookiesAviso}</p><button class="cookies-mas" type="button" data-legal="cookies">${T.masInfo}</button><button class="btn" type="button" data-aceptar>${T.entendido}</button>`;
  document.body.append(c);
  c.querySelector('[data-aceptar]').addEventListener('click', () => {
    try { localStorage.setItem(CLAVE, '1'); } catch { /* nada */ }
    c.remove();
  });
}
