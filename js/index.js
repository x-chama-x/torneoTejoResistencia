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
                    const wrDisplay = (j.winRate * 100).toFixed(1) + '%';
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

                    const tdWinRate = document.createElement('td');
                    tdWinRate.textContent = wrDisplay;
                    tr.appendChild(tdWinRate);

                    const tdGoles = document.createElement('td');
                    tdGoles.textContent = j.promedioGoles.toFixed(2);
                    tr.appendChild(tdGoles);

                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar ranking.txt:', error);
        });
});

