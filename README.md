# patito-k6-load-test

Pruebas de carga del juez Patito con [k6](https://k6.io), corridas en Docker (no hace falta instalar nada).

## browse.js

Usuarios anónimos que entran a `START` y navegan siguiendo enlaces reales (problemas, ranking,
estado, concursos). Con probabilidad `MENU` vuelven a un enlace de la página de entrada, como quien usa el menú. No inicia sesión, no envía soluciones ni descarga nada. Se corta solo si
los errores pasan del 5 % o el p95 pasa de 8 s.

```bash
docker run --rm -i -e MAX=150 grafana/k6 run - < browse.js
```

| Variable | Por defecto | Qué es |
| --- | --- | --- |
| `BASE` | `https://jv.umsa.bo/oj` | URL del juez |
| `START` | `contest.php?cid=3071` | página de entrada, relativa a `BASE` |
| `MAX` | `150` | usuarios simultáneos al tope |
| `STEPS` | `10` | páginas por visita después de la entrada |
| `MENU` | `0.3` | probabilidad de volver a un enlace de la entrada |

El resumen muestra el p95 de cada página. Mientras corre, mirar el consumo en el servidor con `docker stats`.
Correr contra producción en horario bajo y sin concursos activos.
