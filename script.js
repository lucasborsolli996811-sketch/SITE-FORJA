/* ==========================================
   FORJA — Interactive Script
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Header scroll effect ----
    const header = document.getElementById('header');
    const heroSection = document.querySelector('.hero');

    const handleHeaderScroll = () => {
        if (window.scrollY > 60) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll();

    // ---- Active nav link on scroll ----
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const activateNav = () => {
        const scrollY = window.scrollY + window.innerHeight / 3;
        sections.forEach(section => {
            const top = section.offsetTop - 100;
            const bottom = top + section.offsetHeight;
            const id = section.getAttribute('id');
            if (scrollY >= top && scrollY < bottom) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };
    window.addEventListener('scroll', activateNav, { passive: true });

    // ---- Mobile menu ----
    const mobileToggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('nav');

    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('open');
            mobileToggle.classList.toggle('active');
            mobileToggle.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close on link click
        nav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                mobileToggle.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }

    // ---- Reveal on scroll ----
    const reveals = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        reveals.forEach(el => revealObserver.observe(el));
    } else {
        reveals.forEach(el => el.classList.add('revealed'));
    }

    // Calculate faturados count dynamically for "Serviço ao cliente"
    const budgetsDataStr = localStorage.getItem('forja_budgets');
    let faturadosCount = 0;
    if (budgetsDataStr) {
        try {
            const budgets = JSON.parse(budgetsDataStr);
            faturadosCount = budgets.filter(b => b.status === 'PRODUTO FATURADO' || b.status === 'PRODUTO COMPRADO').length;
        } catch (e) {
            console.error("Error parsing budgets:", e);
        }
    }
    const serviceCounter = document.getElementById('service-customer-counter');
    if (serviceCounter) {
        serviceCounter.setAttribute('data-target', (150 + faturadosCount).toString());
    }

    // ---- Stat counter animation ----
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    const animateCounter = (el) => {
        const target = parseInt(el.getAttribute('data-target'), 10);
        const duration = 1800;
        const startTime = performance.now();

        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.round(easeOutQuart(progress) * target);
            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        };

        requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(el => statObserver.observe(el));
    } else {
        statNumbers.forEach(animateCounter);
    }

    // ---- WhatsApp FAB visibility ----
    const fab = document.getElementById('whatsapp-fab');

    if (fab) {
        const showFab = () => {
            if (window.scrollY > 400) {
                fab.classList.add('visible');
            } else {
                fab.classList.remove('visible');
            }
        };
        window.addEventListener('scroll', showFab, { passive: true });
        showFab();
    }

    // ---- Hero particle effect (canvas) ----
    const particleContainer = document.getElementById('particles');

    if (particleContainer) {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        particleContainer.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animFrame;
        let w, h;

        const resize = () => {
            w = canvas.width = particleContainer.offsetWidth;
            h = canvas.height = particleContainer.offsetHeight;
        };

        const createParticles = () => {
            const count = Math.floor((w * h) / 18000);
            particles = [];
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 1.4 + 0.4,
                    dx: (Math.random() - 0.5) * 0.3,
                    dy: (Math.random() - 0.5) * 0.3,
                    alpha: Math.random() * 0.5 + 0.1,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;

                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(249, 115, 22, ${p.alpha})`;
                ctx.fill();
            });

            // Draw connection lines between close particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(249, 115, 22, ${0.06 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animFrame = requestAnimationFrame(draw);
        };

        resize();
        createParticles();
        draw();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });

        // Pause particles when hero is not visible for perf
        if ('IntersectionObserver' in window && heroSection) {
            const heroObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (!animFrame) draw();
                    } else {
                        cancelAnimationFrame(animFrame);
                        animFrame = null;
                    }
                });
            }, { threshold: 0 });
            heroObserver.observe(heroSection);
        }
    }

    // ---- Contact form (demo) ----
    const form = document.getElementById('contact-form');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span style="display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-radius:50%; border-top-color:#fff; animation:spin 1s ease-in-out infinite;"></span> Enviando...';
            btn.disabled = true;

            const formData = new FormData(form);
            // Required Formsubmit fields
            formData.append('_captcha', 'false');
            formData.append('_subject', 'Novo Contato do Site - Forja!');

            fetch("https://formsubmit.co/ajax/Forja3dprojetos@gmail.com", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if(data.success) {
                    btn.innerHTML = '<span>Mensagem Enviada!</span> <i class="fa-solid fa-check"></i>';
                    btn.style.background = 'linear-gradient(135deg, #25d366, #128c7e)';
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.style.background = '';
                        btn.disabled = false;
                        form.reset();
                    }, 4000);
                } else {
                    throw new Error("Formsubmit Error");
                }
            })
            .catch(err => {
                console.error(err);
                alert("Erro ao enviar a mensagem. Por favor, tente novamente ou entre em contato pelo nosso WhatsApp!");
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            });
        });
    }

});
