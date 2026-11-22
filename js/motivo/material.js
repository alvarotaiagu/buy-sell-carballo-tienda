// Motivo «vitrina» · cabecera de `/c/[slug]`: el material de esa zona, que entra una vez.
// Lo usa categoria.js (y solo esa página carga GSAP, para esta entrada).
import { materialHTML, entrarMaterial } from './materiales.js';

export function pintarMaterial(cab, material, { motion }) {
  cab.insertAdjacentHTML('afterbegin', materialHTML(material));
  cab.dataset.material = material;
  entrarMaterial(cab, { motion, retraso: 0.05 });
}
