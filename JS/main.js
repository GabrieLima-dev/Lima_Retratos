// ===== VARIÁVEIS GLOBAIS =====
let isMenuOpen = false;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeHeroCarousel();
    initializePortfolio();
    initializeLightbox();
    initializeContactForm();
    initializeScrollEffects();
    initializeAnimations();
});

// ===== HERO CAROUSEL =====
function initializeHeroCarousel() {
    const carousel = document.querySelector('.hero-carousel');
    const items = document.querySelectorAll('.carousel-item');
    const indicators = document.querySelectorAll('.indicator');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    let currentSlide = 0;
    let isTransitioning = false;
    const slideInterval = 5000; // 5 segundos
    let autoSlideTimer;

    if (!carousel || items.length === 0) return;

    // Função para mostrar slide
    function showSlide(index) {
        if (isTransitioning) return;
        
        isTransitioning = true;
        
        // Remove active de todos
        items.forEach(item => item.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Adiciona active ao atual
        items[index].classList.add('active');
        indicators[index].classList.add('active');
        
        currentSlide = index;
        
        // Reset da transição
        setTimeout(() => {
            isTransitioning = false;
        }, 1000);
        
        // Restart do auto-slide
        resetAutoSlide();
    }

    // Próximo slide
    function nextSlide() {
        const next = (currentSlide + 1) % items.length;
        showSlide(next);
    }

    // Slide anterior
    function prevSlide() {
        const prev = (currentSlide - 1 + items.length) % items.length;
        showSlide(prev);
    }

    // Auto-slide
    function startAutoSlide() {
        autoSlideTimer = setInterval(nextSlide, slideInterval);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideTimer);
    }

    function resetAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }

    // Event listeners
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
        });
    }

    // Indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
        });
    });

    // Pause auto-slide quando mouse estiver sobre o hero
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.addEventListener('mouseenter', stopAutoSlide);
        hero.addEventListener('mouseleave', startAutoSlide);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
        }
    });

    // Touch/swipe support
    let startX = 0;
    let startY = 0;
    
    hero.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    hero.addEventListener('touchend', (e) => {
        if (!startX || !startY) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const diffX = startX - endX;
        const diffY = startY - endY;
        
        // Verifica se é um swipe horizontal
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0) {
                nextSlide(); // Swipe left = next
            } else {
                prevSlide(); // Swipe right = prev
            }
        }
        
        startX = 0;
        startY = 0;
    }, { passive: true });

    // Iniciar auto-slide
    startAutoSlide();

    // Preload das próximas imagens
    function preloadImages() {
        items.forEach((item, index) => {
            if (index !== 0) { // Primeira já está carregada
                const img = item.querySelector('img');
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                }
            }
        });
    }

    // Inicializar preload após um pequeno delay
    setTimeout(preloadImages, 1000);
}

// ===== NAVEGAÇÃO =====
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const header = document.querySelector('.header');

    // Toggle menu mobile
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
            
            // Animação do hamburger
            hamburger.style.transform = isMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)';
        });
    }

    // Fechar menu ao clicar em link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
                hamburger.style.transform = 'rotate(0deg)';
                isMenuOpen = false;
            }
        });
    });

    // Header transparente/sólido baseado no scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = 'none';
        }
    });

    // Smooth scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = header.offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== PORTFOLIO =====
function initializePortfolio() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    // Filtros do portfolio
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active de todos os botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona active ao botão clicado
            button.classList.add('active');

            const filter = button.getAttribute('data-filter');

            // Anima itens do portfolio
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
        });
    });

    // Hover effects para portfolio items
    portfolioItems.forEach(item => {
        const image = item.querySelector('img');
        const overlay = item.querySelector('.portfolio-overlay');

        item.addEventListener('mouseenter', () => {
            image.style.transform = 'scale(1.1)';
            overlay.style.opacity = '1';
        });

        item.addEventListener('mouseleave', () => {
            image.style.transform = 'scale(1)';
            overlay.style.opacity = '0';
        });
    });
}

// ===== LIGHTBOX =====
function initializeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDescription = document.getElementById('lightbox-description');
    const lightboxClose = document.querySelector('.lightbox-close');
    const viewButtons = document.querySelectorAll('.view-btn');

    // Abrir lightbox
    viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const portfolioItem = button.closest('.portfolio-item');
            const image = portfolioItem.querySelector('img');
            const title = portfolioItem.querySelector('.portfolio-overlay h3').textContent;
            const description = portfolioItem.querySelector('.portfolio-overlay p').textContent;

            lightboxImage.src = image.src;
            lightboxTitle.textContent = title;
            lightboxDescription.textContent = description;
            
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    // Fechar lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });
}

// ===== FORMULÁRIO DE CONTATO =====
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Coleta dados do formulário
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);

            // Valida campos obrigatórios
            if (!data.name || !data.email || !data.service) {
                showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }

            // Valida email
            if (!isValidEmail(data.email)) {
                showNotification('Por favor, insira um e-mail válido.', 'error');
                return;
            }

            // Monta mensagem para WhatsApp
            const message = `
Olá Gabriel! Tenho interesse em seus serviços de fotografia.

*Dados do Cliente:*
📝 Nome: ${data.name}
📧 E-mail: ${data.email}
📱 WhatsApp: ${data.phone || 'Não informado'}
📸 Serviço: ${getServiceName(data.service)}

*Mensagem:*
${data.message || 'Sem mensagem adicional'}

Aguardo seu contato!
            `.trim();

            // Abre WhatsApp
            const whatsappUrl = `https://wa.me/5579981338664?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

            // Feedback visual
            showNotification('Redirecionando para WhatsApp...', 'success');
            
            // Limpa formulário após envio
            setTimeout(() => {
                contactForm.reset();
            }, 1000);
        });
    }
}

// ===== FUNÇÕES AUXILIARES =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getServiceName(serviceValue) {
    const services = {
        'batizado': 'Batizado',
        'gestante': 'Ensaio Gestante',
        'missa': 'Missa/Celebração',
        'outro': 'Outro serviço'
    };
    return services[serviceValue] || serviceValue;
}

function showNotification(message, type = 'info') {
    // Remove notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Cria nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;

    // Estilos inline (já que não estão no CSS)
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        font-family: 'Inter', sans-serif;
    `;

    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    // Adiciona ao DOM
    document.body.appendChild(notification);

    // Anima entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove após 4 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// ===== EFEITOS DE SCROLL =====
function initializeScrollEffects() {
    // Intersection Observer para animações
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observa elementos que devem ser animados
    const animatedElements = document.querySelectorAll(`
        .section-header,
        .portfolio-item,
        .service-card,
        .about-text,
        .about-image,
        .contact-item,
        .contact-form-container
    `);

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s ease';
        observer.observe(el);
    });

    // Parallax effect para hero
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
}

// ===== ANIMAÇÕES =====
function initializeAnimations() {
    // Adiciona classe para elementos animados
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }

        .counter {
            font-variant-numeric: tabular-nums;
        }
    `;
    document.head.appendChild(style);

    // Contador animado para estatísticas
    const counters = document.querySelectorAll('.stat-number');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

function animateCounter(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        const suffix = element.textContent.includes('+') ? '+' : '';
        element.textContent = Math.floor(current) + suffix;
    }, 16);
}

// ===== UTILITÁRIOS =====
// Debounce function
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

// Throttle function
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

// Detectar dispositivo mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// ===== OTIMIZAÇÕES DE PERFORMANCE =====
// Lazy loading para imagens
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Preload de imagens críticas
function preloadCriticalImages() {
    const criticalImages = [
        'assets/logo.png',
        'https://images.unsplash.com/photo-1606216794074-735e91aa2c92' // Hero background
    ];

    criticalImages.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

// ===== EVENT LISTENERS OTIMIZADOS =====
// Scroll otimizado com throttle
const optimizedScrollHandler = throttle(() => {
    const scrolled = window.pageYOffset;
    const header = document.querySelector('.header');
    
    // Header background
    if (scrolled > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = 'none';
    }

    // Parallax para hero (apenas em desktop)
    if (!isMobile()) {
        const hero = document.querySelector('.hero');
        if (hero && scrolled < hero.offsetHeight) {
            hero.style.transform = `translateY(${scrolled * 0.3}px)`;
        }
    }
}, 16);

// Resize otimizado com debounce
const optimizedResizeHandler = debounce(() => {
    // Recalcular dimensões se necessário
    const portfolioGrid = document.querySelector('.portfolio-grid');
    if (portfolioGrid && window.innerWidth <= 768) {
        // Ajustes específicos para mobile
    }
}, 250);

// ===== INICIALIZAÇÃO FINAL =====
// Adiciona event listeners otimizados
window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
window.addEventListener('resize', optimizedResizeHandler);

// Preload e lazy loading
document.addEventListener('DOMContentLoaded', () => {
    preloadCriticalImages();
    initializeLazyLoading();
});

// ===== ACCESSIBILITY IMPROVEMENTS =====
// Navegação por teclado
document.addEventListener('keydown', (e) => {
    // Fechar lightbox com ESC
    if (e.key === 'Escape') {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        // Fechar menu mobile
        const navMenu = document.querySelector('.nav-menu');
        const hamburger = document.querySelector('.hamburger');
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            hamburger.style.transform = 'rotate(0deg)';
            isMenuOpen = false;
        }
    }

    // Navegação com Tab melhorada
    if (e.key === 'Tab') {
        document.body.classList.add('using-keyboard');
    }
});

// Remove outline quando usando mouse
document.addEventListener('mousedown', () => {
    document.body.classList.remove('using-keyboard');
});

// ===== ANALYTICS E TRACKING =====
// Tracking de eventos importantes
function trackEvent(eventName, properties = {}) {
    // Implementar Google Analytics ou outro serviço de tracking
    console.log('Event tracked:', eventName, properties);
}

// Track portfolio interactions
document.addEventListener('click', (e) => {
    if (e.target.closest('.portfolio-item')) {
        trackEvent('portfolio_item_clicked', {
            category: e.target.closest('.portfolio-item').dataset.category
        });
    }
    
    if (e.target.closest('.filter-btn')) {
        trackEvent('portfolio_filter_used', {
            filter: e.target.dataset.filter
        });
    }
    
    if (e.target.closest('.contact-link')) {
        trackEvent('contact_method_clicked', {
            method: e.target.textContent
        });
    }
});

// ===== SERVICE WORKER (OPCIONAL) =====
// Registrar service worker para cache
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// ===== EASTER EGGS E DETALHES =====
// Animação sutil no logo
const logo = document.querySelector('.logo-img');
if (logo) {
    logo.addEventListener('click', () => {
        logo.style.animation = 'spin 0.5s ease-in-out';
        setTimeout(() => {
            logo.style.animation = '';
        }, 500);
    });
}

// Adicionar animação de spin
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .using-keyboard *:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
    }
`;
document.head.appendChild(spinStyle);

// ===== ERROR HANDLING =====
// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Implementar logging de erros se necessário
});

// Promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// ===== CONSOLE EASTER EGG =====
console.log(`
🎨 Gabriel Lima Retratos - Site Oficial
📸 Desenvolvido com ❤️ 
📱 WhatsApp: +55 79 9 8133-8664
📧 Contato: gabriellimaretratos@email.com

✨ Obrigado por visitar nosso site!
`);

// Final message
console.log('🚀 Site carregado com sucesso!');
