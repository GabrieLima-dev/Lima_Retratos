// ===== SISTEMA DE AUTENTICAÇÃO =====

class AuthSystem {
    constructor() {
        this.currentToken = null;
        this.clientData = null;
        this.isAuthenticated = false;
        this.tokenValidationUrl = 'tokens.json'; // Local para testes
        this.retryAttempts = 0;
        this.maxRetries = 3;
        
        this.init();
    }

    init() {
        this.checkUrlToken();
        this.setupEventListeners();
        this.showLoginScreen();
    }

    // ===== VERIFICAÇÃO DE TOKEN NA URL =====
    checkUrlToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        
        if (tokenFromUrl) {
            document.getElementById('tokenInput').value = tokenFromUrl;
            // Auto-submit se token válido na URL
            this.validateToken(tokenFromUrl);
        }
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        const tokenForm = document.getElementById('tokenForm');
        const tryAgainBtn = document.getElementById('tryAgainBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (tokenForm) {
            tokenForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTokenSubmit();
            });
        }

        if (tryAgainBtn) {
            tryAgainBtn.addEventListener('click', () => {
                this.showLoginScreen();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Auto-formatação do token input
        const tokenInput = document.getElementById('tokenInput');
        if (tokenInput) {
            tokenInput.addEventListener('input', this.formatTokenInput);
            tokenInput.addEventListener('paste', this.handleTokenPaste);
        }
    }

    // ===== FORMATAÇÃO DO INPUT =====
    formatTokenInput(e) {
        let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        if (value.length > 12) {
            value = value.substring(0, 12);
        }
        e.target.value = value;
    }

    handleTokenPaste(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const cleanToken = paste.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        e.target.value = cleanToken;
    }

    // ===== SUBMIT DO TOKEN =====
    async handleTokenSubmit() {
        const tokenInput = document.getElementById('tokenInput');
        const token = tokenInput.value.trim();

        if (!token) {
            this.showError('Por favor, digite um token válido.');
            return;
        }

        if (token.length < 8) {
            this.showError('Token deve ter pelo menos 8 caracteres.');
            return;
        }

        await this.validateToken(token);
    }

    // ===== VALIDAÇÃO DO TOKEN =====
    async validateToken(token) {
        this.showLoading('Validando seu token...');

        try {
            // Simula busca no arquivo tokens.json
            const response = await this.fetchWithRetry(this.tokenValidationUrl);
            const tokensData = await response.json();

            const clientData = tokensData[token];

            if (!clientData) {
                throw new Error('Token não encontrado');
            }

            // Verificar se token está ativo
            if (!clientData.ativo) {
                throw new Error('Token desativado');
            }

            // Verificar expiração
            const now = new Date();
            const expirationDate = new Date(clientData.expira_em);
            
            if (now > expirationDate) {
                throw new Error('Token expirado');
            }

            // Token válido
            await this.handleSuccessfulAuth(token, clientData);

        } catch (error) {
            console.error('Erro na validação:', error);
            await this.handleAuthError(error.message);
        }
    }

    // ===== AUTENTICAÇÃO BEM-SUCEDIDA =====
    async handleSuccessfulAuth(token, clientData) {
        this.currentToken = token;
        this.clientData = clientData;
        this.isAuthenticated = true;
        this.retryAttempts = 0;

        // Registrar acesso
        await this.registerAccess(token);

        // Salvar na sessão
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('clientData', JSON.stringify(clientData));

        // Atualizar URL sem token
        this.updateUrlWithoutToken();

        // Mostrar galeria
        this.showGallery();

        // Notificar sucesso
        this.showNotification('Login realizado com sucesso!', 'success');
    }

    // ===== ERRO DE AUTENTICAÇÃO =====
    async handleAuthError(errorMessage) {
        this.retryAttempts++;

        let userMessage = 'Token inválido ou expirado.';
        
        if (errorMessage.includes('não encontrado')) {
            userMessage = 'Token não encontrado. Verifique se digitou corretamente.';
        } else if (errorMessage.includes('expirado')) {
            userMessage = 'Token expirado. Solicite um novo token ao fotógrafo.';
        } else if (errorMessage.includes('desativado')) {
            userMessage = 'Token desativado. Entre em contato conosco.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }

        if (this.retryAttempts >= this.maxRetries) {
            userMessage += ' Muitas tentativas falharam. Entre em contato conosco.';
        }

        this.showErrorScreen(userMessage);
    }

    // ===== REGISTRAR ACESSO =====
    async registerAccess(token) {
        try {
            // Em um ambiente real, isso seria uma chamada para API
            // Aqui simularemos o registro local
            const accessData = {
                token: token,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ip: 'unknown' // Em produção, seria obtido do servidor
            };

            console.log('Acesso registrado:', accessData);

            // Simular envio para servidor
            // await fetch('/api/register-access', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(accessData)
            // });

        } catch (error) {
            console.warn('Erro ao registrar acesso:', error);
            // Não bloquear o login por erro de log
        }
    }

    // ===== FETCH COM RETRY =====
    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                console.warn(`Tentativa ${i + 1} falhou:`, error);
                
                if (i === retries - 1) {
                    throw error;
                }
                
                // Aguardar antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // ===== LOGOUT =====
    logout() {
        this.currentToken = null;
        this.clientData = null;
        this.isAuthenticated = false;
        this.retryAttempts = 0;

        // Limpar sessão
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('clientData');

        // Limpar URL
        this.updateUrlWithoutToken();

        // Mostrar tela de login
        this.showLoginScreen();

        this.showNotification('Logout realizado com sucesso.', 'info');
    }

    // ===== VERIFICAR SESSÃO EXISTENTE =====
    checkExistingSession() {
        const savedToken = sessionStorage.getItem('authToken');
        const savedClientData = sessionStorage.getItem('clientData');

        if (savedToken && savedClientData) {
            try {
                this.currentToken = savedToken;
                this.clientData = JSON.parse(savedClientData);
                this.isAuthenticated = true;

                // Validar se ainda está válido
                this.validateSavedSession();
            } catch (error) {
                console.warn('Erro ao recuperar sessão:', error);
                this.clearSession();
            }
        }
    }

    async validateSavedSession() {
        try {
            const response = await fetch(this.tokenValidationUrl);
            const tokensData = await response.json();
            const currentData = tokensData[this.currentToken];

            if (!currentData || !currentData.ativo) {
                throw new Error('Sessão inválida');
            }

            const now = new Date();
            const expirationDate = new Date(currentData.expira_em);
            
            if (now > expirationDate) {
                throw new Error('Sessão expirada');
            }

            // Sessão válida
            this.showGallery();
        } catch (error) {
            console.warn('Sessão inválida:', error);
            this.clearSession();
            this.showLoginScreen();
        }
    }

    clearSession() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('clientData');
        this.currentToken = null;
        this.clientData = null;
        this.isAuthenticated = false;
    }

    // ===== CONTROLE DE TELAS =====
    showLoginScreen() {
        this.hideAllScreens();
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('tokenInput').focus();
    }

    showLoading(message = 'Carregando...') {
        this.hideAllScreens();
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingText = loadingScreen.querySelector('p');
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        loadingScreen.style.display = 'flex';
    }

    showErrorScreen(message) {
        this.hideAllScreens();
        const errorScreen = document.getElementById('errorScreen');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        errorScreen.style.display = 'flex';
    }

    showGallery() {
        this.hideAllScreens();
        
        // Mostrar elementos da galeria
        document.getElementById('clientInfo').style.display = 'block';
        document.getElementById('galleryControls').style.display = 'block';
        document.getElementById('photoGallery').style.display = 'block';

        // Atualizar informações do cliente
        this.updateClientInfo();

        // Carregar fotos
        if (window.galleryManager) {
            window.galleryManager.loadPhotos(this.clientData);
        }
    }

    hideAllScreens() {
        const screens = ['loginScreen', 'loadingScreen', 'errorScreen'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.style.display = 'none';
            }
        });

        // Esconder elementos da galeria
        const galleryElements = ['clientInfo', 'galleryControls', 'photoGallery'];
        galleryElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    // ===== ATUALIZAR INFO DO CLIENTE =====
    updateClientInfo() {
        if (!this.clientData) return;

        const clientName = document.getElementById('clientName');
        const clientCategory = document.getElementById('clientCategory');

        if (clientName) {
            clientName.textContent = this.clientData.cliente;
        }

        if (clientCategory) {
            clientCategory.textContent = this.clientData.categoria;
        }
    }

    // ===== UTILS =====
    updateUrlWithoutToken() {
        const url = new URL(window.location);
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.toString());
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Usar sistema de notificações global se disponível
        if (window.notificationManager) {
            window.notificationManager.show(message, type);
        } else {
            // Fallback para alert
            alert(message);
        }
    }

    // ===== GETTERS =====
    getToken() {
        return this.currentToken;
    }

    getClientData() {
        return this.clientData;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

// ===== INICIALIZAÇÃO =====
let authSystem;

document.addEventListener('DOMContentLoaded', () => {
    authSystem = new AuthSystem();
    
    // Verificar sessão existente
    authSystem.checkExistingSession();
    
    // Tornar disponível globalmente
    window.authSystem = authSystem;
});

// ===== EXPORT PARA MÓDULOS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}