# Programa para Actualizar el Ranking FIFA de Tejo Hockey

```python
import re

class Jugador:
    def __init__(self, nombre, puntos):
        self.nombre = nombre
        self.puntos = float(puntos)  # Usar float para decimales
        self.rank = 0


class Partido:
    def __init__(self, jugador1, jugador2, resultado, tipo):
        self.jugador1 = jugador1
        self.jugador2 = jugador2
        self.resultado = resultado
        self.tipo = tipo


def leer_ranking(archivo):
    """Lee el archivo de ranking y carga los jugadores"""
    jugadores = []

    try:
        with open(archivo, 'r', encoding='utf-8') as f:
            for linea in f:
                linea = linea.strip()

                if not linea or linea.startswith('#'):
                    continue

                # Formato: "1º Lugar: Chama - 100 puntos"
                match = re.search(
                    r'(\d+).*?Lugar.*?([A-Za-z]+)\s*-\s*(\d+)',
                    linea
                )

                if match:
                    rank = int(match.group(1))
                    nombre = match.group(2).strip()
                    puntos = int(match.group(3))

                    jugadores.append(Jugador(nombre, puntos))

    except FileNotFoundError:
        print(f"Archivo {archivo} no encontrado. Creando jugadores por defecto...")

        jugadores_default = [
            ("Chama", 100),
            ("Rafa", 80),
            ("Tomy", 60),
            ("Marco", 50),
            ("Facu", 40),
            ("Santi", 30),
            ("Hector", 20)
        ]

        for nombre, puntos in jugadores_default:
            jugadores.append(Jugador(nombre, puntos))

    return jugadores


def leer_partidos(archivo):
    """Lee el archivo de partidos jugados"""
    partidos = []

    try:
        with open(archivo, 'r', encoding='utf-8') as f:
            for linea in f:
                linea = linea.strip()

                if not linea or linea.startswith('#'):
                    continue

                # Formato: "Chama vs Facu 7-5 liga"
                match = re.search(
                    r'([A-Za-z]+)\s+(?:vs|v)\s+([A-Za-z]+)\s*[:\-]?\s*(\d+)[\-:](\d+)\s*\(?(.*?)\)?$',
                    linea,
                    re.IGNORECASE
                )

                if not match:
                    # Formato alternativo
                    match = re.search(
                        r'([A-Za-z]+)\s+(?:vs|v)\s+([A-Za-z]+)\s*[:\-]?\s*(\d+)[\-:](\d+).*?\(?(.*?)\)?',
                        linea,
                        re.IGNORECASE
                    )

                if match:
                    jugador1 = match.group(1).strip()
                    jugador2 = match.group(2).strip()
                    goles1 = match.group(3)
                    goles2 = match.group(4)
                    tipo = match.group(5).lower().strip()

                    resultado = f"{goles1}-{goles2}"

                    # Normalizar tipo de partido
                    if 'amistoso' in tipo:
                        tipo = 'amistoso'
                    elif 'liga' in tipo:
                        tipo = 'liga'
                    elif 'final' in tipo and 'semi' not in tipo:
                        tipo = 'final'
                    elif 'semifinal' in tipo or 'semi' in tipo:
                        tipo = 'semifinal'
                    elif 'tercer' in tipo or '3°' in tipo or '3º' in tipo:
                        tipo = 'tercer_puesto'
                    else:
                        tipo = 'liga'

                    partidos.append(
                        Partido(jugador1, jugador2, resultado, tipo)
                    )

                else:
                    print(f"Formato no reconocido (se omitirá): {linea}")

    except FileNotFoundError:
        print(f"Archivo {archivo} no encontrado.")

    return partidos


def calcular_puntos_base(tipo_partido):
    """Calcula los puntos base según el tipo de partido"""

    puntos_map = {
        'amistoso': 10,
        'liga': 20,
        'semifinal': 30,
        'final': 30,
        'tercer_puesto': 30
    }

    return puntos_map.get(tipo_partido, 20)


def obtener_multiplicador(rank_oponente):
    """Obtiene el multiplicador basado en el ranking del oponente"""

    multiplicador_map = {
        1: 1.3,
        2: 1.2,
        3: 1.15,
        4: 1.1,
        5: 1.05,
        6: 1.0,
        7: 0.95,
        8: 0.9,
        9: 0.85,
        10: 0.8
    }

    return multiplicador_map.get(rank_oponente, 0.8)


def actualizar_ranking(jugadores, partidos):
    """Actualiza el ranking procesando todos los partidos"""

    jugadores.sort(key=lambda x: x.puntos, reverse=True)

    for i, jugador in enumerate(jugadores):
        jugador.rank = i + 1

    print(f"\n--- PROCESANDO {len(partidos)} PARTIDOS ---")

    for i, partido in enumerate(partidos, 1):

        print(
            f"\nPartido {i}: "
            f"{partido.jugador1} vs {partido.jugador2} "
            f"({partido.resultado}) - {partido.tipo}"
        )

        jugador1 = next(
            (j for j in jugadores if j.nombre.lower() == partido.jugador1.lower()),
            None
        )

        jugador2 = next(
            (j for j in jugadores if j.nombre.lower() == partido.jugador2.lower()),
            None
        )

        if not jugador1 or not jugador2:
            print(
                f" ❌ Jugador no encontrado: "
                f"{partido.jugador1} o {partido.jugador2}"
            )
            continue

        try:
            goles1, goles2 = map(int, partido.resultado.split('-'))

        except:
            print(f" ❌ Resultado inválido: {partido.resultado}")
            continue

        # No procesar empates
        if goles1 == goles2:
            print(" ⚖️ Empate - no se procesan puntos")
            continue

        # Determinar ganador y perdedor
        if goles1 > goles2:
            ganador, perdedor = jugador1, jugador2
        else:
            ganador, perdedor = jugador2, jugador1

        puntos_prev_ganador = ganador.puntos
        puntos_prev_perdedor = perdedor.puntos

        rank_prev_ganador = ganador.rank
        rank_prev_perdedor = perdedor.rank

        # Calcular puntos
        puntos_base = calcular_puntos_base(partido.tipo)

        multiplicador_ganador = obtener_multiplicador(
            perdedor.rank
        )

        multiplicador_perdedor = obtener_multiplicador(
            ganador.rank
        )

        puntos_ganados = (
            puntos_base * multiplicador_ganador
        )

        puntos_perdidos = (
            (puntos_base * 0.6) * multiplicador_perdedor
        )

        # Actualizar puntos
        ganador.puntos += puntos_ganados

        perdedor.puntos = max(
            5.0,
            perdedor.puntos - puntos_perdidos
        )

        print(f" 🏆 Ganador: {ganador.nombre}")
        print(
            f" Puntos antes: "
            f"{puntos_prev_ganador:.1f} "
            f"(Rank {rank_prev_ganador})"
        )

        print(f" Puntos ganados: +{puntos_ganados:.1f}")
        print(f" Puntos después: {ganador.puntos:.1f}")

        print(f" 😞 Perdedor: {perdedor.nombre}")

        print(
            f" Puntos antes: "
            f"{puntos_prev_perdedor:.1f} "
            f"(Rank {rank_prev_perdedor})"
        )

        print(f" Puntos perdidos: -{puntos_perdidos:.1f}")
        print(f" Puntos después: {perdedor.puntos:.1f}")

        # Reordenar ranking
        jugadores.sort(
            key=lambda x: x.puntos,
            reverse=True
        )

        for j, jugador in enumerate(jugadores):
            jugador.rank = j + 1

    return jugadores


def mostrar_cambios_ranking(
    jugadores_inicial,
    jugadores_final
):
    """Muestra los cambios en el ranking"""

    print("\n" + "=" * 60)
    print("📊 CAMBIOS EN EL RANKING")
    print("=" * 60)

    puntos_inicial = {
        j.nombre: (j.puntos, j.rank)
        for j in jugadores_inicial
    }

    for jugador in jugadores_final:

        puntos_prev, rank_prev = puntos_inicial.get(
            jugador.nombre,
            (jugador.puntos, jugador.rank)
        )

        cambio_puntos = jugador.puntos - puntos_prev
        cambio_rank = rank_prev - jugador.rank

        flecha = ""

        if cambio_rank > 0:
            flecha = f"📈 +{cambio_rank}"

        elif cambio_rank < 0:
            flecha = f"📉 {cambio_rank}"

        else:
            flecha = "➡️ ="

        print(
            f"{jugador.rank:2}º "
            f"{jugador.nombre:8} | "
            f"{jugador.puntos:6.1f} pts | "
            f"{cambio_puntos:+6.1f} | "
            f"{flecha}"
        )


def guardar_ranking(jugadores, archivo):
    """Guarda el ranking actualizado en un archivo"""

    with open(archivo, 'w', encoding='utf-8') as f:

        f.write(
            "# Ranking FIFA Tejo Hockey - Actualizado\n"
        )

        f.write(
            "# Sistema con pérdida de puntos para el perdedor\n\n"
        )

        for i, jugador in enumerate(jugadores):

            f.write(
                f"{i+1}º Lugar: "
                f"{jugador.nombre} - "
                f"{int(jugador.puntos)} puntos\n"
            )

        f.write(
            f"\n# Última actualización: "
            f"{len(jugadores)} jugadores registrados\n"
        )


def main():
    """Función principal del programa"""

    archivo_ranking = 'ranking_fifa.txt'
    archivo_partidos = 'partidos_jugados.txt'
    archivo_salida = 'ranking_actualizado.txt'

    print("🏒 PROGRAMA RANKING FIFA TEJO HOCKEY")
    print("=" * 50)

    print("\n📖 Leyendo ranking inicial...")

    jugadores = leer_ranking(archivo_ranking)

    jugadores_inicial = [
        Jugador(j.nombre, j.puntos)
        for j in jugadores
    ]

    jugadores.sort(
        key=lambda x: x.puntos,
        reverse=True
    )

    for i, jugador in enumerate(jugadores):
        jugador.rank = i + 1
        jugadores_inicial[i].rank = i + 1

    print(
        f"Jugadores cargados: "
        f"{', '.join(j.nombre for j in jugadores)}"
    )

    print("\n🎮 Leyendo partidos jugados...")

    partidos = leer_partidos(archivo_partidos)

    print(f"Partidos cargados: {len(partidos)}")

    if not partidos:
        print("⚠️ No se encontraron partidos para procesar.")
        return

    print("\n🔄 Actualizando ranking...")

    jugadores_actualizados = actualizar_ranking(
        jugadores,
        partidos
    )

    mostrar_cambios_ranking(
        jugadores_inicial,
        jugadores_actualizados
    )

    print(f"\n💾 Guardando ranking actualizado...")

    guardar_ranking(
        jugadores_actualizados,
        archivo_salida
    )

    print("\n" + "=" * 60)
    print("🎉 ¡PROCESO COMPLETADO!")
    print(
        f"📄 Ranking actualizado guardado en: "
        f"{archivo_salida}"
    )
    print("=" * 60)


if __name__ == "__main__":
    main()
```

---

# Instrucciones de Uso

1. Crear los archivos:

- `ranking_fifa.txt`
- `partidos_jugados.txt`

2. Ejecutar el programa Python.

3. El programa generará:

```text
ranking_actualizado.txt
```

---

# Ejemplo de `ranking_fifa.txt`

```text
1º Lugar: Chama - 100 puntos
2º Lugar: Rafa - 80 puntos
3º Lugar: Tomy - 60 puntos
4º Lugar: Marco - 50 puntos
5º Lugar: Facu - 40 puntos
6º Lugar: Santi - 30 puntos
7º Lugar: Hector - 20 puntos
```

---

# Ejemplo de `partidos_jugados.txt`

```text
Chama vs Facu - 7-5 - liga
Rafa vs Tomy: 3-7 (amistoso)
Marco vs Hector: 6-7 - liga
Tomy vs Chama 7-6 semifinal
```

---

# Agregar Nuevos Jugadores

Método recomendado:

Añadir nuevos jugadores al final de `ranking_fifa.txt` con un puntaje inicial.

Ejemplo:

```text
8º Lugar: Juan - 15 puntos
9º Lugar: Pedro - 15 puntos
```

El programa los detectará automáticamente gracias a la expresión regular flexible.

---

# Modificaciones Necesarias para Más Jugadores

Actualizar el diccionario de multiplicadores:

```python
multiplicador = {
    1: 1.3,
    2: 1.2,
    3: 1.15,
    4: 1.1,
    5: 1.05,
    6: 1.0,
    7: 0.95,
    8: 0.9,
    9: 0.85,
    10: 0.8
}.get(perdedor.rank, 0.8)
```

---

# Características Flexibles del Programa

- Detecta automáticamente la cantidad de jugadores.
- Asigna ranks dinámicamente.
- El cálculo de puntos se adapta al tamaño del ranking.

---

# Futuras Expansiones

## 1. Nuevos tipos de partidos

Ejemplo:

```text
cuartos_de_final
```

Solo se debe agregar el caso en la normalización de tipos.

---

## 2. Cambiar sistema de puntos

Modificar los valores en:

```python
puntos_map
```

---

## 3. Muchos jugadores nuevos (más de 10)

Se recomienda:

- Actualizar el diccionario de multiplicadores.
- Ajustar el puntaje inicial de nuevos jugadores.