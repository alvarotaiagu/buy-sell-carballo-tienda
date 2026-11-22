// Banderas de movimiento y Lenis. `html.con-movimiento` lo pone el <head> si no hay
// prefers-reduced-motion; aquí se quita si GSAP no ha llegado (bloqueado o sin red).
// Los estados ocultos de las animaciones solo existen bajo html.con-movimiento.
export function banderas() {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = !!window.gsap;
  const motion = !reduce && gsap && html.classList.contains('con-movimiento');
  if (!motion) html.classList.remove('con-movimiento');
  if (motion && window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  return { motion, reduce };
}

/** Lenis solo en la portada, y solo con movimiento. Se para con la cesta o el menú abiertos. */
export function iniciarLenis({ motion }) {
  if (!motion || !window.Lenis) return null;
  const lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
  if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
  window.gsap.ticker.add((t) => lenis.raf(t * 1000));
  window.gsap.ticker.lagSmoothing(0);
  document.addEventListener('cesta:abierta', () => lenis.stop());
  document.addEventListener('cesta:cerrada', () => lenis.start());
  // los enlaces a #anclas de la propia página, con Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const destino = document.querySelector(a.getAttribute('href'));
    if (!destino) return;
    e.preventDefault();
    lenis.scrollTo(destino, { offset: -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cab-h')) || 64) });
  });
  return lenis;
}

/** Esperar a que los <script defer> de GSAP hayan corrido (o hayan fallado). */
export function esperarGSAP() {
  if (window.gsap || document.readyState !== 'loading') return Promise.resolve();
  return new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
}
