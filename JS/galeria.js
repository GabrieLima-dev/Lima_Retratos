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
        this.currentViewMode = 'albums'; // grid, list, albums (padrão em modo álbum)
        this.selectedAlbum = null;
        this.currentModalPhotos = [];
        this.photoIndexMap = new Map();
        this.currentModalLoadToken = 0;
        
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
            const pastasPermitidas = Array.isArray(clientData.pastasPermitidas) && clientData.pastasPermitidas.length
                ? clientData.pastasPermitidas
                : clientData.pasta ? [clientData.pasta] : [];

            if (!pastasPermitidas.length) {
                throw new Error('Nenhum álbum associado a este token.');
            }

            let fotosCliente = [];

            for (const pasta of pastasPermitidas) {
                try {
                    const response = await fetch(`fotos/${pasta}.json`);
                    if (!response.ok) {
                        console.warn(`Arquivo fotos/${pasta}.json não encontrado.`, response.status);
                        continue;
                    }

                    const fotosData = await response.json();
                    const fotosFormatadas = fotosData.map((foto, index) => {
                        const previewUrl = foto.preview || foto.thumbnail || foto.url || '';
                        const thumbnailUrl = foto.thumbnail || foto.preview || foto.url || '';

                        return {
                        id: `${pasta}_${index}`,
                        name: foto.nome || `foto_${index + 1}.jpg`,
                        url: foto.url,
                        thumbnailUrl,
                        previewUrl,
                        album: foto.album || this.DEFAULT_ALBUM_NAME,
                        description: foto.descricao || '',
                        dateFormatted: foto.data || new Date().toLocaleDateString('pt-BR'),
                        pasta
                    };
                    });

                    fotosCliente = fotosCliente.concat(fotosFormatadas);
                } catch (error) {
                    console.warn(`Erro ao carregar fotos do álbum ${pasta}:`, error);
                }
            }

            // Se não encontrou arquivos JSON, tenta fallback usando fotos.txt
            if (fotosCliente.length === 0) {
                try {
                    const response = await fetch('fotos.txt');
                    const fotosData = await response.text();
                    const lines = fotosData.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        const parts = line.split('|');
                        if (parts.length >= 3) {
                            const [pasta, nomeArquivo, urlFoto] = parts;
                            if (pastasPermitidas.includes(pasta.trim())) {
                                const previewUrl = urlFoto.trim();
                                fotosCliente.push({
                                    id: `${pasta}_${nomeArquivo}`,
                                    name: nomeArquivo.trim(),
                                    url: urlFoto.trim(),
                                    thumbnailUrl: urlFoto.trim(),
                                    previewUrl,
                                    album: this.DEFAULT_ALBUM_NAME,
                                    description: '',
                                    dateFormatted: new Date().toLocaleDateString('pt-BR'),
                                    pasta: pasta.trim()
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Falha ao usar fallback fotos.txt:', error);
                }
            }
            
            this.currentPhotos = fotosCliente;
            this.selectedAlbum = null;
            this.currentViewMode = 'albums';
            this.currentView = 'grid';
            this.selectedPhotos.clear();
            this.setModalPhotos([]);
            this.buildAlbumIndexes();
            this.updateViewButtons();
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
                <span class="album-count-badge" aria-label="${totalText}">${summary.count}</span>
                <div class="album-overlay">
                    <div class="album-meta">
                        <h4>${albumName}</h4>
                    </div>
                </div>
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

    extractDriveId(url = '') {
        if (!url) return null;
        const idParamMatch = url.match(/[?&]id=([^&]+)/);
        if (idParamMatch) {
            return idParamMatch[1];
        }

        const ucMatch = url.match(/\/d\/([^/]+)/);
        if (ucMatch) {
            return ucMatch[1];
        }

        return null;
    }

    getDriveHighResSources(photo = {}) {
        const sources = [];
        const driveId = this.extractDriveId(photo.url) 
            || this.extractDriveId(photo.previewUrl) 
            || this.extractDriveId(photo.thumbnailUrl);
        
        if (driveId) {
            sources.push(`https://lh3.googleusercontent.com/d/${driveId}=w3600`);
            sources.push(`https://drive.google.com/uc?export=download&id=${driveId}`);
            sources.push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`);
        }

        if (photo.url) sources.push(photo.url);
        return [...new Set(sources.filter(Boolean))];
    }

    loadModalImage(imageElement, photo) {
        const previewSource = photo.previewUrl || photo.thumbnailUrl || photo.url || '';
        if (previewSource) {
            imageElement.src = previewSource;
        } else {
            imageElement.removeAttribute('src');
        }

        imageElement.alt = photo.name || 'Foto selecionada';

        const highResSources = this.getDriveHighResSources(photo).filter(src => src !== previewSource);
        const loadToken = ++this.currentModalLoadToken;

        if (!highResSources.length) {
            this.setModalLoading(false);
            return;
        }

        this.setModalLoading(true);

        const highResImage = new Image();
        let sourceIndex = 0;

        const tryLoad = () => {
            if (sourceIndex >= highResSources.length || loadToken !== this.currentModalLoadToken) {
                this.setModalLoading(false);
                return;
            }

            highResImage.src = highResSources[sourceIndex];
        };

        highResImage.onload = () => {
            if (loadToken !== this.currentModalLoadToken) return;
            this.setModalLoading(false);
            imageElement.src = highResImage.src;
        };

        highResImage.onerror = () => {
            if (loadToken !== this.currentModalLoadToken) return;
            sourceIndex += 1;
            tryLoad();
        };

        tryLoad();
    }

    setModalLoading(isLoading) {
        const loadingBar = document.getElementById('modalLoadingBar');
        if (!loadingBar) return;
        const progress = loadingBar.querySelector('.modal-loading-progress');
        if (isLoading) {
            loadingBar.classList.add('active');
            if (progress) {
                progress.style.width = '0%';
                requestAnimationFrame(() => {
                    progress.style.width = '100%';
                });
            }
        } else {
            loadingBar.classList.remove('active');
            if (progress) {
                progress.style.width = '0%';
            }
        }
    }

    getDownloadSource(photo = {}) {
        const sources = this.getDriveHighResSources(photo);
        if (photo.previewUrl) sources.push(photo.previewUrl);
        if (photo.thumbnailUrl) sources.push(photo.thumbnailUrl);
        return sources.find(Boolean) || '';
    }

    // ===== CRIAR ELEMENTO DE FOTO =====
    createPhotoElement(photo, index) {
        const photoItem = document.createElement('div');
        photoItem.className = `photo-item ${this.currentView}-view`;
        photoItem.dataset.photoId = photo.id;
        const modalIndex = typeof index === 'number' ? index : this.photoIndexMap.get(photo.id) || 0;
        
        const isSelected = this.selectedPhotos.has(photo.id);
        const photoName = this.escapeHtml(photo.name || 'Foto');
        const photoDate = this.escapeHtml(photo.dateFormatted || '');
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
                     alt="${photoName}"
                     onclick="galeriaSimples.openModal(${modalIndex})"
                     loading="lazy">
                
                <div class="photo-overlay">
                    <div class="photo-overlay-content">
                        <span class="photo-overlay-title">${photoName}</span>
                    </div>
                </div>
                
                <!-- Marca d'água para visitantes -->
                <div class="watermark-overlay"></div>
            </div>
            
            <div class="photo-info">
                <div class="photo-name">${photoName}</div>
                <div class="photo-meta">
                    <span class="photo-date">${photoDate}</span>
                </div>
            </div>
        `;

        photoItem.addEventListener('click', (event) => {
            if (event.target.closest('.photo-checkbox') || event.target.closest('button')) {
                return;
            }

            if (this.currentView === 'list') {
                event.preventDefault();
                this.openModal(modalIndex);
            }
        });

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
        const modalImage = document.getElementById('modalImage');
        this.loadModalImage(modalImage, photo);
        const modalPhotoDate = document.getElementById('modalPhotoDate');
        if (modalPhotoDate) {
            modalPhotoDate.textContent = photo.dateFormatted || '-';
        }
        
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
        this.setModalLoading(false);
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
    async downloadPhoto(photoId) {
        const photo = this.currentPhotos.find(p => p.id === photoId);
        if (!photo) return;

        const isAuthenticated = window.authSimples?.isUserAuthenticated() || false;
        
        if (isAuthenticated) {
            // Download direto para usuários autenticados
            const downloadUrl = this.getDownloadSource(photo);
            if (downloadUrl) {
                this.showNotification('Preparando download da foto. Aguarde...', 'info');
                try {
                    await this.downloadPhotoFromUrl(downloadUrl, photo);
                    this.showNotification(`${photo.name} baixado!`, 'success');
                } catch (error) {
                    console.error('Erro ao baixar foto individual:', error);
                    this.showNotification('Não foi possível baixar esta foto. Tente novamente.', 'error');
                }
            } else {
                this.showNotification('Não foi possível encontrar a versão em alta desta foto.', 'error');
            }
            
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

    async downloadCurrentPhoto() {
        const photo = this.currentModalPhotos[this.currentPhotoIndex];
        if (photo) {
            await this.downloadPhoto(photo.id);
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

        if (selectedList.length === 1) {
            await this.downloadPhoto(selectedList[0].id);
            return;
        }

        if (typeof JSZip === 'undefined') {
            this.showNotification('Não foi possível preparar o arquivo ZIP. Atualize a página e tente novamente.', 'error');
            return;
        }

        try {
            this.showNotification(`Preparando arquivo ZIP com ${selectedList.length} fotos. Aguarde...`, 'info');
            await this.downloadPhotosAsZip(selectedList);
            this.showNotification(`ZIP com ${selectedList.length} fotos pronto para download!`, 'success');
        } catch (error) {
            console.error('Erro ao gerar ZIP:', error);
            this.showNotification('Não foi possível gerar o arquivo ZIP. Tente novamente.', 'error');
        }
    }

    async downloadPhotosAsZip(photos = []) {
        const zip = new JSZip();
        const folder = zip.folder('fotos');
        const usedNames = {};
        let added = 0;

        for (const photo of photos) {
            const downloadUrl = this.getDownloadSource(photo);
            if (!downloadUrl) continue;

            try {
                const blob = await this.fetchPhotoBlob(downloadUrl);
                const filename = this.getUniqueFilename(photo.name || `foto_${added + 1}.jpg`, usedNames);
                folder.file(filename, blob);
                added += 1;
                this.registrarDownload(photo);
            } catch (error) {
                console.warn(`Erro ao incluir ${photo.name} no ZIP:`, error);
            }
        }

        if (added === 0) {
            throw new Error('Nenhuma foto válida para o ZIP');
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipName = `gabriel-lima-fotos-${Date.now()}.zip`;
        this.triggerBlobDownload(zipBlob, zipName);
    }

    async fetchPhotoBlob(url) {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Falha ao baixar recurso: ${response.status}`);
        }
        return await response.blob();
    }

    triggerBlobDownload(blob, filename) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    }

    async downloadPhotoFromUrl(url, photo) {
        const blob = await this.fetchPhotoBlob(url);
        const filename = this.getUniqueFilename(photo.name || 'foto.jpg');
        this.triggerBlobDownload(blob, filename);
        this.registrarDownload(photo);
    }

    sanitizeFilename(name = '') {
        const sanitized = name
            .replace(/[<>:"/\\|?*]+/g, '_')
            .replace(/\s+/g, '_')
            .trim();
        return sanitized || 'foto';
    }

    getUniqueFilename(name, usedNames = {}) {
        const sanitized = this.sanitizeFilename(name);
        const extIndex = sanitized.lastIndexOf('.');
        const base = extIndex > 0 ? sanitized.slice(0, extIndex) : sanitized;
        const ext = extIndex > 0 ? sanitized.slice(extIndex) : '';
        const key = sanitized.toLowerCase();
        const count = (usedNames[key] || 0) + 1;
        usedNames[key] = count;
        if (count === 1) {
            return sanitized;
        }
        const safeBase = base || 'foto';
        return `${safeBase}_${count}${ext}`;
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
