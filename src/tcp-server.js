'use strict';

const fs = require('fs');
const net = require('net');
const { PRICETAB_PATH } = require('./updater');

const KEEPALIVE_INTERVAL_MS = 30000;

const terminais = [];

function handleQuery(cod, socket, addr) {
  fs.readFile(PRICETAB_PATH, 'utf8', (err, fileData) => {
    if (err) {
      console.error('[tcp] Erro ao ler PRICETAB.TXT: ' + err);
      socket.write('#ERRO AO CONSULTAR|0,00\n');
      return;
    }

    const linhas = fileData.split('\n');
    let resposta = '#PRODUTO NAO ENCONTRADO|0,00';

    for (const linha of linhas) {
      const [codigo, descricao, preco] = linha.split('|');
      if (codigo === cod) {
        resposta = `#${descricao}|${preco}`;
        break;
      }
    }

    console.log(`[tcp] ${addr} → ${resposta}`);
    socket.write(resposta + '\n');
  });
}

function start() {
  const PORT = parseInt(process.env.TCP_PORT || '6500', 10);

  const server = net.createServer((socket) => {
    const addr = socket.remoteAddress;
    console.log(`[tcp] Terminal ${addr} conectado`);
    terminais.push(socket);

    let state = 'handshake_ok';
    let keepaliveTimer = null;
    let waitingAlive = false;
    let aliveTimeout = null;

    function cleanup() {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      if (aliveTimeout) clearTimeout(aliveTimeout);
      const i = terminais.indexOf(socket);
      if (i !== -1) terminais.splice(i, 1);
    }

    function sendAlwaysLive() {
      if (state !== 'handshake_alive' || socket.destroyed) return;
      console.log(`[tcp] Terminal ${addr} — enviando alwayslive`);
      socket.write(Buffer.from('#alwayslive'));
      state = 'handshake_alwayslive';
    }

    function startKeepalive() {
      keepaliveTimer = setInterval(() => {
        if (socket.destroyed) { clearInterval(keepaliveTimer); return; }
        if (waitingAlive) {
          console.log(`[tcp] Terminal ${addr} não respondeu ao keepalive — encerrando`);
          socket.destroy();
          return;
        }
        waitingAlive = true;
        socket.write('#live?');
      }, KEEPALIVE_INTERVAL_MS);
    }

    // Passo 1: greeting
    socket.write(Buffer.from('#ok'));

    socket.on('data', (data) => {
      const msg = data.toString().replace(/\0/g, '').trim();
      console.log(`[tcp] ${addr} [${state}] ← ${JSON.stringify(msg)}`);

      if (state === 'handshake_ok') {
        if (msg.startsWith('#tc')) {
          console.log(`[tcp] Terminal ${addr} identificado: ${msg}`);
          socket.write('#live?');
          state = 'handshake_alive';
          // Avança após 500ms independente da resposta (igual ao comportamento Python)
          aliveTimeout = setTimeout(sendAlwaysLive, 500);
        }
        return;
      }

      if (state === 'handshake_alive') {
        // Se o #alive chegar antes do timeout, avança imediatamente
        if (msg.includes('#alive')) {
          clearTimeout(aliveTimeout);
          sendAlwaysLive();
        }
        return;
      }

      if (state === 'handshake_alwayslive') {
        if (msg.includes('#alwayslive_ok')) {
          console.log(`[tcp] Terminal ${addr} pronto (modo always-on)`);
          state = 'ready';
          startKeepalive();
        }
        return;
      }

      // Estado ready
      if (msg === '#alive' || msg === '#live') {
        waitingAlive = false;
        return;
      }

      if (msg.startsWith('#')) {
        const cod = msg.substring(1);
        console.log(`[tcp] Consulta: ${cod} ← ${addr}`);
        handleQuery(cod, socket, addr);
      }
    });

    socket.on('end', () => {
      console.log(`[tcp] Terminal ${addr} desconectado`);
      cleanup();
    });

    socket.on('error', (err) => {
      console.error(`[tcp] Erro ${addr}: ${err.message}`);
      cleanup();
    });
  });

  server.listen(PORT, () => {
    console.log(`[tcp] Servidor escutando na porta ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('[tcp] Erro no servidor: ' + err.message);
  });

  return server;
}

module.exports = { start };
