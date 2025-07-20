// ===== SISTEMA DE MARCA D'ÁGUA =====

class WatermarkSystem {
    constructor() {
        this.logoUrl = 'assets/logo.png';
        this.logoImage = null;
        this.watermarkText = 'GABRIEL LIMA RETRATOS';
        this.defaultOpacity = 0.3;
        this.defaultSize = 0.15; // 15% da largura da imagem
        this.positions = {
            center: { x: 0.5, y: 0.5 },
            topLeft: { x: 0.1, y: 0.1 },
            topRight: { x: 0.9, y: 0.1 },
            bottomLeft: { x: 0.1, y: 0.9 },
            bottomRight: { x: 0.9, y: 0.9 },
            pattern: 'pattern' // Para marca d'água repetida
        };
        
        this.init();
    }

    async init() {
        await this.loadLogo();
        this.setupCanvas();
    }

    // ===== CARREGAR LOGO =====
    async loadLogo() {
        return new Promise((resolve, reject) => {
            this.logoImage = new Image();
            this.logoImage.crossOrigin = 'anonymous';
            
            this.logoImage.onload = () => {
                console.log('Logo carregada para marca d\'água');
                resolve();
            };
            
            this.logoImage.onerror = (error) => {
                console.warn('Erro ao carregar logo, usando texto:', error);
                this.logoImage = null;
                resolve(); // Continua com texto
            };
            
            // Tentar carregar logo
            this.logoImage.src = this.logoUrl;
            
            // Timeout fallback
            setTimeout(() => {
                if (!this.logoImage.complete) {
                    console.warn('Timeout ao carregar logo, usando texto');
                    this.logoImage = null;
                    resolve();
                }
            }, 5000);
        });
    }

    // ===== SETUP CANVAS =====
    setupCanvas() {
        // Criar canvas para processamento
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configurações para qualidade
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    // ===== APLICAR MARCA D'ÁGUA =====
    async applyWatermark(imageElement, options = {}) {
        const {
            position = 'center',
            opacity = this.defaultOpacity,
            size = this.defaultSize,
            pattern = false,
            textOnly = false
        } = options;

        try {
            // Configurar canvas
            this.canvas.width = imageElement.naturalWidth || imageElement.width;
            this.canvas.height = imageElement.naturalHeight || imageElement.height;
            
            // Desenhar imagem original
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);
            
            // Aplicar marca d'água
            if (pattern) {
                await this.applyPatternWatermark(opacity, size, textOnly);
            } else {
                await this.applySingleWatermark(position, opacity, size, textOnly);
            }
            
            return this.canvas.toDataURL('image/jpeg', 0.9);
            
        } catch (error) {
            console.error('Erro ao aplicar marca d\'água:', error);
            return imageElement.src; // Retorna imagem original em caso de erro
        }
    }

    // ===== MARCA D'ÁGUA ÚNICA =====
    async applySingleWatermark(position, opacity, size, textOnly) {
        const pos = this.positions[position] || this.positions.center;
        
        // Configurar transparência
        this.ctx.globalAlpha = opacity;
        
        if (this.logoImage && !textOnly) {
            await this.drawLogoWatermark(pos, size);
        } else {
            this.drawTextWatermark(pos, size);
        }
        
        // Resetar transparência
        this.ctx.globalAlpha = 1.0;
    }

    // ===== MARCA D'ÁGUA EM PADRÃO =====
    async applyPatternWatermark(opacity, size, textOnly) {
        // Configurar transparência
        this.ctx.globalAlpha = opacity * 0.5; // Mais sutil para padrão
        
        const spacing = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        const rows = Math.ceil(this.canvas.height / spacing) + 1;
        const cols = Math.ceil(this.canvas.width / spacing) + 1;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = (col * spacing) - (spacing * 0.5);
                const y = (row * spacing) - (spacing * 0.5);
                
                // Posição relativa
                const relativePos = {
                    x: x / this.canvas.width,
                    y: y / this.canvas.height
                };
                
                if (this.logoImage && !textOnly) {
                    await this.drawLogoWatermark(relativePos, size * 0.7);
                } else {
                    this.drawTextWatermark(relativePos, size * 0.7);
                }
            }
        }
        
        // Resetar transparência
        this.ctx.globalAlpha = 1.0;
    }

    // ===== DESENHAR LOGO =====
    async drawLogoWatermark(position, size) {
        if (!this.logoImage) return;
        
        const logoWidth = this.canvas.width * size;
        const logoHeight = (logoWidth * this.logoImage.height) / this.logoImage.width;
        
        const x = (this.canvas.width * position.x) - (logoWidth / 2);
        const y = (this.canvas.height * position.y) - (logoHeight / 2);
        
        // Salvar contexto
        this.ctx.save();
        
        // Rotacionar se necessário (opcional)
        if (position === this.positions.center) {
            this.ctx.translate(x + logoWidth/2, y + logoHeight/2);
            this.ctx.rotate(-Math.PI / 6); // -30 graus
            this.ctx.translate(-(logoWidth/2), -(logoHeight/2));
            this.ctx.drawImage(this.logoImage, 0, 0, logoWidth, logoHeight);
        } else {
            this.ctx.drawImage(this.logoImage, x, y, logoWidth, logoHeight);
        }
        
        // Restaurar contexto
        this.ctx.restore();
    }

    // ===== DESENHAR TEXTO =====
    drawTextWatermark(position, size) {
        const fontSize = this.canvas.width * size * 0.1;
        
        // Configurar fonte
        this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#D4AF37'; // Cor dourada
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = fontSize * 0.02;
        
        const x = this.canvas.width * position.x;
        const y = this.canvas.height * position.y;
        
        // Salvar contexto
        this.ctx.save();
        
        // Rotacionar texto
        this.ctx.translate(x, y);
        this.ctx.rotate(-Math.PI / 6); // -30 graus
        
        // Desenhar contorno e preenchimento
        this.ctx.strokeText(this.watermarkText, 0, 0);
        this.ctx.fillText(this.watermarkText, 0, 0);
        
        // Restaurar contexto
        this.ctx.restore();
    }

    // ===== APLICAR MARCA D'ÁGUA EM ELEMENTO IMG =====
    async processImageElement(imgElement, authenticated = false, options = {}) {
        if (authenticated) {
            // Usuário autenticado - sem marca d'água
            return imgElement.src;
        }
        
        // Visitante - aplicar marca d'água
        const defaultOptions = {
            position: 'center',
            opacity: 0.3,
            size: 0.15,
            pattern: true // Padrão repetido para visitantes
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const watermarkedDataUrl = await this.applyWatermark(imgElement, finalOptions);
            return watermarkedDataUrl;
        } catch (error) {
            console.error('Erro ao processar imagem:', error);
            return imgElement.src;
        }
    }

    // ===== PROCESSAR GALERIA =====
    async processGallery(authenticated = false) {
        const images = document.querySelectorAll('.photo-item img');
        const promises = [];
        
        images.forEach((img, index) => {
            if (img.complete && img.naturalWidth > 0) {
                promises.push(this.processImageInGallery(img, authenticated, index));
            } else {
                img.onload = () => {
                    this.processImageInGallery(img, authenticated, index);
                };
            }
        });
        
        await Promise.all(promises);
    }

    async processImageInGallery(img, authenticated, index) {
        try {
            // Delay escalonado para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, index * 100));
            
            const processedSrc = await this.processImageElement(img, authenticated);
            
            if (processedSrc !== img.src) {
                // Transição suave
                img.style.opacity = '0.5';
                
                setTimeout(() => {
                    img.src = processedSrc;
                    img.style.opacity = '1';
                }, 200);
            }
            
        } catch (error) {
            console.error(`Erro ao processar imagem ${index}:`, error);
        }
    }

    // ===== CRIAR OVERLAY DE MARCA D'ÁGUA CSS =====
    createCSSWatermark() {
        const style = document.createElement('style');
        style.textContent = `
            .watermark-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 5;
                background-image: 
                    repeating-linear-gradient(
                        -45deg,
                        transparent,
                        transparent 50px,
                        rgba(212, 175, 55, 0.1) 50px,
                        rgba(212, 175, 55, 0.1) 100px
                    );
            }
            
            .watermark-overlay::before {
                content: 'GABRIEL LIMA RETRATOS';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-30deg);
                font-family: 'Playfair Display', serif;
                font-size: min(5vw, 3rem);
                font-weight: 700;
                color: rgba(212, 175, 55, 0.3);
                white-space: nowrap;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
                pointer-events: none;
            }
            
            .watermark-pattern {
                background-image: 
                    repeating-linear-gradient(
                        45deg,
                        transparent 0px,
                        transparent 80px,
                        rgba(212, 175, 55, 0.05) 80px,
                        rgba(212, 175, 55, 0.05) 120px
                    ),
                    repeating-linear-gradient(
                        -45deg,
                        transparent 0px,
                        transparent 80px,
                        rgba(212, 175, 55, 0.05) 80px,
                        rgba(212, 175, 55, 0.05) 120px
                    );
            }
            
            @media (max-width: 768px) {
                .watermark-overlay::before {
                    font-size: min(8vw, 2rem);
                }
            }
        `;
        
        if (!document.head.querySelector('style[data-watermark]')) {
            style.setAttribute('data-watermark', 'true');
            document.head.appendChild(style);
        }
    }

    // ===== APLICAR OVERLAY CSS =====
    applyOverlayToElements(selector = '.photo-item', authenticated = false) {
        if (authenticated) return; // Não aplicar para usuários autenticados
        
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            // Verificar se já tem overlay
            if (element.querySelector('.watermark-overlay')) return;
            
            // Criar overlay
            const overlay = document.createElement('div');
            overlay.className = 'watermark-overlay';
            
            // Adicionar posicionamento relativo ao container se necessário
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'relative';
            }
            
            element.appendChild(overlay);
        });
    }

    // ===== REMOVER OVERLAYS =====
    removeOverlays(selector = '.photo-item') {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            const overlay = element.querySelector('.watermark-overlay');
            if (overlay) {
                overlay.remove();
            }
        });
    }

    // ===== DOWNLOAD COM MARCA D'ÁGUA =====
    async downloadWithWatermark(imageUrl, filename, authenticated = false) {
        if (authenticated) {
            // Download direto para usuários autenticados
            return this.downloadDirect(imageUrl, filename);
        }
        
        try {
            // Aplicar marca d'água antes do download
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                img.onload = async () => {
                    try {
                        const watermarkedDataUrl = await this.applyWatermark(img, {
                            position: 'center',
                            opacity: 0.4,
                            size: 0.2,
                            pattern: false
                        });
                        
                        this.downloadDataUrl(watermarkedDataUrl, filename);
                        resolve(true);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => reject(new Error('Erro ao carregar imagem'));
                img.src = imageUrl;
            });
            
        } catch (error) {
            console.error('Erro ao baixar com marca d\'água:', error);
            throw error;
        }
    }

    // ===== DOWNLOAD DIRETO =====
    downloadDirect(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return Promise.resolve(true);
    }

    // ===== DOWNLOAD DATA URL =====
    downloadDataUrl(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ===== VALIDAR AUTENTICAÇÃO =====
    isAuthenticated() {
        // Verificar se usuário está autenticado
        return window.authSystem && window.authSystem.isUserAuthenticated();
    }

    // ===== PROTEGER IMAGEM =====
    protectImage(imgElement) {
        // Prevenir clique direito
        imgElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showProtectionMessage();
        });
        
        // Prevenir drag
        imgElement.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
        
        // Prevenir seleção
        imgElement.style.userSelect = 'none';
        imgElement.style.webkitUserSelect = 'none';
        imgElement.style.mozUserSelect = 'none';
        imgElement.style.msUserSelect = 'none';
        
        // Adicionar atributos de proteção
        imgElement.setAttribute('draggable', 'false');
        imgElement.setAttribute('ondragstart', 'return false');
    }

    // ===== MOSTRAR MENSAGEM DE PROTEÇÃO =====
    showProtectionMessage() {
        if (this.isAuthenticated()) return;
        
        const message = document.createElement('div');
        message.className = 'protection-message';
        message.innerHTML = `
            <div class="protection-content">
                <i class="fas fa-shield-alt"></i>
                <h3>Imagem Protegida</h3>
                <p>Esta imagem está protegida por direitos autorais.</p>
                <p>Para baixar sem marca d'água, faça login com seu token.</p>
            </div>
        `;
        
        // Estilos inline
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        `;
        
        message.querySelector('.protection-content').style.cssText = `
            max-width: 300px;
        `;
        
        document.body.appendChild(message);
        
        // Remover após 3 segundos
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
        
        // Remover ao clicar
        message.addEventListener('click', () => {
            message.remove();
        });
    }

    // ===== PROCESSAR NOVA IMAGEM =====
    async processNewImage(imgElement, container = null) {
        const authenticated = this.isAuthenticated();
        
        if (!authenticated) {
            // Aplicar proteções
            this.protectImage(imgElement);
            
            // Aplicar overlay se tiver container
            if (container) {
                this.applyOverlayToElements(container, false);
            }
            
            // Processar marca d'água na imagem
            if (imgElement.complete && imgElement.naturalWidth > 0) {
                await this.processImageInGallery(imgElement, false, 0);
            } else {
                imgElement.onload = () => {
                    this.processImageInGallery(imgElement, false, 0);
                };
            }
        }
    }

    // ===== OBSERVER PARA NOVAS IMAGENS =====
    setupImageObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Buscar imagens no novo nó
                        const images = node.querySelectorAll ? 
                            node.querySelectorAll('img') : 
                            (node.tagName === 'IMG' ? [node] : []);
                        
                        images.forEach(img => {
                            this.processNewImage(img, img.closest('.photo-item'));
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        return observer;
    }

    // ===== ATUALIZAR ESTADO DE AUTENTICAÇÃO =====
    updateAuthenticationState(authenticated) {
        if (authenticated) {
            // Remover todas as marcas d'água e proteções
            this.removeOverlays();
            this.removeProtections();
        } else {
            // Aplicar marcas d'água e proteções
            this.createCSSWatermark();
            this.applyOverlayToElements('.photo-item', false);
            this.processGallery(false);
        }
    }

    // ===== REMOVER PROTEÇÕES =====
    removeProtections() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Remover event listeners (não é possível remover diretamente, mas podemos sobrescrever)
            img.style.userSelect = '';
            img.style.webkitUserSelect = '';
            img.style.mozUserSelect = '';
            img.style.msUserSelect = '';
            img.removeAttribute('draggable');
            img.removeAttribute('ondragstart');
        });
    }

    // ===== CONFIGURAÇÕES AVANÇADAS =====
    updateWatermarkSettings(settings) {
        const {
            text = this.watermarkText,
            opacity = this.defaultOpacity,
            size = this.defaultSize,
            logoUrl = this.logoUrl
        } = settings;
        
        this.watermarkText = text;
        this.defaultOpacity = opacity;
        this.defaultSize = size;
        
        if (logoUrl !== this.logoUrl) {
            this.logoUrl = logoUrl;
            this.loadLogo();
        }
    }

    // ===== ESTATÍSTICAS =====
    getStats() {
        return {
            processedImages: document.querySelectorAll('.watermark-overlay').length,
            protectedImages: document.querySelectorAll('img[draggable="false"]').length,
            authenticated: this.isAuthenticated(),
            logoLoaded: !!this.logoImage
        };
    }

    // ===== LIMPEZA =====
    destroy() {
        this.removeOverlays();
        this.removeProtections();
        
        // Remover estilos
        const watermarkStyle = document.head.querySelector('style[data-watermark]');
        if (watermarkStyle) {
            watermarkStyle.remove();
        }
        
        // Limpar canvas
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}

// ===== INICIALIZAÇÃO =====
let watermarkSystem;

document.addEventListener('DOMContentLoaded', () => {
    watermarkSystem = new WatermarkSystem();
    window.watermarkSystem = watermarkSystem;
    
    // Configurar observer para novas imagens
    watermarkSystem.setupImageObserver();
    
    // Aplicar proteções iniciais se não autenticado
    setTimeout(() => {
        if (!watermarkSystem.isAuthenticated()) {
            watermarkSystem.createCSSWatermark();
            watermarkSystem.processGallery(false);
        }
    }, 1000);
});

// ===== EVENT LISTENERS GLOBAIS =====
document.addEventListener('authStateChanged', (event) => {
    if (watermarkSystem) {
        watermarkSystem.updateAuthenticationState(event.detail.authenticated);
    }
});

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WatermarkSystem;
}