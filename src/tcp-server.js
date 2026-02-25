'use strict';

const fs = require('fs');
const net = require('net');
const { PRICETAB_PATH } = require('./updater');

const terminais = [];

function start() {
  const PORT = parseInt(process.env.TCP_PORT || '6500', 10);

  const server = net.createServer((socket) => {
    const terminalAddress = socket.remoteAddress;
    console.log(`[tcp] Terminal ${terminalAddress} conectado`);

    terminais.push(socket);

    socket.on('data', (data) => {
      const comandoRecebido = data.toString().trim();

      if (comandoRecebido.startsWith('#')) {
        const cod = comandoRecebido.substring(1);
        console.log(`[tcp] Consulta de código: ${cod}`);

        fs.readFile(PRICETAB_PATH, 'utf8', (err, fileData) => {
          if (err) {
            console.error('[tcp] Erro ao ler PRICETAB.TXT: ' + err);
            socket.write('Erro ao consultar o código de barras');
            return;
          }

          const linhas = fileData.split('\n');
          let encontrado = false;
          let resposta = '';

          for (const linha of linhas) {
            const [codigo, descricao, preco, cod2] = linha.split('|');
            if (codigo === cod) {
              resposta = `#${descricao}|${preco}|${cod2}`;
              encontrado = true;
              break;
            }
          }

          if (!encontrado) {
            console.log(`[tcp] Código não encontrado: ${cod}`);
            resposta = '#Código de barras não encontrado|0.00|0';
          }

          socket.write(resposta);
        });
      }
    });

    socket.on('end', () => {
      console.log(`[tcp] Terminal ${terminalAddress} desconectado`);
      const index = terminais.indexOf(socket);
      if (index !== -1) {
        terminais.splice(index, 1);
      }
    });

    socket.on('error', (err) => {
      console.error(`[tcp] Erro no terminal ${terminalAddress}: ${err.message}`);
      const index = terminais.indexOf(socket);
      if (index !== -1) {
        terminais.splice(index, 1);
      }
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
