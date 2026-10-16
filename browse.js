// Usuarios anónimos que entran al index y navegan siguiendo enlaces reales.
// docker run --rm -i -e BASE=https://jv.umsa.bo/oj grafana/k6 run - < browse.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { parseHTML } from 'k6/html';

const BASE = (__ENV.BASE || 'https://jv.umsa.bo/oj').replace(/\/$/, '');
const STEPS = Number(__ENV.STEPS || 8);   // páginas por visita
const MAX = Number(__ENV.MAX || 30);      // usuarios simultáneos al tope
// Nada que inicie sesión, registre, envíe o descargue.
const SKIP = /login|logout|register|submit|setlang|lostpassword|download|export|\.(zip|xlsx|pdf)/i;

export const options = {
  stages: [
    { duration: '1m', target: Math.ceil(MAX / 3) },
    { duration: '2m', target: MAX },
    { duration: '2m', target: MAX },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // Si producción empieza a sufrir, k6 corta la prueba sola.
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: [{ threshold: 'p(95)<8000', abortOnFail: true, delayAbortEval: '30s' }],
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

export default function () {
  let res = get('index.php');
  for (let i = 0; i < STEPS; i++) {
    sleep(2 + Math.random() * 4); // lee la página 2–6 s
    const next = res.status === 200 ? links(res) : [];
    res = get(next.length ? next[Math.floor(Math.random() * next.length)] : 'index.php');
  }
}
