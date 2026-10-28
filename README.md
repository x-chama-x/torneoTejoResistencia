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
| `torneo.html` | **Creador de Torneo** - Sorteo de grupos con probabilidades en tiempo real |
| `simulador.html` | **Simulador de Torneo** - Simula torneos completos con resultados detallados |
| `montecarlo.html` | **Simulador Monte Carlo** - Analisis estadistico con miles de simulaciones |
| `partido.html` | **Simulador 1vs1** - Enfrentamientos directos con historial |
| `playoffs.html` | **Playoffs** - Configuracion de brackets para semifinales y final |
| `torneos.html` | **Torneos** - Historial de todos los torneos, con selector. Se arma solo leyendo `enfrentamientos_directos.txt` |

---

## Caracteristicas Principales

### Pagina de Inicio (`index.html`)
- **Ranking FIFA**: Tabla de posiciones con puntos y racha actual de cada jugador
- **Ranking Historico**: Puntos acumulados en mundiales (goles)
- **Estadisticas Generales**: PJ, G, P, WR, GF, GC, DIF, PG de todos los partidos
- **Historial de Campeones**: Lista de ganadores de cada torneo

### Creador de Torneo (`torneo.html`)
- Sorteo de grupos aleatorio
- Calculo de probabilidades de clasificacion en tiempo real
- Visualizacion de los grupos generados
- Soporte para formatos de 7, 8, 9 y 10 jugadores

### Simulador de Torneo (`simulador.html`)
- Simula un torneo completo con resultados partido a partido
- Muestra fase de grupos, playoffs, semifinales, tercer puesto y final
- **Armado manual de grupos**: Permite elegir que jugadores van a cada grupo
- Sorteo aleatorio o configuracion manual

### Simulador Monte Carlo (`montecarlo.html`)
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

### Playoffs (`playoffs.html`)
- Seleccion de 4 jugadores clasificados
- Configuracion del bracket (sorteo aleatorio o manual)
- Visualizacion de cruces con probabilidades de cada partido
- Calculo de probabilidades del campeon

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
├── torneo.html                   # Creador de torneo (sorteo de grupos)
├── simulador.html                # Simulador de torneo individual
├── montecarlo.html               # Simulador Monte Carlo
├── partido.html                  # Simulador de partido 1vs1
├── playoffs.html                 # Configurador de playoffs
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
│   ├── montecarlo.css            # Estilos Monte Carlo
│   ├── partido.css               # Estilos Partido 1vs1
│   ├── torneo.css                # Estilos Creador de Torneo
│   └── playoffs.css              # Estilos Playoffs
├── js/
│   ├── index.js                  # Logica de la pagina de inicio
│   ├── menu.js                   # Menu de navegacion
│   ├── playerSelection.js        # Componente de seleccion de jugadores
│   ├── simulador.js              # Logica de simulacion de torneos
│   ├── montecarlo.js             # Logica de simulaciones multiples
│   ├── partido.js                # Logica de partido 1vs1
│   ├── torneo.js                 # Logica del creador de torneo
│   ├── playoffs.js               # Logica de playoffs
│   ├── rankingCalculator.js      # Calcula el ranking FIFA desde enfrentamientos_directos.txt
│   └── historial_torneos.js      # Carga y renderiza torneos historicos
└── img/
    └── favicon.png               # Icono de la aplicacion
```

---

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
- **Cuatro modos**: "uno" (commitea al instante), "tanda" (vas armando la lista de la jornada y despues se suben todos), "historial" (editar o borrar partidos ya cargados) y "torneo" (ver abajo). La tanda queda guardada en el celular, asi que no se pierde si se cierra la app o se corta la señal.
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

Mientras las semifinales estan sorteadas pero sin jugar, la final **tampoco queda vacia**: muestra "Ganador SF1 vs Ganador SF2" y, debajo, la probabilidad de cada uno de los cuatro de salir campeon. No se simula, se calcula exacto: la chance de ganar su semi por la chance de ganarle a cada rival posible, pesada por lo probable que sea enfrentar a cada uno. Las cuatro suman 100%. El tercer puesto hace lo mismo con "Perdedor SF1 vs Perdedor SF2".

En cuanto se carga **una** semifinal, las dos tarjetas se actualizan: el ganador aparece con su nombre en la final (y el perdedor en el tercer puesto), el que quedo afuera se muestra tachado como "eliminado", y las probabilidades se recalculan entre los que siguen vivos. Una semi ya jugada deja de ser un azar: el que gano pasa con probabilidad 1 y el que perdio queda en 0, y las cuentas salen solas de ahi.
| Repechajes y eliminatorio | Como la liga, en su tabla de Resultados |

Las tablas de posiciones se dibujan con **todos los jugadores del sorteo en cero**, asi el torneo se ve completo desde el minuto uno y se va llenando solo. El aviso de empate multiple no aparece mientras nadie haya jugado (si no, al arranque saltaria siempre, con todos en cero).

La probabilidad usa la misma formula que el Creador de Torneo: Ranking FIFA 40% + winrate 60%, ajustado por el historial entre esos dos y pasado por una sigmoide.

El fixture sale del sorteo guardado en `torneos/<slug>.json`, asi que un torneo **recien sorteado ya se ve completo** aunque no tenga ni un partido jugado. Como el sitio es estatico y no puede listar esa carpeta, `api/torneo-estado.js` mantiene `torneos/index.json` al crear y borrar torneos.

Para los torneos viejos, que no tienen JSON de sorteo, igual se detecta el partido por el **tercer puesto** que haya quedado sin jugar: si hay dos semis y final pero no Tercer Puesto, el cruce son los dos perdedores de semis.

La formula no incluye el ajuste por bicampeonato de `js/campeon.js`, que el Creador aplica despues de calibrarlo; por eso puede haber diferencias chicas cuando juega el campeon defensor.

### Desempate en la tabla

El orden es: puntos (goles a favor), diferencia de gol, goles a favor. Si dos jugadores quedan empatados en los tres, desempata el **enfrentamiento directo** entre ellos.

Con tres o mas empatados no se aplica, porque el mano a mano puede ser circular (A le gana a B, B a C y C a A) y no existiria un orden valido. En ese caso la tabla muestra un aviso para definir ese tramo a mano.

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
