'use strict';

const cron = require('node-cron');
const { update } = require('./updater');

async function runUpdate(context) {
  console.log(`[cron] Iniciando atualização do PRICETAB.TXT (${context})`);
  try {
    const result = await update();
    if (result.updated) {
      console.log(`[cron] PRICETAB.TXT atualizado com sucesso em ${result.timestamp.toISOString()}`);
    } else {
      console.log(`[cron] Sem alterações no PRICETAB.TXT`);
    }
  } catch (err) {
    console.error(`[cron] Erro ao atualizar PRICETAB.TXT: ${err.message}`);
  }
}

function start() {
  const schedule = process.env.CRON_SCHEDULE || '0 * * * *';

  if (!cron.validate(schedule)) {
    console.error(`[cron] CRON_SCHEDULE inválido: "${schedule}". Usando padrão "0 * * * *"`);
    cron.schedule('0 * * * *', () => runUpdate('cron'));
  } else {
    cron.schedule(schedule, () => runUpdate('cron'));
    console.log(`[cron] Agendamento configurado: "${schedule}"`);
  }

  // Executa imediatamente na inicialização para garantir arquivo atualizado
  runUpdate('inicialização');
}

module.exports = { start };
