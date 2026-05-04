/* ========================================
   E-TOMIC — Main JS
======================================== */
(function () {
    function init() {
        // Reveal on scroll
        const reveals = document.querySelectorAll('.reveal');
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
            reveals.forEach(r => io.observe(r));
        } else {
            reveals.forEach(r => r.classList.add('visible'));
        }

        // Smooth scroll para âncoras internas
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', (e) => {
                const id = a.getAttribute('href');
                if (id && id.length > 1) {
                    const t = document.querySelector(id);
                    if (t) {
                        e.preventDefault();
                        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });

        // Header shadow ao rolar
        const header = document.querySelector('.header');
        if (header) {
            const onScroll = () => {
                if (window.scrollY > 20) header.style.borderBottomColor = 'rgba(157, 78, 221, 0.3)';
                else header.style.borderBottomColor = 'rgba(157, 78, 221, 0.12)';
            };
            window.addEventListener('scroll', onScroll, { passive: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
