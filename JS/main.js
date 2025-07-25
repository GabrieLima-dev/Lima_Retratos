// ===== GABRIEL LIMA RETRATOS - MAIN JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    // ===== VARIÁVEIS GLOBAIS =====
    let currentSlide = 0;
    let slideInterval;
    let isAutoPlaying = true;

    // ===== ELEMENTOS DOM =====
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const indicators = document.querySelectorAll('.indicator');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const portfolioFilters = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    const contactForm = document.getElementById('contactForm');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDescription = document.getElementById('lightbox-description');
    const lightboxClose = document.querySelector('.lightbox-close');
    const themeToggle = document.getElementById('themeToggle');

    // ===== INICIALIZAÇÃO =====
    init();

    function init() {
        setupEventListeners();
        startCarousel();
        setupScrollEffects();
        setupPortfolioFilters();
        setupLightbox();
        setupContactForm();
        setupVideoCards();
        setupInstagramFeed();
        setupSmoothScrolling();
        setupThemeToggle();
        initializeTheme();
    }

    // ===== SISTEMA DE TEMAS =====
    function setupThemeToggle() {
        themeToggle?.addEventListener('click', toggleTheme);
    }

    function initializeTheme() {
        // Verificar se há preferência salva
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            // Usar tema salvo
            setTheme(savedTheme);
        } else {
            // Usar preferência do sistema
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemPrefersDark ? 'dark' : 'light');
        }

        // Escutar mudanças na preferência do sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Notificação de mudança de tema
        const themeText = newTheme === 'dark' ? 'escuro' : 'claro';
        showNotification(`Tema ${themeText} ativado!`, 'success');
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Atualizar meta theme-color para mobile
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        const themeColor = theme === 'dark' ? '#0D1117' : '#F5F2E8';
        themeColorMeta.content = themeColor;
        
        // Adicionar classe ao body para transições suaves
        document.body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
        
        // Remover transição após um tempo para não afetar outras animações
        setTimeout(() => {
            document.body.style.transition = '';
        }, 400);
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Mobile menu
        hamburger?.addEventListener('click', toggleMobileMenu);
        
        // Carousel controls
        prevBtn?.addEventListener('click', () => changeSlide('prev'));
        nextBtn?.addEventListener('click', () => changeSlide('next'));
        
        // Carousel indicators
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => goToSlide(index));
        });

        // Scroll events
        window.addEventListener('scroll', handleScroll);
        
        // Resize events
        window.addEventListener('resize', handleResize);

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);

        // Close mobile menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu?.classList.remove('active');
            });
        });

        // Close lightbox on outside click
        lightbox?.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    // ===== MOBILE MENU =====
    function toggleMobileMenu() {
        navMenu?.classList.toggle('active');
        hamburger?.classList.toggle('active');
    }

    // ===== CAROUSEL FUNCTIONALITY =====
    function startCarousel() {
        if (carouselItems.length === 0) return;
        
        slideInterval = setInterval(() => {
            if (isAutoPlaying) {
                changeSlide('next');
            }
        }, 5000);

        // Pause on hover
        const heroSection = document.querySelector('.hero');
        heroSection?.addEventListener('mouseenter', () => {
            isAutoPlaying = false;
        });
        
        heroSection?.addEventListener('mouseleave', () => {
            isAutoPlaying = true;
        });
    }

    function changeSlide(direction) {
        if (carouselItems.length === 0) return;

        carouselItems[currentSlide]?.classList.remove('active');
        indicators[currentSlide]?.classList.remove('active');

        if (direction === 'next') {
            currentSlide = (currentSlide + 1) % carouselItems.length;
        } else {
            currentSlide = (currentSlide - 1 + carouselItems.length) % carouselItems.length;
        }

        carouselItems[currentSlide]?.classList.add('active');
        indicators[currentSlide]?.classList.add('active');
    }

    function goToSlide(index) {
        if (carouselItems.length === 0 || index === currentSlide) return;

        carouselItems[currentSlide]?.classList.remove('active');
        indicators[currentSlide]?.classList.remove('active');

        currentSlide = index;

        carouselItems[currentSlide]?.classList.add('active');
        indicators[currentSlide]?.classList.add('active');
    }

    // ===== SCROLL EFFECTS =====
    function setupScrollEffects() {
        // Add scroll class to header
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate');
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        // Observe sections for animation
        document.querySelectorAll('section').forEach((section) => {
            observer.observe(section);
        });
    }

    function handleScroll() {
        const scrolled = window.pageYOffset;
        
        // Header background on scroll
        if (scrolled > 100) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }

        // Update active nav link
        updateActiveNavLink();
    }

    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop && 
                window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    // ===== PORTFOLIO FILTERS =====
    function setupPortfolioFilters() {
        portfolioFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const filterValue = filter.getAttribute('data-filter');
                
                // Update active filter
                portfolioFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Filter portfolio items
                filterPortfolioItems(filterValue);
            });
        });
    }

    function filterPortfolioItems(filter) {
        portfolioItems.forEach(item => {
            const category = item.getAttribute('data-category');
            
            if (filter === 'all' || category === filter) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 100);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    }

    // ===== LIGHTBOX =====
    function setupLightbox() {
        // Portfolio items
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const portfolioItem = btn.closest('.portfolio-item');
                const img = portfolioItem.querySelector('img');
                const title = portfolioItem.querySelector('h3').textContent;
                const description = portfolioItem.querySelector('p').textContent;
                
                openLightbox(img.src, title, description);
            });
        });

        // Close lightbox
        lightboxClose?.addEventListener('click', closeLightbox);
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox?.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    function openLightbox(src, title, description) {
        if (!lightbox) return;
        
        lightboxImage.src = src;
        lightboxTitle.textContent = title;
        lightboxDescription.textContent = description;
        
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox) return;
        
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ===== CONTACT FORM =====
    function setupContactForm() {
        contactForm?.addEventListener('submit', handleContactSubmit);
    }

    function handleContactSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const service = formData.get('service');
        const message = formData.get('message');
        
        // Validate form
        if (!name || !email || !service || !message) {
            showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        // Create WhatsApp message
        const whatsappMessage = createWhatsAppMessage(name, email, phone, service, message);
        const whatsappURL = `https://wa.me/5579981338664?text=${encodeURIComponent(whatsappMessage)}`;
        
        // Open WhatsApp
        window.open(whatsappURL, '_blank');
        
        // Reset form
        contactForm.reset();
        showNotification('Redirecionando para o WhatsApp...', 'success');
    }

    function createWhatsAppMessage(name, email, phone, service, message) {
        return `Olá Gabriel! 📸

*Nome:* ${name}
*E-mail:* ${email}
${phone ? `*WhatsApp:* ${phone}` : ''}
*Serviço:* ${service}

*Mensagem:*
${message}

Gostaria de saber mais sobre seus serviços!`;
    }

    // ===== VIDEO CARDS =====
    function setupVideoCards() {
        const videoCards = document.querySelectorAll('.video-card');
        
        videoCards.forEach(card => {
            const playBtn = card.querySelector('.play-btn');
            
            playBtn?.addEventListener('click', () => {
                const title = card.querySelector('.video-title').textContent;
                showNotification(`Vídeo "${title}" em breve disponível!`, 'info');
            });
            
            // Hover effects for video thumbnails
            card.addEventListener('mouseenter', () => {
                const video = card.querySelector('video');
                if (video) {
                    video.play().catch(() => {
                        // Video play failed, ignore silently
                    });
                }
            });
            
            card.addEventListener('mouseleave', () => {
                const video = card.querySelector('video');
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            });
        });
    }

    // ===== INSTAGRAM FEED =====
    function setupInstagramFeed() {
        const feedGrid = document.getElementById('feedGrid');
        if (!feedGrid) return;

        // Add more feed items for continuous scroll effect
        const feedItems = feedGrid.innerHTML;
        feedGrid.innerHTML = feedItems + feedItems; // Duplicate content
        
        // Instagram feed animation
        animateInstagramFeed();
    }

    function animateInstagramFeed() {
        const feedGrid = document.getElementById('feedGrid');
        if (!feedGrid) return;

        let scrollPosition = 0;
        const scrollSpeed = 0.5;
        const maxScroll = feedGrid.scrollHeight / 2;

        function animate() {
            scrollPosition += scrollSpeed;
            
            if (scrollPosition >= maxScroll) {
                scrollPosition = 0;
            }
            
            feedGrid.style.transform = `translateY(-${scrollPosition}px)`;
            requestAnimationFrame(animate);
        }
        
        animate();
    }

    // ===== SMOOTH SCROLLING =====
    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80; // Account for header
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ===== KEYBOARD NAVIGATION =====
    function handleKeyboard(e) {
        if (lightbox?.classList.contains('active')) {
            switch(e.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    changeSlide('prev');
                    break;
                case 'ArrowRight':
                    changeSlide('next');
                    break;
            }
        }
        
        // Atalho de teclado para trocar tema (Ctrl/Cmd + Shift + T)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            toggleTheme();
        }
    }

    // ===== RESIZE HANDLER =====
    function handleResize() {
        // Close mobile menu on desktop
        if (window.innerWidth > 768) {
            navMenu?.classList.remove('active');
            hamburger?.classList.remove('active');
        }
    }

    // ===== NOTIFICATION SYSTEM =====
    function showNotification(message, type = 'info', duration = 4000) {
        const notification = createNotificationElement(message, type);
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto hide
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
        
        // Close button
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn?.addEventListener('click', () => {
            hideNotification(notification);
        });
    }

    function createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icons[type] || icons.info}"></i>
                <span>${message}</span>
                <button class="close-btn" aria-label="Fechar notificação">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Position notification
        const existingNotifications = document.querySelectorAll('.notification');
        const top = 20 + (existingNotifications.length * 80);
        notification.style.cssText = `
            position: fixed;
            top: ${top}px;
            right: 20px;
            z-index: 10000;
            background: var(--glass-bg);
            color: var(--text-primary);
            padding: 15px 20px;
            border-radius: var(--border-radius);
            border-left: 4px solid var(--primary-color);
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            min-width: 300px;
            max-width: 400px;
        `;
        
        // Type-specific styling
        const borderColors = {
            success: '#4CAF50',
            error: '#ff6b6b',
            warning: '#ffa726',
            info: 'var(--primary-color)'
        };
        
        notification.style.borderLeftColor = borderColors[type] || borderColors.info;
        
        return notification;
    }

    function hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // ===== LAZY LOADING =====
    function setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    // ===== PERFORMANCE OPTIMIZATIONS =====
    function optimizePerformance() {
        // Preload critical resources
        const criticalImages = [
            'assets/favicon.png'
        ];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
        
        // Prefetch next page
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = 'galeria.html';
        document.head.appendChild(prefetchLink);
    }

    // ===== ACCESSIBILITY IMPROVEMENTS =====
    function enhanceAccessibility() {
        // Skip to content link
        const skipLink = document.createElement('a');
        skipLink.href = '#portfolio';
        skipLink.textContent = 'Pular para o conteúdo principal';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: var(--text-primary);
            padding: 8px;
            border-radius: 4px;
            text-decoration: none;
            z-index: 10001;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add ARIA labels where needed
        prevBtn?.setAttribute('aria-label', 'Imagem anterior do carousel');
        nextBtn?.setAttribute('aria-label', 'Próxima imagem do carousel');
        
        indicators.forEach((indicator, index) => {
            indicator.setAttribute('aria-label', `Ir para slide ${index + 1}`);
        });
    }

    // ===== ANALYTICS (Optional) =====
    function trackEvents() {
        // Track portfolio filter clicks
        portfolioFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const category = filter.getAttribute('data-filter');
                console.log(`Portfolio filter clicked: ${category}`);
                // Add your analytics code here
            });
        });
        
        // Track contact form submissions
        contactForm?.addEventListener('submit', () => {
            console.log('Contact form submitted');
            // Add your analytics code here
        });
        
        // Track lightbox opens
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Lightbox opened');
                // Add your analytics code here
            });
        });
        
        // Track theme changes
        themeToggle?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            console.log(`Theme changed to: ${currentTheme}`);
            // Add your analytics code here
        });
    }

    // ===== ERROR HANDLING =====
    window.addEventListener('error', (e) => {
        console.error('JavaScript error:', e.error);
        // Log error to analytics service if needed
    });

    // ===== FINAL INITIALIZATION =====
    setupLazyLoading();
    optimizePerformance();
    enhanceAccessibility();
    trackEvents();

    // Show loading complete
    window.addEventListener('load', () => {
        console.log('Gabriel Lima Retratos website loaded successfully');
        document.body.classList.add('loaded');
        
        // Mostrar dica sobre o atalho de teclado para tema
        setTimeout(() => {
            showNotification('Dica: Use Ctrl+Shift+T para alternar o tema!', 'info', 6000);
        }, 2000);
    });

    // ===== SERVICE WORKER (PWA) =====
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }

    // ===== EXPORTAR FUNÇÕES PARA ACESSO GLOBAL =====
    window.themeSystem = {
        toggleTheme,
        setTheme,
        getCurrentTheme: () => document.documentElement.getAttribute('data-theme')
    };
});

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== EXPORT FOR MODULE USAGE =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        openLightbox,
        closeLightbox,
        toggleTheme,
        setTheme
    };
}// ===== GABRIEL LIMA RETRATOS - MAIN JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    // ===== PORTFOLIO FILTERS =====
    function setupPortfolioFilters() {
        portfolioFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const filterValue = filter.getAttribute('data-filter');
                
                // Update active filter
                portfolioFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Filter portfolio items
                filterPortfolioItems(filterValue);
            });
        });
    }

    function filterPortfolioItems(filter) {
        portfolioItems.forEach(item => {
            const category = item.getAttribute('data-category');
            
            if (filter === 'all' || category === filter) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 100);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    }

    // ===== LIGHTBOX =====
    function setupLightbox() {
        // Portfolio items
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const portfolioItem = btn.closest('.portfolio-item');
                const img = portfolioItem.querySelector('img');
                const title = portfolioItem.querySelector('h3').textContent;
                const description = portfolioItem.querySelector('p').textContent;
                
                openLightbox(img.src, title, description);
            });
        });

        // Close lightbox
        lightboxClose?.addEventListener('click', closeLightbox);
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox?.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    function openLightbox(src, title, description) {
        if (!lightbox) return;
        
        lightboxImage.src = src;
        lightboxTitle.textContent = title;
        lightboxDescription.textContent = description;
        
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox) return;
        
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ===== CONTACT FORM =====
    function setupContactForm() {
        contactForm?.addEventListener('submit', handleContactSubmit);
    }

    function handleContactSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const service = formData.get('service');
        const message = formData.get('message');
        
        // Validate form
        if (!name || !email || !service || !message) {
            showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        // Create WhatsApp message
        const whatsappMessage = createWhatsAppMessage(name, email, phone, service, message);
        const whatsappURL = `https://wa.me/5579981338664?text=${encodeURIComponent(whatsappMessage)}`;
        
        // Open WhatsApp
        window.open(whatsappURL, '_blank');
        
        // Reset form
        contactForm.reset();
        showNotification('Redirecionando para o WhatsApp...', 'success');
    }

    function createWhatsAppMessage(name, email, phone, service, message) {
        return `Olá Gabriel! 📸

*Nome:* ${name}
*E-mail:* ${email}
${phone ? `*WhatsApp:* ${phone}` : ''}
*Serviço:* ${service}

*Mensagem:*
${message}

Gostaria de saber mais sobre seus serviços!`;
    }

    // ===== VIDEO CARDS =====
    function setupVideoCards() {
        const videoCards = document.querySelectorAll('.video-card');
        
        videoCards.forEach(card => {
            const playBtn = card.querySelector('.play-btn');
            
            playBtn?.addEventListener('click', () => {
                const title = card.querySelector('.video-title').textContent;
                showNotification(`Vídeo "${title}" em breve disponível!`, 'info');
            });
            
            // Hover effects for video thumbnails
            card.addEventListener('mouseenter', () => {
                const video = card.querySelector('video');
                if (video) {
                    video.play().catch(() => {
                        // Video play failed, ignore silently
                    });
                }
            });
            
            card.addEventListener('mouseleave', () => {
                const video = card.querySelector('video');
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            });
        });
    }

    // ===== INSTAGRAM FEED =====
    function setupInstagramFeed() {
        const feedGrid = document.getElementById('feedGrid');
        if (!feedGrid) return;

        // Add more feed items for continuous scroll effect
        const feedItems = feedGrid.innerHTML;
        feedGrid.innerHTML = feedItems + feedItems; // Duplicate content
        
        // Instagram feed animation
        animateInstagramFeed();
    }

    function animateInstagramFeed() {
        const feedGrid = document.getElementById('feedGrid');
        if (!feedGrid) return;

        let scrollPosition = 0;
        const scrollSpeed = 0.5;
        const maxScroll = feedGrid.scrollHeight / 2;

        function animate() {
            scrollPosition += scrollSpeed;
            
            if (scrollPosition >= maxScroll) {
                scrollPosition = 0;
            }
            
            feedGrid.style.transform = `translateY(-${scrollPosition}px)`;
            requestAnimationFrame(animate);
        }
        
        animate();
    }

    // ===== SMOOTH SCROLLING =====
    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80; // Account for header
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ===== KEYBOARD NAVIGATION =====
    function handleKeyboard(e) {
        if (lightbox?.classList.contains('active')) {
            switch(e.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    changeSlide('prev');
                    break;
                case 'ArrowRight':
                    changeSlide('next');
                    break;
            }
        }
    }

    // ===== RESIZE HANDLER =====
    function handleResize() {
        // Close mobile menu on desktop
        if (window.innerWidth > 768) {
            navMenu?.classList.remove('active');
            hamburger?.classList.remove('active');
        }
    }

    // ===== NOTIFICATION SYSTEM =====
    function showNotification(message, type = 'info', duration = 4000) {
        const notification = createNotificationElement(message, type);
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto hide
        setTimeout(() => {
            hideNotification(notification);
        }, duration);
        
        // Close button
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn?.addEventListener('click', () => {
            hideNotification(notification);
        });
    }

    function createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icons[type] || icons.info}"></i>
                <span>${message}</span>
                <button class="close-btn" aria-label="Fechar notificação">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Position notification
        const existingNotifications = document.querySelectorAll('.notification');
        const top = 20 + (existingNotifications.length * 80);
        notification.style.cssText = `
            position: fixed;
            top: ${top}px;
            right: 20px;
            z-index: 10000;
            background: var(--glass-bg);
            color: var(--text-primary);
            padding: 15px 20px;
            border-radius: var(--border-radius);
            border-left: 4px solid var(--primary-color);
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            min-width: 300px;
            max-width: 400px;
        `;
        
        // Type-specific styling
        const borderColors = {
            success: '#4CAF50',
            error: '#ff6b6b',
            warning: '#ffa726',
            info: 'var(--primary-color)'
        };
        
        notification.style.borderLeftColor = borderColors[type] || borderColors.info;
        
        return notification;
    }

    function hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // ===== LAZY LOADING =====
    function setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    // ===== PERFORMANCE OPTIMIZATIONS =====
    function optimizePerformance() {
        // Preload critical resources
        const criticalImages = [
            'assets/favicon.png'
        ];
        
        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
        
        // Prefetch next page
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = 'galeria.html';
        document.head.appendChild(prefetchLink);
    }

    // ===== ACCESSIBILITY IMPROVEMENTS =====
    function enhanceAccessibility() {
        // Skip to content link
        const skipLink = document.createElement('a');
        skipLink.href = '#portfolio';
        skipLink.textContent = 'Pular para o conteúdo principal';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: var(--text-primary);
            padding: 8px;
            border-radius: 4px;
            text-decoration: none;
            z-index: 10001;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add ARIA labels where needed
        prevBtn?.setAttribute('aria-label', 'Imagem anterior do carousel');
        nextBtn?.setAttribute('aria-label', 'Próxima imagem do carousel');
        
        indicators.forEach((indicator, index) => {
            indicator.setAttribute('aria-label', `Ir para slide ${index + 1}`);
        });
    }

    // ===== ANALYTICS (Optional) =====
    function trackEvents() {
        // Track portfolio filter clicks
        portfolioFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const category = filter.getAttribute('data-filter');
                console.log(`Portfolio filter clicked: ${category}`);
                // Add your analytics code here
            });
        });
        
        // Track contact form submissions
        contactForm?.addEventListener('submit', () => {
            console.log('Contact form submitted');
            // Add your analytics code here
        });
        
        // Track lightbox opens
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Lightbox opened');
                // Add your analytics code here
            });
        });
    }

    // ===== ERROR HANDLING =====
    window.addEventListener('error', (e) => {
        console.error('JavaScript error:', e.error);
        // Log error to analytics service if needed
    });

    // ===== FINAL INITIALIZATION =====
    setupLazyLoading();
    optimizePerformance();
    enhanceAccessibility();
    trackEvents();

    // Show loading complete
    window.addEventListener('load', () => {
        console.log('Gabriel Lima Retratos website loaded successfully');
        document.body.classList.add('loaded');
    });

    // ===== SERVICE WORKER (PWA) =====
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration);
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
});

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== EXPORT FOR MODULE USAGE =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification,
        openLightbox,
        closeLightbox
    };
}
//== VARIÁVEIS GLOBAIS =====
    let currentSlide = 0;
    let slideInterval;
    let isAutoPlaying = true;

    // ===== ELEMENTOS DOM =====
    const header = document.querySelector('.header');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const indicators = document.querySelectorAll('.indicator');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const portfolioFilters = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    const contactForm = document.getElementById('contactForm');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDescription = document.getElementById('lightbox-description');
    const lightboxClose = document.querySelector('.lightbox-close');

    // ===== INICIALIZAÇÃO =====
    init();

    function init() {
        setupEventListeners();
        startCarousel();
        setupScrollEffects();
        setupPortfolioFilters();
        setupLightbox();
        setupContactForm();
        setupVideoCards();
        setupInstagramFeed();
        setupSmoothScrolling();
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Mobile menu
        hamburger?.addEventListener('click', toggleMobileMenu);
        
        // Carousel controls
        prevBtn?.addEventListener('click', () => changeSlide('prev'));
        nextBtn?.addEventListener('click', () => changeSlide('next'));
        
        // Carousel indicators
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => goToSlide(index));
        });

        // Scroll events
        window.addEventListener('scroll', handleScroll);
        
        // Resize events
        window.addEventListener('resize', handleResize);

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);

        // Close mobile menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu?.classList.remove('active');
            });
        });

        // Close lightbox on outside click
        lightbox?.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

    // ===== MOBILE MENU =====
    function toggleMobileMenu() {
        navMenu?.classList.toggle('active');
        hamburger?.classList.toggle('active');
    }

    // ===== CAROUSEL FUNCTIONALITY =====
    function startCarousel() {
        if (carouselItems.length === 0) return;
        
        slideInterval = setInterval(() => {
            if (isAutoPlaying) {
                changeSlide('next');
            }
        }, 5000);

        // Pause on hover
        const heroSection = document.querySelector('.hero');
        heroSection?.addEventListener('mouseenter', () => {
            isAutoPlaying = false;
        });
        
        heroSection?.addEventListener('mouseleave', () => {
            isAutoPlaying = true;
        });
    }

    function changeSlide(direction) {
        if (carouselItems.length === 0) return;

        carouselItems[currentSlide]?.classList.remove('active');
        indicators[currentSlide]?.classList.remove('active');

        if (direction === 'next') {
            currentSlide = (currentSlide + 1) % carouselItems.length;
        } else {
            currentSlide = (currentSlide - 1 + carouselItems.length) % carouselItems.length;
        }

        carouselItems[currentSlide]?.classList.add('active');
        indicators[currentSlide]?.classList.add('active');
    }

    function goToSlide(index) {
        if (carouselItems.length === 0 || index === currentSlide) return;

        carouselItems[currentSlide]?.classList.remove('active');
        indicators[currentSlide]?.classList.remove('active');

        currentSlide = index;

        carouselItems[currentSlide]?.classList.add('active');
        indicators[currentSlide]?.classList.add('active');
    }

    // ===== SCROLL EFFECTS =====
    function setupScrollEffects() {
        // Add scroll class to header
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate');
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        // Observe sections for animation
        document.querySelectorAll('section').forEach((section) => {
            observer.observe(section);
        });
    }

    function handleScroll() {
        const scrolled = window.pageYOffset;
        
        // Header background on scroll
        if (scrolled > 100) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }

        // Update active nav link
        updateActiveNavLink();
    }

    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop && 
                window.pageYOffset < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    // ===