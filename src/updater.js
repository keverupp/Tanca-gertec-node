'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const PRICETAB_PATH = path.join(process.env.DATA_DIR || './data', 'PRICETAB.TXT');

const state = {
  lastUpdate: null,
  lastStatus: 'never',
};

function buildAuthHeaders() {
  const type = (process.env.PRICETAB_AUTH_TYPE || 'none').toLowerCase();

  switch (type) {
    case 'basic': {
      const credentials = Buffer.from(
        `${process.env.PRICETAB_AUTH_USER}:${process.env.PRICETAB_AUTH_PASS}`
      ).toString('base64');
      return { Authorization: `Basic ${credentials}` };
    }
    case 'bearer':
      return { Authorization: `Bearer ${process.env.PRICETAB_AUTH_TOKEN}` };
    case 'header':
      return { [process.env.PRICETAB_AUTH_HEADER_NAME]: process.env.PRICETAB_AUTH_HEADER_VALUE };
    default:
      return {};
  }
}

function md5(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function fetchPricetab() {
  const url = process.env.PRICETAB_URL;
  if (!url) {
    throw new Error('PRICETAB_URL não configurada no .env');
  }

  const headers = buildAuthHeaders();
  const response = await axios.get(url, {
    headers,
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  const contentType = (response.headers['content-type'] || '').toLowerCase();
  let content;

  if (contentType.startsWith('text/')) {
    content = Buffer.from(response.data).toString('utf8');
  } else {
    content = Buffer.from(response.data);
  }

  return content;
}

async function update() {
  const newContent = await fetchPricetab();

  // Lê conteúdo atual para comparar
  let currentHash = null;
  try {
    const current = fs.readFileSync(PRICETAB_PATH);
    currentHash = md5(current);
  } catch {
    // Arquivo ainda não existe — primeira execução
  }

  const newHash = md5(newContent);

  if (currentHash === newHash) {
    console.log('[updater] PRICETAB.TXT sem alterações');
    state.lastUpdate = new Date();
    state.lastStatus = 'unchanged';
    return { updated: false, timestamp: state.lastUpdate };
  }

  // Garante que o diretório existe
  fs.mkdirSync(path.dirname(PRICETAB_PATH), { recursive: true });
  fs.writeFileSync(PRICETAB_PATH, newContent);

  state.lastUpdate = new Date();
  state.lastStatus = 'updated';
  console.log(`[updater] PRICETAB.TXT atualizado em ${state.lastUpdate.toISOString()}`);

  return { updated: true, timestamp: state.lastUpdate };
}

function getState() {
  return {
    lastUpdate: state.lastUpdate,
    lastStatus: state.lastStatus,
    pricetabPath: PRICETAB_PATH,
    cronSchedule: process.env.CRON_SCHEDULE || '0 * * * *',
  };
}

module.exports = { update, getState, PRICETAB_PATH };
