# patito-k6-load-test

Pruebas de carga del juez Patito con [k6](https://k6.io), corridas en Docker (no hace falta instalar nada).

## browse.js

Usuarios anónimos que entran a `index.php` y navegan siguiendo enlaces reales (problemas, ranking,
estado, concursos, perfiles). No inicia sesión, no envía soluciones ni descarga nada. Se corta solo si
los errores pasan del 5 % o el p95 pasa de 8 s.

```bash
docker run --rm -i -e MAX=5 grafana/k6 run - < browse.js
```

| Variable | Por defecto | Qué es |
| --- | --- | --- |
| `BASE` | `https://jv.umsa.bo/oj` | URL del juez |
| `MAX` | `30` | usuarios simultáneos al tope |
| `STEPS` | `8` | páginas por visita después del index |

Mientras corre, mirar el consumo en el servidor con `docker stats`.
Correr contra producción en horario bajo y sin concursos activos.
