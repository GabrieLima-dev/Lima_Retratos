// ===== SISTEMA DE GALERIA SIMPLES =====

class GaleriaSimples {
    constructor() {
        this.currentPhotos = [];
        this.selectedPhotos = new Set();
        this.currentView = 'grid';
        this.searchQuery = '';
        this.currentPhotoIndex = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNotificationSystem();
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
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
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

        // Modal backdrop
        const photoModal = document.getElementById('photoModal');
        photoModal?.addEventListener('click', (e) => {
            if (e.target === photoModal) {
                this.closeModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    // ===== CARREGAR FOTOS DO SEU SISTEMA =====
    async loadPhotos(clientData) {
        this.showLoading(true);
        
        try {
            // Buscar fotos da pasta específica do cliente
            // Primeiro tenta carregar de um arquivo específico da pasta
            let fotosCliente = [];
            
            try {
                // Tentar carregar arquivo específico da pasta (se existir)
                const response = await fetch(`fotos/${clientData.pasta}.json`);
                if (response.ok) {
                    const fotosData = await response.json();
                    fotosCliente = fotosData.map((foto, index) => ({
                        id: `${clientData.pasta}_${index}`,
                        name: foto.nome || `foto_${index + 1}.jpg`,
                        url: foto.url,
                        thumbnailUrl: foto.thumbnail || foto.url,
                        previewUrl: foto.url,
                        dateFormatted: foto.data || new Date().toLocaleDateString('pt-BR'),
                        pasta: clientData.pasta
                    }));
                }
            } catch (error) {
                console.log('Arquivo específico não encontrado, tentando fotos.txt...');
            }
            
            // Se não encontrou arquivo específico, usa o sistema de fotos.txt
            if (fotosCliente.length === 0) {
                const response = await fetch('fotos.txt');
                const fotosData = await response.text();
                
                // Formato: PASTA|NOME_FOTO|URL_FOTO
                const lines = fotosData.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    const parts = line.split('|');
                    if (parts.length >= 3) {
                        const [pasta, nomeArquivo, urlFoto] = parts;
                        
                        // Verificar se a foto pertence ao cliente
                        if (pasta.trim() === clientData.pasta) {
                            fotosCliente.push({
                                id: `${pasta}_${nomeArquivo}`,
                                name: nomeArquivo.trim(),
                                url: urlFoto.trim(),
                                thumbnailUrl: urlFoto.trim(),
                                previewUrl: urlFoto.trim(),
                                dateFormatted: new Date().toLocaleDateString('pt-BR'),
                                pasta: pasta.trim()
                            });
                        }
                    }
                }
            }
            
            this.currentPhotos = fotosCliente;
            this.renderGallery();
            this.updateStats();
            
            // Log para acompanhamento
            console.log(`Carregadas ${fotosCliente.length} fotos para ${clientData.cliente}`);
            
            // Aplicar marca d'água se usuário não autenticado
            setTimeout(() => {
                this.applyWatermarkIfNeeded();
            }, 500);
            
        } catch (error) {
            console.error('Erro ao carregar fotos:', error);
            this.showError('Erro ao carregar fotos. Verifique se as fotos foram configuradas corretamente.');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== RENDERIZAR GALERIA =====
    renderGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        // Filtrar fotos baseado na busca
        const filteredPhotos = this.filterPhotos();
        
        if (filteredPhotos.length === 0) {
            this.showEmptyState();
            return;
        }

        // Limpar grid
        galleryGrid.innerHTML = '';
        
        // Aplicar classe de view
        galleryGrid.className = `gallery-grid ${this.currentView}-view`;

        // Renderizar fotos
        filteredPhotos.forEach((photo, index) => {
            const photoElement = this.createPhotoElement(photo, index);
            galleryGrid.appendChild(photoElement);
        });

        // Esconder empty state
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
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
                           onchange="galeriaSimples.toggleSelection('${photo.id}')">
                    <span class="checkmark"></span>
                </label>
            </div>
            
            <div class="photo-container">
                <img src="${photo.thumbnailUrl}" 
                     alt="${photo.name}"
                     onclick="galeriaSimples.openModal(${index})"
                     loading="lazy">
                
                <div class="photo-overlay">
                    <div class="overlay-actions">
                        <button class="overlay-btn" onclick="galeriaSimples.openModal(${index})" 
                                title="Visualizar">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="overlay-btn" onclick="galeriaSimples.downloadPhoto('${photo.id}')" 
                                title="Baixar">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Marca d'água para visitantes -->
                <div class="watermark-overlay"></div>
            </div>
            
            <div class="photo-info">
                <div class="photo-name">${photo.name}</div>
                <div class="photo-meta">
                    <span class="photo-date">${photo.dateFormatted}</span>
                </div>
            </div>
        `;

        return photoItem;
    }

    // ===== APLICAR MARCA D'ÁGUA =====
    applyWatermarkIfNeeded() {
        const isAuthenticated = window.authSimples?.isUserAuthenticated() || false;
        
        if (!isAuthenticated) {
            // Criar CSS para marca d'água
            this.createWatermarkCSS();
            
            // Aplicar a todas as imagens
            const images = document.querySelectorAll('.photo-item img');
            images.forEach(img => {
                img.style.filter = 'brightness(0.9)';
                img.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.showProtectionMessage();
                });
            });
        }
    }

    createWatermarkCSS() {
        const style = document.createElement('style');
        style.id = 'watermark-style';
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
                font-weight: 700;
                color: rgba(212, 175, 55, 0.3);
                white-space: nowrap;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            }
        `;
        
        if (!document.head.querySelector('#watermark-style')) {
            document.head.appendChild(style);
        }
    }

    showProtectionMessage() {
        this.showNotification('Imagem protegida! Faça login para baixar sem marca d\'água.', 'warning');
    }

    // ===== BUSCA E FILTROS =====
    filterPhotos() {
        if (!this.searchQuery) {
            return this.currentPhotos;
        }

        const query = this.searchQuery.toLowerCase();
        return this.currentPhotos.filter(photo => 
            photo.name.toLowerCase().includes(query)
        );
    }

    handleSearch(query) {
        this.searchQuery = query.trim();
        this.renderGallery();
    }

    changeView(view) {
        this.currentView = view;
        
        // Atualizar botões
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

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
            filteredPhotos.forEach(photo => this.selectedPhotos.delete(photo.id));
        } else {
            filteredPhotos.forEach(photo => this.selectedPhotos.add(photo.id));
        }

        this.updateSelectionUI();
        this.renderGallery();
    }

    updateSelectionUI() {
        const count = this.selectedPhotos.size;
        
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = count;
        }

        const downloadBtn = document.getElementById('downloadSelectedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = count === 0;
        }
    }

    // ===== MODAL =====
    openModal(photoIndex) {
        const filteredPhotos = this.filterPhotos();
        this.currentPhotoIndex = photoIndex;
        const photo = filteredPhotos[photoIndex];

        if (!photo) return;

        document.getElementById('modalPhotoName').textContent = photo.name;
        document.getElementById('modalImage').src = photo.previewUrl;
        document.getElementById('photoDate').textContent = photo.dateFormatted;
        
        document.getElementById('photoCounter').textContent = 
            `${photoIndex + 1} de ${filteredPhotos.length}`;

        document.getElementById('prevPhotoBtn').disabled = photoIndex === 0;
        document.getElementById('nextPhotoBtn').disabled = photoIndex === filteredPhotos.length - 1;

        const photoModal = document.getElementById('photoModal');
        photoModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const photoModal = document.getElementById('photoModal');
        photoModal.classList.remove('active');
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

    // ===== DOWNLOADS COM RASTREAMENTO =====
    downloadPhoto(photoId) {
        const photo = this.currentPhotos.find(p => p.id === photoId);
        if (!photo) return;

        const isAuthenticated = window.authSimples?.isUserAuthenticated() || false;
        
        if (isAuthenticated) {
            // Download direto para usuários autenticados
            this.downloadDirect(photo.url, photo.name);
            this.showNotification(`${photo.name} baixado!`, 'success');
            
            // Registrar download
            this.registrarDownload(photo);
        } else {
            // Visitante - mostrar mensagem
            this.showNotification('Faça login com seu token para baixar as fotos!', 'warning');
        }
    }

    // ===== REGISTRAR DOWNLOAD =====
    registrarDownload(photo) {
        try {
            const clientData = window.authSimples?.getClientData();
            if (!clientData) return;

            const downloadData = {
                token: clientData.token,
                cliente: clientData.cliente,
                foto: photo.name,
                timestamp: new Date().toISOString()
            };

            console.log('Download registrado:', downloadData);
            
            // Salvar localmente para demonstração
            const downloads = JSON.parse(localStorage.getItem('downloads_fotos') || '[]');
            downloads.push(downloadData);
            localStorage.setItem('downloads_fotos', JSON.stringify(downloads));

            // Atualizar estatísticas
            this.updateDownloadStats();

        } catch (error) {
            console.warn('Erro ao registrar download:', error);
        }
    }

    downloadCurrentPhoto() {
        const filteredPhotos = this.filterPhotos();
        const photo = filteredPhotos[this.currentPhotoIndex];
        if (photo) {
            this.downloadPhoto(photo.id);
        }
    }

    async downloadSelected() {
        if (this.selectedPhotos.size === 0) return;

        const isAuthenticated = window.authSimples?.isUserAuthenticated() || false;
        
        if (!isAuthenticated) {
            this.showNotification('Faça login com seu token para baixar as fotos!', 'warning');
            return;
        }

        const selectedList = this.currentPhotos.filter(photo => 
            this.selectedPhotos.has(photo.id)
        );

        for (const photo of selectedList) {
            this.downloadDirect(photo.url, photo.name);
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay entre downloads
        }

        this.showNotification(`${selectedList.length} fotos baixadas!`, 'success');
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

    // ===== NAVEGAÇÃO POR TECLADO =====
    handleKeyboard(event) {
        const photoModal = document.getElementById('photoModal');
        if (!photoModal.classList.contains('active')) return;

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
        }
    }

    // ===== ESTADOS DA UI =====
    showLoading(show) {
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
        
        const galleryGrid = document.getElementById('galleryGrid');
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    // ===== SISTEMA DE NOTIFICAÇÕES =====
    setupNotificationSystem() {
        // Já está no DOM
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }

    // ===== ESTATÍSTICAS COM DOWNLOADS =====
    updateStats() {
        const totalPhotos = document.getElementById('totalPhotos');
        if (totalPhotos) {
            totalPhotos.textContent = this.currentPhotos.length;
        }

        this.updateDownloadStats();
    }

    updateDownloadStats() {
        const downloadedPhotos = document.getElementById('downloadedPhotos');
        if (downloadedPhotos) {
            try {
                const clientData = window.authSimples?.getClientData();
                if (clientData) {
                    const downloads = JSON.parse(localStorage.getItem('downloads_fotos') || '[]');
                    const clientDownloads = downloads.filter(d => d.token === clientData.token);
                    downloadedPhotos.textContent = clientDownloads.length;
                }
            } catch (error) {
                downloadedPhotos.textContent = '0';
            }
        }
    }
}

// ===== INICIALIZAÇÃO =====
let galeriaSimples;

document.addEventListener('DOMContentLoaded', () => {
    galeriaSimples = new GaleriaSimples();
    window.galeriaSimples = galeriaSimples;
    
    console.log('🖼️ Galeria simples inicializada');
});
