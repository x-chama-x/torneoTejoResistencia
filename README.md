# Torneo Air Hockey - La Resistencia

**Plataforma web completa para gestionar torneos de Air Hockey (Tejo) del grupo "La Resistencia" (amigos de x_chama_x).**

> Link: https://x-chama-x.github.io/torneoTejoResistencia/index.html

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
- **Sistema de Encuestas**: Votacion para predecir el proximo campeon (con backend Redis)

La aplicacion utiliza un sistema de probabilidades basado en una **funcion sigmoide** que combina el ranking FIFA (40%) y el win rate historico (60%) para calcular las chances de victoria en cada partido.

---

## Paginas de la Aplicacion

| Pagina | Descripcion |
|--------|-------------|
| `index.html` | **Inicio** - Rankings, estadisticas generales, historial de campeones y encuesta |
| `torneo.html` | **Creador de Torneo** - Sorteo de grupos con probabilidades en tiempo real |
| `simulador.html` | **Simulador de Torneo** - Simula torneos completos con resultados detallados |
| `montecarlo.html` | **Simulador Monte Carlo** - Analisis estadistico con miles de simulaciones |
| `partido.html` | **Simulador 1vs1** - Enfrentamientos directos con historial |
| `playoffs.html` | **Playoffs** - Configuracion de brackets para semifinales y final |
| `torneo1.html` | **Primer Torneo** - Historial del primer torneo oficial (Liga) |
| `torneo2.html` | **Segundo Torneo** - Historial del segundo torneo oficial (Grupos) |

---

## Caracteristicas Principales

### Pagina de Inicio (`index.html`)
- **Ranking FIFA**: Tabla de posiciones con puntos y racha actual de cada jugador
- **Ranking Historico**: Puntos acumulados en mundiales (goles)
- **Estadisticas Generales**: PJ, G, P, WR, GF, GC, DIF, PG de todos los partidos
- **Historial de Campeones**: Lista de ganadores de cada torneo
- **Encuesta**: Sistema de votacion para predecir el proximo campeon

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
├── index.html                    # Pagina de inicio (rankings, stats, encuesta)
├── torneo.html                   # Creador de torneo (sorteo de grupos)
├── simulador.html                # Simulador de torneo individual
├── montecarlo.html               # Simulador Monte Carlo
├── partido.html                  # Simulador de partido 1vs1
├── playoffs.html                 # Configurador de playoffs
├── torneo1.html                  # Historial del primer torneo
├── torneo2.html                  # Historial del segundo torneo
├── ranking.txt                   # Archivo con el ranking FIFA (editable)
├── enfrentamientos_directos.txt  # Historial de partidos entre jugadores
├── formatos.md                   # Documentacion de formatos
├── README.md                     # Este archivo
├── api/
│   └── poll.js                   # API serverless para encuestas (Redis)
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
│   └── historial_torneos.js      # Carga y renderiza torneos historicos
└── img/
    └── favicon.png               # Icono de la aplicacion
```

---

## Archivos de Configuracion

### ranking.txt
Contiene el ranking de jugadores en formato CSV:
```
# Comentarios empiezan con #
nombre,ranking,winRate,promedioGoles
Chama,198,0.7368,6.47
Facu,126,0.6154,5.92
```

### enfrentamientos_directos.txt
Historial de partidos jugados:
```
jugador1,jugador2,resultado_j1,marcador,torneo,fecha,fase
Chama,Rafa,G,7-2,Primer torneo de hockey de mesa,3/5/2025,Final
```

---

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: API serverless con Node.js (Vercel Functions)
- **Base de datos**: Redis (para sistema de encuestas)
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
1. Editar el archivo `ranking.txt` con los nuevos datos
2. Recargar la pagina del simulador

---

## Notas

- Los playoffs siempre incluyen semifinales, partido por el tercer puesto y final
- El precio por partido es de $1,200 fijo en todos los formatos
- El win rate tiene mas peso (60%) que el ranking (40%) porque refleja mejor el rendimiento real
- La funcion sigmoide permite que siempre haya chance de upset (nunca 0% ni 100%)

---

*Desarrollado por x_chama_x*
