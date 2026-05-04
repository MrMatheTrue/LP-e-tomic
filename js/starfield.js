/* ========================================
   E-TOMIC — Starfield Background
   Partículas em roxo/violeta/azul
======================================== */
(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const canvas = document.createElement('canvas');
        document.body.prepend(canvas);

        Object.assign(canvas.style, {
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: '-1'
        });

        const ctx = canvas.getContext('2d');

        let w, h, dpr;
        let particles = [];
        let time = 0;
        let stars = []; // estrelas estáticas de fundo

        const mouse = { x: -9999, y: -9999 };
        let mouseActive = false;

        const CONFIG = {
            count: 280,
            // três cores para partículas (sorteadas)
            colors: ['#9D4EDD', '#B5179E', '#4CC9F0'],

            // campo
            fieldScale: 0.0025,
            fieldTime: 0.0006,
            fieldForce: 0.25,

            // tecido
            neighborRadius: 42,
            neighborForce: 0.0028,

            // mouse
            mouseRadius: 180,
            mouseForce: 0.12,

            // estabilidade
            friction: 0.992,
            idleMotion: 0.06,
            reviveMotion: 0.9,
            centerPull: 0.000002,

            // visual
            strokeMin: 0.2,
            strokeMax: 1.4,
            lengthMin: 0.5,
            lengthMax: 12,

            // estrelas estáticas
            starCount: 120
        };

        function fieldAngle(x, y, t) {
            const nx = x * CONFIG.fieldScale;
            const ny = y * CONFIG.fieldScale;
            return (
                Math.sin(nx + t) +
                Math.sin(ny * 1.3 - t * 1.2) +
                Math.sin((nx + ny) * 0.7 + t * 0.8)
            );
        }

        class Particle {
            constructor() {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.vx = 0;
                this.vy = 0;
                this.angle = 0;
                this.stroke = CONFIG.strokeMin;
                this.len = CONFIG.lengthMin;
                this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
            }

            update() {
                const t = time;

                // campo de fluxo
                const a = fieldAngle(this.x, this.y, t);
                const fx = Math.cos(a) * CONFIG.fieldForce;
                const fy = Math.sin(a) * CONFIG.fieldForce;
                this.vx += fx;
                this.vy += fy;

                // mouse
                let md = Infinity;
                if (mouseActive) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    md = Math.sqrt(dx * dx + dy * dy);
                    if (md < CONFIG.mouseRadius) {
                        const force = (1 - md / CONFIG.mouseRadius) * CONFIG.mouseForce;
                        this.vx += (dx / (md || 1)) * force;
                        this.vy += (dy / (md || 1)) * force;
                    }
                }

                // pull para o centro
                const cx = w / 2, cy = h / 2;
                this.vx += (cx - this.x) * CONFIG.centerPull;
                this.vy += (cy - this.y) * CONFIG.centerPull;

                // fricção
                this.vx *= CONFIG.friction;
                this.vy *= CONFIG.friction;

                // motion perpétuo
                this.vx += (Math.random() - 0.5) * CONFIG.idleMotion;
                this.vy += (Math.random() - 0.5) * CONFIG.idleMotion;
                if (!mouseActive) {
                    this.vx += (Math.random() - 0.5) * CONFIG.reviveMotion * 0.05;
                    this.vy += (Math.random() - 0.5) * CONFIG.reviveMotion * 0.05;
                }

                // posição
                this.x += this.vx;
                this.y += this.vy;

                // wrap
                if (this.x < 0) this.x = w;
                if (this.x > w) this.x = 0;
                if (this.y < 0) this.y = h;
                if (this.y > h) this.y = 0;

                // visual
                this.angle = Math.atan2(this.vy, this.vx);

                const paddingR = CONFIG.mouseRadius * 0.45;
                const marginR  = CONFIG.mouseRadius;

                let visualInfluence = 0;
                if (mouseActive && md < marginR) {
                    const d = Math.abs(md - paddingR);
                    visualInfluence = Math.max(0, 1 - d / (marginR - paddingR));
                }
                visualInfluence = visualInfluence * visualInfluence;

                const targetStroke = CONFIG.strokeMin + visualInfluence * (CONFIG.strokeMax - CONFIG.strokeMin);
                const targetLen    = CONFIG.lengthMin + visualInfluence * (CONFIG.lengthMax - CONFIG.lengthMin);

                this.stroke += (targetStroke - this.stroke) * 0.18;
                this.len    += (targetLen - this.len) * 0.18;
            }

            draw() {
                ctx.strokeStyle = this.color;
                ctx.fillStyle = this.color;
                if (this.len < 1.5) {
                    ctx.fillRect(this.x, this.y, 1, 1);
                } else {
                    ctx.lineWidth = this.stroke;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(
                        this.x - Math.cos(this.angle) * this.len,
                        this.y - Math.sin(this.angle) * this.len
                    );
                    ctx.stroke();
                }
            }
        }

        function drawStars() {
            for (const s of stars) {
                const tw = 0.5 + 0.5 * Math.sin(time * 80 + s.phase);
                ctx.globalAlpha = s.baseAlpha * tw;
                ctx.fillStyle = s.color;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            }
            ctx.globalAlpha = 1;
        }

        function resize() {
            dpr = window.devicePixelRatio || 1;
            w = window.innerWidth;
            h = window.innerHeight;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            particles = Array.from({ length: CONFIG.count }, () => new Particle());

            // estrelas estáticas (fundo)
            const starColors = ['#FFFFFF', '#E0AAFF', '#9D4EDD', '#4CC9F0'];
            stars = Array.from({ length: CONFIG.starCount }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() < 0.7 ? 1 : 2,
                color: starColors[Math.floor(Math.random() * starColors.length)],
                phase: Math.random() * Math.PI * 2,
                baseAlpha: 0.3 + Math.random() * 0.5
            }));
        }

        function animate() {
            time += CONFIG.fieldTime * w;

            ctx.clearRect(0, 0, w, h);
            ctx.lineCap = 'round';

            drawStars();

            for (const p of particles) {
                p.update();
                p.draw();
            }

            requestAnimationFrame(animate);
        }

        window.addEventListener('mousemove', e => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouseActive = true;
        }, { passive: true });

        window.addEventListener('mouseleave', () => {
            mouseActive = false;
        });

        window.addEventListener('resize', resize);

        resize();
        animate();
    }
})();
