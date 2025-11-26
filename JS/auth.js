// ===== SISTEMA DE AUTENTICAÇÃO SIMPLES =====

class AuthSimples {
    constructor() {
        this.tokenValido = null;
        this.clienteData = null;
        this.isAuthenticated = false;
        
        this.init();
    }

    init() {
        this.checkUrlToken();
        this.setupEventListeners();
        this.showLoginScreen();
    }

    // ===== VERIFICAR TOKEN NA URL =====
    checkUrlToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        
        if (tokenFromUrl) {
            document.getElementById('tokenInput').value = tokenFromUrl;
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
    }

    // ===== SUBMIT DO TOKEN =====
    async handleTokenSubmit() {
        const tokenInput = document.getElementById('tokenInput');
        const token = tokenInput.value.trim(); // NÃO converter para uppercase

        if (!token) {
            this.showError('Por favor, digite um token válido.');
            return;
        }

        if (token.length < 6) {
            this.showError('Token deve ter pelo menos 6 caracteres.');
            return;
        }

        console.log('Tentando validar token:', token);
        await this.validateToken(token);
    }

    // ===== VALIDAÇÃO DO TOKEN COM SEU SISTEMA =====
    async validateToken(token) {
        this.showLoading('Validando seu token...');

        try {
            // Buscar no arquivo tokens.json (seu sistema Python)
            const response = await fetch('tokens.json');
            
            if (!response.ok) {
                throw new Error('Erro ao carregar arquivo de tokens');
            }
            
            const tokensData = await response.json();
            
            // Procurar o token no objeto JSON (busca exata)
            const clientData = tokensData[token];

            if (!clientData) {
                console.log('Token não encontrado:', token);
                console.log('Tokens disponíveis:', Object.keys(tokensData));
                throw new Error('Token não encontrado');
            }

            // Verificar se token está ativo
            if (!clientData.ativo) {
                throw new Error('Token desativado');
            }

            // Verificar expiração
            const now = new Date();
            const expirationDate = new Date(clientData.expira_em);
            
            console.log('Data atual:', now);
            console.log('Data de expiração:', expirationDate);
            
            if (now > expirationDate) {
                throw new Error('Token expirado');
            }

            // Converter dados para formato do sistema
            const pastasPermitidas = Array.isArray(clientData.pastas_permitidas) && clientData.pastas_permitidas.length
                ? clientData.pastas_permitidas
                : clientData.pasta ? [clientData.pasta] : [];

            const clienteFormatado = {
                token: token,
                cliente: clientData.cliente,
                categoria: clientData.categoria,
                pasta: pastasPermitidas[0] || clientData.pasta || '',
                pastasPermitidas,
                expira_em: clientData.expira_em,
                criado_em: clientData.criado_em,
                downloads_permitidos: clientData.downloads_permitidos,
                fotos_baixadas: clientData.fotos_baixadas || []
            };

            console.log('Token válido para cliente:', clienteFormatado);

            // Token válido
            await this.handleSuccessfulAuth(token, clienteFormatado);

        } catch (error) {
            console.error('Erro na validação:', error);
            this.handleAuthError(error.message);
        }
    }

    // ===== AUTENTICAÇÃO BEM-SUCEDIDA =====
    async handleSuccessfulAuth(token, clientData) {
        this.tokenValido = token;
        this.clienteData = clientData;
        this.isAuthenticated = true;

        // Salvar na sessão
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('clientData', JSON.stringify(clientData));

        // Atualizar URL sem token
        this.updateUrlWithoutToken();

        // Também registrar download no sistema (se necessário)
        this.registrarAcesso(token);

        // Mostrar galeria
        this.showGallery();

        // Notificar sucesso com informações do token
        const diasRestantes = Math.ceil((new Date(clientData.expira_em) - new Date()) / (1000 * 60 * 60 * 24));
        this.showNotification(`Bem-vindo ${clientData.cliente}! Token válido por ${diasRestantes} dias.`, 'success');
    }

    // ===== REGISTRAR ACESSO =====
    async registrarAcesso(token) {
        try {
            // Em um ambiente real, enviaria para o servidor
            const accessData = {
                token: token,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };

            console.log('Acesso registrado:', accessData);
            
            // Salvar localmente para demonstração
            const acessos = JSON.parse(localStorage.getItem('acessos_tokens') || '[]');
            acessos.push(accessData);
            localStorage.setItem('acessos_tokens', JSON.stringify(acessos));

        } catch (error) {
            console.warn('Erro ao registrar acesso:', error);
        }
    }

    // ===== ERRO DE AUTENTICAÇÃO =====
    handleAuthError(errorMessage) {
        let userMessage = 'Token inválido. Verifique se digitou corretamente.';
        
        if (errorMessage.includes('não encontrado')) {
            userMessage = 'Token não encontrado. Verifique com Gabriel se o token está correto.';
        } else if (errorMessage.includes('expirado')) {
            userMessage = 'Token expirado. Entre em contato com Gabriel para renovar o acesso.';
        } else if (errorMessage.includes('desativado')) {
            userMessage = 'Token desativado. Entre em contato com Gabriel.';
        } else if (errorMessage.includes('fetch')) {
            userMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }

        this.showErrorScreen(userMessage);
    }

    // ===== LOGOUT =====
    logout() {
        this.tokenValido = null;
        this.clienteData = null;
        this.isAuthenticated = false;

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
                this.tokenValido = savedToken;
                this.clienteData = JSON.parse(savedClientData);
                this.isAuthenticated = true;
                this.showGallery();
            } catch (error) {
                console.warn('Erro ao recuperar sessão:', error);
                this.clearSession();
                this.showLoginScreen();
            }
        }
    }

    clearSession() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('clientData');
        this.tokenValido = null;
        this.clienteData = null;
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
        if (window.galeriaSimples) {
            window.galeriaSimples.loadPhotos(this.clienteData);
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
        if (!this.clienteData) return;

        const clientName = document.getElementById('clientName');

        if (clientName) {
            clientName.textContent = this.clienteData.cliente;
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
        // Sistema de notificação simples
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }

    // ===== GETTERS =====
    getToken() {
        return this.tokenValido;
    }

    getClientData() {
        return this.clienteData;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

// ===== INICIALIZAÇÃO =====
let authSimples;

document.addEventListener('DOMContentLoaded', () => {
    authSimples = new AuthSimples();
    
    // Verificar sessão existente
    authSimples.checkExistingSession();
    
    // Tornar disponível globalmente
    window.authSimples = authSimples;
    
    console.log('🔐 Sistema de autenticação simples inicializado');
});
