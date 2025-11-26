#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current.startsWith('--')) {
      const key = current.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
        i -= 1;
      } else {
        args[key] = next;
      }
    }
  }
  return args;
}

function loadConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo de configuração não encontrado: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Não foi possível interpretar ${configPath}: ${err.message}`);
  }
}

function ensureDest(destPath) {
  const absoluteDest = path.resolve(destPath);
  fs.mkdirSync(absoluteDest, { recursive: true });
  return absoluteDest;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 10);
}

function resolveDescription(file, config) {
  if (file.description) return file.description;

  const fallbackKeys = [
    config.descriptionPropertyKey,
    'descricao',
    'description'
  ].filter(Boolean);

  const properties = file.properties || {};
  for (const key of fallbackKeys) {
    if (properties[key]) {
      return properties[key];
    }
  }

  return config.defaultDescription || '';
}

function buildUrl(file, config) {
  if (config.urlTemplate) {
    return config.urlTemplate.replace(/\{id\}/g, file.id);
  }
  if (file.webContentLink) return file.webContentLink;
  if (file.webViewLink) return file.webViewLink;
  return `https://drive.google.com/uc?id=${file.id}`;
}

function buildThumbnail(file, photoUrl, config) {
  const thumbnailCfg = config.thumbnail || {};
  const strategy = thumbnailCfg.strategy || 'drive';

  if (strategy === 'template' && thumbnailCfg.template) {
    return thumbnailCfg.template.replace(/\{id\}/g, file.id);
  }

  if (strategy === 'replace' && thumbnailCfg.search && thumbnailCfg.replace) {
    return photoUrl.replace(thumbnailCfg.search, thumbnailCfg.replace);
  }

  if (file.thumbnailLink) return file.thumbnailLink;

  return `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
}

function buildPhotoEntry(file, albumName, albumDate, config) {
  const url = buildUrl(file, config);
  return {
    nome: file.name,
    album: albumName,
    data: albumDate,
    descricao: resolveDescription(file, config),
    url,
    thumbnail: buildThumbnail(file, url, config)
  };
}

async function loadDriveClient(config) {
  const authOptions = {
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  };

  if (config.keyFile) {
    authOptions.keyFile = config.keyFile;
  }

  if (config.credentials) {
    authOptions.credentials = config.credentials;
  }

  const auth = new google.auth.GoogleAuth(authOptions);
  return google.drive({ version: 'v3', auth });
}

async function listFolders(drive, parentId) {
  const folders = [];
  let pageToken;

  do {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'nextPageToken, files(id, name, createdTime)',
      pageToken
    });

    folders.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return folders;
}

async function listPhotos(drive, folderId, onlyImages) {
  const files = [];
  let pageToken;
  let query = `'${folderId}' in parents and trashed = false`;

  if (onlyImages) {
    query += " and mimeType contains 'image/'";
  }

  do {
    const res = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, description, createdTime, modifiedTime, thumbnailLink, webViewLink, webContentLink, properties, mimeType)',
      pageSize: 1000,
      pageToken
    });

    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config || 'sync.config.json';
  const config = loadConfig(configPath);

  if (!config.rootFolderId) {
    throw new Error('Defina "rootFolderId" no arquivo de configuração.');
  }

  if (!config.keyFile && !config.credentials) {
    console.warn('Aviso: nenhuma credencial definida no config. O script usará GOOGLE_APPLICATION_CREDENTIALS, se disponível.');
  }

  const drive = await loadDriveClient(config);
  const absoluteDest = ensureDest(config.dest || 'fotos');
  const onlyImages = config.onlyImages !== false;

  const folders = await listFolders(drive, config.rootFolderId);
  if (!folders.length) {
    console.log('Nenhum álbum encontrado dentro da pasta raiz informada.');
    return;
  }

  for (const folder of folders) {
    const photos = await listPhotos(drive, folder.id, onlyImages);
    if (!photos.length) {
      console.log(`Pasta "${folder.name}" não possui imagens ou está vazia. Ignorando.`);
      continue;
    }

    const albumDate = formatDate(folder.createdTime) || formatDate(photos[0]?.createdTime);
    const fotoEntries = photos.map((photo) => buildPhotoEntry(photo, folder.name, albumDate, config));
    fotoEntries.sort((a, b) => a.nome.localeCompare(b.nome));

    const outputPath = path.join(absoluteDest, `${folder.name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(fotoEntries, null, 2), 'utf-8');
    console.log(`Álbum "${folder.name}" sincronizado com ${fotoEntries.length} fotos → ${outputPath}`);
  }
}

run().catch((err) => {
  console.error('Falha ao sincronizar álbuns:', err.message);
  process.exit(1);
});
