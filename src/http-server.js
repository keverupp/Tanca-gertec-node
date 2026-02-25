'use strict';

const express = require('express');
const fs = require('fs');
const { update, getState, PRICETAB_PATH } = require('./updater');

function apiKeyMiddleware(req, res, next) {
  const apiKey = process.env.HTTP_API_KEY;
  if (!apiKey) {
    return next(); // Sem key configurada = sem proteção
  }
  const provided = req.headers['x-api-key'];
  if (provided !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function start() {
  const PORT = parseInt(process.env.HTTP_PORT || '3000', 10);
  const app = express();

  app.use(express.json());

  // Health check — sem auth, usado pelo Docker HEALTHCHECK
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Status — com auth
  app.get('/status', apiKeyMiddleware, (req, res) => {
    const state = getState();
    let fileSize = null;
    try {
      const stat = fs.statSync(PRICETAB_PATH);
      fileSize = stat.size;
    } catch {
      // arquivo ainda não existe
    }
    res.json({ ...state, fileSize });
  });

  // Disparo manual de atualização — com auth
  app.post('/update', apiKeyMiddleware, async (req, res) => {
    try {
      const result = await update();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[http] Erro ao atualizar PRICETAB.TXT: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`[http] Servidor HTTP escutando na porta ${PORT}`);
  });

  return app;
}

module.exports = { start };
