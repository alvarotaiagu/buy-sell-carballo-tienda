// Motivo «vitrina» · «Despegar» (boceto B): al añadir a la cesta, la etiqueta ovalada se despega por
// una esquina y vuela al icono de la cesta. Web Animations, sin GSAP, < 600 ms. Es el addToCart del
// motivo (como «ensartar» en hilo o «prender» en maniqui). Sin movimiento, no vuela nada.
const DURACION = 540;

export function despegar(origen, destino) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!origen || !destino || reduce || !Element.prototype.animate) return Promise.resolve();
  const a = origen.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  if (!a.width || !b.width) return Promise.resolve();

  const vuela = origen.cloneNode(true);
  vuela.classList.add('etiqueta-vuela');
  vuela.setAttribute('aria-hidden', 'true');
  vuela.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;margin:0;z-index:1000;pointer-events:none;transform-origin:12% 88%`;
  document.body.append(vuela);

  // la etiqueta deja su hueco en la balda mientras vuela, y vuelve a aparecer después
  origen.classList.add('etiqueta-despegada');

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = Math.max(0.18, Math.min(0.5, b.height / a.height));
  const alto = Math.min(90, Math.abs(dy) * 0.35 + 40);
  const vuelo = vuela.animate(
    [
      { transform: 'translate(0,0) rotate(0) scale(1)', offset: 0 },
      // se despega: se levanta por la esquina de arriba a la derecha
      { transform: 'translate(-2px,-8px) rotate(-11deg) scale(1.06)', offset: 0.2, easing: 'cubic-bezier(.3,0,.2,1)' },
      { transform: `translate(${dx * 0.55}px,${dy * 0.55 - alto}px) rotate(6deg) scale(${(1 + s) / 2})`, offset: 0.62 },
      { transform: `translate(${dx}px,${dy}px) rotate(14deg) scale(${s})`, offset: 1, opacity: 0.85 },
    ],
    { duration: DURACION, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' },
  );
  return vuelo.finished
    .catch(() => {})
    .then(() => {
      vuela.remove();
      destino.classList.remove('cesta-bote');
      void destino.offsetWidth;
      destino.classList.add('cesta-bote');
      setTimeout(() => origen.classList.remove('etiqueta-despegada'), 260);
    });
}
