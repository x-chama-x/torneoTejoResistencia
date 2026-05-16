# 🧮 Ranking FIFA EXPLICADO

## 1. Ranking Inicial y Puntos Base (Tras el Primer Torneo)

Se utilizarán el resultado final del torneo (el podio) para los primeros puestos y la clasificación de la fase de liga para los jugadores que no llegaron a la fase final, para asignar un puntaje inicial. Este puntaje refleja el rendimiento en el primer torneo.

| Posición | Jugador | Puntos |
|---|---|---|
| 1° Lugar (Campeón del torneo) | Chama | 100 puntos |
| 2° Lugar (Subcampeón del torneo) | Rafa | 80 puntos |
| 3° Lugar (Tercer Puesto del torneo) | Tomy | 60 puntos |
| 4° Lugar (Cuarto Puesto del torneo) | Marco | 50 puntos |
| 5° Lugar (5° en Fase de Liga) | Facu | 40 puntos |
| 6° Lugar (6° en Fase de Liga) | Santi | 30 puntos |
| 7° Lugar (7° en Fase de Liga) | Hector | 20 puntos |

Este es el punto de partida para el ranking. Los jugadores acumularán puntos en futuros partidos.

---

## 2. Puntos Obtenidos por Partido Ganado

### Fórmula para el Ganador

```text
Puntos Ganados = Puntos Base × Multiplicador por Rango del Oponente
```

### Fórmula para el Perdedor

```text
Puntos Perdidos = (Puntos Base × 0.6) × Multiplicador por Rango del Oponente
```

> Nota: El perdedor pierde el 60% de lo que ganaría el ganador, haciendo que las derrotas sean significativas pero no devastadoras.

---

## 3. Puntos Base por Tipo de Partido

Asignamos diferentes valores a los partidos según su importancia:

| Tipo de Partido | Puntos Base | Descripción |
|---|---|---|
| Partido Amistoso | 10 puntos | Se juegan entre torneos y suman menos |
| Partido de Fase de Liga (Torneo) | 20 puntos | Parte de una competición oficial |
| Partido de Fase Final (Semifinal, 3° puesto, Final) | 30 puntos | Partidos decisivos |

---

## 4. Multiplicador por Rango del Oponente

Para reflejar la fuerza del oponente, se usa un multiplicador basado en el ranking actual del rival al momento del partido.

| Rango del Oponente | Multiplicador |
|---|---|
| Rango 1 | × 1.3 |
| Rango 2 | × 1.2 |
| Rango 3 | × 1.15 |
| Rango 4 | × 1.1 |
| Rango 5 | × 1.05 |
| Rango 6 | × 1.0 |
| Rango 7 | × 0.95 |

> Si se unen más jugadores y existen rangos inferiores, el multiplicador para rangos más bajos sería menor a `0.95`.

---

## 5. Protección contra Puntos Negativos

- Puntaje mínimo: **5 puntos**
- Si un jugador tendría menos de 5 puntos tras una derrota, se mantiene en 5 puntos.
- Esto evita puntuaciones negativas o demasiado bajas.

---

## 6. Manejo de Nuevos Jugadores

Los nuevos jugadores ingresan con **15 puntos iniciales**, ubicándose al final del ranking hasta ganar partidos y acumular puntos.

---

## 7. Actualización del Ranking

Después de cada partido:

1. Se calculan los puntos ganados/perdidos.
2. Se actualizan los totales de ambos jugadores.
3. Se aplica la protección de puntaje mínimo (5 puntos).
4. Se reordena el ranking de mayor a menor puntaje.

---

## 8. Ejemplo de Cálculo

### Ejemplo 1: Partido Amistoso

**Rafa (Rank 2, 80 pts) vs Tomy (Rank 3, 60 pts)**

#### Si Rafa gana

```text
Rafa gana: 10 × 1.15 = 11.5 puntos → 91.5 puntos total
Tomy pierde: (10 × 0.6) × 1.2 = 7.2 puntos → 52.8 puntos total
```

#### Si Tomy gana

```text
Tomy gana: 10 × 1.2 = 12 puntos → 72 puntos total
Rafa pierde: (10 × 0.6) × 1.15 = 6.9 puntos → 73.1 puntos total
```

---

### Ejemplo 2: Partido de Liga

**Marco (Rank 4, 50 pts) vs Chama (Rank 1, 100 pts)**

#### Si Marco gana (Upset)

```text
Marco gana: 20 × 1.3 = 26 puntos → 76 puntos total
Chama pierde: (20 × 0.6) × 1.1 = 13.2 puntos → 86.8 puntos total
```

#### Si Chama gana

```text
Chama gana: 20 × 1.1 = 22 puntos → 122 puntos total
Marco pierde: (20 × 0.6) × 1.3 = 15.6 puntos → 34.4 puntos total
```

---

Después de este partido amistoso (si Tomy ganó), el ranking provisional sería:

```text
Chama (100), Rafa (80), Tomy (72), Marco (50), Facu (40), Santi (30), Hector (20)
```

El ranking se reordena en base a estos nuevos puntajes.

---

## Ejemplo Adicional

Supongamos un partido de Fase de Liga en el próximo torneo entre:

- Marco (Rank 4, 50 pts)
- Chama (Rank 1, 100 pts)

### Si Marco gana

```text
Tipo de partido: Fase de Liga (Puntos Base = 20)
Oponente: Chama (Rank 1)
Multiplicador = 1.3

Puntos Ganados por Marco = 20 × 1.3 = 26 puntos
Nuevo puntaje de Marco = 50 + 26 = 76 puntos
```

Chama mantiene sus 100 puntos.

### Si Chama gana

```text
Tipo de partido: Fase de Liga (Puntos Base = 20)
Oponente: Marco (Rank 4)
Multiplicador = 1.1

Puntos Ganados por Chama = 20 × 1.1 = 22 puntos
Nuevo puntaje de Chama = 100 + 22 = 122 puntos
```

Marco mantiene sus 50 puntos.

---

## Conclusión

Este sistema propuesto permite que los resultados de los amistosos influyan en el ranking, aunque en menor medida que los partidos de torneo, y recompensa las victorias contra oponentes mejor clasificados. Refleja el rendimiento actual de los jugadores a medida que acumulan puntos.

---