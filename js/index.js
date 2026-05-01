document.addEventListener('DOMContentLoaded', () => {
    fetch('ranking.txt')
        .then(response => response.text())
        .then(data => {
            const lineas = data.split('\n');
            const jugadores = [];
            for (const linea of lineas) {
                const l = linea.trim();
                if (l && !l.startsWith('#')) {
                    const partes = l.split(',');
                    if (partes.length >= 4) {
                        jugadores.push({
                            nombre: partes[0].trim(),
                            ranking: parseInt(partes[1].trim() || 0, 10),
                            winRate: parseFloat(partes[2].trim() || 0),
                            promedioGoles: parseFloat(partes[3].trim() || 0)
                        });
                    }
                }
            }
            // Ordenar por ranking (mayor a menor)
            jugadores.sort((a, b) => b.ranking - a.ranking);
            const tbody = document.querySelector('#ranking-table tbody');
            if(tbody) {
                jugadores.forEach((j, index) => {
                    const tr = document.createElement('tr');

                    const tdPos = document.createElement('td');
                    tdPos.textContent = index + 1;
                    tr.appendChild(tdPos);

                    const tdNombre = document.createElement('td');
                    const strong = document.createElement('strong');
                    strong.textContent = j.nombre;
                    tdNombre.appendChild(strong);
                    tr.appendChild(tdNombre);

                    const tdRanking = document.createElement('td');
                    tdRanking.textContent = j.ranking;
                    tr.appendChild(tdRanking);

                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar ranking.txt:', error);
        });

    fetch('enfrentamientos_directos.txt')
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n');
            const gmap = {}; // Mapa para acumular goles por jugador

            for (const r_line of lines) {
                const line = r_line.trim();
                // Ignorar líneas vacías o comentarios
                if (!line || line.startsWith('#')) continue;

                const parts = line.split(',');
                if (parts.length >= 4) {
                    const j1 = parts[0].trim();
                    const j2 = parts[1].trim();
                    const marcador = parts[3].trim();
                    const torneo = parts.length > 4 ? parts[4].trim() : '';

                    // No contar goles de partidos amistosos
                    if (torneo.toLowerCase().includes('amistoso')) continue;

                    const goles = marcador.split('-');
                    if (goles.length === 2) {
                        const g1 = parseInt(goles[0], 10);
                        const g2 = parseInt(goles[1], 10);

                        if (!isNaN(g1)) {
                            gmap[j1] = (gmap[j1] || 0) + g1;
                        }
                        if (!isNaN(g2)) {
                            gmap[j2] = (gmap[j2] || 0) + g2;
                        }
                    }
                }
            }

            // Convertir a array, filtrar los que tengan 0 goles, y ordenar
            const arr = Object.keys(gmap)
                .map(nombre => ({ nombre, goles: gmap[nombre] }))
                .filter(j => j.goles > 0);
            arr.sort((a, b) => b.goles - a.goles);

            const tbodyGoals = document.querySelector('#goals-ranking-table tbody');
            if(tbodyGoals) {
                arr.forEach((j, index) => {
                    const tr = document.createElement('tr');

                    const tdPos = document.createElement('td');
                    tdPos.textContent = index + 1;
                    tr.appendChild(tdPos);

                    const tdNombre = document.createElement('td');
                    const strong = document.createElement('strong');
                    strong.textContent = j.nombre;
                    tdNombre.appendChild(strong);
                    tr.appendChild(tdNombre);

                    const tdGoles = document.createElement('td');
                    tdGoles.textContent = j.goles;
                    tr.appendChild(tdGoles);

                    tbodyGoals.appendChild(tr);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar enfrentamientos_directos.txt:', error);
        });
});
