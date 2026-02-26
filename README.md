# Consulta-preco-server

Servidor Node.js para terminais de consulta de preços Tanca e Gertec.

## Funcionalidades

- Servidor TCP para consulta de preços por código de barras (compatível com protocolo Tanca/Gertec)
- Download automático agendado do arquivo de preços (remoto salvo localmente como `PRICETAB.TXT`)
- Atualização pontual do `PRICETAB.TXT` via API HTTP (`POST /update`)
- Healthcheck e status operacional via HTTP (`/health` e `/status`)
- Controle de acesso por `X-API-Key` para endpoints administrativos

**Testado com:**

- Gertec G2E ✅

**Compatibilidade esperada** (mesmo protocolo):

- Gertec 506E
- Tanca 240W

---

## Deploy com Docker (recomendado)

```bash
# Copie o exemplo de variáveis
cp .env.example .env
# Edite o .env com sua PRICETAB_URL e credenciais

docker compose up --build -d
```

No **Portainer**, crie uma stack apontando para este repositório e configure as variáveis de ambiente diretamente na interface.

---

## Execução local

```bash
npm install
# copie .env.example para .env e preencha
npm start
```

---

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `TCP_PORT` | `6500` | Porta TCP para os terminais |
| `HTTP_PORT` | `3000` | Porta HTTP de gerenciamento |
| `DATA_DIR` | `./data` | Diretório do PRICETAB.TXT (use `/data` no Docker) |
| `HTTP_API_KEY` | `changeme` | Chave de acesso às rotas HTTP |
| `PRICETAB_URL` | — | URL de origem do arquivo de preços |
| `PRICETAB_AUTH_TYPE` | `none` | Autenticação da URL: `none`, `basic`, `bearer`, `header` |
| `CRON_SCHEDULE` | `0 * * * *` | Agendamento de atualização automática (cron) |

---

## Atualização do PRICETAB.TXT

O servidor busca automaticamente o arquivo de preços na `PRICETAB_URL` conforme o agendamento `CRON_SCHEDULE`. Para disparar manualmente:

```bash
curl -X POST http://localhost:3000/update -H "X-API-Key: sua_chave"
```

Observação: no projeto o arquivo local é persistido como `PRICETAB.TXT` (maiúsculo). Se a origem remota usar `pricetab.txt`, o conteúdo é baixado normalmente pela URL configurada.


## Rotas HTTP

| Método | Rota | Auth | Descrição |
| --- | --- | --- | --- |
| `GET` | `/health` | — | Healthcheck (Docker/Portainer) |
| `GET` | `/status` | `X-API-Key` | Última atualização e tamanho do arquivo |
| `POST` | `/update` | `X-API-Key` | Dispara atualização manual do PRICETAB |

### Exemplo de retorno `/status`

```json
{
  "lastUpdate": "2026-02-26T18:20:00.000Z",
  "lastStatus": "updated",
  "pricetabPath": "./data/PRICETAB.TXT",
  "cronSchedule": "0 * * * *",
  "fileSize": 123456
}
```

---

## Créditos

Agradecimento à **Ana Lucia S. Melo** que em 2008 criou o código do Gertec em Java — foi com esse código que o projeto original foi reescrito para Node.js.

Agradecimento a **[Jonas Lacerda](https://github.com/JonasLacerda)** que fez a primeira versão em JavaScript.

Estou lascado sem grana, se te ajudou não esquece de pagar meu cafezinho!

[![Buy Me A Pizza](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20pizza!!&emoji=🍕&slug=caosaquatico&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00)](https://www.buymeacoffee.com/caosaquatico)
