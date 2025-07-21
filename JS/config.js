// ===== CONFIGURAÇÕES DO SISTEMA =====

const CONFIG = {
    // ===== INFORMAÇÕES DO FOTÓGRAFO =====
    photographer: {
        name: 'Gabriel Lima',
        businessName: 'Gabriel Lima Retratos',
        phone: '5579981338664',
        instagram: '@gabriellima_retratos',
        location: 'Aracaju, Sergipe',
        email: 'contato@gabriellimaretratos.com'
    },

    // ===== BOX API =====
    box: {
        clientId: '7qzbuv0z2kxj5ncgacbthi8xjem4uarg',
        clientSecret: 'eJgsO4XgvCilz1tH4Qi4XK3EWtxYiqFj',
        redirectUri: window.location.origin + '/callback.html',
        rootFolderId: '0', // ID da pasta raiz (0 = raiz da conta)
        mainFolderName: 'Gabriel Lima Retratos', // Nome da pasta principal
        corsProxy: 'https://cors-anywhere.herokuapp.com/',
        enableMockData: true, // true para desenvolvimento, false para produção
        cacheExpiry: 300000, // 5 minutos
        apiVersion: '2.0'
    },

    // ===== AUTENTICAÇÃO =====
    auth: {
        tokenFile: 'tokens.json',
        maxRetries: 3,
        sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
        autoLogout: false
    },

    // ===== MARCA D'ÁGUA =====
    watermark: {
        text: 'GABRIEL LIMA RETRATOS',
        logoUrl: 'assets/logo.png',
        opacity: 0.3,
        size: 0.15, // 15% da largura da imagem
        position: 'center',
        patternForVisitors: true,
        protectImages: true,
        fallbackToText: true
    },

    // ===== GALERIA =====
    gallery: {
        defaultView: 'grid', // 'grid' ou 'list'
        photosPerPage: 50,
        enableLazyLoading: true,
        enableSearch: true,
        enableBulkDownload: true,
        enableShare: true,
        cachePhotos: true,
        supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'],
        thumbnailSize: {
            width: 300,
            height: 300
        },
        previewSize: {
            width: 1200,
            height: 800
        }
    },

    // ===== UI/UX =====
    ui: {
        theme: 'light', // 'light', 'dark', 'auto'
        animations: true,
        smoothScrolling: true,
        showLoadingSpinner: true,
        notificationDuration: 4000,
        modalCloseOnClickOutside: true,
        enableKeyboardNavigation: true
    },

    // ===== PERFORMANCE =====
    performance: {
        enableServiceWorker: false, // Para cache offline
        compressionQuality: 0.9, // Para imagens processadas
        maxConcurrentDownloads: 3,
        downloadDelay: 1000, // ms entre downloads
        cacheStrategy: 'session', // 'session', 'local', 'none'
        enablePreloading: true
    },

    // ===== ANALYTICS =====
    analytics: {
        googleAnalyticsId: 'GA_MEASUREMENT_ID',
        enableTracking: false, // true para produção
        trackDownloads: true,
        trackViews: true,
        trackErrors: true
    },

    // ===== DESENVOLVIMENTO =====
    development: {
        enableConsoleLogging: true,
        enableErrorReporting: false,
        showDebugInfo: false,
        mockDataDelay: 1000, // ms para simular loading
        enableTestMode: false
    },

    // ===== RECURSOS OPCIONAIS =====
    features: {
        enableComments: false,
        enableRatings: false,
        enableFavorites: false,
        enableCollections: false,
        enableSlideshow: true,
        enableZoom: true,
        enableFullscreen: true,
        enableMetadata: true
    },

    // ===== LIMITES =====
    limits: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxPhotosPerGallery: 500,
        maxSelectionCount: 100,
        maxSearchResults: 200,
        sessionStorageLimit: 10 * 1024 * 1024 // 10MB
    },

    // ===== URLS E ENDPOINTS =====
    urls: {
        baseUrl: window.location.origin,
        apiBase: '/api',
        uploadEndpoint: '/upload',
        downloadEndpoint: '/download',
        authEndpoint: '/auth',
        webhookEndpoint: '/webhook'
    },

    // ===== MENSAGENS =====
    messages: {
        loading: 'Carregando suas fotos...',
        noPhotos: 'Nenhuma foto encontrada.',
        error: 'Ocorreu um erro inesperado.',
        downloadSuccess: 'Download realizado com sucesso!',
        downloadError: 'Erro ao baixar arquivo.',
        authRequired: 'É necessário fazer login para acessar esta área.',
        tokenInvalid: 'Token inválido ou expirado.',
        connectionError: 'Erro de conexão. Verifique sua internet.'
    },

    // ===== REDES SOCIAIS =====
    social: {
        whatsapp: {
            number: '5579981338664',
            message: 'Olá Gabriel, gostaria de um orçamento para fotografia'
        },
        instagram: {
            username: 'gabriellima_retratos',
            url: 'https://instagram.com/gabriellima_retratos'
        },
        facebook: {
            enabled: false,
            pageId: '',
            url: ''
        },
        website: {
            url: 'https://gabriellimaretratos.com.br'
        }
    },

    // ===== CATEGORIAS DE SERVIÇOS =====
    services: {
        categories: [
            {
                id: 'batizados',
                name: 'Batizados',
                description: 'Cobertura completa da cerimônia',
                icon: 'fas fa-baby',
                featured: false
            },
            {
                id: 'gestantes',
                name: 'Ensaio Gestante',
                description: 'Eternize a beleza da maternidade',
                icon: 'fas fa-heart',
                featured: true
            },
            {
                id: 'missas',
                name: 'Missas Especiais',
                description: 'Primeira comunhão, crisma e celebrações',
                icon: 'fas fa-church',
                featured: false
            },
            {
                id: 'outros',
                name: 'Outros',
                description: 'Eventos e ocasiões especiais',
                icon: 'fas fa-camera',
                featured: false
            }
        ]
    }
};

// ===== CONFIGURAÇÕES DINÂMICAS =====
class ConfigManager {
    constructor() {
        this.config = { ...CONFIG };
        this.loadLocalConfig();
        this.detectEnvironment();
    }

    // ===== CARREGAR CONFIGURAÇÕES LOCAIS =====
    loadLocalConfig() {
        try {
            const localConfig = localStorage.getItem('app_config');
            if (localConfig) {
                const parsed = JSON.parse(localConfig);
                this.config = this.mergeConfig(this.config, parsed);
            }
        } catch (error) {
            console.warn('Erro ao carregar configurações locais:', error);
        }
    }

    // ===== DETECTAR AMBIENTE =====
    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Desenvolvimento local
            this.config.development.enableConsoleLogging = true;
            this.config.development.showDebugInfo = true;
            this.config.box.enableMockData = true;
        } else if (hostname.includes('github.io') || hostname.includes('netlify')) {
            // Ambiente de demonstração
            this.config.box.enableMockData = true;
            this.config.analytics.enableTracking = false;
        } else {
            // Produção
            this.config.development.enableConsoleLogging = false;
            this.config.development.showDebugInfo = false;
            this.config.box.enableMockData = false;
            this.config.analytics.enableTracking = true;
        }
    }

    // ===== MERGE CONFIGURAÇÕES =====
    mergeConfig(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfig(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // ===== GETTERS =====
    get(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
    }

    getPhotographerInfo() {
        return this.config.photographer;
    }

    getBoxConfig() {
        return this.config.box;
    }

    getWatermarkConfig() {
        return this.config.watermark;
    }

    getGalleryConfig() {
        return this.config.gallery;
    }

    getUIConfig() {
        return this.config.ui;
    }

    getServiceCategories() {
        return this.config.services.categories;
    }

    // ===== SETTERS =====
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        
        target[lastKey] = value;
        this.saveConfig();
    }

    // ===== SALVAR CONFIGURAÇÕES =====
    saveConfig() {
        try {
            localStorage.setItem('app_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Erro ao salvar configurações:', error);
        }
    }

    // ===== RESET =====
    resetToDefaults() {
        this.config = { ...CONFIG };
        localStorage.removeItem('app_config');
        this.detectEnvironment();
    }

    // ===== VALIDAÇÃO =====
    validateConfig() {
        const errors = [];
        
        // Validar configurações críticas
        if (!this.config.photographer.name) {
            errors.push('Nome do fotógrafo não configurado');
        }
        
        if (!this.config.photographer.phone) {
            errors.push('Telefone não configurado');
        }
        
        if (this.config.box.enableMockData === false && !this.config.box.clientId) {
            errors.push('Client ID do BOX não configurado');
        }
        
        return errors;
    }

    // ===== INFORMAÇÕES DO SISTEMA =====
    getSystemInfo() {
        return {
            version: '1.0.0',
            environment: this.detectEnvironment(),
            features: Object.keys(this.config.features).filter(key => 
                this.config.features[key]
            ),
            lastUpdated: new Date().toISOString(),
            config: this.config
        };
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====
function getConfig(path) {
    if (!window.configManager) {
        window.configManager = new ConfigManager();
    }
    return path ? window.configManager.get(path) : window.configManager.config;
}

function setConfig(path, value) {
    if (!window.configManager) {
        window.configManager = new ConfigManager();
    }
    return window.configManager.set(path, value);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar gerenciador de configurações
    window.configManager = new ConfigManager();
    
    // Validar configurações
    const errors = window.configManager.validateConfig();
    if (errors.length > 0) {
        console.warn('Problemas de configuração encontrados:', errors);
    }
    
    // Aplicar configurações de UI
    const uiConfig = window.configManager.getUIConfig();
    if (!uiConfig.animations) {
        document.body.classList.add('no-animations');
    }
    
    // Log de inicialização
    if (window.configManager.get('development.enableConsoleLogging')) {
        console.log('🔧 Sistema de configurações inicializado');
        console.log('📊 Info do sistema:', window.configManager.getSystemInfo());
    }
});

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ConfigManager, getConfig, setConfig };
}