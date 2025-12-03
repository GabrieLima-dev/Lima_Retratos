// ===== SISTEMA DE TEMAS - UNIVERSAL =====

class ThemeSystem {
    constructor() {
        this.themeToggle = null;
        this.currentTheme = null;
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.initializeTheme();
    }

    setupElements() {
        this.themeToggle = document.getElementById('themeToggle');
        
        // Criar botão se não existir
        if (!this.themeToggle) {
            this.createThemeToggle();
        }
    }

    createThemeToggle() {
        const toggle = document.createElement('button');
        toggle.id = 'themeToggle';
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Alternar tema');
        
        toggle.innerHTML = `
            <i class="fas fa-moon icon dark-icon"></i>
            <i class="fas fa-sun icon light-icon"></i>
        `;
        
        document.body.appendChild(toggle);
        this.themeToggle = toggle;
    }

    setupEventListeners() {
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // Atalho de teclado (Ctrl/Cmd + Shift + T)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Escutar mudanças na preferência do sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    initializeTheme() {
        // Verificar se há preferência salva
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            // Usar tema salvo
            this.setTheme(savedTheme);
        } else {
            // Usar preferência do sistema
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(systemPrefersDark ? 'dark' : 'light');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Notificação de mudança de tema
        const themeText = newTheme === 'dark' ? 'escuro' : 'claro';
        this.showNotification(`Tema ${themeText} ativado!`, 'success');
        
        // Analytics event
        this.trackThemeChange(newTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Atualizar meta theme-color para mobile
        this.updateThemeColor(theme);
        
        // Adicionar transição suave
        this.addThemeTransition();
        
        // Salvar preferência
        localStorage.setItem('theme', theme);
    }

    updateThemeColor(theme) {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        const themeColor = theme === 'dark' ? '#0D1117' : '#F5F2E8';
        themeColorMeta.content = themeColor;
    }

    addThemeTransition() {
        // Adicionar classe ao body para transições suaves
        document.body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
        
        // Remover transição após um tempo para não afetar outras animações
        setTimeout(() => {
            document.body.style.transition = '';
        }, 400);
    }

    getCurrentTheme() {
        return this.currentTheme || document.documentElement.getAttribute('data-theme') || 'light';
    }

    // Sistema de notificações integrado
    showNotification(message, type = 'info', duration = 4000) {
        // Verificar se existe sistema de notificação global
        if (window.showNotification) {
            window.showNotification(message, type, duration);
            return;
        }

        // Criar notificação simples se não houver sistema global
        const notification = this.createSimpleNotification(message, type);
        document.body.appendChild(notification);
        
        // Mostrar notificação
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto ocultar
        setTimeout(() => {
            this.hideNotification(notification);
        }, duration);
    }

    createSimpleNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `theme-notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#ff6b6b',
            warning: '#ffa726',
            info: 'var(--primary-color)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: var(--glass-bg);
            color: var(--text-primary);
            padding: 15px 20px;
            border-radius: var(--border-radius);
            border-left: 4px solid ${colors[type] || colors.info};
            box-shadow: var(--shadow);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            font-family: var(--font-secondary);
            font-size: 14px;
            max-width: 300px;
        `;
        
        return notification;
    }

    hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // Analytics para mudanças de tema
    trackThemeChange(theme) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'theme_change', {
                'theme': theme,
                'page_location': window.location.href
            });
        }
        
        console.log(`Theme changed to: ${theme}`);
    }

    // Métodos públicos para integração
    enableDarkMode() {
        this.setTheme('dark');
    }

    enableLightMode() {
        this.setTheme('light');
    }

    resetToSystemPreference() {
        localStorage.removeItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(systemPrefersDark ? 'dark' : 'light');
        this.showNotification('Tema resetado para preferência do sistema', 'info');
    }

    // Verificar se é modo escuro
    isDarkMode() {
        return this.getCurrentTheme() === 'dark';
    }

    // Verificar se é modo claro
    isLightMode() {
        return this.getCurrentTheme() === 'light';
    }

    // Aplicar tema baseado na hora do dia
    setThemeByTime() {
        const hour = new Date().getHours();
        const isDayTime = hour >= 6 && hour < 18;
        const theme = isDayTime ? 'light' : 'dark';
        
        this.setTheme(theme);
        this.showNotification(`Tema ${theme === 'dark' ? 'escuro' : 'claro'} aplicado automaticamente`, 'info');
    }

    // Destruir sistema de temas
    destroy() {
        this.themeToggle?.removeEventListener('click', this.toggleTheme);
        document.removeEventListener('keydown', this.handleKeyboard);
        
        if (this.themeToggle && this.themeToggle.id === 'themeToggle') {
            this.themeToggle.remove();
        }
    }
}

// ===== INICIALIZAÇÃO AUTOMÁTICA =====
let themeSystem;

document.addEventListener('DOMContentLoaded', () => {
    themeSystem = new ThemeSystem();
    
    // Tornar disponível globalmente
    window.themeSystem = themeSystem;
    
    console.log('🎨 Sistema de temas inicializado');
    
    // Mostrar dica sobre atalho de teclado após um tempo
    setTimeout(() => {
        if (themeSystem.showNotification) {
            themeSystem.showNotification('Dica: Use Ctrl+Shift+T para alternar o tema!', 'info', 5000);
        }
    }, 3000);
});

// ===== INTEGRAÇÃO COM OUTROS SISTEMAS =====

// Integração com sistema de notificações existente
window.addEventListener('load', () => {
    // Verificar se existe sistema de notificação global
    if (typeof window.showNotification === 'function') {
        // Substituir método de notificação
        themeSystem.showNotification = window.showNotification;
    }
});

// ===== EVENTOS PERSONALIZADOS =====

// Disparar evento quando tema mudar
document.addEventListener('themeChanged', (e) => {
    console.log('Theme changed event:', e.detail);
});

// Adicionar método para disparar evento personalizado
ThemeSystem.prototype.dispatchThemeChangeEvent = function(theme) {
    const event = new CustomEvent('themeChanged', {
        detail: {
            theme: theme,
            timestamp: new Date().toISOString(),
            previousTheme: this.currentTheme
        }
    });
    document.dispatchEvent(event);
};

// ===== UTILITÁRIOS =====

// Função utilitária para aplicar tema específico
window.applyTheme = function(theme) {
    if (window.themeSystem) {
        window.themeSystem.setTheme(theme);
    }
};

// Função utilitária para obter tema atual
window.getCurrentTheme = function() {
    return window.themeSystem ? window.themeSystem.getCurrentTheme() : 'light';
};

// Função utilitária para alternar tema
window.toggleTheme = function() {
    if (window.themeSystem) {
        window.themeSystem.toggleTheme();
    }
};

// ===== CSS DINÂMICO PARA O BOTÃO DE TEMA =====
const themeToggleCSS = `
.theme-toggle {
    position: fixed;
    top: 5px;
    right: 20px;
    z-index: 1001;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-light);
}

.theme-toggle:hover {
    transform: scale(1.1);
    box-shadow: var(--glow);
    border-color: var(--primary-color);
}

.theme-toggle .icon {
    font-size: 20px;
    color: var(--text-primary);
    transition: var(--transition);
}

.theme-toggle .light-icon {
    display: none;
}

[data-theme="dark"] .theme-toggle .light-icon {
    display: block;
}

[data-theme="dark"] .theme-toggle .dark-icon {
    display: none;
}

.theme-notification {
    font-family: var(--font-secondary);
}

.theme-notification.show {
    transform: translateX(0);
    opacity: 1;
}

@media (max-width: 1024px) {
    .theme-toggle {
        top: 70px;
        right: 15px;
        width: 48px;
        height: 48px;
    }
    
    .theme-toggle .icon {
        font-size: 18px;
    }
}

@media (max-width: 480px) {
    .theme-toggle {
        top: 70px;
        right: 10px;
        width: 44px;
        height: 44px;
    }
    
    .theme-toggle .icon {
        font-size: 16px;
    }
}
`;

// Injetar CSS se não existir
if (!document.querySelector('#theme-toggle-styles')) {
    const style = document.createElement('style');
    style.id = 'theme-toggle-styles';
    style.textContent = themeToggleCSS;
    document.head.appendChild(style);
}

// ===== PERSISTÊNCIA AVANÇADA =====

// Salvar configurações avançadas
function saveThemeSettings(settings) {
    const themeData = {
        theme: settings.theme,
        autoSwitch: settings.autoSwitch || false,
        timeBasedSwitch: settings.timeBasedSwitch || false,
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('themeSettings', JSON.stringify(themeData));
}

// Carregar configurações avançadas
function loadThemeSettings() {
    try {
        const saved = localStorage.getItem('themeSettings');
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.warn('Erro ao carregar configurações de tema:', error);
        return null;
    }
}

// ===== INTEGRAÇÃO COM PWA =====

// Atualizar manifest.json baseado no tema
function updatePWATheme(theme) {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
        // Criar manifest dinâmico baseado no tema
        const manifest = {
            name: "Gabriel Lima Retratos",
            short_name: "GL Retratos",
            description: "Fotografia profissional especializada",
            start_url: "/",
            display: "standalone",
            background_color: theme === 'dark' ? '#0D1117' : '#F5F2E8',
            theme_color: theme === 'dark' ? '#2C5F41' : '#D4AF37',
            icons: [
                {
                    src: "assets/favicon.png",
                    sizes: "192x192",
                    type: "image/png"
                }
            ]
        };
        
        // Atualizar manifest
        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        manifestLink.href = url;
    }
}

// ===== ACESSIBILIDADE =====

// Anunciar mudanças de tema para leitores de tela
function announceThemeChange(theme) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    const themeText = theme === 'dark' ? 'escuro' : 'claro';
    announcement.textContent = `Tema alterado para modo ${themeText}`;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Adicionar anúncio de tema ao método setTheme
const originalSetTheme = ThemeSystem.prototype.setTheme;
ThemeSystem.prototype.setTheme = function(theme) {
    originalSetTheme.call(this, theme);
    announceThemeChange(theme);
    updatePWATheme(theme);
    this.dispatchThemeChangeEvent(theme);
};

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSystem;
}
