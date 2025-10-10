// ===== SISTEMA DE GALERIA SIMPLES =====

class GaleriaSimples {
    constructor() {
        this.currentPhotos = [];
        this.selectedPhotos = new Set();
        this.currentView = 'grid';
        this.searchQuery = '';
        this.currentPhotoIndex = 0;
        this.DEFAULT_ALBUM_NAME = 'Sem álbum';
        this.albumSummaries = [];
        this.albumToPhotos = new Map();
        this.currentViewMode = 'grid'; // grid, list, albums
        this.selectedAlbum = null;
        this.currentModalPhotos = [];
        this.photoIndexMap = new Map();
        
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
            btn.addEventListener('click', () => {
                this.changeView(btn.dataset.view);
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

        // Album filters (delegated)
        const albumFiltersContainer = document.getElementById('albumFilters');
        albumFiltersContainer?.addEventListener('click', (event) => {
            const button = event.target.closest('.album-filter-btn');
            if (!button) return;

            const action = button.dataset.action;
            if (action === 'back-to-albums') {
                this.backToAlbumOverview();
            }
        });

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
                        album: foto.album || this.DEFAULT_ALBUM_NAME,
                        description: foto.descricao || '',
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
                                album: this.DEFAULT_ALBUM_NAME,
                                description: '',
                                dateFormatted: new Date().toLocaleDateString('pt-BR'),
                                pasta: pasta.trim()
                            });
                        }
                    }
                }
            }
            
            this.currentPhotos = fotosCliente;
            this.selectedAlbum = null;
            this.currentViewMode = 'grid';
            this.currentView = 'grid';
            this.selectedPhotos.clear();
            this.setModalPhotos([]);
            this.buildAlbumIndexes();
            this.renderAlbumFilters();
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
        const galleryContainer = document.getElementById('galleryGrid');
        if (!galleryContainer) return;

        if (!this.currentPhotos.length) {
            this.showEmptyState();
            this.setModalPhotos([]);
            return;
        }

        if (this.currentViewMode === 'albums') {
            this.renderAlbumCards(galleryContainer);
        } else {
            this.renderPhotoView(galleryContainer);
        }
    }

    renderAlbumCards(container) {
        const albumSummaries = this.getFilteredAlbumSummaries();

        if (albumSummaries.length === 0) {
            this.showEmptyState();
            this.setModalPhotos([]);
            return;
        }

        this.hideEmptyState();
        container.className = 'album-grid-view';
        container.innerHTML = '';

        this.setModalPhotos([]);
        this.selectedPhotos.clear();
        this.updateSelectionUI();

        albumSummaries.forEach((summary) => {
            const card = this.createAlbumCard(summary);
            container.appendChild(card);
        });
    }

    createAlbumCard(summary) {
        const card = document.createElement('div');
        card.className = 'album-card grid-view';

        const coverPhoto = summary.coverPhoto || summary.photos[0] || {};
        const coverUrl = coverPhoto.thumbnailUrl || coverPhoto.url || '';
        const albumName = this.escapeHtml(summary.name);
        const totalText = `${summary.count} ${summary.count === 1 ? 'foto' : 'fotos'}`;

        card.innerHTML = `
            <div class="album-cover">
                <img src="${coverUrl}" alt="${albumName}">
            </div>
            <div class="album-meta">
                <h4>${albumName}</h4>
                <p>${totalText}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            this.openAlbum(summary.name);
        });

        return card;
    }

    openAlbum(albumName) {
        this.selectedAlbum = albumName;
        this.currentViewMode = 'grid';
        this.currentView = 'grid';
        this.selectedPhotos.clear();
        this.updateViewButtons();
        this.renderAlbumFilters();
        this.renderGallery();
    }

    renderPhotoView(container) {
        const isListView = this.currentViewMode === 'list';
        this.currentView = isListView ? 'list' : 'grid';

        if (this.selectedAlbum) {
            this.renderSingleAlbumView(container, this.selectedAlbum);
            return;
        }

        this.renderGroupedAlbums(container);
    }

    renderSingleAlbumView(container, albumName) {
        const albumPhotos = this.albumToPhotos.get(albumName) || [];
        const photos = this.filterPhotosBySearch(albumPhotos);
        const safeName = this.escapeHtml(albumName);

        if (photos.length === 0) {
            this.showEmptyState();
            this.setModalPhotos([]);
            return;
        }

        this.hideEmptyState();

        container.className = 'album-detail-view';
        container.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'album-detail-header';
        header.innerHTML = `
            <div class="album-detail-info">
                <h3>${safeName}</h3>
                <span class="album-count">${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}</span>
            </div>
        `;
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = `gallery-grid ${this.currentView}-view`;

        photos.forEach((photo, index) => {
            const photoElement = this.createPhotoElement(photo, index);
            grid.appendChild(photoElement);
        });

        container.appendChild(grid);
        this.setModalPhotos(photos);
    }

    renderGroupedAlbums(container) {
        const query = this.searchQuery.trim().toLowerCase();
        const groups = [];

        this.albumSummaries.forEach((summary) => {
            const albumName = summary.name;
            const albumNameLower = albumName.toLowerCase();
            const albumMatches = query ? albumNameLower.includes(query) : true;
            const filteredPhotos = this.filterPhotosBySearch(summary.photos);

            if (!query) {
                groups.push({ album: albumName, photos: summary.photos });
            } else if (filteredPhotos.length > 0 || albumMatches) {
                const photosToUse = filteredPhotos.length > 0 ? filteredPhotos : summary.photos;
                groups.push({ album: albumName, photos: photosToUse });
            }
        });

        if (groups.length === 0) {
            this.showEmptyState();
            this.setModalPhotos([]);
            return;
        }

        this.hideEmptyState();
        container.className = 'album-group-wrapper';
        container.innerHTML = '';

        const modalPhotos = [];

        groups.forEach((group) => {
            const section = document.createElement('div');
            section.className = 'album-group';
            section.innerHTML = `
                <div class="album-group-header">
                    <h3>${this.escapeHtml(group.album)}</h3>
                    <span class="album-count">${group.photos.length} ${group.photos.length === 1 ? 'foto' : 'fotos'}</span>
                </div>
            `;

            const grid = document.createElement('div');
            grid.className = `gallery-grid ${this.currentView}-view`;

            group.photos.forEach((photo) => {
                const modalIndex = modalPhotos.length;
                modalPhotos.push(photo);
                const photoElement = this.createPhotoElement(photo, modalIndex);
                grid.appendChild(photoElement);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });

        this.setModalPhotos(modalPhotos);
    }

    setModalPhotos(photos) {
        this.currentModalPhotos = Array.isArray(photos) ? [...photos] : [];
        this.photoIndexMap = new Map(this.currentModalPhotos.map((photo, index) => [photo.id, index]));

        // Remover seleções que não estão presentes na visualização atual
        this.selectedPhotos.forEach((photoId) => {
            if (!this.photoIndexMap.has(photoId)) {
                this.selectedPhotos.delete(photoId);
            }
        });

        this.updateSelectionUI();
        this.updateSelectionControlsAvailability();
        this.syncSelectedPhotoItems();
        this.applyWatermarkIfNeeded();
    }

    getFilteredAlbumSummaries() {
        if (!this.searchQuery) {
            return [...this.albumSummaries];
        }

        const query = this.searchQuery.toLowerCase();
        return this.albumSummaries.filter((summary) => this.matchesAlbumSearch(summary, query));
    }

    matchesAlbumSearch(summary, query) {
        if (!query) return true;
        if (summary.name.toLowerCase().includes(query)) return true;
        return summary.photos.some((photo) => photo.name.toLowerCase().includes(query));
    }

    filterPhotosBySearch(photos) {
        if (!this.searchQuery) {
            return [...photos];
        }

        const query = this.searchQuery.toLowerCase();
        return photos.filter((photo) => {
            const albumName = this.getAlbumName(photo).toLowerCase();
            return photo.name.toLowerCase().includes(query) || albumName.includes(query);
        });
    }

    buildAlbumIndexes() {
        this.albumToPhotos = new Map();
        const albumMap = new Map();

        this.currentPhotos.forEach((photo, index) => {
            photo.originalIndex = index;
            const albumName = this.getAlbumName(photo);

            if (!this.albumToPhotos.has(albumName)) {
                this.albumToPhotos.set(albumName, []);
            }
            this.albumToPhotos.get(albumName).push(photo);

            if (!albumMap.has(albumName)) {
                albumMap.set(albumName, {
                    name: albumName,
                    count: 0,
                    coverPhoto: photo,
                    photos: []
                });
            }

            const summary = albumMap.get(albumName);
            summary.count += 1;
            summary.photos.push(photo);

            if (!summary.coverPhoto || this.isPhotoEarlier(photo, summary.coverPhoto)) {
                summary.coverPhoto = photo;
            }
        });

        this.albumSummaries = Array.from(albumMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
        );
    }

    isPhotoEarlier(photoA, photoB) {
        if (photoA?.originalIndex != null && photoB?.originalIndex != null) {
            return photoA.originalIndex < photoB.originalIndex;
        }
        return false;
    }

    getAlbumName(photo) {
        if (!photo || !photo.album) {
            return this.DEFAULT_ALBUM_NAME;
        }
        const trimmed = String(photo.album).trim();
        return trimmed.length > 0 ? trimmed : this.DEFAULT_ALBUM_NAME;
    }

    renderAlbumFilters() {
        const albumFilters = document.getElementById('albumFilters');
        if (!albumFilters) return;

        if (this.selectedAlbum && this.currentViewMode !== 'albums') {
            albumFilters.innerHTML = `
                <button class="album-filter-btn" data-action="back-to-albums">
                    <i class="fas fa-arrow-left"></i>
                    Voltar aos álbuns
                </button>
            `;
            albumFilters.style.display = 'flex';
        } else {
            albumFilters.innerHTML = '';
            albumFilters.style.display = 'none';
        }
    }

    backToAlbumOverview() {
        this.changeView('albums');
    }

    escapeHtml(text = '') {
        const stringValue = String(text);
        return stringValue
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ===== CRIAR ELEMENTO DE FOTO =====
    createPhotoElement(photo, index) {
        const photoItem = document.createElement('div');
        photoItem.className = `photo-item ${this.currentView}-view`;
        photoItem.dataset.photoId = photo.id;
        const modalIndex = typeof index === 'number' ? index : this.photoIndexMap.get(photo.id) || 0;
        
        const isSelected = this.selectedPhotos.has(photo.id);
        if (isSelected) {
            photoItem.classList.add('selected');
        }

        photoItem.innerHTML = `
            <div class="photo-checkbox">
                <label class="checkbox-container">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           data-photo-id="${photo.id}"
                           onchange="galeriaSimples.toggleSelection('${photo.id}')">
                    <span class="checkmark"></span>
                </label>
            </div>
            
            <div class="photo-container">
                <img src="${photo.thumbnailUrl}" 
                     alt="${photo.name}"
                     onclick="galeriaSimples.openModal(${modalIndex})"
                     loading="lazy">
                
                <div class="photo-overlay">
                    <div class="overlay-actions">
                        <button class="overlay-btn" onclick="galeriaSimples.openModal(${modalIndex})" 
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
        return [...this.currentModalPhotos];
    }

    handleSearch(query) {
        this.searchQuery = query.trim();
        this.renderGallery();
    }

    changeView(view) {
        if (!view) return;

        if (view === 'albums') {
            this.currentViewMode = 'albums';
            this.currentView = 'grid';
            this.selectedAlbum = null;
            this.selectedPhotos.clear();
            this.setModalPhotos([]);
        } else {
            const nextView = view === 'list' ? 'list' : 'grid';
            this.currentViewMode = nextView;
            this.currentView = nextView;
            this.selectedPhotos.clear();
            this.setModalPhotos([]);
        }

        this.updateViewButtons();
        this.renderAlbumFilters();
        this.renderGallery();
    }

    updateViewButtons() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            const btnView = btn.dataset.view;
            const isActive = this.currentViewMode === 'albums'
                ? btnView === 'albums'
                : btnView === this.currentViewMode;
            btn.classList.toggle('active', isActive);
        });
    }

    canSelectPhotos() {
        return this.currentViewMode !== 'albums' && this.currentModalPhotos.length > 0;
    }

    // ===== SELEÇÃO =====
    toggleSelection(photoId) {
        if (!this.canSelectPhotos()) {
            return;
        }

        if (this.selectedPhotos.has(photoId)) {
            this.selectedPhotos.delete(photoId);
        } else {
            this.selectedPhotos.add(photoId);
        }

        this.updateSelectionUI();
        this.syncSelectedPhotoItems();
    }

    toggleSelectAll() {
        if (!this.canSelectPhotos()) {
            this.showNotification('Use as visualizações Grade ou Lista para selecionar imagens.', 'info');
            return;
        }

        const currentPhotos = this.currentModalPhotos;
        const allSelected = currentPhotos.length > 0 && currentPhotos.every(photo => this.selectedPhotos.has(photo.id));

        if (allSelected) {
            currentPhotos.forEach(photo => this.selectedPhotos.delete(photo.id));
        } else {
            currentPhotos.forEach(photo => this.selectedPhotos.add(photo.id));
        }

        this.updateSelectionUI();
        this.syncSelectedPhotoItems();
    }

    updateSelectionUI() {
        const count = this.selectedPhotos.size;
        
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = count;
        }

        this.updateSelectionControlsAvailability();
    }

    updateSelectionControlsAvailability() {
        const hasPhotoSelection = this.canSelectPhotos();

        const selectAllBtn = document.getElementById('selectAllBtn');
        if (selectAllBtn) {
            selectAllBtn.disabled = !hasPhotoSelection;
        }

        const downloadBtn = document.getElementById('downloadSelectedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = !hasPhotoSelection || this.selectedPhotos.size === 0;
        }
    }

    syncSelectedPhotoItems() {
        document.querySelectorAll('.photo-item').forEach((item) => {
            const checkbox = item.querySelector('input[data-photo-id]');
            if (!checkbox) return;
            const photoId = checkbox.dataset.photoId;
            const isSelected = this.selectedPhotos.has(photoId);
            checkbox.checked = isSelected;
            item.classList.toggle('selected', isSelected);
        });
    }

    // ===== MODAL =====
    openModal(photoIndex) {
        const photos = this.currentModalPhotos;
        if (!photos.length) return;

        this.currentPhotoIndex = photoIndex;
        const photo = photos[photoIndex];

        if (!photo) return;

        document.getElementById('modalPhotoName').textContent = photo.name;
        document.getElementById('modalImage').src = photo.previewUrl;
        document.getElementById('photoDate').textContent = photo.dateFormatted;
        
        document.getElementById('photoCounter').textContent = 
            `${photoIndex + 1} de ${photos.length}`;

        document.getElementById('prevPhotoBtn').disabled = photoIndex === 0;
        document.getElementById('nextPhotoBtn').disabled = photoIndex === photos.length - 1;

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
        if (this.currentPhotoIndex < this.currentModalPhotos.length - 1) {
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
        const photo = this.currentModalPhotos[this.currentPhotoIndex];
        if (photo) {
            this.downloadPhoto(photo.id);
        }
    }

    async downloadSelected() {
        if (!this.canSelectPhotos() || this.selectedPhotos.size === 0) return;

        const isAuthenticated = window.authSimples?.isUserAuthenticated() || false;
        
        if (!isAuthenticated) {
            this.showNotification('Faça login com seu token para baixar as fotos!', 'warning');
            return;
        }

        const selectedList = this.currentModalPhotos.filter(photo => 
            this.selectedPhotos.has(photo.id)
        );

        if (selectedList.length === 0) {
            this.showNotification('Selecione as fotos dentro do álbum atual.', 'info');
            return;
        }

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
            galleryGrid.className = `gallery-grid ${this.currentView}-view`;
        }
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
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
