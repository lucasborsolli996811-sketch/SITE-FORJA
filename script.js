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

    // Check for success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('sent')) {
        alert("Sua mensagem foi enviada com sucesso! Entraremos em contato em breve.");
        // Clean url
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ==========================================
    // CAROUSEL LOGIC
    // ==========================================
    const initCarousel = () => {
        const track = document.getElementById('carousel-track');
        const section = document.getElementById('site-gallery');
        if (!track || !section) return;

        // Fetch posts from data.js
        const posts = (window.ForjaDB && window.ForjaDB.getPosts) ? window.ForjaDB.getPosts() : [];
        if (posts.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        
        let currentIndex = 0;
        
        track.innerHTML = posts.map((p, i) => `
            <div class="carousel-slide" style="min-width: 100%; position: relative;">
                <img src="${p.image}" alt="${p.title}" style="width: 100%; height: 500px; object-fit: cover; display: block;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 2rem 1.5rem 1.5rem; text-align: center; color: white;">
                    <span class="badge" style="background: var(--accent); font-size: 0.75rem; padding: 0.2rem 0.6rem; margin-bottom: 0.5rem; display: inline-block;">${p.category}</span>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">${p.title}</h3>
                    <p style="margin: 0; font-size: 0.95rem; opacity: 0.9; max-width: 600px; margin: 0 auto;">${p.desc}</p>
                </div>
            </div>
        `).join('');

        const indicators = document.getElementById('carousel-indicators');
        if (indicators) {
            indicators.innerHTML = posts.map((_, i) => `
                <button class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}" style="width: 12px; height: 12px; border-radius: 50%; border: none; background: ${i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: 0.3s;"></button>
            `).join('');
        }

        const updateCarousel = () => {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            if (indicators) {
                Array.from(indicators.children).forEach((dot, idx) => {
                    dot.style.background = idx === currentIndex ? 'var(--accent)' : 'rgba(255,255,255,0.5)';
                });
            }
        };

        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');

        if (prevBtn) prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : posts.length - 1;
            updateCarousel();
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex < posts.length - 1) ? currentIndex + 1 : 0;
            updateCarousel();
        });

        if (indicators) {
            Array.from(indicators.children).forEach(dot => {
                dot.addEventListener('click', (e) => {
                    currentIndex = parseInt(e.target.getAttribute('data-idx'));
                    updateCarousel();
                });
            });
        }
        
        // Auto-play
        setInterval(() => {
            if(document.visibilityState === 'visible') {
                currentIndex = (currentIndex < posts.length - 1) ? currentIndex + 1 : 0;
                updateCarousel();
            }
        }, 5000);
    };
    
    // We must wait a brief moment for data.js to sync if using Firebase locally
    setTimeout(initCarousel, 500);

});
