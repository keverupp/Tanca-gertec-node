'use strict';

require('dotenv').config();

const tcpServer = require('./tcp-server');
const httpServer = require('./http-server');
const cronJob = require('./cron');

console.log('[app] Iniciando Tanca-Gertec Price Server...');

tcpServer.start();
httpServer.start();
cronJob.start();
