# 🏒 Simulador de Torneo Air Hockey

Simulador web para torneos de la RESISTENCIA (amigos de x_chama_x) de Air Hockey (Tejo) que permite simular competencias entre jugadores con diferentes formatos de torneo y análisis estadístico mediante simulaciones Monte Carlo.
Link: https://x-chama-x.github.io/torneoTejoResistencia/index.html

## 🎮 Características

### Simulador de Torneo Individual
- Simula un torneo completo con resultados partido a partido
- Muestra fase de grupos, playoffs, semifinales, tercer puesto y final
- Visualización detallada de cada partido con marcadores
- **Armado manual de grupos**: Permite elegir qué jugadores van a cada grupo

### Simulador Monte Carlo
- Ejecuta entre 1,000 y 10,000 simulaciones de torneos
- Calcula probabilidades de cada jugador de:
  - 🏆 Ser campeón
  - 🥈 Ser subcampeón
  - 🥉 Quedar tercero
  - 4️⃣ Quedar cuarto
  - ✅ Clasificar a playoffs
  - ❌ No clasificar a playoffs
- **Para formato 9 jugadores**: Muestra probabilidades de:
  - 🏆 Clasificación directa (como 1° de grupo)
  - 🔄 Clasificación indirecta (a través del repechaje)
- Muestra estadísticas agregadas y porcentajes
- **Análisis por grupo**: Permite simular con grupos configurados manualmente para ver cómo afecta un "grupo de la muerte" a las probabilidades

### Simulador de Partido 1vs1
- Simula enfrentamientos directos entre dos jugadores
- **Barra de probabilidad**: Muestra automáticamente el porcentaje de victoria de cada jugador al seleccionarlos
- **Historial de enfrentamientos**: Muestra victorias totales, goles y los últimos 5 partidos entre los jugadores
- **Datos calculados automáticamente**: Las estadísticas se calculan desde el archivo `enfrentamientos_directos.txt`
- La probabilidad considera tanto las estadísticas generales como el historial directo entre jugadores

## 📊 Formatos de Torneo Soportados

| Jugadores | Formato | Partidos Total | Clasifican |
|-----------|---------|----------------|------------|
| 7 | Liga (Round Robin) | 25 | Top 4 |
| 8 | 2 grupos de 4 | 16 | 2 por grupo |
| 9 | 3 grupos de 3 + Repechajes | 20 | 1° de grupos + ganador eliminatorio |
| 10 | 2 grupos de 5 | 24 | 2 por grupo |

### Formato especial de 9 jugadores:
1. **Fase de grupos**: 3 grupos de 3 (9 partidos)
2. **Repechaje 2° puestos**: Mini-liga entre los 3 segundos (3 partidos) → Solo el 1° avanza
3. **Repechaje 3° puestos**: Mini-liga entre los 3 terceros (3 partidos) → Solo el 1° avanza
4. **Partido eliminatorio**: 1° rep. segundos vs 1° rep. terceros (1 partido) → Ganador clasifica
5. **Playoffs**: Semifinales + 3er puesto + Final (4 partidos)

#### Vías de clasificación a Playoffs (9 jugadores):
| Vía | Descripción | Cantidad |
|-----|-------------|----------|
| **Directa** 🏆 | Terminar 1° en tu grupo | 3 jugadores |
| **Indirecta** 🔄 | Ganar repechaje + partido eliminatorio | 1 jugador |

**Nota:** En Monte Carlo se muestran las probabilidades separadas de clasificar por cada vía, lo que permite ver qué tan probable es que un jugador termine primero vs que necesite ir por repechaje.

## ✋ Armado Manual de Grupos

En los formatos de 8, 9 y 10 jugadores, se puede elegir entre:

- **🎲 Sorteo Aleatorio**: Los grupos se arman de forma random (comportamiento clásico)
- **✋ Armado Manual**: El usuario elige qué jugadores van a cada grupo

### Uso:
1. Seleccionar los jugadores participantes
2. Cambiar el selector "Armado" a "✋ Armado Manual"
3. Asignar cada jugador a un grupo usando los selectores
4. Hacer clic en "✅ Confirmar Grupos"
5. Simular el torneo

### En Monte Carlo:
Cuando se usa armado manual en Monte Carlo, los grupos se mantienen **fijos** durante todas las simulaciones. Esto permite analizar escenarios como:
- ¿Qué probabilidad tiene un jugador si le toca un "grupo de la muerte"?
- ¿Cómo cambian las probabilidades en un grupo fácil vs uno difícil?

## 🎯 Sistema de Simulación

La simulación de partidos tiene en cuenta:

1. **Ranking FIFA**: Puntos acumulados de cada jugador (peso 40%)
2. **Win Rate**: Porcentaje histórico de victorias (peso 60%)
3. **Promedio de Goles**: Influye en la diferencia de goles de cada partido

### Fórmula de Probabilidad (Logística/Sigmoide)

Se usa una función **sigmoide** que es más sensible a diferencias de nivel y nunca llega exactamente a 0% ni 100%:

```
factorFuerza = (ranking × 0.4) + (winRate × 100 × 0.6)
diferencia = factorFuerza1 - factorFuerza2
probabilidad = 1 / (1 + e^(-diferencia / 30))
```

**¿Por qué el winRate tiene más peso (60%) que el ranking (40%)?**
- El ranking puede estar "inflado" por jugar más torneos
- El winRate refleja mejor el rendimiento real partido a partido
- Esto equilibra mejor las probabilidades y permite más upsets

#### Tabla de probabilidades según diferencia de fuerza:

| Diferencia | Probabilidad | Ejemplo |
|------------|--------------|---------|
| 0 | 50% | Jugadores iguales |
| 20 | 66% | Ventaja leve |
| 40 | 79% | Ventaja moderada |
| 60 | 88% | Ventaja clara |
| 80 | 93% | Ventaja grande |

#### Ejemplos de cálculo:

**Chama (198 pts, 73.68% WR) vs Kovic (5 pts, 0% WR):**
```
fuerza_Chama = (198 × 0.4) + (73.68 × 0.6) = 79.2 + 44.21 = 123.41
fuerza_Kovic = (5 × 0.4) + (0 × 0.6) = 2 + 0 = 2
diferencia = 123.41 - 2 = 121.41
probabilidad = 1 / (1 + e^(-121.41/30)) = 98.3%
```
Chama tiene **98.3%** de probabilidad de ganar (muy favorito pero no imposible el upset).

**Chama vs Tomy (118 pts, 69.23% WR):**
```
fuerza_Chama = 123.41
fuerza_Tomy = (118 × 0.4) + (69.23 × 0.6) = 47.2 + 41.54 = 88.74
diferencia = 123.41 - 88.74 = 34.67
probabilidad = 1 / (1 + e^(-34.67/30)) = 76%
```
Chama tiene **76%** de probabilidad de ganar (favorito pero Tomy tiene chances reales).

**Chama vs Facu (126 pts, 61.54% WR):**
```
fuerza_Facu = (126 × 0.4) + (61.54 × 0.6) = 50.4 + 36.92 = 87.32
diferencia = 123.41 - 87.32 = 36.09
probabilidad = 1 / (1 + e^(-36.09/30)) = 77%
```
Chama tiene **77%** de ganar contra Facu.

**Tomy vs Facu:**
```
diferencia = 88.74 - 87.32 = 1.42
probabilidad = 1 / (1 + e^(-1.42/30)) = 52.4%
```
Tomy tiene **52.4%** de ganar (partido muy parejo, leve ventaja Tomy por mejor winRate).

#### ¿Por qué la fórmula sigmoide?
- ✅ **Nunca llega a 0% ni 100%**: Siempre hay chance de upset (realista)
- ✅ **Curva suave (k=30)**: Permite más sorpresas que una curva agresiva
- ✅ **WinRate pesa más**: Refleja rendimiento real, no solo cantidad de torneos jugados
- ✅ **Grupos de la muerte impactan**: Chama tiene 76% vs Tomy pero 98% vs Kovic
- ✅ **Probabilidades más realistas**: El mejor jugador puede perder en fase de grupos

## 🏆 Ranking FIFA Actual

| Pos | Jugador | Puntos |
|-----|---------|--------|
| 1° 🥇 | Chama | 198 |
| 2° 🥈 | Facu | 126 |
| 3° 🥉 | Tomy | 118 |
| 4° | Marco | 76 |
| 5° | Lucas | 50 |
| 6° | Rafa | 35 |
| 7° | Pedro | 21 |
| 8° | Hector | 20 |
| 9° | Mateo | 17 |
| 10° | Santi | 5 |
| 11° | Kovic | 5 |

## 📁 Estructura del Proyecto

```
torneoTejoResistencia/
├── index.html                    # Simulador de torneo individual
├── montecarlo.html               # Simulador Monte Carlo
├── partido.html                  # Simulador de partido 1vs1
├── ranking.txt                   # Archivo con el ranking FIFA (editable)
├── enfrentamientos_directos.txt  # Historial de partidos entre jugadores
├── formatos.md                   # Documentación de formatos
├── README.md                     # Este archivo
├── css/
│   ├── styles.css                # Estilos principales
│   ├── montecarlo.css            # Estilos específicos Monte Carlo
│   └── partido.css               # Estilos específicos Partido 1vs1
└── js/
    ├── simulador.js              # Lógica principal de simulación
    ├── montecarlo.js             # Lógica de simulaciones múltiples
    └── partido.js                # Lógica de partido 1vs1
```

## 📝 Configuración de Jugadores (ranking.txt)

El ranking de jugadores se carga desde el archivo `ranking.txt` ubicado en la raíz del proyecto. Este archivo permite actualizar fácilmente los jugadores sin modificar el código.

### Formato del archivo:
```
# Comentarios empiezan con #
nombre,ranking,winRate,promedioGoles
```

### Ejemplo:
```
# RANKING FIFA - Simulador Torneo Tejo
Chama,198,0.7368,6.47
Facu,126,0.6154,5.92
Tomy,118,0.6923,6.54
```

### Campos:
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| nombre | Nombre del jugador | Chama |
| ranking | Puntos FIFA acumulados | 198 |
| winRate | Porcentaje de victorias (0-1) | 0.7368 |
| promedioGoles | Promedio de goles por partido | 6.47 |

**Nota:** Los primeros 8 jugadores del archivo se consideran "jugadores base" y los restantes "nuevos jugadores".

## 📋 Configuración de Enfrentamientos (enfrentamientos_directos.txt)

El historial de partidos entre jugadores se carga desde el archivo `enfrentamientos_directos.txt`. Este archivo permite registrar todos los partidos jugados y el sistema calcula automáticamente las estadísticas.

### Formato del archivo:
```
# Comentarios empiezan con #
jugador1,jugador2,resultado_j1,marcador,torneo,fecha,fase
```

### Campos:
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| jugador1 | Nombre del primer jugador | Chama |
| jugador2 | Nombre del segundo jugador | Rafa |
| resultado_j1 | G = Ganó jugador1, P = Perdió jugador1 | G |
| marcador | Resultado del partido | 7-2 |
| torneo | Nombre del torneo o evento | Primer torneo de hockey de mesa |
| fecha | Fecha del partido | 3/5/2025 |
| fase | Fase del torneo | Final |

### Ejemplo:
```
Chama,Rafa,G,7-2,Primer torneo de hockey de mesa,3/5/2025,Final
Tomy,Rafa,P,5-7,Primer torneo de hockey de mesa,3/5/2025,Semifinal
Chama,Facu,P,5-7,Amistoso,7/5/2025,Amistoso
```

### Estadísticas calculadas automáticamente:
- **Victorias totales** de cada jugador en el enfrentamiento directo
- **Goles totales** de cada jugador
- **Total de partidos jugados** entre ambos
- **Últimos 5 partidos** con detalle de torneo, fase y fecha

## 🚀 Uso

1. **Importante:** Debido a que el proyecto carga el ranking desde un archivo externo, debe ejecutarse desde un servidor web:
   - **Opción 1 (Live Server):** Si usas VS Code, instala la extensión "Live Server" y haz clic derecho en `index.html` → "Open with Live Server"
   - **Opción 2 (Python):** Ejecuta `python -m http.server 8000` en la carpeta del proyecto y abre `http://localhost:8000`
   - **Opción 3 (Node.js):** Usa `npx serve` o `npx http-server`
   - **Opción 4 (GitHub Pages):** El proyecto funciona directamente en GitHub Pages

2. Seleccionar el formato de torneo (cantidad de jugadores)
3. Elegir los jugadores participantes
4. (Opcional) Cambiar a "Armado Manual" y configurar los grupos
5. Hacer clic en "Simular Torneo" o "Iniciar Simulación Monte Carlo"

### Para actualizar el ranking:
1. Editar el archivo `ranking.txt` con los nuevos datos
2. Recargar la página del simulador

## 🛠️ Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)

---

*Desarrollado por x_chama_x*

