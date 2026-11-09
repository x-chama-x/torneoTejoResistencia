// =====================================================
// PESO DE BICAMPEONATO (CAMPEÓN DEFENSOR)  ·  v3.0
// =====================================================
// Módulo compartido por el simulador y el creador de torneo.
//
// Idea: al último campeón del torneo (detectado leyendo el historial de
// partidos) se le ajusta la fuerza en cada partido, tomando como referencia
// el fenómeno mundialista del bicampeonato.
//
// CALIBRACIÓN
// -----------
// En un mundial de 32 equipos el reparto "justo" da 1/32 = 3,125% de repetir
// título; el campeón defensor lo logra ~10% de las veces. Ese salto, medido
// en CUOTA (odds), es independiente del tamaño del campo:
//
//     M = odds(0,10) / odds(1/32) = (0,1/0,9) / ((1/32)/(31/32)) ≈ 3,44
//
// M es el multiplicador de cuota que el campeón debe realizar sobre TODO el
// torneo. No se fuerza el 10% sobre el resultado: se fuerza el multiplicador.
// La probabilidad final SURGE de la cadena de probabilidades condicionales de
// cada etapa del formato elegido.
//
// DESCOMPOSICIÓN CONDICIONAL POR ETAPA
// ------------------------------------
//     P(bicampeón) = P(supera fase inicial)
//                  · P(gana repechaje | no ganó su grupo)   [sólo 9 jugadores]
//                  · P(gana semi | clasificó)
//                  · P(gana final | finalista)
//
// El peso se reparte entre esas etapas con un peso de importancia w_e
// (la presión crece hacia la final) y se divide por la cantidad de partidos
// n_e que el campeón juega en esa etapa:
//
//     λ_e = k · ln(M) · (w_e / Σw) / n_e        [puntos de fuerza por partido]
//
// Dividir por n_e es clave: el ajuste se aplica en CADA partido, así que sin
// esa división una liga de 7 (6 partidos) recibiría 6 veces el peso previsto
// para "una etapa" y la descomposición condicional se rompería.
//
// Sumando el corrimiento de log-cuota de todo el camino:
//     Σ_e n_e · (λ_e / k) = ln(M)   →   multiplicador realizado ≈ M  ✔
//
// MODO
// ----
//   'maldicion' (default) el campeón RESTA fuerza → repetir es más difícil (×1/M)
//   'pedigri'             el campeón SUMA fuerza  → repetir es más probable (×M)
//
// El default es la MALDICIÓN DEL CAMPEÓN: sólo ~10% de los campeones mundialistas
// repiten título, y varios se van en fase de grupos (Francia 2002, Italia 2010,
// España 2014, Alemania 2018). La presión y el desgaste le juegan en contra, y esa
// presión crece etapa a etapa (ver pesosEtapa). El signo lo aplica
// bonusFuerzaCampeon(); el resto del cálculo es idéntico en los dos modos.
//
// Cambios v3.0 respecto de v2.0:
//   - Corregida la magnitud del castigo: v2 realizaba ×0,54 en vez del ×1/3,44 buscado.
//   - Corregida la normalización: los factores {1.0,1.2,1.5} realizaban M^1,233.
//   - Corregido el conteo de partidos por etapa (antes el peso se aplicaba N veces).
//   - Rutas de etapas por formato (7/8/9/10), incluida la etapa 'repechaje' de 9.
//   - Refinamiento numérico del λ, cacheado por (formato+roster+campeón).
// =====================================================

window.CAMPEON = {
    activo: true,
    nombre: null,          // se completa al detectar el último campeón
    torneo: null,          // torneo en el que salió campeón

    // --- Calibración ---
    refMundial: 0.10,      // el campeón defensor repite ~10% de las veces
    campoMundial: 32,      // frente a un reparto justo de 1/32
    // M: multiplicador de cuota sobre TODO el torneo. 3.44 es la cifra real
    // mundialista, pero para un roster donde el campeón domina claramente al
    // resto (ranking/winRate muy por delante) ese castigo no alcanza a
    // quitarle el favoritismo. Se sube a 8 a pedido: maldición más dramática
    // que la real, ya no una réplica fiel de las estadísticas de Mundiales.
    oddsMultiplier: 8,
    // La MISMA constante de la sigmoide del modelo base, y no por prolijidad:
    // λ se multiplica por k justamente porque después la sigmoide divide por
    // k, así el corrimiento que queda en log-cuota es ln(M)·w/n, limpio de k.
    // Si las dos se separan, el castigo al campeón se escala solo. Sale de
    // js/probabilidades.js, que es donde vive PROB_K.
    k: typeof PROB_K !== 'undefined' ? PROB_K : 30,

    // 'maldicion' → el peso PERJUDICA al campeón (default) | 'pedigri' → lo favorece
    modo: 'maldicion',

    // --- Contexto de la simulación en curso ---
    formato: 8,            // 7 | 8 | 9 | 10
    etapaActual: 'grupos', // 'grupos' | 'liga' | 'repechaje' | 'semifinal' | 'final'

    // Corrección multiplicativa de λ que deja el M realizado sobre el objetivo.
    // 1 = usar la forma cerrada tal cual. La ajusta calibrarPesoCampeon().
    factorCalibracion: 1,

    // Peso de importancia de cada etapa. Concentrado en semifinal/final para
    // que el campeón defensor llegue lejos con normalidad (grupos/liga/
    // repechaje casi sin castigo) y sea ahí, en el tramo final, donde la
    // maldición le pega más fuerte.
    pesosEtapa: {
        liga: 0.3,
        grupos: 0.3,
        repechaje: 0.5,
        semifinal: 2.2,
        final: 3.0
    }
};

// ---- Ruta de etapas de cada formato ----
// n = partidos que juega el campeón en esa etapa.
//   6  liga de 6 → 5 partidos de round-robin
//   7  liga de 7 → 6 partidos de round-robin
//   8  grupo de 4 → 3 partidos
//   9  grupo de 3 → 2 partidos; repechaje = mini-liga (2) + pre-playoff (1) = 3
//  10  grupo de 5 → 4 partidos
window.CAMPEON.rutaFormato = {
    6:  [{ etapa: 'liga',   n: 5, label: 'Liga (Top 4)' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    7:  [{ etapa: 'liga',   n: 6, label: 'Liga (Top 4)' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    8:  [{ etapa: 'grupos', n: 3, label: 'Fase de grupos' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    9:  [{ etapa: 'grupos', n: 2, label: 'Fase de grupos' },
         { etapa: 'repechaje', n: 3, label: 'Repechaje + Pre-Playoff', condicional: true },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }],

    10: [{ etapa: 'grupos', n: 4, label: 'Fase de grupos' },
         { etapa: 'semifinal', n: 1, label: 'Semifinal' },
         { etapa: 'final',     n: 1, label: 'Final' }]
};

// ---- Detectar el último campeón leyendo enfrentamientos_directos.txt ----
// El campeón es el ganador de la última línea cuya fase sea "Final".
async function detectarUltimoCampeon() {
    try {
        const resp = await fetch('enfrentamientos_directos.txt');
        if (!resp.ok) throw new Error('No se pudo cargar enfrentamientos_directos.txt');
        const texto = await resp.text();
        const lineas = texto.split('\n');

        let campeon = null;
        let torneo = null;

        for (const linea of lineas) {
            const t = linea.trim();
            if (!t || t.startsWith('#') || t.startsWith('=')) continue;

            const p = t.split(',');
            if (p.length >= 7) {
                const fase = (p[6] || '').trim().toLowerCase();
                // Sólo la final del torneo (no "tercer puesto" ni "semifinal")
                if (fase === 'final') {
                    const j1 = p[0].trim();
                    const j2 = p[1].trim();
                    const res = p[2].trim();
                    const ganador = res === 'G' ? j1 : (res === 'P' ? j2 : null);
                    if (ganador) {
                        campeon = ganador;
                        torneo = (p[4] || '').trim();
                    }
                }
            }
        }

        window.CAMPEON.nombre = campeon;
        window.CAMPEON.torneo = torneo;
        console.log('👑 Último campeón detectado:', campeon, '(' + torneo + ')');
        return campeon;
    } catch (e) {
        console.error('No se pudo detectar el último campeón:', e);
        return null;
    }
}

// ---- Ruta de etapas del formato en curso ----
function rutaEtapas(formato) {
    const c = window.CAMPEON;
    return c.rutaFormato[formato] || c.rutaFormato[8];
}

// ---- Establecer el formato del torneo que se está simulando ----
// Cambiar de formato invalida la calibración numérica previa.
function establecerFormatoBicampeon(formato) {
    const c = window.CAMPEON;
    const f = parseInt(formato);
    if (!c || !c.rutaFormato[f]) return;
    if (c.formato !== f) {
        c.formato = f;
        c.factorCalibracion = 1;
    }
}

// ---- Peso de fuerza por partido para el campeón, en la etapa indicada ----
// λ_e = k · ln(M) · (w_e / Σw) / n_e     · factorCalibracion
//
// Devuelve SIEMPRE la magnitud con signo ya aplicado según el modo:
//   'pedigri'   → positivo (suma fuerza)
//   'maldicion' → negativo (resta fuerza)
function bonusFuerzaCampeon(etapa = null, formato = null) {
    const c = window.CAMPEON;
    if (!c || !c.activo) return 0;

    const fmt = formato != null ? parseInt(formato) : c.formato;
    const ruta = rutaEtapas(fmt);
    const etapaUso = etapa || c.etapaActual;

    const paso = ruta.find(p => p.etapa === etapaUso);
    if (!paso) return 0; // etapa que no pertenece a este formato (ej. repechaje en 8)

    const sumaPesos = ruta.reduce((acc, p) => acc + (c.pesosEtapa[p.etapa] || 1), 0);
    const wRel = (c.pesosEtapa[etapaUso] || 1) / sumaPesos;

    // Corrimiento de log-cuota que le toca a esta etapa, repartido entre sus n partidos
    const lambda = c.k * Math.log(c.oddsMultiplier) * wRel / Math.max(1, paso.n);

    const signo = c.modo === 'maldicion' ? -1 : 1;
    return signo * lambda * c.factorCalibracion;
}

// ---- Aplica el peso a la fuerza de un jugador si es el campeón defensor ----
function ajustarFuerzaPorCampeon(fuerza, nombre, etapa = null) {
    const c = window.CAMPEON;
    if (c && c.activo && c.nombre && nombre === c.nombre) {
        return fuerza + bonusFuerzaCampeon(etapa);
    }
    return fuerza;
}

// ---- Fisher-Yates local (para no depender de globals de cada página) ----
function _shuffleCampeon(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---- Helper: Establecer etapa actual para el contexto de bicampeonato ----
function establecerEtapaBicampeon(etapa) {
    // 'ninguna' es una etapa neutral: no pertenece a ningún formato, por lo
    // que bonusFuerzaCampeon() devuelve 0 (partidos no campeonables, ej. 3er puesto).
    const validas = ['grupos', 'liga', 'repechaje', 'semifinal', 'final', 'ninguna'];
    if (window.CAMPEON && validas.includes(etapa)) {
        window.CAMPEON.etapaActual = etapa;
    }
}

// ---- Utilidades de cuota ----
const _odds = p => (p <= 0 ? 0 : p >= 1 ? Infinity : p / (1 - p));

// =====================================================
// SIMULACIÓN DEL TORNEO COMPLETO PARA EL CAMPEÓN
// =====================================================
// Recorre el formato marcando la etapa en cada tramo, y devuelve en qué punto
// del camino quedó el campeón. Es el núcleo tanto de la calibración numérica
// como del panel de probabilidades condicionales.
//
// Parámetros inyectados desde cada página:
//   grupos       -> { all:[...] } o { A:[...], B:[...] [, C:[...]] }
//   simPartido   -> (j1, j2) => { ganador, ... }
//   simGrupo     -> (arrJugadores) => [{ nombre, ... }] ordenado 1°..n°
function _simularCaminoCampeon({ grupos, numJugadores, campeon, simPartido, simGrupo, getData }) {
    const c = window.CAMPEON;

    // ETAPA 1: fase inicial
    c.etapaActual = (numJugadores === 7 || numJugadores === 6) ? 'liga' : 'grupos';

    let clasificados = [];
    let pasoPorRepechaje = false;
    let superoRepechaje = null; // true/false sólo si transitó el repechaje

    if (numJugadores === 7 || numJugadores === 6) {
        const r = simGrupo(grupos.all);
        clasificados = r.slice(0, 4).map(x => x.nombre);

    } else if (numJugadores === 8 || numJugadores === 10) {
        const a = simGrupo(grupos.A);
        const b = simGrupo(grupos.B);
        clasificados = [a[0].nombre, a[1].nombre, b[0].nombre, b[1].nombre];

    } else if (numJugadores === 9) {
        const a = simGrupo(grupos.A);
        const b = simGrupo(grupos.B);
        const cc = simGrupo(grupos.C);
        const primeros = [a[0].nombre, b[0].nombre, cc[0].nombre];

        // El campeón pasa por el repechaje sólo si no ganó su grupo
        pasoPorRepechaje = !primeros.includes(campeon);

        // ETAPA 2 (condicional): mini-ligas de 2° y 3° + partido eliminatorio
        c.etapaActual = 'repechaje';

        const segundos = [a[1].nombre, b[1].nombre, cc[1].nombre].map(getData);
        const terceros = [a[2].nombre, b[2].nombre, cc[2].nombre].map(getData);
        const rSeg = simGrupo(segundos);
        const rTer = simGrupo(terceros);
        const elim = simPartido(getData(rSeg[0].nombre), getData(rTer[0].nombre));
        clasificados = [...primeros, elim.ganador];

        if (pasoPorRepechaje) superoRepechaje = (elim.ganador === campeon);
    }

    if (!clasificados.includes(campeon)) {
        return { clasifico: false, pasoPorRepechaje, superoRepechaje, finalista: false, campeonNuevo: false };
    }

    // ETAPA 3: semifinales
    c.etapaActual = 'semifinal';
    const semi = _shuffleCampeon(clasificados);
    const sf1 = simPartido(getData(semi[0]), getData(semi[1]));
    const sf2 = simPartido(getData(semi[2]), getData(semi[3]));
    const finalistas = [sf1.ganador, sf2.ganador];

    if (!finalistas.includes(campeon)) {
        return { clasifico: true, pasoPorRepechaje, superoRepechaje, finalista: false, campeonNuevo: false };
    }

    // ETAPA 4: final
    c.etapaActual = 'final';
    const fin = simPartido(getData(sf1.ganador), getData(sf2.ganador));

    return {
        clasifico: true,
        pasoPorRepechaje,
        superoRepechaje,
        finalista: true,
        campeonNuevo: fin.ganador === campeon
    };
}

// ---- Mide P(bicampeón) con el factorCalibracion actual ----
function _medirPTitulo(cfg, n) {
    let t = 0;
    for (let i = 0; i < n; i++) {
        if (_simularCaminoCampeon(cfg).campeonNuevo) t++;
    }
    return t / n;
}

// =====================================================
// CALIBRACIÓN NUMÉRICA DEL PESO
// =====================================================
// La forma cerrada de λ_e es exacta cuando cada etapa es un único partido,
// pero aproximada en round-robin: clasificar no es el producto de ganar cada
// partido. Este paso mide el multiplicador de cuota REALIZADO y corrige λ con
// un ajuste secante en escala log-cuota, hasta que el realizado ≈ M.
//
// Se ejecuta UNA vez por (formato + roster + campeón + modo) y se cachea, así
// no se paga en cada simulación.
function calibrarPesoCampeon({ grupos, numJugadores, campeon, simPartido, simGrupo, n = 1500, maxIter = 4, tolerancia = 0.12 }) {
    const c = window.CAMPEON;
    if (!c || !c.activo || !campeon) return null;

    const pool = Object.values(grupos).flat();
    if (!pool.some(j => j.nombre === campeon)) return null; // el campeón no participa

    const getData = (nombre) => pool.find(j => j.nombre === nombre)
        || { nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 };
    const cfg = { grupos, numJugadores, campeon, simPartido, simGrupo, getData };

    const clave = _claveCache(grupos, numJugadores, campeon);
    const cacheado = _leerCache(clave);
    if (cacheado != null) {
        c.factorCalibracion = cacheado;
        return { factor: cacheado, desdeCache: true };
    }

    const factorPrevio = c.factorCalibracion;

    // Baseline: sin peso
    c.factorCalibracion = 0;
    const pBase = _medirPTitulo(cfg, n);

    // Objetivo: la cuota base multiplicada por M (o dividida, en modo maldición)
    const oddsBase = _odds(pBase);
    if (!isFinite(oddsBase) || oddsBase <= 0) {
        // El campeón nunca gana o gana siempre: no hay margen para calibrar
        c.factorCalibracion = factorPrevio;
        return { factor: factorPrevio, degenerado: true, pBase };
    }
    const oddsObjetivo = c.modo === 'maldicion' ? oddsBase / c.oddsMultiplier : oddsBase * c.oddsMultiplier;
    const lnObjetivo = Math.log(oddsObjetivo / oddsBase); // = ±ln(M)

    // Ajuste secante sobre el factor. f=1 es la estimación de forma cerrada.
    let f = 1;
    let mejorF = 1, mejorErr = Infinity;

    for (let iter = 0; iter < maxIter; iter++) {
        c.factorCalibracion = f;
        const p = _medirPTitulo(cfg, n);
        const o = _odds(p);

        if (!isFinite(o) || o <= 0) break;

        const lnLogrado = Math.log(o / oddsBase);
        const err = Math.abs(lnLogrado - lnObjetivo);
        if (err < mejorErr) { mejorErr = err; mejorF = f; }

        // Convergió dentro de la tolerancia (en log-cuota)
        if (err <= Math.abs(lnObjetivo) * tolerancia) break;

        // El corrimiento de log-cuota es ~lineal en f: escalar directamente
        if (Math.abs(lnLogrado) < 1e-6) break;
        const siguiente = f * (lnObjetivo / lnLogrado);

        // Clamp a un rango sano para que un formato degenerado no dispare el peso
        f = Math.max(0.2, Math.min(6, siguiente));
        if (!isFinite(f)) { f = mejorF; break; }
    }

    c.factorCalibracion = mejorF;
    _guardarCache(clave, mejorF);

    console.log(`👑 Peso de bicampeonato calibrado (formato ${numJugadores}, modo ${c.modo}): factor ×${mejorF.toFixed(3)} · P base ${(pBase * 100).toFixed(1)}%`);

    return { factor: mejorF, pBase, desdeCache: false };
}

// ---- Calibrar ANTES de simular ----
// Se llama desde el propio flujo de simulación, antes del primer partido,
// para que el peso ya esté calibrado (factorCalibracion ajustado a la cuota
// objetivo) cuando importa, en vez de correr con la estimación de forma
// cerrada (=1) sin ajustar.
function calibrarSiCorresponde(grupos, numJugadores, simPartido, simGrupo) {
    const c = window.CAMPEON;
    if (!c || !c.activo || !c.nombre || !grupos) return null;
    return calibrarPesoCampeon({ grupos, numJugadores, campeon: c.nombre, simPartido, simGrupo });
}

// ---- Caché de calibración (por sesión) ----
function _claveCache(grupos, numJugadores, campeon) {
    const c = window.CAMPEON;
    const roster = Object.values(grupos).flat().map(j => j.nombre).sort().join('|');
    // La k entra en la clave: el factor calibrado depende de la suavidad de la
    // sigmoide, así que si cambia PROB_K el caché viejo no sirve.
    return `bicampeon:v4:${c.modo}:${c.oddsMultiplier}:${c.k}:${numJugadores}:${campeon}:${roster}`;
}

function _leerCache(clave) {
    try {
        const v = window.sessionStorage && window.sessionStorage.getItem(clave);
        const n = v == null ? NaN : parseFloat(v);
        return isFinite(n) ? n : null;
    } catch (e) {
        return null; // sessionStorage no disponible (file://, modo privado, headless)
    }
}

function _guardarCache(clave, valor) {
    try {
        if (window.sessionStorage) window.sessionStorage.setItem(clave, String(valor));
    } catch (e) {
        /* sin caché: se recalcula, no es crítico */
    }
}

// Exponer globalmente
window.detectarUltimoCampeon = detectarUltimoCampeon;
window.bonusFuerzaCampeon = bonusFuerzaCampeon;
window.ajustarFuerzaPorCampeon = ajustarFuerzaPorCampeon;
window.establecerEtapaBicampeon = establecerEtapaBicampeon;
window.establecerFormatoBicampeon = establecerFormatoBicampeon;
window.calibrarPesoCampeon = calibrarPesoCampeon;
window.calibrarSiCorresponde = calibrarSiCorresponde;
