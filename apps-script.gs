/**
 * E-TOMIC — Captura de Leads
 * Apps Script para registrar leads do diagnóstico no Google Sheets.
 *
 * Como usar:
 * 1. Crie uma planilha no Google Sheets (qualquer nome).
 * 2. Menu Extensões → Apps Script.
 * 3. Apague o código que vier por padrão e cole TODO este arquivo.
 * 4. Salve (disquete ou Ctrl+S).
 * 5. Clique em "Implantar" → "Nova implantação".
 *      - Tipo: "Aplicativo da Web"
 *      - Executar como: "Eu"
 *      - Quem tem acesso: "Qualquer pessoa"
 * 6. Copie a URL gerada (termina em /exec).
 * 7. Cole essa URL na constante SHEETS_URL no arquivo js/diagnostic.js.
 *
 * Pronto. Toda submissão do formulário vai virar uma linha nova na planilha.
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Leads');

    // Cria a aba "Leads" se não existir, com cabeçalho
    if (!sheet) {
      sheet = ss.insertSheet('Leads');
      sheet.appendRow([
        'Data/Hora',
        'Nome',
        'E-mail',
        'WhatsApp',
        'Site',
        'Nicho',
        'Tamanho da Base',
        'Score CRM',
        'Receita Estimada'
      ]);
      // formatação do cabeçalho
      sheet.getRange(1, 1, 1, 9)
           .setFontWeight('bold')
           .setBackground('#7209B7')
           .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    const p = e.parameter || {};
    const now = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');

    sheet.appendRow([
      now,
      p.nome    || '',
      p.email   || '',
      p.phone   || '',
      p.site    || '',
      p.niche   || '',
      p.size    || '',
      p.score   || '',
      p.revenue || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Permite testar abrindo a URL direto no navegador
function doPost(e) {
  return doGet(e);
}
