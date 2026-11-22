// Motivo «vitrina» · los materiales de las zonas (boceto D), dibujados en CSS (css/motivo/material.css).
// Lista cerrada: el tema dice qué material lleva cada categoría (motif.zonas); el código no sabe qué
// vende cada zona. Una categoría sin material lleva «balda».
export const MATERIALES = ['mostrador', 'balda', 'vidrio', 'cesped', 'ganchos', 'suelo', 'pared'];
const valido = (m) => (MATERIALES.includes(m) ? m : 'balda');

/** Briznas de césped deterministas (sin azar: la misma tarima en cada carga). */
function briznas(n, alto) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = (i * 100) / n + ((i * 37) % 7) * 0.22;
    const h = alto * (0.55 + ((i * 53) % 10) / 22);
    const g = (((i * 29) % 9) - 4) * 0.35;
    d += `M${x.toFixed(2)} ${alto}q${(g * 0.4).toFixed(2)} ${(-h * 0.55).toFixed(2)} ${g.toFixed(2)} ${(-h).toFixed(2)}q${(-g * 0.2 + 0.5).toFixed(2)} ${(h * 0.5).toFixed(2)} ${(0.9).toFixed(2)} ${h.toFixed(2)}Z`;
  }
  return d;
}

/** El dibujo del material, a sangre dentro de su contenedor. Decorativo. */
export function materialHTML(nombre) {
  const m = valido(nombre);
  const capas = {
    cesped: `<i class="mat-tarima"><i class="mat-manto"></i><svg class="mat-briznas" viewBox="0 0 100 10" preserveAspectRatio="none" focusable="false"><path d="${briznas(90, 10)}"/></svg></i>`,
    vidrio: '<i class="mat-reflejo"></i><i class="mat-canto" style="--x:18%"></i><i class="mat-canto" style="--x:64%"></i><i class="mat-vbalda" style="--b:34%"></i><i class="mat-vbalda" style="--b:68%"></i><i class="mat-barrido"></i>',
    mostrador: '<i class="mat-mesa"><i class="mat-tapa"></i><i class="mat-frente"></i></i><i class="mat-brillo"></i>',
    balda: '<i class="mat-ebalda" style="--b:30%"></i><i class="mat-ebalda" style="--b:64%"></i>',
    suelo: `<i class="mat-rodapie"></i><i class="mat-solado">${'<i></i>'.repeat(24)}</i>`,
    ganchos: '<i class="mat-perf"></i><i class="mat-gancho" style="--x:22%;--y:30%"></i><i class="mat-gancho" style="--x:48%;--y:30%"></i><i class="mat-gancho" style="--x:74%;--y:30%"></i>',
    pared: '<i class="mat-liston"></i><i class="mat-luz"></i>',
  };
  return `<div class="mat mat-${m}" aria-hidden="true">${capas[m]}</div>`;
}

/** Muestra pequeña del material (menú de departamentos). */
export const muestraMaterial = (nombre) => `<span class="mat-muestra mat-m-${valido(nombre)}" aria-hidden="true"></span>`;

/**
 * La entrada del material (una vez): el césped crece, el vidrio cruza un reflejo, el mostrador
 * brilla, las baldas se colocan, la baldosa se asienta, el panel aparece, el listón se traza.
 * GSAP; sin movimiento no hace nada (el material ya está en su sitio).
 */
export function entrarMaterial(raiz, { motion, retraso = 0 } = {}) {
  const gsap = window.gsap;
  if (!motion || !gsap || !raiz) return;
  const mat = raiz.classList.contains('mat') ? raiz : raiz.querySelector('.mat');
  if (!mat) return;
  const q = (s) => mat.querySelectorAll(s);
  const tl = gsap.timeline({ delay: retraso, defaults: { ease: 'expo.out' } });
  if (mat.classList.contains('mat-cesped')) {
    tl.fromTo(q('.mat-briznas'), { scaleY: 0 }, { scaleY: 1, duration: 1.1, transformOrigin: '50% 100%' });
    tl.fromTo(q('.mat-manto'), { scaleY: 0.6 }, { scaleY: 1, duration: 0.9, transformOrigin: '50% 100%' }, 0);
  } else if (mat.classList.contains('mat-vidrio')) {
    tl.fromTo(q('.mat-vbalda'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.12, transformOrigin: '0 50%' });
    tl.fromTo(q('.mat-barrido'), { xPercent: -140, opacity: 1 }, { xPercent: 520, opacity: 1, duration: 1.3, ease: 'power2.inOut' }, 0.25);
  } else if (mat.classList.contains('mat-mostrador')) {
    tl.fromTo(q('.mat-mesa'), { yPercent: 16 }, { yPercent: 0, duration: 0.9 });
    tl.fromTo(q('.mat-brillo'), { xPercent: -130, opacity: 1 }, { xPercent: 700, opacity: 1, duration: 1.2, ease: 'power2.inOut' }, 0.2);
  } else if (mat.classList.contains('mat-balda')) {
    tl.fromTo(q('.mat-ebalda'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.12, transformOrigin: '0 50%' });
  } else if (mat.classList.contains('mat-suelo')) {
    tl.fromTo(q('.mat-solado i'), { opacity: 0.25 }, { opacity: 1, duration: 0.6, stagger: { each: 0.02, from: 'start' } });
  } else if (mat.classList.contains('mat-ganchos')) {
    tl.fromTo(q('.mat-gancho'), { y: -14, rotation: -12 }, { y: 0, rotation: 0, duration: 0.9, stagger: 0.08 });
  } else if (mat.classList.contains('mat-pared')) {
    tl.fromTo(q('.mat-liston'), { scaleX: 0 }, { scaleX: 1, duration: 1, transformOrigin: '0 50%' });
    tl.fromTo(q('.mat-luz'), { opacity: 0.2 }, { opacity: 1, duration: 1.2 }, 0.1);
  }
}
