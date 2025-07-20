// ===== BOX API INTEGRATION =====

class BoxAPI {
    constructor() {
        this.baseUrl = 'https://api.box.com/2.0';
        this.uploadUrl = 'https://upload.box.com/api/2.0';
        this.accessToken = null;
        this.refreshToken = null;
        this.clientId = 'YOUR_BOX_CLIENT_ID'; // Configurar no painel do BOX
        this.clientSecret = 'YOUR_BOX_CLIENT_SECRET';
        this.redirectUri = window.location.origin + '/auth/callback';
        
        // Cache de pastas para otimização
        this.foldersCache = new Map();
        this.photosCache = new Map();
        this.cacheExpiry = 300000; // 5 minutos
        
        this.init();
    }

    init() {
        this.loadStoredTokens();
        this.setupCORSProxy();
    }

    // ===== AUTENTICAÇÃO =====
    loadStoredTokens() {
        this.accessToken = localStorage.getItem('box_access_token');
        this.refreshToken = localStorage.getItem('box_refresh_token');
        
        if (this.accessToken) {
            this.validateToken();
        }
    }

    async validateToken() {
        try {
            const response = await this.makeRequest('/users/me', 'GET');
            if (response.ok) {
                console.log('Token BOX válido');
                return true;
            } else {
                throw new Error('Token inválido');
            }
        } catch (error) {
            console.warn('Token expirado, tentando renovar...');
            return await this.refreshAccessToken();
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('Refresh token não disponível');
        }

        try {
            const response = await fetch('https://api.box.com/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.access_token;
                this.refreshToken = data.refresh_token;
                
                localStorage.setItem('box_access_token', this.accessToken);
                localStorage.setItem('box_refresh_token', this.refreshToken);
                
                return true;
            } else {
                throw new Error('Falha ao renovar token');
            }
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            this.clearTokens();
            return false;
        }
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('box_access_token');
        localStorage.removeItem('box_refresh_token');
    }

    // ===== CORS PROXY SETUP =====
    setupCORSProxy() {
        // Para desenvolvimento local, usar um proxy CORS
        // Em produção, usar suas próprias funções serverless
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/';
        // Alternativa: https://api.allorigins.win/get?url=
    }

    // ===== REQUISIÇÕES =====
    async makeRequest(endpoint, method = 'GET', body = null) {
        const url = this.baseUrl + endpoint;
        
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            // Em ambiente real, usar proxy próprio ou função serverless
            const response = await fetch(this.corsProxy + url, options);
            return response;
        } catch (error) {
            console.error('Erro na requisição BOX:', error);
            throw error;
        }
    }

    // ===== BUSCAR PASTAS =====
    async searchFolders(query) {
        const cacheKey = `search_${query}`;
        
        // Verificar cache
        if (this.foldersCache.has(cacheKey)) {
            const cached = this.foldersCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest(
                `/search?query=${encodeURIComponent(query)}&type=folder&limit=50`
            );
            
            if (response.ok) {
                const data = await response.json();
                const folders = data.entries || [];
                
                // Armazenar no cache
                this.foldersCache.set(cacheKey, {
                    data: folders,
                    timestamp: Date.now()
                });
                
                return folders;
            } else {
                throw new Error(`Erro na busca: ${response.status}`);
            }
        } catch (error) {
            console.error('Erro ao buscar pastas:', error);
            return [];
        }
    }

    // ===== BUSCAR PASTA ESPECÍFICA =====
    async findClientFolder(clientData) {
        const { categoria, pasta } = clientData;
        
        try {
            // Buscar por nome exato da pasta
            let folders = await this.searchFolders(pasta);
            
            if (folders.length === 0) {
                // Buscar por categoria se não encontrar por nome
                folders = await this.searchFolders(categoria);
            }
            
            // Filtrar resultados para encontrar a pasta mais relevante
            const targetFolder = folders.find(folder => 
                folder.name.toLowerCase().includes(pasta.toLowerCase()) ||
                folder.name.toLowerCase().includes(categoria.toLowerCase())
            );
            
            return targetFolder || null;
        } catch (error) {
            console.error('Erro ao encontrar pasta do cliente:', error);
            return null;
        }
    }

    // ===== LISTAR FOTOS DA PASTA =====
    async getFolderPhotos(folderId) {
        const cacheKey = `photos_${folderId}`;
        
        // Verificar cache
        if (this.photosCache.has(cacheKey)) {
            const cached = this.photosCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest(
                `/folders/${folderId}/items?fields=id,name,size,modified_at,shared_link,download_url&limit=200`
            );
            
            if (response.ok) {
                const data = await response.json();
                const allItems = data.entries || [];
                
                // Filtrar apenas imagens
                const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
                const photos = allItems.filter(item => {
                    if (item.type !== 'file') return false;
                    
                    const extension = item.name.split('.').pop().toLowerCase();
                    return imageTypes.includes(extension);
                });
                
                // Processar dados das fotos
                const processedPhotos = await Promise.all(
                    photos.map(photo => this.processPhotoData(photo))
                );
                
                // Armazenar no cache
                this.photosCache.set(cacheKey, {
                    data: processedPhotos,
                    timestamp: Date.now()
                });
                
                return processedPhotos;
            } else {
                throw new Error(`Erro ao listar fotos: ${response.status}`);
            }
        } catch (error) {
            console.error('Erro ao buscar fotos:', error);
            return [];
        }
    }

    // ===== PROCESSAR DADOS DA FOTO =====
    async processPhotoData(photo) {
        return {
            id: photo.id,
            name: photo.name,
            size: photo.size,
            sizeFormatted: this.formatFileSize(photo.size),
            modifiedAt: photo.modified_at,
            dateFormatted: this.formatDate(photo.modified_at),
            downloadUrl: null, // Será gerado quando necessário
            thumbnailUrl: await this.getThumbnailUrl(photo.id),
            previewUrl: await this.getPreviewUrl(photo.id),
            extension: photo.name.split('.').pop().toLowerCase()
        };
    }

    // ===== GERAR URL DE THUMBNAIL =====
    async getThumbnailUrl(fileId, size = 'large') {
        try {
            // BOX thumbnail API
            const thumbnailUrl = `${this.baseUrl}/files/${fileId}/thumbnail.png?min_height=300&min_width=300`;
            return thumbnailUrl;
        } catch (error) {
            console.error('Erro ao gerar thumbnail:', error);
            return null;
        }
    }

    // ===== GERAR URL DE PREVIEW =====
    async getPreviewUrl(fileId) {
        try {
            const response = await this.makeRequest(`/files/${fileId}?fields=download_url`);
            
            if (response.ok) {
                const data = await response.json();
                return data.download_url || null;
            }
            return null;
        } catch (error) {
            console.error('Erro ao gerar preview:', error);
            return null;
        }
    }

    // ===== GERAR URL DE DOWNLOAD =====
    async getDownloadUrl(fileId) {
        try {
            const response = await this.makeRequest(`/files/${fileId}/content`, 'GET');
            
            if (response.status === 302) {
                // BOX retorna redirect para URL de download
                return response.headers.get('Location');
            } else {
                // Fallback: usar URL direta
                return `${this.baseUrl}/files/${fileId}/content`;
            }
        } catch (error) {
            console.error('Erro ao gerar URL de download:', error);
            return null;
        }
    }

    // ===== COMPARTILHAR PASTA =====
    async createSharedLink(folderId, access = 'open') {
        try {
            const body = {
                shared_link: {
                    access: access,
                    permissions: {
                        can_download: true,
                        can_preview: true
                    }
                }
            };

            const response = await this.makeRequest(`/folders/${folderId}`, 'PUT', body);
            
            if (response.ok) {
                const data = await response.json();
                return data.shared_link;
            }
            return null;
        } catch (error) {
            console.error('Erro ao criar link compartilhado:', error);
            return null;
        }
    }

    // ===== BUSCAR FOTOS POR CLIENTE =====
    async getClientPhotos(clientData) {
        try {
            // 1. Encontrar pasta do cliente
            const folder = await this.findClientFolder(clientData);
            
            if (!folder) {
                console.warn('Pasta do cliente não encontrada:', clientData);
                return [];
            }

            // 2. Buscar fotos da pasta
            const photos = await this.getFolderPhotos(folder.id);
            
            console.log(`Encontradas ${photos.length} fotos para ${clientData.cliente}`);
            return photos;
            
        } catch (error) {
            console.error('Erro ao buscar fotos do cliente:', error);
            throw error;
        }
    }

    // ===== DOWNLOAD DE FOTO =====
    async downloadPhoto(photo, filename = null) {
        try {
            const downloadUrl = await this.getDownloadUrl(photo.id);
            
            if (!downloadUrl) {
                throw new Error('URL de download não disponível');
            }

            // Criar link temporário para download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || photo.name;
            link.target = '_blank';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error('Erro ao baixar foto:', error);
            throw error;
        }
    }

    // ===== DOWNLOAD MÚLTIPLO =====
    async downloadMultiplePhotos(photos, onProgress = null) {
        const results = [];
        
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            
            try {
                await this.downloadPhoto(photo);
                results.push({ success: true, photo });
                
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: photos.length,
                        photo: photo,
                        success: true
                    });
                }
                
                // Delay para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Erro ao baixar ${photo.name}:`, error);
                results.push({ success: false, photo, error });
                
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: photos.length,
                        photo: photo,
                        success: false,
                        error: error.message
                    });
                }
            }
        }
        
        return results;
    }

    // ===== UTILITIES =====
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
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ===== LIMPEZA DE CACHE =====
    clearCache() {
        this.foldersCache.clear();
        this.photosCache.clear();
    }

    // ===== STATUS DA CONEXÃO =====
    isAuthenticated() {
        return !!this.accessToken;
    }

    // ===== FALLBACK PARA DESENVOLVIMENTO =====
    async getMockPhotos(clientData) {
        // Para desenvolvimento/teste quando BOX não estiver configurado
        console.warn('Usando fotos mock para desenvolvimento');
        
        const mockPhotos = [
            {
                id: 'mock1',
                name: 'batizado_001.jpg',
                size: 2048000,
                sizeFormatted: '2.0 MB',
                modifiedAt: new Date().toISOString(),
                dateFormatted: new Date().toLocaleDateString('pt-BR'),
                downloadUrl: 'https://images.unsplash.com/photo-1544717440-50301b8a9ea8',
                thumbnailUrl: 'https://images.unsplash.com/photo-1544717440-50301b8a9ea8?w=300',
                previewUrl: 'https://images.unsplash.com/photo-1544717440-50301b8a9ea8?w=800',
                extension: 'jpg'
            },
            {
                id: 'mock2',
                name: 'familia_002.jpg',
                size: 1856000,
                sizeFormatted: '1.8 MB',
                modifiedAt: new Date().toISOString(),
                dateFormatted: new Date().toLocaleDateString('pt-BR'),
                downloadUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96',
                thumbnailUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300',
                previewUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
                extension: 'jpg'
            }
        ];
        
        return mockPhotos;
    }
}

// ===== INICIALIZAÇÃO =====
let boxAPI;

document.addEventListener('DOMContentLoaded', () => {
    boxAPI = new BoxAPI();
    window.boxAPI = boxAPI;
});

// ===== EXPORT =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoxAPI;
}