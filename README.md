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
| `torneo1.html` | **Primer Torneo** - Historial del primer torneo oficial (Liga) |
| `torneo2.html` | **Segundo Torneo** - Historial del segundo torneo oficial (Grupos) |
| `torneo3.html` | **Tercer Torneo** - Historial del tercer torneo oficial (Liga 6 jugadores) |

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
├── torneo1.html                  # Historial del primer torneo
├── torneo2.html                  # Historial del segundo torneo
├── enfrentamientos_directos.txt  # Historial de partidos entre jugadores (fuente del ranking FIFA)
├── formatos.md                   # Documentacion de formatos
├── README.md                     # Este archivo
├── api/
│   ├── poll.js                   # API serverless para encuestas (Redis)
│   ├── cargar-partido.js         # API serverless: agrega un partido al .txt (commit a GitHub)
│   └── partidos.js               # API serverless: lista, edita y borra partidos
├── lib/
│   └── github.js                 # Helpers de GitHub y formato del .txt (compartidos por /api)
├── app/                          # App de carga (PWA, se instala en el celular)
│   ├── index.html                # Interfaz de carga de amistosos
│   ├── app.js                    # Logica de la app
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
- **Tres modos**: "uno por uno" (commitea al instante), "tanda" (vas armando la lista de la jornada y despues se suben todos) e "historial" (editar o borrar partidos ya cargados). La tanda queda guardada en el celular, asi que no se pierde si se cierra la app o se corta la señal.
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
| `DELETE` | `/api/partidos` | Borra la linea indicada (`indice` + `lineaEsperada`) |

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
