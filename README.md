# E-TOMIC — Site

Landing page de captação de leads + diagnóstico de CRM para a consultoria E-TOMIC.

## Estrutura

```
etomic-site/
├── index.html              ← página única
├── css/style.css
├── js/
│   ├── starfield.js        ← canvas de partículas roxo/violeta/azul
│   ├── diagnostic.js       ← diagnóstico de CRM client-side
│   └── main.js             ← reveal on scroll, smooth scroll
├── assets/
│   ├── logo-mark.png       ← logo (átomo) com fundo transparente
│   ├── logo-full.png       ← logo + texto
│   └── favicon.png
└── apps-script.gs          ← script do Google Sheets (passo 2 abaixo)
```

---

# 📋 Passo a passo (na ordem)

## 1. Configurar a captura de leads no Google Sheets

Sem isso, os dados do formulário se perdem.

### 1.1 Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha nova.
2. Dê um nome (ex: `E-TOMIC — Leads`).

### 1.2 Colar o Apps Script

1. Na planilha: menu **Extensões → Apps Script**.
2. Apague o código padrão e cole **todo o conteúdo do arquivo `apps-script.gs`**.
3. Salve (Ctrl+S ou disquete).

### 1.3 Publicar como Web App

1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Ícone de engrenagem → **Aplicativo da Web**.
3. Configurar:
   - **Descrição**: `E-TOMIC Leads`
   - **Executar como**: `Eu`
   - **Quem tem acesso**: `Qualquer pessoa`
4. Clique em **Implantar**.
5. Na primeira vez vai pedir autorização — autorize com sua conta Google.
6. **Copie a URL gerada** (termina em `/exec`).

### 1.4 Colar a URL no site

1. Abra `js/diagnostic.js`.
2. Linha 9, na constante `SHEETS_URL`:
   ```js
   const SHEETS_URL = ''; // ← cole a URL aqui
   ```
3. Salve.

Cada lead vai virar uma linha na aba `Leads` da planilha (criada automaticamente na primeira submissão), com: Data/Hora, Nome, E-mail, WhatsApp, Site, Nicho, Tamanho da Base, Score CRM e Receita Estimada.

> **Observação:** o site usa um *Image beacon* para enviar — uma requisição GET silenciosa, sem CORS, que funciona em qualquer hospedagem estática. Se a URL estiver errada, o lead simplesmente não é gravado (fica um aviso no console do navegador), mas o diagnóstico continua funcionando.

---

## 2. Subir o site com `etomic.com.br` (grátis)

Recomendado: **Cloudflare Pages** — CDN global + SSL + DNS no mesmo painel.

### 2.1 Subir o site (5 min)

1. Crie conta em [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. **Workers & Pages → Create → Pages → Upload assets**.
3. Nome do projeto: `etomic`.
4. Arraste a pasta `etomic-site` (ou o `.zip`). Clique **Deploy**.
5. Em ~30s seu site sobe em `etomic.pages.dev`.

### 2.2 Adicionar o domínio na Cloudflare (10 min)

1. **Add a Site → `etomic.com.br`** → plano **Free**.
2. A Cloudflare te dá **2 nameservers** (ex: `nina.ns.cloudflare.com` e `bob.ns.cloudflare.com`). Anote.

### 2.3 Trocar nameservers no Registro.br

1. Acesse [registro.br](https://registro.br) → login.
2. **Painel → etomic.com.br → DNS → Alterar Servidores DNS**.
3. Substitua pelos nameservers da Cloudflare. Salve.
4. Propagação: 30 min a algumas horas.

### 2.4 Conectar o domínio ao Pages

1. Cloudflare → seu projeto Pages → **Custom domains → Set up a custom domain**.
2. Digite `etomic.com.br`. A Cloudflare cria o DNS automaticamente.
3. Repita para `www.etomic.com.br`.

✅ `https://etomic.com.br` no ar com SSL grátis e CDN global.

---

## 3. Onde ajustar coisas depois

| O que | Onde |
|---|---|
| Número do WhatsApp | `js/diagnostic.js` (constante `WHATSAPP`) e `index.html` (várias ocorrências de `5512991304121`) |
| URL do Sheets | `js/diagnostic.js` (constante `SHEETS_URL`) |
| Textos do hero / serviços | `index.html` |
| Cores (roxo / violeta / azul) | `css/style.css` topo (variáveis `--neon-purple`, `--neon-violet`, etc) |
| Lista de nichos | `index.html` (select `#diag-niche`) e `js/diagnostic.js` (constante `NICHE_DATA`) |

## 4. Como o diagnóstico funciona

1. Lead preenche: nome, e-mail, WhatsApp, URL do site, nicho, tamanho da base.
2. **Os dados são gravados no Google Sheets** (passo 1).
3. Loading animado de ~3s simulando análise.
4. Resultado: score 1–10, métricas (recuperáveis, receita oculta, economia em mídia), itens detectados, oportunidades priorizadas, plano de 4 semanas.
5. CTA final → WhatsApp com mensagem pré-preenchida (incluindo nome, site, nicho, base e score).

> **Importante:** o cálculo é heurístico baseado em nicho + tamanho da base. É honesto comercialmente — dá uma estimativa direcional convincente que motiva a conversa no WhatsApp, onde você fará a análise real do site dele.

Se quiser depois trocar pra uma análise *real* (scraping + IA, igual ao `docu-buddy-50`), o `js/diagnostic.js` está estruturado pra isso — basta substituir a função `buildDiagnostic` por um `fetch` numa Edge Function.
