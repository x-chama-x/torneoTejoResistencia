document.addEventListener('DOMContentLoaded', () => {
    /* ─── DIFFICULTY CARDS ─── */
    document.querySelectorAll('.diff-card').forEach(c => {
        c.addEventListener('click', () => {
            document.querySelectorAll('.diff-card').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            currentLevel = c.dataset.level;
        });
    });

    /* ─── LEVELS CONFIG ─── */
    const LEVELS = {
        easy:   { cpuSpeed: 2.6,  maxPuck: 10, label: 'Fácil',      predict: 0.40 },
        medium: { cpuSpeed: 4.0,  maxPuck: 13, label: 'Intermedio', predict: 0.72 },
        hard:   { cpuSpeed: 6.0,  maxPuck: 15, label: 'Difícil',    predict: 0.97 }
    };
    let currentLevel = 'medium';

    /* ─── CANVAS SETUP ─── */
    const canvas  = document.getElementById('ah-canvas');
    if (!canvas) return;
    const ctx     = canvas.getContext('2d');
    let W = canvas.width, H = canvas.height;

    // Responsive resize
    function resizeCanvas() {
        // En móviles o PC pequeñas, el alto también puede hacer que se corte
        // Calculamos un margen vertical para HUD, botones, padding, etc.
        const offH = window.innerWidth <= 900 ? 120 : 160;

        const maxW = Math.min(500, window.innerWidth - 40);
        const maxH = Math.min(640, window.innerHeight - offH);

        // El factor de escala elige el menor para asegurarse de que quepa de ancho y de alto sin hacer scroll
        const scale = Math.min(maxW / 500, maxH / 640);

        canvas.style.width  = (500 * scale) + 'px';
        canvas.style.height = (640 * scale) + 'px';
        document.getElementById('table-wrap').style.width = (500 * scale) + 'px';
        document.querySelector('.hud').style.maxWidth     = (500 * scale) + 'px';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    /* ─── CONSTANTS ─── */
    const GOAL_W  = 160;
    const GOAL_X  = (W - GOAL_W) / 2;
    const PR  = 18;   // puck radius
    const MR  = 28;   // mallet radius
    const MAX_SCORE = 7;

    /* ─── STATE ─── */
    let gs = null, animId = null;
    let mouseX = W/2, mouseY = H - 100;
    let prevMX = W/2, prevMY = H - 100;

    /* ─── MOUSE / TOUCH ─── */
    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        const scaleX = W / r.width, scaleY = H / r.height;
        const src = e.touches ? e.touches[0] : e;
        return {
            x: (src.clientX - r.left) * scaleX,
            y: (src.clientY - r.top)  * scaleY
        };
    }
    function applyPos(e) { const p = getPos(e); mouseX = p.x; mouseY = p.y; }
    canvas.addEventListener('mousemove',  applyPos);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); applyPos(e); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); applyPos(e); }, { passive: false });
    if ('ontouchstart' in window) {
        document.getElementById('msg-bar').textContent = 'Arrastrá el dedo en tu mitad de la mesa';
    }

    /* ─── NAVIGATION BUTTONS ─── */
    document.getElementById('btn-start').addEventListener('click',    startGame);
    document.getElementById('btn-restart').addEventListener('click',  restartGame);
    document.getElementById('btn-replay').addEventListener('click',   restartGame);
    document.getElementById('btn-menu-ov').addEventListener('click',  goMenu);
    document.getElementById('btn-menu2').addEventListener('click',    goMenu);

    /* ─── HELPERS ─── */
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function makeState() {
        const dir = Math.random() > 0.5 ? 1 : -1;
        const spd = 4.5 + Math.random();
        const a   = (Math.random() - 0.5) * 0.8;
        return {
            puck:   { x: W/2, y: H/2, vx: Math.sin(a)*spd, vy: dir*spd },
            player: { x: W/2, y: H - 100 },
            cpu:    { x: W/2, y: 100 },
            scores: { cpu: 0, player: 0 },
            over:   false,
            stuckTimer: 0,
            lastPuckPos: { x: W/2, y: H/2 }
        };
    }

    function resetPuck(dir) {
        const p = gs.puck;
        p.x = W/2; p.y = H/2 + (dir > 0 ? 65 : -65);
        const spd = 4.2 + Math.random() * 0.8;
        const a   = (Math.random() - 0.5) * 0.75;
        p.vx = Math.sin(a) * spd;
        p.vy = dir * spd;
        gs.stuckTimer   = 0;
        gs.lastPuckPos  = { x: p.x, y: p.y };
    }

    function updateScoreUI() {
        document.getElementById('s-cpu').textContent = gs.scores.cpu;
        document.getElementById('s-ply').textContent = gs.scores.player;
    }

    /* ─── CPU AI ─── */
    function cpuAI() {
        const lv = LEVELS[currentLevel];
        const p  = gs.puck, c = gs.cpu;

        // Distance from CPU mallet to puck
        const dxP  = p.x - c.x, dyP = p.y - c.y;
        const distP = Math.sqrt(dxP*dxP + dyP*dyP);
        const tooClose = distP < (PR + MR + 8); // inside "hug zone"

        let tx, ty;

        // Safe Y limit: CPU mallet must never get closer than MR+4 to its own goal line (y=0)
        // AND must never cross the center line
        const CPU_Y_MIN = MR + 4;
        const CPU_Y_MAX = H/2 - MR - 2;

        if (tooClose) {
            // Back away along the normal — never chase the puck when already touching it.
            tx = c.x - dxP * 1.5;
            ty = c.y - dyP * 1.5;
            tx = clamp(tx, MR + 2, W - MR - 2);
            ty = clamp(ty, CPU_Y_MIN, CPU_Y_MAX);
        } else if (p.vy > 0) {
            // Puck moving toward player — retreat to safe spot
            tx = W / 2;
            ty = 80;
        } else {
            // Puck incoming — predict intercept point
            if (Math.random() < lv.predict) {
                const t = Math.abs((c.y - p.y) / (p.vy || -0.01));
                tx = clamp(p.x + p.vx * t * 0.55, MR + 8, W - MR - 8);
            } else {
                tx = p.x;
            }
            // Target: slightly in front of puck (toward center), never on top of it
            ty = clamp(p.y - (PR + MR + 8), CPU_Y_MIN, CPU_Y_MAX);
        }

        const dx   = tx - c.x, dy = ty - c.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0.5) {
            const spd = tooClose ? lv.cpuSpeed * 1.4 : lv.cpuSpeed;
            c.x += (dx/dist) * Math.min(spd, dist);
            c.y += (dy/dist) * Math.min(spd * 0.88, dist);
        }
        // Hard clamp — CPU mallet can NEVER exit its half or reach its own goal
        c.x = clamp(c.x, MR + 2, W - MR - 2);
        c.y = clamp(c.y, CPU_Y_MIN, CPU_Y_MAX);
    }

    /* ─── MALLET COLLISION ─── */
    function malletHit(mallet, dvx, dvy, isCpu) {
        const p    = gs.puck;
        const lv   = LEVELS[currentLevel];
        const dx   = p.x - mallet.x, dy = p.y - mallet.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minD = PR + MR;
        if (dist < minD && dist > 0.1) {
            const nx = dx / (dist || 1), ny = dy / (dist || 1);
            // Separate puck fully — extra gap to avoid re-triggering next frame
            p.x = mallet.x + nx * (minD + 2);
            p.y = mallet.y + ny * (minD + 2);
            // Reflect velocity relative to mallet motion
            const dot = (p.vx - dvx)*nx + (p.vy - dvy)*ny;
            if (dot < 0) {
                p.vx -= 2 * dot * nx - dvx * 0.7;
                p.vy -= 2 * dot * ny - dvy * 0.7;
            } else {
                // Already moving away but still overlapping — gentle push out
                p.vx += nx * 2;
                p.vy += ny * 2;
            }
            // For CPU mallet: puck MUST leave moving toward player (vy > 0)
            // This prevents the mallet's backward motion from sending the puck into the CPU's own goal
            if (isCpu && p.vy < 1.5) {
                p.vy = 1.5 + Math.random() * 2;
            }
            // Speed clamp
            const spd = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            if (spd > lv.maxPuck) { p.vx = p.vx/spd*lv.maxPuck; p.vy = p.vy/spd*lv.maxPuck; }
            if (spd < 3.5)        { p.vx *= 3.5/spd;             p.vy *= 3.5/spd;             }
        }
    }

    /* ─── STUCK DETECTION ─── */
    function checkStuck() {
        const p   = gs.puck;
        const dx  = p.x - gs.lastPuckPos.x;
        const dy  = p.y - gs.lastPuckPos.y;
        const mov = Math.sqrt(dx*dx + dy*dy);

        if (mov < 1.2) {
            gs.stuckTimer++;
        } else {
            gs.stuckTimer   = 0;
            gs.lastPuckPos  = { x: p.x, y: p.y };
        }

        // If stuck for ~45 frames (~0.75 s), rescue it
        if (gs.stuckTimer > 45) {
            gs.stuckTimer = 0;
            const dir = p.y < H/2 ? 1 : -1;
            const spd = 5 + Math.random() * 2;
            const a   = ((Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.5));
            p.vx = Math.cos(a) * spd;
            p.vy = dir * Math.abs(Math.sin(a)) * spd || dir * spd;
            gs.lastPuckPos = { x: p.x, y: p.y };
        }
    }

    /* ─── UPDATE ─── */
    function update() {
        if (!gs || gs.over) return;
        const p  = gs.puck;
        const pl = gs.player;

        // Player mallet velocity
        const pvx = (mouseX - pl.x) * 0.5;
        const pvy = (mouseY - pl.y) * 0.5;
        pl.x = clamp(mouseX, MR + 2, W - MR - 2);
        pl.y = clamp(mouseY, H/2 + MR + 2, H - MR - 2);

        cpuAI();

        // Move puck
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.9998;
        p.vy *= 0.9998;

        // Wall collisions (sides)
        if (p.x - PR < 2)     { p.x = PR + 2;    p.vx =  Math.abs(p.vx); }
        if (p.x + PR > W - 2) { p.x = W - PR - 2; p.vx = -Math.abs(p.vx); }

        // Top wall / goal
        if (p.y - PR < 2) {
            if (p.x > GOAL_X && p.x < GOAL_X + GOAL_W) {
                gs.scores.player++;
                updateScoreUI();
                if (gs.scores.player >= MAX_SCORE) { endGame(true);  return; }
                resetPuck(1);
            } else {
                p.y  = PR + 2;
                p.vy = Math.abs(p.vy);
            }
        }
        // Bottom wall / goal
        if (p.y + PR > H - 2) {
            if (p.x > GOAL_X && p.x < GOAL_X + GOAL_W) {
                gs.scores.cpu++;
                updateScoreUI();
                if (gs.scores.cpu >= MAX_SCORE) { endGame(false); return; }
                resetPuck(-1);
            } else {
                p.y  = H - PR - 2;
                p.vy = -Math.abs(p.vy);
            }
        }

        malletHit(pl,      pvx, pvy, false);
        malletHit(gs.cpu,  0,   0,   true);
        checkStuck();
    }

    /* ─── DRAW ─── */
    function draw() {
        if (!gs) return;
        ctx.clearRect(0, 0, W, H);

        // Table background
        ctx.fillStyle = '#0d2a1a';
        ctx.beginPath(); ctx.roundRect(0, 0, W, H, 14); ctx.fill();

        // Center line
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
        ctx.setLineDash([]);

        // Center circle
        ctx.beginPath(); ctx.arc(W/2, H/2, 65, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(W/2, H/2, 5, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill();

        // Goals
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath(); ctx.roundRect(GOAL_X, 0,        GOAL_W, 14, [0,0,8,8]); ctx.fill();
        ctx.beginPath(); ctx.roundRect(GOAL_X, H - 14,   GOAL_W, 14, [8,8,0,0]); ctx.fill();

        // Goal posts
        ctx.strokeStyle = '#2ea043'; ctx.lineWidth = 3;
        [[GOAL_X, 2, GOAL_X, 16], [GOAL_X+GOAL_W, 2, GOAL_X+GOAL_W, 16],
         [GOAL_X, H-2, GOAL_X, H-16], [GOAL_X+GOAL_W, H-2, GOAL_X+GOAL_W, H-16]
        ].forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        });

        // Puck
        const p = gs.puck;
        ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, Math.PI*2);
        ctx.fillStyle = '#ccc'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x - 4, p.y - 4, PR * 0.35, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();

        // Mallets
        function drawMallet(x, y, fill, glow) {
            ctx.beginPath(); ctx.arc(x, y, MR, 0, Math.PI*2);
            ctx.fillStyle   = fill; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.5; ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
        }
        drawMallet(gs.cpu.x,    gs.cpu.y,    '#da3633', '#f85149');
        drawMallet(gs.player.x, gs.player.y, '#1f6feb', '#58a6ff');

        // Level watermark
        ctx.font        = 'bold 11px Segoe UI, sans-serif';
        ctx.textAlign   = 'left';
        ctx.fillStyle   = 'rgba(255,255,255,0.18)';
        ctx.fillText(LEVELS[currentLevel].label.toUpperCase(), 10, H/2 - 10);
    }

    /* ─── OVERLAY ─── */
    function endGame(playerWon) {
        gs.over = true;
        const ov = document.getElementById('overlay');
        document.getElementById('ov-title').textContent  = playerWon ? '¡Ganaste! 🎉' : 'CPU gana 🤖';
        document.getElementById('ov-sub').textContent    = playerWon ? '¡Excelente partida!' : 'La computadora fue mejor esta vez';
        document.getElementById('ov-score').textContent  = `${gs.scores.player} – ${gs.scores.cpu}`;
        ov.style.display = 'flex';
    }

    /* ─── LOOP ─── */
    function loop() {
        update();
        draw();
        animId = requestAnimationFrame(loop);
    }

    /* ─── SCREEN TRANSITIONS ─── */
    function startGame() {
        document.getElementById('screen-menu').style.display = 'none';
        document.getElementById('screen-game').style.display = 'flex';
        document.getElementById('hud-badge').textContent     = LEVELS[currentLevel].label;
        mouseX = W/2; mouseY = H - 100;

        // Hacemos un scroll automático arriba y garantizamos el resize con el nuevo elemento
        resizeCanvas();
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);

        launchGame();
    }

    function restartGame() {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('msg-bar').textContent   = 'Mové tu mazo con el mouse o el dedo';
        launchGame();
    }

    function goMenu() {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        document.getElementById('overlay').style.display      = 'none';
        document.getElementById('screen-game').style.display  = 'none';
        document.getElementById('screen-menu').style.display  = 'flex';
    }

    function launchGame() {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        gs = makeState();
        updateScoreUI();
        loop();
    }
});
