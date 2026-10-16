// Usuarios anónimos que entran a START y navegan siguiendo enlaces reales.
// docker run --rm -i -e MAX=150 grafana/k6 run - < browse.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { parseHTML } from 'k6/html';

const BASE = (__ENV.BASE || 'https://jv.umsa.bo/oj').replace(/\/$/, '');
const START = __ENV.START || 'contest.php?cid=3071'; // página de entrada, relativa a BASE
const STEPS = Number(__ENV.STEPS || 10);  // páginas por visita
const MAX = Number(__ENV.MAX || 150);     // usuarios simultáneos al tope
const MENU = Number(__ENV.MENU || 0.3);   // probabilidad de volver a un enlace de START, como usar el menú
// Nada que inicie sesión, registre, envíe, abra el IDE o descargue.
const SKIP = /login|logout|register|submit|setlang|lostpassword|vibe-ide|download|export|\.(zip|xlsx|pdf)/i;
const PAGES = ['index.php', 'contest.php', 'problem.php', 'contestrank.php', 'status.php', 'problemset.php', 'ranklist.php', 'userinfo.php'];

export const options = {
  stages: [
    { duration: '2m', target: Math.ceil(MAX / 3) },
    { duration: '3m', target: MAX },
    { duration: '3m', target: MAX },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // Si producción empieza a sufrir, k6 corta la prueba sola.
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: [{ threshold: 'p(95)<8000', abortOnFail: true, delayAbortEval: '30s' }],
    // Solo para que el resumen muestre el tiempo de cada página.
    ...Object.fromEntries(PAGES.map((p) => [`http_req_duration{name:${p}}`, ['p(95)<8000']])),
  },
};

function links(res) {
  const out = [];
  parseHTML(res.body).find('a[href]').each((_, a) => {
    const href = a.getAttribute('href');
    if (href && /^[a-z_]+\.php(\?|$)/i.test(href) && !SKIP.test(href)) out.push(href);
  });
  return out;
}

function get(path) {
  const page = path.split('?')[0];
  const res = http.get(`${BASE}/${path}`, { tags: { name: page } }); // métricas por página, no por URL
  check(res, { 'status 200': (r) => r.status === 200 });
  return res;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default function () {
  let res = get(START);
  const menu = res.status === 200 ? links(res) : [];
  for (let i = 0; i < STEPS; i++) {
    sleep(2 + Math.random() * 4); // lee la página 2–6 s
    const next = Math.random() < MENU ? menu : res.status === 200 ? links(res) : [];
    res = get(next.length ? pick(next) : START);
  }
}
