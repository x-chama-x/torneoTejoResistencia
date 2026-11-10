# Torneo Air Hockey - La Resistencia

**Plataforma web completa para gestionar torneos de Air Hockey (Tejo) del grupo "La Resistencia" (amigos de x_chama_x).**

> Link: https://torneo-tejo-resistencia.vercel.app/index.html

---

## Resumen del Proyecto

Este proyecto es una aplicacion web que permite organizar, simular y analizar torneos de Air Hockey entre un grupo de amigos. Incluye multiples herramientas:

- **Sistema de Rankings**: Ranking FIFA con puntos acumulados y ranking historico en mundiales
- **Creador de Torneos**: Sorteo de grupos con probabilidades de clasificacion en tiempo real
- **Simulador de Torneos**: Simulacion completa de torneos con resultados partido a partido
- **Simulador Monte Carlo**: Analisis estadistico con hasta 10,000 simulaciones
- **Simulador 1vs1**: Enfrentamientos directos con historial y probabilidades
- **Playoffs**: Configuracion de brackets con sorteo o armado manual
- **Historial de Torneos**: Registro completo de torneos pasados con estadisticas

La aplicacion utiliza un sistema de probabilidades basado en una **funcion sigmoide** que combina el ranking FIFA (40%) y el win rate historico (60%) para calcular las chances de victoria en cada partido.

---

## Paginas de la Aplicacion

| Pagina | Descripcion |
|--------|-------------|
| `index.html` | **Inicio** - Rankings, estadisticas generales e historial de campeones |
| `simulador.html` | **Simulador de Torneo** - Simula torneos completos con resultados detallados, y Monte Carlo con miles de simulaciones |
| `partido.html` | **Simulador 1vs1** - Enfrentamientos directos con historial |
| `torneos.html` | **Torneos** - Historial de todos los torneos, con selector. Se arma solo leyendo `enfrentamientos_directos.txt` |
| `app/index.html` | **Tejo - Cargar Partidos** - Crear torneos, sortear grupos y semis, y cargar los partidos uno por uno; tambien el modo jornada de la Nations League |

> **Borradas**: `torneo.html` (Creador de Torneo) y `playoffs.html`, en noviembre de 2026. El Creador sorteaba grupos y guardaba el torneo, que es exactamente lo que hace hoy la app (`app/torneo.js`, con `sortearYGuardar` y `sortearYGuardarSemis`) y encima cargando los partidos. Playoffs armaba un bracket de 4 jugadores cualesquiera para ver probabilidades; el bracket con probabilidades quedo en `torneos.html`, pero solo para torneos reales. Se fueron tambien `js/torneo.js` y `js/playoffs.js`.

---

## Caracteristicas Principales

### Pagina de Inicio (`index.html`)
- **Ranking FIFA**: Tabla de posiciones con puntos y racha actual de cada jugador
- **Ranking Historico**: Puntos acumulados en mundiales (goles)
- **Estadisticas Generales**: PJ, G, P, WR, GF, GC, DIF, PG de todos los partidos
- **Historial de Campeones**: Lista de ganadores de cada torneo

### Simulador de Torneo (`simulador.html`)
- Simula un torneo completo con resultados partido a partido
- Muestra fase de grupos, playoffs, semifinales, tercer puesto y final
- **Armado manual de grupos**: Permite elegir que jugadores van a cada grupo
- Sorteo aleatorio o configuracion manual

### Simulador Monte Carlo (dentro de `simulador.html`)
- Ejecuta entre 1,000 y 10,000 simulaciones de torneos
- Calcula probabilidades de cada jugador de:
  - Ser campeon, subcampeon, tercero o cuarto
  - Clasificar o no clasificar a playoffs
- **Para formato 9 jugadores**: Muestra probabilidades de clasificacion directa vs indirecta (repechaje)
- Analisis con grupos configurados manualmente para evaluar "grupos de la muerte"

### Simulador de Partido 1vs1 (`partido.html`)
- Simula enfrentamientos directos entre dos jugadores
- **Barra de probabilidad**: Muestra el porcentaje de victoria automaticamente
- **Historial de enfrentamientos**: Victorias totales, goles y ultimos 5 partidos
- Datos calculados desde `enfrentamientos_directos.txt`

---

## Formatos de Torneo Soportados

| Jugadores | Formato | Partidos Total | Clasifican | Costo Estimado |
|-----------|---------|----------------|------------|----------------|
| 7 | Liga (Round Robin) | 25 | Top 4 | $30,000 |
| 8 | 2 grupos de 4 | 16 | 2 por grupo | $19,200 |
| 9 | 3 grupos de 3 + Repechajes | 20 | 1ro de grupos + ganador eliminatorio | $24,000 |
| 10 | 2 grupos de 5 | 24 | 2 por grupo | $28,800 |

### Formato especial de 9 jugadores:
1. **Fase de grupos**: 3 grupos de 3 (9 partidos)
2. **Repechaje 2do puestos**: Mini-liga entre los 3 segundos (3 partidos) - Solo el 1ro avanza
3. **Repechaje 3ro puestos**: Mini-liga entre los 3 terceros (3 partidos) - Solo el 1ro avanza
4. **Partido eliminatorio**: 1ro rep. segundos vs 1ro rep. terceros (1 partido)
5. **Playoffs**: Semifinales + 3er puesto + Final (4 partidos)

---

## Sistema de Simulacion

La simulacion de partidos tiene en cuenta:

1. **Ranking FIFA**: Puntos acumulados de cada jugador (peso 40%)
2. **Win Rate**: Porcentaje historico de victorias (peso 60%)
3. **Promedio de Goles**: Influye en la diferencia de goles de cada partido

### Formula de Probabilidad (Sigmoide)

```
factorFuerza = (ranking * 0.4) + (winRate * 100 * 0.6)
diferencia = factorFuerza1 - factorFuerza2
probabilidad = 1 / (1 + e^(-diferencia / 30))
```

| Diferencia | Probabilidad | Descripcion |
|------------|--------------|-------------|
| 0 | 50% | Jugadores iguales |
| 20 | 66% | Ventaja leve |
| 40 | 79% | Ventaja moderada |
| 60 | 88% | Ventaja clara |
| 80 | 93% | Ventaja grande |

---

## Ranking FIFA Actual

| Pos | Jugador | Puntos |
|-----|---------|--------|
| 1ro | Chama | 198 |
| 2do | Facu | 126 |
| 3ro | Tomy | 118 |
| 4to | Marco | 76 |
| 5to | Lucas | 50 |
| 6to | Rafa | 35 |
| 7mo | Pedro | 21 |
| 8vo | Hector | 20 |
| 9no | Mateo | 17 |
| 10mo | Santi | 5 |
| 11vo | Kovic | 5 |

---

## Estructura del Proyecto

```
torneoTejoResistencia/
├── index.html                    # Pagina de inicio (rankings, stats, campeones)
├── simulador.html                # Simulador de torneo individual
├── partido.html                  # Simulador de partido 1vs1
├── torneos.html                  # Historial de todos los torneos (selector, se arma solo)
├── torneo1.html                  # Redireccion a torneos.html (link viejo)
├── torneo2.html                  # Redireccion a torneos.html (link viejo)
├── torneo3.html                  # Redireccion a torneos.html (link viejo)
├── enfrentamientos_directos.txt  # Historial de partidos entre jugadores (fuente del ranking FIFA)
├── formatos.md                   # Documentacion de formatos
├── README.md                     # Este archivo
├── api/
│   ├── poll.js                   # API serverless para encuestas (Redis)
│   ├── cargar-partido.js         # API serverless: agrega un partido al .txt (commit a GitHub)
│   ├── partidos.js               # API serverless: lista, edita y borra partidos
│   └── torneo-estado.js          # API serverless: guarda y lee el sorteo de un torneo
├── lib/
│   ├── github.js                 # Helpers de GitHub y formato del .txt (compartidos por /api)
│   └── torneo-formatos.js        # Formatos, fixture, repechajes y siembra de playoffs
├── torneos/                      # Sorteos de torneos en curso (JSON, creados por la app)
│   └── index.json                # Indice de torneos sorteados, para que el sitio los vea
├── app/                          # App de carga (PWA, se instala en el celular)
│   ├── index.html                # Interfaz de carga
│   ├── app.js                    # Logica de la app
│   ├── torneo.js                 # Modo Torneo (sorteo, fixture, tabla y playoffs)
│   ├── manifest.json             # Manifest de la PWA
│   └── sw.js                     # Service worker (cache del shell)
├── css/
│   ├── styles.css                # Estilos principales
│   ├── partido.css               # Estilos Partido 1vs1
│   ├── torneo.css                # Estilos Creador de Torneo
│   └── playoffs.css              # Estilos Playoffs
├── js/
│   ├── index.js                  # Logica de la pagina de inicio
│   ├── menu.js                   # Menu de navegacion
│   ├── playerSelection.js        # Componente de seleccion de jugadores
│   ├── simulador.js              # Logica de simulacion de torneos
│   ├── partido.js                # Logica de partido 1vs1
│   ├── torneo.js                 # Logica del creador de torneo
│   ├── playoffs.js               # Logica de playoffs
│   ├── rankingCalculator.js      # Calcula el ranking FIFA desde enfrentamientos_directos.txt
│   └── historial_torneos.js      # Carga y renderiza torneos historicos
└── img/
    └── favicon.png               # Icono de la aplicacion
```

---

## Escudos de los jugadores

Cada jugador puede tener su escudo al lado del nombre. Viven en `img/escudos/` y los maneja `js/escudos.js`.

**Para agregar uno nuevo, dos pasos:**

1. Guardar la imagen como `img/escudos/<nombre en minuscula>.png`.
2. Agregar el nombre a `CON_ESCUDO`, arriba de todo en `js/escudos.js`.

El segundo paso parece de mas, pero sin la lista la unica forma de saber si un escudo existe es pedirlo y que falle: serian 10 pedidos fallidos por pagina.

El que todavia no tiene el suyo usa `_generico.svg`, un escudo neutro con la corona, el borde dorado y el tejo adentro. Es SVG (2 KB) y esta dibujado para leerse a 16px: a ese tamaño no se ve detalle fino, solo la silueta.

Los originales en alta van a `img/escudos/originales/`, que el sitio no usa. Lo que se publica conviene que no pase de ~256px de lado: el de Chama bajo de 1,3 MB a 79 KB sin que se note a los tamaños en que se muestra, y con 11 jugadores esa diferencia son 14 MB por pagina.

### Donde se muestran, y donde no

El escudo mide `2.2em` (variable `--escudo-tam`), no un tamaño fijo. Todas las tablas tienen la letra ajustada al ancho real (ver `.densa` y `.densa-max`), asi que en em el escudo acompaña: a 320px mide 25px y en PC 39px.

2.2em suena mucho al lado de la letra, pero el escudo es alto y angosto: en la tabla de 10 columnas de un celular de 320px ocupa 25px de ancho, y subirlo de 1.35em a 2.2em le costo a esa tabla 9px de los 19 que le sobraban. Lo que crece es el alto de la fila, no el ancho.

Se muestran en: ranking FIFA, invictos, goleadores, Estadisticas Generales, posiciones y estadisticas de la Nations League, posiciones de grupos, de liga y de repechajes, estadisticas del torneo, los Resultados de todas las paginas, el Simulador, el partido 1vs1 y la Copa de Campeones.

**Donde se achica o se esconde**, por ancho:

| donde | tamaño | se ve desde | por que |
|---|---|---|---|
| Estadisticas del Torneo (`.densa-max`) | 1.8em | siempre | Es la tabla mas ancha del sitio, por eso 1.8 y no 2.2. A 320px entra igual: lo unico que pasa es que "Prom TG/PJ" va a dos lineas en el encabezado. |
| Ranking FIFA de la home | 1.8em hasta 413px, 2.2em arriba | 390px | La columna Racha son cinco cajitas de ancho fijo. Abajo de 390 la tabla scrollea con escudo o sin el: ya pedia 359px antes de que existieran. |
| Resultados por Fecha (index) | 1.4em | 390px | Dos escudos por fila con la letra mas grande del sitio. A 360 se pasa por 6px. |
| Resultados (Nations) | 0.9em hasta 389px, 1.4em arriba | 360px | Igual que la anterior, pero ademas lleva las barras de probabilidad de los pendientes, que tienen ancho minimo propio. |
| Campeones (mundiales y Nations) | 1.6em, 1.35em abajo de 360px | siempre | Tres columnas con la letra grande y el titulo "Subcampeon", que no se parte. En celular bajan a 1.05rem con padding 8px 4px. |
| Tarjetas del bracket | 2em, **arriba** del nombre | siempre | En celular cada tarjeta mide 126px: al costado no entra, arriba cuesta alto. El placeholder "Ganador SF1" no lleva escudo. |

### La letra de las tablas se mide contra su contenedor

Las tablas anchas tenian la letra atada al ancho de la **pantalla**, con un clamp en `vw`. Eso anda en celular, donde la tabla ocupa casi todo, pero se rompe en PC: a partir de 901px la pagina se parte en dos columnas y cada tabla recibe 257px, **menos que en un celular de 320**. El resultado es que entre 901 y 1280px casi todas se desbordaban: Estadisticas del Torneo se pasaba 159px a 901, Estadisticas Generales 146, el ranking FIFA 139.

Ahora la letra se mide en **`cqw`** (1% del ancho del contenedor, con `container-type: inline-size` en `.table-responsive`) y el padding queda en el minimo. Dos consecuencias:

- la letra crece hasta llenar el ancho disponible en vez de dejar aire entre columnas;
- deja de importar el ancho de la pantalla, asi que el mismo numero sirve en un celular, en la columna angosta de 901px y en un monitor.

Los coeficientes salen de medir, tabla por tabla y en doce anchos distintos, la letra mas grande que entra sin que la tabla scrollee. El cociente letra/contenedor resulto casi constante (Posiciones da entre 4,88% y 5,28%), asi que se toma el minimo y se redondea para abajo:

| clase | tabla | coeficiente | tope |
|---|---|---|---|
| `.densa` | Posiciones (9 columnas) | 4.8cqw | 1.5rem |
| `.densa-10` | Estadisticas de 10 columnas con titulos cortos | 3.9cqw | 1.35rem |
| `.densa-max` | Estadisticas del Torneo ("Prom TG/PJ") | 3.6cqw | 1.3rem |
| por id | las dos de campeones | 5.6cqw | 1.6rem |
| por id | ranking FIFA | 5.2cqw | 1.25rem |

El ranking FIFA es el caso raro: su columna Racha son cinco cajitas de ancho fijo, asi que achicar la letra no achica esa columna. Las cajitas tambien pasaron a medirse en cqw (`clamp(11px, 4.3cqw, 22px)`), y con eso la tabla deja de desbordarse tambien a 320 y 360px, donde scrolleaba desde siempre.

Que gano la letra, a 320px y a 1440px:

| tabla | antes | ahora |
|---|---|---|
| NL Posiciones | 11,5 / 17,6 | **14 / 24** |
| Posiciones de torneo | 11,5 / 14,1 (desbordaba) | **14 / 24** |
| Estadisticas Generales | 11,5 / 14,1 (desbordaba) | **12 / 21** |
| Estadisticas del Torneo | 10,6 / 14,1 (desbordaba) | **11 / 19** |
| Campeones | 16,8 / 20 (desbordaba) | **17 / 26** |

Verificado en 12 anchos de 320 a 1920px: **ninguna tabla se desborda**. Hay un respaldo con los clamps en vw para un navegador sin container queries.

Si una tabla cambia de columnas o le alargan un titulo, hay que volver a medir su coeficiente.

### Dos desbordes viejos que aparecieron en el camino

Buscando lugar para los escudos salieron dos problemas que no tenian nada que ver con ellos:

**Las tablas de campeones del index se desbordaban desde siempre**: la de mundiales se pasaba 74px a 320px, 34 a 360 y 4 a 390. Son tres columnas con `large-table-font` y el titulo "Subcampeon", que no se puede partir. Arreglado bajandolas en celular a 1.05rem con padding 8px 4px: ahora entran a 320px **con** escudo.

### El bug de las cajitas de Racha

Buscando lugar para el escudo del ranking aparecio que `.streak-box` tenia **dos reglas en media queries de 480px que la bajaban a 14px y nunca se aplicaron**: la regla base que la pone en 22px esta declarada mas abajo en el archivo, y con la misma especificidad gana la ultima. Las cajitas estuvieron siempre en 22px en celular, no en 14.

Arreglado con `.streak-container .streak-box` (dos clases), y puesto en **18px** en vez de los 14 originales, que al lado de la letra de la tabla quedaban muy chicas. La columna Racha pasa de 126px a 106px, y esos 20px son los que necesitaba el escudo para entrar en un celular de 390px. De paso el ranking scrollea menos: a 360px pasa de desbordar 21px a 1px.

Un criterio que vale para todo esto: **medir con el ancho real, no con `max-content`**. El primer corte de Estadisticas del Torneo (400px) salio de mirar `max-content`, que es el umbral de "no se parte nada en dos lineas", y es mas duro que el real: la tabla comprime columnas antes de scrollear. Medido de verdad, entra a 320.

Verificado a 320, 360, 390, 400, 414, 420, 430, 480 y 768px: ninguna tabla scrollea ni parte celdas, y en el corte mas ajustado quedan 5px.

La app (`/app`) todavia no muestra escudos.

## Archivos de Configuracion

### enfrentamientos_directos.txt
Historial de partidos jugados. Es la unica fuente de datos: a partir de este archivo, `js/rankingCalculator.js` calcula el ranking FIFA de cada jugador en el navegador (sistema anti-inflacion, ver `Ranking_FIFA_EXPLICADO.md`). Ya no existe un `ranking.txt` separado para editar a mano.
```
jugador1,jugador2,resultado_j1,marcador,torneo,fecha,fase
Chama,Rafa,G,7-2,Primer torneo de hockey de mesa,3/5/2025,Final
```

---

## App de Carga (`/app`)

PWA personal para cargar partidos amistosos de la Tejo Nations League desde el celular, sin tocar una computadora. Esta aislada del sitio: no aparece en el menu y no comparte estilos ni scripts con las demas paginas.

- **URL**: https://torneo-tejo-resistencia.vercel.app/app/
- **Instalacion**: abrir esa URL en el celular y elegir "Agregar a pantalla de inicio". Queda con icono propio y se abre en pantalla completa.
- **Como carga**: como en el tejo siempre se juega a 7, el ganador siempre hace 7 goles. Entonces alcanza con tocar ganador, perdedor y los goles del perdedor (0-6).
- **Cinco modos**: "uno" (commitea al instante), "tanda" (vas armando la lista de la jornada y despues se suben todos), "historial" (editar o borrar partidos ya cargados), "jornada" (ver abajo) y "torneo" (ver abajo). La tanda queda guardada en el celular, asi que no se pierde si se cierra la app o se corta la señal.
- **Que hace**: cada partido se agrega como una linea nueva en `enfrentamientos_directos.txt` mediante un commit directo a `master` via la API de GitHub (un commit por partido). Vercel redeploya solo y el sitio queda actualizado.

### Editar y borrar

Desde el modo "historial" se listan los ultimos partidos (por defecto solo amistosos, con un filtro para ver todos) y cada uno se puede editar o borrar.

Para identificar que linea tocar, la app manda el **numero de linea** mas el **contenido esperado** de esa linea. El numero dice cual y el contenido confirma que el archivo no cambio en el medio: si no coinciden, el endpoint devuelve 409 y no modifica nada. Esto importa porque el archivo tiene lineas repetidas (partidos identicos jugados el mismo dia), asi que buscar solo por contenido seria ambiguo y podria borrar el partido equivocado.

Al editar se conservan el `torneo` y la `fase` originales, asi tambien se pueden corregir partidos de torneos sin convertirlos sin querer en amistosos.

### Endpoints

| Metodo | Ruta | Que hace |
|---|---|---|
| `POST` | `/api/cargar-partido` | Agrega un partido al final del archivo |
| `GET` | `/api/partidos?limit=25&torneo=Amistoso` | Lista los partidos mas recientes con su indice de linea |
| `PUT` | `/api/partidos` | Reemplaza la linea indicada (`indice` + `lineaEsperada` + `partido`) |
| `DELETE` | `/api/partidos` | Borra la linea indicada (`indice` + `lineaEsperada`), o todos los partidos de un torneo (`torneo`) en un solo commit |
| `GET` | `/api/jornada` | Lista las jornadas abiertas de la Nations League |
| `PUT` | `/api/jornada` | Abre o actualiza una jornada (`fecha` + `jugadores`) |
| `DELETE` | `/api/jornada` | Cierra la jornada de esa `fecha` |

La logica compartida de GitHub y del formato del archivo vive en `lib/github.js` (fuera de `/api`, porque cada archivo dentro de `/api` se vuelve una funcion serverless).

### Variables de entorno (configurar en Vercel)

| Variable | Requerida | Default | Descripcion |
|---|---|---|---|
| `GITHUB_TOKEN` | Si | - | Personal Access Token con permiso `contents: write` sobre el repo |
| `GITHUB_OWNER` | No | `x-chama-x` | Dueño del repo |
| `GITHUB_REPO` | No | `torneoTejoResistencia` | Nombre del repo |
| `GITHUB_BRANCH` | No | `master` | Rama donde se commitea |

Sin `GITHUB_TOKEN` configurado, la app responde error 500 al intentar cargar un partido.

> **Nota**: el endpoint no tiene autenticacion, igual que el `cargar.html` viejo. Cualquiera que conozca la URL puede cargar partidos.

---

## Historial de Torneos (`torneos.html`)

Una sola pagina muestra el historial de **cualquier** torneo. La lista sale de `enfrentamientos_directos.txt`: cada valor distinto de la columna `torneo` (salvo "Amistoso") aparece como un boton en el selector, ordenado por la fecha de su primer partido.

Esto quiere decir que **un torneo nuevo aparece solo**, apenas se carga su primer partido. No hay que crear una pagina ni agregar nada al menu, como pasaba antes con `torneo1/2/3.html`.

El formato tambien se deduce del archivo: si alguna fase dice `Fase de Liga` se dibuja la tabla de liga, y si dicen `Fase de Grupos (X)` se dibujan las tablas por grupo. Los archivos `torneo1.html`, `torneo2.html` y `torneo3.html` quedaron como redirecciones para no romper links viejos.

### Partidos por jugar

Los partidos que **todavia no se jugaron** no van en una seccion aparte: se dibujan en el mismo lugar donde va a ir su resultado cuando se jueguen, con una barra de probabilidad en vez del marcador.

| Instancia | Donde aparece |
|---|---|
| Fase de liga y de grupos | Una fila mas en la tabla de Resultados |
| Semifinales, final y tercer puesto | La tarjeta del bracket, igual que en la pagina de Playoffs |
| Repechajes y eliminatorio | Como la liga, en su tabla de Resultados |

Mientras las semifinales estan sorteadas pero sin jugar, la final **tampoco queda vacia**: muestra "Ganador SF1 vs Ganador SF2" y, debajo, la probabilidad de cada uno de los cuatro de salir campeon. No se simula, se calcula exacto: la chance de ganar su semi por la chance de ganarle a cada rival posible, pesada por lo probable que sea enfrentar a cada uno. Las cuatro suman 100%. El tercer puesto hace lo mismo con "Perdedor SF1 vs Perdedor SF2".

En cuanto se carga **una** semifinal, las dos tarjetas se actualizan: el ganador aparece con su nombre en la final (y el perdedor en el tercer puesto), el que quedo afuera se muestra tachado como "eliminado", y las probabilidades se recalculan entre los que siguen vivos. Una semi ya jugada deja de ser un azar: el que gano pasa con probabilidad 1 y el que perdio queda en 0, y las cuentas salen solas de ahi.

En **celular** el bracket sigue siendo un bracket: las dos semifinales a la izquierda, la final a la derecha y las lineas uniendolas. Lo que no entraba era el contenido de las tarjetas, que venia dimensionado para la vieja `playoffs.html`, donde las tarjetas eran del doble de ancho. Abajo de 600px (`css/styles.css`):

- el panel de playoffs usa menos padding, asi cada columna gana 8px;
- los dos nombres se reparten la fila en partes iguales y pueden cortar en dos lineas, asi "Ganador SF1" entra como "Ganador / SF1" en vez de salirse de la tarjeta;
- los badges de porcentaje pierden el `min-width: 64px`, que entre los dos pedian mas ancho del que tenia la tarjeta entera;
- los candidatos al titulo pasan a dos renglones (nombre y % arriba, barra abajo a todo el ancho), en `torneos.html`.

La barra de cada candidato pasa de 16px a 145px, que es la diferencia entre verse y no verse. Aguanta hasta 320px, donde cada tarjeta queda en 126px y las cuatro lineas del bracket se siguen dibujando.

Las tablas de posiciones se dibujan con **todos los jugadores del sorteo en cero**, asi el torneo se ve completo desde el minuto uno y se va llenando solo. El aviso de empate multiple no aparece mientras nadie haya jugado (si no, al arranque saltaria siempre, con todos en cero).

La probabilidad usa la misma formula que el Creador de Torneo: Ranking FIFA 40% + winrate 60%, ajustado por el historial entre esos dos y pasado por una sigmoide.

### Como se pesa el mano a mano

El ajuste por enfrentamiento directo tiene un tope del 40%, y llega a ese tope de a poco segun cuantas veces se enfrentaron: `0.4 * n / (n + 4)`. Con 2 cruces pesa 0,13; con 8, 0,27; y nunca pasa de 0,4. Es la misma idea de los partidos fantasma del PG\* de la Nations League: con pocos datos, tira al centro.

Antes el peso era `n / (el par que mas se enfrento en todo el historial)`, y eso tenia un problema: los mismos partidos entre dos valian cada vez menos a medida que **otro** par seguia jugando. El 3-0 de Marco contra Facu aportaba 15 puntos con el maximo en 8 y habria aportado 4 con el maximo en 30, sin que esos tres partidos cambiaran en nada.

Medido sobre 67 partidos del historial, prediciendo cada uno solo con lo jugado antes, los dos pesos dan casi lo mismo (Brier 0,2338 contra 0,2307; 43 y 42 aciertos). El cambio no es por precision sino porque el peso ahora depende solo de ese cruce y no se degrada solo con el tiempo.

### Donde vive la formula

La formula vive **solo en `js/probabilidades.js`**, en tres funciones:

| funcion | que hace |
|---|---|
| `fuerzaBase(ranking, winRate)` | ranking 40% + winrate 60% |
| `ajustePorCruce(v1, v2)` | lo que suma o resta el mano a mano |
| `probabilidadEntre(j1, j2, historial, opciones)` | la sigmoide, con todo junto |

Las paginas que la usan llaman a `probabilidadEntre()`, y **todas con la misma suavidad**, `PROB_K = 60`. Lo unico que cambia de pagina en pagina es el ajuste por bicampeonato de `js/campeon.js`, que va por opcion (`{ campeon: true }`) porque solo tiene sentido donde hay un torneo con campeon defensor:

| pagina | campeon |
|---|---|
| Nations League, Torneos (paginas de datos) | no |
| Simulador (`simulador.js`) | si |
| Cargar Partido (`partido.js`) | no |

Antes estaba copiada y pegada en cinco archivos (los tres de arriba mas los ya borrados `torneo.js` y `playoffs.js`), y cada cambio habia que hacerlo cinco veces o dos paginas mostraban numeros distintos para el mismo cruce. La unificacion se hizo en dos pasos: primero juntar el calculo sin tocar ningun numero (verificado identico bit a bit sobre los 110 cruces reales del historial y sobre una grilla de 13.125 combinaciones de ranking, winrate, mano a mano y campeon), y despues pasar todo a `k = 60`.

### Por que todo usa la misma k

El 30 era el valor original de todo el sitio. Cuando se midio que las predicciones estaban **sobreconfiadas** (los cruces anunciados al 80-90% se cumplian el 57% de las veces) se subio a 60, pero solo en `js/probabilidades.js`, que es lo que ven las paginas de datos. Los simuladores quedaron en 30 por inercia, no por una razon medida: no existia ninguna calibracion que justificara mostrar un 92% en el Creador y un 78% en Playoffs para el mismo cruce.

Con `k = 60` en todas, la ventaja promedio del favorito sobre los 55 cruces del roster pasa de **75,6% a 65,3%**, y el cruce mas desparejo de 96,3% a 83,5%. En el simulador eso reparte el titulo: en un round-robin de 8 (20.000 simulaciones) el favorito baja de 58,3% a 44,2% y los del medio de la tabla pasan de no existir (2,8%, 2,5%, 1,1%) a tener chance real (8,3%, 6,3%, 4,3%). Es lo mismo que paso con las paginas de datos: no cambia **quien** es favorito en ningun cruce, cambia cuanto.

**`js/campeon.js` tiene que usar la misma `k`**, y no por prolijidad: su λ se multiplica por `k` justamente porque despues la sigmoide divide por `k`, asi lo que queda en log-cuota es `ln(M)·w/n`, limpio de `k`. Si las dos se separan, el castigo al campeon se escala solo. Por eso `c.k` sale de `PROB_K`, y la `k` entra en la clave del cache de calibracion. Verificado: al duplicar `k`, λ de semifinal pasa de −44,8 a −88,0 (exactamente el doble) y el factor calibrado queda igual (×1,80 contra ×1,76, dentro del ruido del Monte Carlo), o sea la maldicion sigue apuntando al mismo multiplicador de cuota de 8.

Las paginas que no la cargaban (`simulador.html` y `partido.html`) ahora incluyen `js/probabilidades.js` **antes** de su propio script.

El fixture sale del sorteo guardado en `torneos/<slug>.json`, asi que un torneo **recien sorteado ya se ve completo** aunque no tenga ni un partido jugado. Como el sitio es estatico y no puede listar esa carpeta, `api/torneo-estado.js` mantiene `torneos/index.json` al crear y borrar torneos.

Para los torneos viejos, que no tienen JSON de sorteo, igual se detecta el partido por el **tercer puesto** que haya quedado sin jugar: si hay dos semis y final pero no Tercer Puesto, el cruce son los dos perdedores de semis.

La formula no incluye el ajuste por bicampeonato de `js/campeon.js`, que el Creador aplica despues de calibrarlo; por eso puede haber diferencias chicas cuando juega el campeon defensor.

### Desempate en la tabla

El orden es: puntos (goles a favor), diferencia de gol, goles a favor. Si dos jugadores quedan empatados en los tres, desempata el **enfrentamiento directo** entre ellos.

Con tres o mas empatados no se aplica, porque el mano a mano puede ser circular (A le gana a B, B a C y C a A) y no existiria un orden valido. En ese caso la tabla muestra un aviso para definir ese tramo a mano.

### Video del partido

Las tarjetas de los partidos que tienen video grabado se vuelven clickeables y lo abren en un modal (`js/reproductor.js`). El mapa de que partido tiene que video esta en `js/videos.js`, indexado por nombre de torneo y fase, asi que sirve para cualquier instancia, no solo las finales.

Los videos **no van en el repo**: los originales de las finales pesan ~300 MB cada uno y GitHub rechaza cualquier archivo de mas de 100 MB (Vercel tampoco sirve estaticos de ese tamaño). Viven en un store **publico** de Vercel Blob y la pagina los pide por URL. `img/Videos/` esta en el `.gitignore` para que no se suban por accidente.

Antes de subir uno hay que recomprimirlo. Los que salen del celular vienen en HEVC/H.265 a 12 Mbps, y HEVC no lo reproduce cualquier navegador:

```bash
ffmpeg -i original.mp4 -vf "scale=-2:720" -r 30 \
       -c:v libx264 -preset veryfast -crf 27 -pix_fmt yuv420p \
       -c:a aac -b:a 96k -movflags +faststart salida.mp4
```

Eso deja los 300 MB en ~35 MB sin tocar la duracion. El `-movflags +faststart` es el que permite que el video arranque sin bajarse entero.

Dos detalles del reproductor que importan por el cupo de Blob (el plan Hobby incluye 1 GB de almacenamiento y 10 GB de transferencia por mes): el `<video>` se crea **sin** `src` y recien se le pone la URL al abrir el modal, asi entrar a la pagina no descarga nada; y al cerrar se vacia el `src`, porque si no el navegador sigue bajando en segundo plano con el modal ya cerrado.

---

## Tejo Nations League (`nationsleague.html`)

Liga anual armada con los partidos cargados como `Amistoso` en `enfrentamientos_directos.txt`. Cada año calendario es una edicion distinta, que se elige con el selector de año.

### Jornadas

Los resultados se agrupan por fecha: **cada dia que se juntaron a jugar es una jornada**. No hay un calendario armado de antemano (la liga son amistosos sueltos, que se juegan cuando pinta), asi que la jornada se deduce de la fecha del partido. Se numeran en orden cronologico dentro de la edicion, o sea que la Jornada 1 es la primera vez que se juntaron ese año.

Se ve **una jornada por vez, con flechas**, igual que los resultados por fecha del index: apiladas se amontonaban, porque una sola jornada puede tener 7 partidos. Se entra en la mas reciente y la flecha izquierda va para atras en el tiempo. Adentro de cada jornada los partidos van en el orden en que se jugaron.

Se agrupa por una **clave numerica AAAAMMDD** (`clave`, que arma `parsearAmistosos`) y no por el texto de la fecha, porque en el `.txt` conviven `15/05/2026` y `2/4/2026`: como texto son dos formatos distintos, como numero son el mismo dia.

### Tabla de posiciones

Ordena por **PG\*** (promedio ajustado), no por el promedio en bruto. El calculo esta en `js/nationsLeagueCalculator.js`, compartido con el Historial de ganadores de `index.html`.

---

## Modo Jornada (en la app)

Para los dias que el grupo se junta a jugar amistosos. Se marca quienes vinieron (**cualquier cantidad, desde 2**) y la app arma **todos los cruces posibles**, que despues se cargan uno por uno igual que el fixture de un torneo. Con 7 jugadores son 21 partidos; con 5, 10.

El orden sale de `ordenarParaQueDescansen()`, la misma funcion que ordena el fixture de los torneos, asi nadie juega dos partidos seguidos.

Con **3 o 4 jugadores no se puede evitar del todo**, y no es cuestion de buscar mejor: con 4 hay 6 partidos y cada uno tiene exactamente un rival disjunto (la pareja complementaria), asi que el grafo de compatibilidad son tres aristas sueltas y no hay forma de recorrer los 6 encadenados. Lo mejor posible son 2 repeticiones. La busqueda va por presupuesto (primero intenta con cero, despues permitiendo una, dos...) y devuelve el que menos repite; la app avisa en el hint cuando se eligen 3 o 4.

### Que se guarda

`jornadas/index.json` guarda **solo la fecha y quienes vinieron**. Los cruces no se guardan, se deducen (son todos contra todos), y los resultados tampoco: van a `enfrentamientos_directos.txt` como amistosos, igual que siempre. O sea:

```
cruces      = todos contra todos entre los jugadores de la jornada
jugados     = los amistosos del .txt con esa misma fecha
pendientes  = cruces - jugados
```

Por eso se puede cerrar la app, quedarse sin bateria o seguir desde otro telefono sin perder nada: la app baja la jornada y el `.txt` y aparece donde estaba. Es la misma idea que el modo Torneo.

### Si cae alguien tarde

"Cambiar jugadores" edita el plantel de una jornada ya empezada. Como los cruces se deducen de la lista, sumar a alguien hace aparecer sus partidos como pendientes y no toca nada de lo ya jugado. La fecha no se puede cambiar, porque es lo que identifica a la jornada en el archivo.

A quien **ya jugo** no se lo puede sacar (queda marcado con un ✓): sus partidos estan en el `.txt` con esa fecha y, si se lo quitara del plantel, la app dejaria de reconocerlos como parte de la jornada aunque sigan ahi. A los que todavia no jugaron si, por si alguien se fue antes.

Todas las jornadas abiertas entran en un solo archivo porque son cuatro datos: no hace falta un archivo por jornada mas un indice, como si pasa con los torneos.

### Varias jornadas a la vez

Se pueden dejar **varias armadas de antes**, una por dia: si el finde te juntas sabado y domingo, armas las dos el viernes y cada dia abris la que toca. Se guardan en el mismo archivo, indexadas por fecha, y cada una lleva su propio plantel y su propio avance.

Al entrar al modo, la app decide sola:

| Jornadas abiertas | Que muestra |
|---|---|
| ninguna | la pantalla para armar una |
| una | esa, directo |
| varias, y una es de hoy | la de hoy, directo |
| varias, ninguna de hoy | la lista, para elegir |

Desde una jornada abierta, el boton de abajo vuelve a la lista (y de ahi se puede armar otra).

En la pagina aparecen todas las abiertas, cada una como su propia jornada, con un cartelito segun la fecha:

| Fecha de la jornada | Cartel |
|---|---|
| hoy | **EN CURSO** (ambar) |
| todavia no llego | **PROGRAMADA** (azul) |
| ya paso y sigue abierta | **SIN TERMINAR** (gris) |

Una armada para el viernes no dice "en curso" el jueves, y una que quedo abierta de un dia que ya paso se nota a simple vista: ese es el recordatorio de que falta cerrarla.

La pagina **entra en la jornada mas proxima a jugarse**, que es lo que interesa mirar antes de ir: con la del viernes y la del sabado armadas, el jueves abre en la del viernes y el viernes sigue abriendo en esa. Si no queda ninguna por jugar, abre en la ultima que se jugo, como siempre. La linea de arriba resume lo mismo en palabras ("13 partidos amistosos jugados en esta edicion · 2 jornadas programadas", "· 1 jornada en curso y 1 programada").

### En la pagina

Mientras la jornada esta abierta, la Nations League la muestra como una jornada mas, marcada **EN CURSO**, con los partidos ya jugados arriba y los que faltan abajo, cada uno con su barra de probabilidad (la misma formula que el Creador de Torneo). Las tablas de posiciones y estadisticas **no** cuentan los pendientes: solo lo jugado.

Cerrar la jornada desde la app la saca del archivo y con eso desaparecen los pendientes de la pagina. Los partidos cargados quedan, obviamente, porque viven en el `.txt`.

---

## Modo Torneo (en la app)

Permite llevar un torneo entero desde el celular: sorteo, fixture, carga de resultados, tabla en vivo y playoffs. Soporta los cinco formatos (6, 7, 8, 9 y 10 jugadores).

### Como se guarda el estado

El JSON en `torneos/<slug>.json` guarda **solo el sorteo**: nombre, formato, fecha y quien quedo en que grupo. Es lo unico que no se puede deducir de otro lado. Los resultados NO se guardan ahi: viven en `enfrentamientos_directos.txt`, que sigue siendo la unica fuente de verdad.

Todo lo demas se deduce cruzando las dos cosas:

| Dato | De donde sale |
|---|---|
| Fixture | sorteo + formato (`lib/torneo-formatos.js`) |
| Partidos jugados | los que estan en el `.txt` con ese nombre de torneo |
| Pendientes | fixture menos jugados |
| Tabla | `processStandings` de `js/historial_torneos.js`, la misma funcion que usa el sitio |

Gracias a eso no hay nada que sincronizar: si cambiaś de celular, la app baja el sorteo y el `.txt` y aparece exactamente donde estabas. Y la tabla de la app nunca puede diferir de la de la web, porque es literalmente el mismo codigo.

### Flujo

1. **Crear**: formato, jugadores y sorteo de grupos. Se commitea el JSON del sorteo.
2. **Fase regular**: todos contra todos (por grupo si el formato los tiene). Cada resultado se commitea al `.txt` apenas se carga.

   El orden del fixture esta armado para que **nadie juegue dos partidos seguidos**. Como se juega en una sola mesa, los partidos van uno atras del otro: si el fixture saliera en el orden natural, a alguno le tocaria jugar dos veces seguidas (en los tres torneos anteriores paso 3, 4 y 3 veces). Cuando hay varios grupos se intercalan entre si, que es lo que permite resolverlo siempre. El algoritmo es determinista, asi que la app y el sitio arman el mismo orden sin ponerse de acuerdo.
3. **Repechajes** (solo formato de 9): cuando termina la fase de grupos, los tres segundos juegan una mini-liga y los tres terceros otra. Los ganadores definen el ultimo lugar de playoffs en el **Partido Eliminatorio**.
4. **Semifinales**: **se sortean**, no se siembran. Cuando termina la fase regular, la app muestra los cuatro clasificados y un boton para sortear los cruces. Es lo que se hizo en los tres torneos anteriores (ninguno uso la siembra 1v4 / 2v3).

   El sorteo queda **guardado en el JSON del torneo**, junto al de los grupos. Tiene que guardarse justamente porque es al azar: si se recalculara, la app y el sitio armarian cada uno un bracket distinto a partir del mismo torneo. Mientras no se sortee, el sitio muestra los clasificados con un aviso en el lugar del bracket.
5. **Final y tercer puesto**: salen de las dos semis. **El tercer puesto va siempre**, para que no vuelva a pasar lo del Tercer torneo, donde se lo saltearon por olvido.

### Borrar un torneo

El boton "Borrar torneo" elimina el sorteo y todos sus partidos del `.txt` en un solo commit cada uno. Sirve para deshacer un torneo de prueba o uno que salio mal: el `.txt` queda **exactamente** como estaba antes, byte por byte, y como el Ranking FIFA se recalcula de cero en cada carga de pagina, tambien vuelve solo a su estado anterior.

Los amistosos no se pueden borrar en masa (seria borrar la Tejo Nations League entera): el endpoint lo rechaza.

### Partidos pendientes de torneos viejos

Si un torneo tiene dos semifinales y final pero no tiene `Tercer Puesto`, la app lo detecta y ofrece cargarlo: el cruce son los dos perdedores de semis. Es el caso del Tercer torneo (Chama vs Marco).

### Fases que escribe

Estas cadenas van tal cual al `.txt` y **no son cosmeticas**: `historial_torneos.js` detecta el formato preguntando si alguna fase es exactamente `Fase de Liga`, y `rankingCalculator.js` reparte los puntos base del Ranking FIFA segun la fase.

| Fase | Puntos base |
|---|---|
| `Fase de Liga`, `Fase de Grupos (A/B/C)` | 20 |
| `Repechaje 2° Puestos`, `Repechaje 3° Puestos` | 20 |
| `Partido Eliminatorio` | 30 |
| `Semifinal`, `Tercer Puesto`, `Final` | 30 |

---

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: API serverless con Node.js (Vercel Functions)
- **Hosting**: GitHub Pages / Vercel

---

## Instalacion y Uso

### Opcion 1: GitHub Pages (Recomendado)
El proyecto funciona directamente en: https://x-chama-x.github.io/torneoTejoResistencia/

### Opcion 2: Servidor Local
```bash
# Con Python
python -m http.server 8000

# Con Node.js
npx serve

# Con VS Code
# Usar extension "Live Server"
```

Luego abrir `http://localhost:8000` en el navegador.

### Para actualizar el ranking:
1. Agregar el partido jugado como una nueva linea en `enfrentamientos_directos.txt`
2. Recargar la pagina: el ranking FIFA se recalcula automaticamente

---

## Notas

- Los playoffs siempre incluyen semifinales, partido por el tercer puesto y final
- El precio por partido es de $1,200 fijo en todos los formatos
- El win rate tiene mas peso (60%) que el ranking (40%) porque refleja mejor el rendimiento real
- La funcion sigmoide permite que siempre haya chance de upset (nunca 0% ni 100%)

---

*Desarrollado por x_chama_x*
