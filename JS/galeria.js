// ===== GERENCIADOR DA GALERIA =====

class GalleryManager {
    constructor() {
        this.currentPhotos = [];
        this.selectedPhotos = new Set();
        this.currentView = 'grid';
        this.searchQuery = '';
        this.currentPhotoIndex = 0;
        this.isLoading = false;
        this.downloadInProgress = false;
        
        // Referências DOM
        this.galleryGrid = null;
        this.photoModal = null;
        this.searchInput = null;
        this.selectedCount = null;
        
        this.init();
    }

    init() {
        this.setupDOMReferences();
        this.setupEventListeners();
        this.setupNotificationSystem();
    }

    // ===== SETUP DOM =====
    setupDOMReferences() {
        this.galleryGrid = document.getElementById('galleryGrid');
        this.photoModal = document.getElementById('photoModal');
        this.searchInput = document.getElementById('searchInput');
        this.selectedCount = document.getElementById('selectedCount');
        this.totalPhotos = document.getElementById('totalPhotos');
        this.downloadedPhotos = document.getElementById('downloadedPhotos');
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeView(e.target.dataset.view);
            });
        });

        // Gallery actions
        document.getElementById('selectAllBtn')?.addEventListener('click', () => {
            this.toggleSelectAll();
        });

        document.getElementById('downloadSelectedBtn')?.addEventListener('click', () => {
            this.downloadSelected();
        });

        // Search
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Modal controls
        document.getElementById('closeModalBtn')?.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('downloadSingleBtn')?.addEventListener('click', () => {
            this.downloadCurrentPhoto();
        });

        document.getElementById('prevPhotoBtn')?.addEventListener('click', () => {
            this.showPreviousPhoto();
        });

        document.getElementById('nextPhotoBtn')?.addEventListener('click', () => {
            this.showNextPhoto();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Modal backdrop
        this.photoModal?.addEventListener('click', (e) => {
            if (e.target === this.photoModal) {
                this.closeModal();
            }
        });

        // Download progress
        document.getElementById('cancelDownloadBtn')?.addEventListener('click', () => {
            this.cancelDownload();
        });
    }

    // ===== CARREGAR FOTOS =====
    async loadPhotos(clientData) {
        this.showLoading(true);
        
        try {
            // Usar BOX API se disponível, senão usar mock
            let photos = [];
            
            if (window.boxAPI && window.boxAPI.isAuthenticated()) {
                photos = await window.boxAPI.getClientPhotos(clientData);
            } else {
                console.warn('BOX API não disponível, usando dados mock');
                photos = await this.getMockPhotos(clientData);
            }
            
            this.currentPhotos = photos;
            this.renderGallery();
            this.updateStats();
            
            // Aplicar marcas d'água se necessário
            const authenticated = window.authSystem?.isUserAuthenticated() || false;
            if (window.watermarkSystem) {
                setTimeout(() => {
                    window.watermarkSystem.processGallery(authenticated);
                }, 500);
            }
            
        } catch (error) {
            console.error('Erro ao carregar fotos:', error);
            this.showError('Erro ao carregar fotos. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== DADOS MOCK =====
    async getMockPhotos(clientData) {
        const { categoria, cliente } = clientData;
        
        // Fotos de exemplo baseadas na categoria
        const mockData = {
            'Batizados': [
                'https://images.unsplash.com/photo-1544717440-50301b8a9ea8?w=800',
                'https://images.unsplash.com/photo-1519340333755-56e9c1d4893c?w=800',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
            ],
            'Gestantes': [
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
                'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800',
                'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800'
            ],
            'Missas': [
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
                'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800'
            ]
        };
        
        const urls = mockData[categoria] || mockData['Batizados'];
        
        return urls.map((url, index) => ({
            id: `mock_${categoria}_${index}`,
            name: `${categoria.toLowerCase()}_${cliente.replace(' ', '_')}_${String(index + 1).padStart(3, '0')}.jpg`,
            size: Math.floor(Math.random() * 3000000) + 1000000, // 1-4MB
            sizeFormatted: this.formatFileSize(Math.floor(Math.random() * 3000000) + 1000000),
            modifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            dateFormatted: new Date().toLocaleDateString('pt-BR'),
            downloadUrl: url,
            thumbnailUrl: url + '?w=300&h=300&fit=crop',
            previewUrl: url,
            extension: 'jpg'
        }));
    }

    // ===== RENDERIZAR GALERIA =====
    renderGallery() {
        if (!this.galleryGrid) return;

        // Filtrar fotos baseado na busca
        const filteredPhotos = this.filterPhotos();
        
        if (filteredPhotos.length === 0) {
            this.showEmptyState();
            return;
        }

        // Limpar grid
        this.galleryGrid.innerHTML = '';
        
        // Aplicar classe de view
        this.galleryGrid.className = `gallery-grid ${this.currentView}-view`;

        // Renderizar fotos
        filteredPhotos.forEach((photo, index) => {
            const photoElement = this.createPhotoElement(photo, index);
            this.galleryGrid.appendChild(photoElement);
        });

        // Esconder empty state
        document.getElementById('emptyState').style.display = 'none';
    }

    // ===== CRIAR ELEMENTO DE FOTO =====
    createPhotoElement(photo, index) {
        const photoItem = document.createElement('div');
        photoItem.className = `photo-item ${this.currentView}-view`;
        photoItem.dataset.photoId = photo.id;
        
        const isSelected = this.selectedPhotos.has(photo.id);
        if (isSelected) {
            photoItem.classList.add('selected');
        }

        photoItem.innerHTML = `
            <div class="photo-checkbox">
                <label class="checkbox-container">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="galleryManager.toggleSelection('${photo.id}')">
                    <span class="checkmark"></span>
                </label>
            </div>
            
            <div class="photo-container">
                <img src="${photo.thumbnailUrl}" 
                     alt="${photo.name}"
                     onclick="galleryManager.openModal(${index})"
                     loading="lazy">
                
                <div class="photo-overlay">
                    <div class="overlay-actions">
                        <button class="overlay-btn" onclick="galleryManager.openModal(${index})" 
                                title="Visualizar">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="overlay-btn" onclick="galleryManager.downloadPhoto('${photo.id}')" 
                                title="Baixar">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="photo-info">
                <div class="photo-name">${photo.name}</div>
                <div class="photo-meta">
                    <span class="photo-date">${photo.dateFormatted}</span>
                    <span class="photo-size">${photo.sizeFormatted}</span>
                </div>
            </div>
        `;

        return photoItem;
    }

    // ===== FILTRAR FOTOS =====
    filterPhotos() {
        if (!this.searchQuery) {
            return this.currentPhotos;
        }

        const query = this.searchQuery.toLowerCase();
        return this.currentPhotos.filter(photo => 
            photo.name.toLowerCase().includes(query) ||
            photo.dateFormatted.includes(query)
        );
    }

    // ===== BUSCA =====
    handleSearch(query) {
        this.searchQuery = query.trim();
        this.renderGallery();
    }

    // ===== MUDAR VISUALIZAÇÃO =====
    changeView(view) {
        this.currentView = view;
        
        // Atualizar botões
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Re-renderizar
        this.renderGallery();
    }

    // ===== SELEÇÃO =====
    toggleSelection(photoId) {
        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }

        this.updateSelectionUI();
    }

    toggleSelectAll() {
        const filteredPhotos = this.filterPhotos();
        const allSelected = filteredPhotos.every(photo => this.selectedPhotos.has(photo.id));

        if (allSelected) {
            // Desselecionar todas
            filteredPhotos.forEach(photo => this.selectedPhotos.delete(photo.id));
        } else {
            // Selecionar todas
            filteredPhotos.forEach(photo => this.selectedPhotos.add(photo.id));
        }

        this.updateSelectionUI();
        this.renderGallery(); // Re-renderizar para atualizar checkboxes
    }

    updateSelectionUI() {
        const count = this.selectedPhotos.size;
        
        if (this.selectedCount) {
            this.selectedCount.textContent = count;
        }

        const downloadBtn = document.getElementById('downloadSelectedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = count === 0;
            downloadBtn.textContent = count === 0 ? 
                'Selecione fotos' : 
                `Baixar Selecionadas (${count})`;
        }

        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            const filteredPhotos = this.filterPhotos();
            const allSelected = filteredPhotos.length > 0 && 
                filteredPhotos.every(photo => this.selectedPhotos.has(photo.id));
            
            selectAllBtn.innerHTML = allSelected ? 
                '<i class="fas fa-minus-square"></i> Desselecionar Todas' :
                '<i class="fas fa-check-double"></i> Selecionar Todas';
        }
    }

    // ===== MODAL =====
    openModal(photoIndex) {
        const filteredPhotos = this.filterPhotos();
        this.currentPhotoIndex = photoIndex;
        const photo = filteredPhotos[photoIndex];

        if (!photo) return;

        // Atualizar modal
        document.getElementById('modalPhotoName').textContent = photo.name;
        document.getElementById('modalImage').src = photo.previewUrl;
        document.getElementById('photoSize').textContent = photo.sizeFormatted;
        document.getElementById('photoDate').textContent = photo.dateFormatted;
        
        // Atualizar contador
        document.getElementById('photoCounter').textContent = 
            `${photoIndex + 1} de ${filteredPhotos.length}`;

        // Atualizar botões de navegação
        document.getElementById('prevPhotoBtn').disabled = photoIndex === 0;
        document.getElementById('nextPhotoBtn').disabled = photoIndex === filteredPhotos.length - 1;

        // Mostrar modal
        this.photoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.photoModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    showPreviousPhoto() {
        if (this.currentPhotoIndex > 0) {
            this.openModal(this.currentPhotoIndex - 1);
        }
    }

    showNextPhoto() {
        const filteredPhotos = this.filterPhotos();
        if (this.currentPhotoIndex < filteredPhotos.length - 1) {
            this.openModal(this.currentPhotoIndex + 1);
        }
    }

    // ===== DOWNLOADS =====
    async downloadPhoto(photoId) {
        const photo = this.currentPhotos.find(p => p.id === photoId);
        if (!photo) return;

        try {
            const authenticated = window.authSystem?.isUserAuthenticated() || false;
            
            if (window.watermarkSystem) {
                await window.watermarkSystem.downloadWithWatermark(
                    photo.downloadUrl, 
                    photo.name, 
                    authenticated
                );
            } else {
                // Fallback: download direto
                this.downloadDirect(photo.downloadUrl, photo.name);
            }

            this.trackDownload(photo);
            this.showNotification(`${photo.name} baixado com sucesso!`, 'success');

        } catch (error) {
            console.error('Erro ao baixar foto:', error);
            this.showNotification('Erro ao baixar foto. Tente novamente.', 'error');
        }
    }

    async downloadCurrentPhoto() {
        const filteredPhotos = this.filterPhotos();
        const photo = filteredPhotos[this.currentPhotoIndex];
        if (photo) {
            await this.downloadPhoto(photo.id);
        }
    }

    async downloadSelected() {
        if (this.selectedPhotos.size === 0) return;
        if (this.downloadInProgress) return;

        const selectedList = this.currentPhotos.filter(photo => 
            this.selectedPhotos.has(photo.id)
        );

        this.downloadInProgress = true;
        this.showDownloadProgress(0, selectedList.length);

        try {
            for (let i = 0; i < selectedList.length; i++) {
                const photo = selectedList[i];
                
                this.updateDownloadProgress(
                    i + 1, 
                    selectedList.length, 
                    `Baixando ${photo.name}...`
                );

                await this.downloadPhoto(photo.id);
                
                // Delay para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.showNotification(
                `${selectedList.length} fotos baixadas com sucesso!`, 
                'success'
            );

        } catch (error) {
            console.error('Erro no download múltiplo:', error);
            this.showNotification('Erro durante o download. Algumas fotos podem não ter sido baixadas.', 'error');
        } finally {
            this.downloadInProgress = false;
            this.hideDownloadProgress();
        }
    }

    downloadDirect(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    cancelDownload() {
        this.downloadInProgress = false;
        this.hideDownloadProgress();
        this.showNotification('Download cancelado.', 'warning');
    }

    // ===== PROGRESSO DE DOWNLOAD =====
    showDownloadProgress(current, total) {
        const progressDiv = document.getElementById('downloadProgress');
        if (progressDiv) {
            progressDiv.style.display = 'block';
            this.updateDownloadProgress(current, total, 'Iniciando downloads...');
        }
    }

    updateDownloadProgress(current, total, message) {
        const percent = Math.round((current / total) * 100);
        
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = message;
        document.getElementById('progressPercent').textContent = `${percent}%`;
    }

    hideDownloadProgress() {
        const progressDiv = document.getElementById('downloadProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }

    // ===== NAVEGAÇÃO POR TECLADO =====
    handleKeyboard(event) {
        if (!this.photoModal.classList.contains('active')) return;

        switch (event.key) {
            case 'Escape':
                this.closeModal();
                break;
            case 'ArrowLeft':
                this.showPreviousPhoto();
                break;
            case 'ArrowRight':
                this.showNextPhoto();
                break;
            case ' ':
                event.preventDefault();
                this.downloadCurrentPhoto();
                break;
        }
    }

    // ===== ESTADOS DA UI =====
    showLoading(show) {
        this.isLoading = show;
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = show ? 'flex' : 'none';
        }
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        
        if (this.galleryGrid) {
            this.galleryGrid.innerHTML = '';
        }
    }

    showError(message) {
        const errorScreen = document.getElementById('errorScreen');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorScreen && errorMessage) {
            errorMessage.textContent = message;
            errorScreen.style.display = 'flex';
        }
    }

    // ===== SISTEMA DE NOTIFICAÇÕES =====
    setupNotificationSystem() {
        this.notificationContainer = document.getElementById('notificationContainer');
        
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'notificationContainer';
            this.notificationContainer.className = 'notification-container';
            document.body.appendChild(this.notificationContainer);
        }
    }

    showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type]}</span>
                <div class="notification-text">
                    <p>${message}</p>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    ×
                </button>
            </div>
        `;

        this.notificationContainer.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remover automaticamente
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    // ===== ESTATÍSTICAS =====
    updateStats() {
        if (this.totalPhotos) {
            this.totalPhotos.textContent = this.currentPhotos.length;
        }

        // Simular fotos já baixadas (em um ambiente real, viria do servidor)
        if (this.downloadedPhotos) {
            const downloaded = Math.floor(this.currentPhotos.length * 0.2); // 20% já baixadas
            this.downloadedPhotos.textContent = downloaded;
        }
    }

    trackDownload(photo) {
        // Registrar download para estatísticas
        const clientData = window.authSystem?.getClientData();
        if (clientData && clientData.fotos_baixadas) {
            if (!clientData.fotos_baixadas.includes(photo.name)) {
                clientData.fotos_baixadas.push(photo.name);
                this.updateStats();
            }
        }

        // Log para analytics
        console.log('Download tracked:', {
            photoId: photo.id,
            photoName: photo.name,
            timestamp: new Date().toISOString(),
            client: clientData?.cliente
        });
    }

    // ===== UTILIDADES =====
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // ===== RESPONSIVE HELPERS =====
    isMobile() {
        return window.innerWidth <= 768;
    }

    adaptToScreenSize() {
        if (this.isMobile()) {
            // Adaptações para mobile
            this.currentView = 'grid';
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === 'grid');
            });
        }
    }

    // ===== LAZY LOADING =====
    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });

        // Observar todas as imagens com data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // ===== PERFORMANCE OPTIMIZATION =====
    debounce(func, wait) {
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

    // ===== CACHE MANAGEMENT =====
    cachePhoto(photo) {
        // Cache simples em sessionStorage para session atual
        try {
            const cacheKey = `photo_${photo.id}`;
            const photoData = {
                ...photo,
                cachedAt: Date.now()
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(photoData));
        } catch (error) {
            console.warn('Erro ao fazer cache da foto:', error);
        }
    }

    getCachedPhoto(photoId) {
        try {
            const cacheKey = `photo_${photoId}`;
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                const photoData = JSON.parse(cached);
                // Cache válido por 1 hora
                if (Date.now() - photoData.cachedAt < 3600000) {
                    return photoData;
                }
            }
        } catch (error) {
            console.warn('Erro ao recuperar cache da foto:', error);
        }
        return null;
    }

    // ===== EXPORT/SHARE FEATURES =====
    async shareGallery() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Galeria - Gabriel Lima Retratos',
                    text: 'Confira suas fotos!',
                    url: window.location.href
                });
            } catch (error) {
                console.log('Compartilhamento cancelado');
            }
        } else {
            // Fallback: copiar URL
            await navigator.clipboard.writeText(window.location.href);
            this.showNotification('Link copiado para área de transferência!', 'success');
        }
    }

    // ===== CLEANUP =====
    destroy() {
        // Limpar event listeners
        document.removeEventListener('keydown', this.handleKeyboard);
        
        // Limpar cache
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('photo_')) {
                sessionStorage.removeItem(key);
            }
        });

        // Limpar seleções
        this.selectedPhotos.clear();
        this.currentPhotos = [];
    }

    // ===== ACCESSIBILITY =====
    setupAccessibility() {
        // Adicionar roles ARIA
        if (this.galleryGrid) {
            this.galleryGrid.setAttribute('role', 'grid');
            this.galleryGrid.setAttribute('aria-label', 'Galeria de fotos');
        }

        // Navegação por teclado na galeria
        document.addEventListener('keydown', (e) => {
            if (this.photoModal.classList.contains('active')) return;
            
            const focusedElement = document.activeElement;
            const photoItems = Array.from(document.querySelectorAll('.photo-item'));
            const currentIndex = photoItems.indexOf(focusedElement);

            switch (e.key) {
                case 'ArrowRight':
                    if (currentIndex < photoItems.length - 1) {
                        photoItems[currentIndex + 1].focus();
                    }
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    if (currentIndex > 0) {
                        photoItems[currentIndex - 1].focus();
                    }
                    e.preventDefault();
                    break;
                case 'Enter':
                    if (focusedElement.classList.contains('photo-item')) {
                        const photoIndex = photoItems.indexOf(focusedElement);
                        this.openModal(photoIndex);
                    }
                    break;
            }
        });
    }

    // ===== ANALYTICS =====
    trackEvent(eventName, data = {}) {
        // Integração com Google Analytics ou similar
        if (window.gtag) {
            window.gtag('event', eventName, {
                custom_parameter_1: data.photoId,
                custom_parameter_2: data.action,
                value: 1
            });
        }

        // Console log para desenvolvimento
        console.log('Analytics Event:', eventName, data);
    }

    // ===== ERROR HANDLING =====
    handleError(error, context = '') {
        console.error(`Erro na galeria${context ? ` (${context})` : ''}:`, error);
        
        this.showNotification(
            'Ocorreu um erro inesperado. Tente recarregar a página.',
            'error',
            6000
        );

        // Reportar erro para serviço de monitoramento
        if (window.Sentry) {
            window.Sentry.captureException(error, {
                tags: {
                    component: 'gallery',
                    context: context
                }
            });
        }
    }

    // ===== GETTERS =====
    getSelectedPhotos() {
        return this.currentPhotos.filter(photo => 
            this.selectedPhotos.has(photo.id)
        );
    }

    getCurrentPhoto() {
        const filteredPhotos = this.filterPhotos();
        return filteredPhotos[this.currentPhotoIndex];
    }

    getStats() {
        return {
            totalPhotos: this.currentPhotos.length,
            selectedPhotos: this.selectedPhotos.size,
            currentView: this.currentView,
            searchQuery: this.searchQuery,
            isLoading: this.isLoading
        };
    }
}

// ===== INICIALIZAÇÃO =====
let galleryManager;

document.addEventListener('DOMContentLoaded', () => {
    galleryManager = new GalleryManager();
    window.galleryManager = galleryManager;
    
    // Setup responsividade
    window.addEventListener('resize', () => {
        galleryManager.adaptToScreenSize();
    });
    
    // Setup accessibility
    galleryManager.setupAccessibility();
    
    console.log('🖼️ Gallery Manager inicializado');
});

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GalleryManager;
}