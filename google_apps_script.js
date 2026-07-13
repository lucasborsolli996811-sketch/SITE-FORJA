// Google Apps Script para o Banco de Dados da FORJA
// Como instalar:
// 1. Abra sua planilha do Google Sheets.
// 2. No menu superior, clique em "Extensões" > "Apps Script".
// 3. Apague todo o código existente lá e cole este código completo.
// 4. No canto superior direito, clique em "Implantar" (Deploy) > "Nova implantação" (New deployment).
// 5. Clique no ícone de engrenagem ao lado de "Selecione o tipo" e escolha "Mapeamento da Web" (Web app).
// 6. Defina:
//    - Descrição: API de Sincronização Forja
//    - Executar como: Eu (lucasborsolli996811...)
//    - Quem tem acesso: Qualquer pessoa (Anyone)
// 7. Clique em "Implantar" e conceda as permissões da sua conta do Google (clique em Avançado > Acessar projeto sem título).
// 8. Copie o "URL do aplicativo da Web" gerado e cole no arquivo `data.js` do seu site!

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Garantir que as abas existam
    var estoqueSheet = ss.getSheetByName("estoque") || createEstoqueSheet(ss);
    var clientesSheet = ss.getSheetByName("clientes") || createClientesSheet(ss);
    var orcamentosSheet = ss.getSheetByName("orcamentos") || createOrcamentosSheet(ss);
    var configSheet = ss.getSheetByName("config") || createConfigSheet(ss);
    
    var estoqueData = readSheetData(estoqueSheet);
    var clientesData = readSheetData(clientesSheet);
    var orcamentosData = readSheetData(orcamentosSheet);
    
    // Tratamentos e conversões de tipos
    orcamentosData.forEach(function(item) {
      if (item.itens && typeof item.itens === 'string') {
        try {
          item.itens = JSON.parse(item.itens);
        } catch (err) {
          item.itens = [];
        }
      }
      if (item.number) item.number = parseInt(item.number);
      if (item.totalValue) item.totalValue = parseFloat(item.totalValue) || 0;
    });
    
    estoqueData.forEach(function(item) {
      if (item.stock !== undefined) item.stock = parseInt(item.stock) || 0;
      if (item.buyPrice !== undefined) item.buyPrice = parseFloat(item.buyPrice) || 0;
      if (item.sellPrice !== undefined) item.sellPrice = parseFloat(item.sellPrice) || 0;
      if (item.soldCount !== undefined) item.soldCount = parseInt(item.soldCount) || 0;
      if (item.quotedCount !== undefined) item.quotedCount = parseInt(item.quotedCount) || 0;
    });

    var lastNum = 12001;
    var val = configSheet.getRange("A1").getValue();
    if (val) lastNum = parseInt(val);
    
    var response = {
      inventory: estoqueData,
      clients: clientesData,
      budgets: orcamentosData,
      lastBudgetNum: lastNum
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var data = postData.data;
    
    if (action === "saveAll") {
      var estoqueSheet = ss.getSheetByName("estoque") || createEstoqueSheet(ss);
      var clientesSheet = ss.getSheetByName("clientes") || createClientesSheet(ss);
      var orcamentosSheet = ss.getSheetByName("orcamentos") || createOrcamentosSheet(ss);
      var configSheet = ss.getSheetByName("config") || createConfigSheet(ss);

      if (data.inventory) writeSheetData(estoqueSheet, data.inventory);
      if (data.clients) writeSheetData(clientesSheet, data.clients);
      
      if (data.budgets) {
        var budgetsToSave = JSON.parse(JSON.stringify(data.budgets));
        budgetsToSave.forEach(function(item) {
          if (item.itens && typeof item.itens !== 'string') {
            item.itens = JSON.stringify(item.itens);
          }
        });
        writeSheetData(orcamentosSheet, budgetsToSave);
      }
      
      if (data.lastBudgetNum !== undefined) {
        configSheet.getRange("A1").setValue(data.lastBudgetNum);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "Ação desconhecida" }))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Funções Auxiliares para ler/escrever dados em lote (Batch) de forma rápida
function readSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  var result = [];
  for (var r = 0; r < values.length; r++) {
    var rowObj = {};
    for (var c = 0; c < headers.length; c++) {
      var val = values[r][c];
      if (val === null || val === undefined) {
        val = "";
      }
      rowObj[headers[c]] = val;
    }
    result.push(rowObj);
  }
  return result;
}

function writeSheetData(sheet, dataArray) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  // Limpar dados anteriores
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  
  if (!dataArray || dataArray.length === 0) return;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var outputValues = [];
  
  for (var i = 0; i < dataArray.length; i++) {
    var rowObj = dataArray[i];
    var rowValues = [];
    for (var c = 0; c < headers.length; c++) {
      var val = rowObj[headers[c]];
      if (val === undefined || val === null) {
        val = "";
      }
      rowValues.push(val);
    }
    outputValues.push(rowValues);
  }
  
  sheet.getRange(2, 1, outputValues.length, lastCol).setValues(outputValues);
}

// Criadores de planilhas padrão caso o usuário não as tenha criado
function createEstoqueSheet(ss) {
  var sheet = ss.insertSheet("estoque");
  var headers = ["id", "brand", "name", "desc", "stock", "img", "buyLink", "buyPrice", "sellPrice", "soldCount", "quotedCount"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  return sheet;
}

function createClientesSheet(ss) {
  var sheet = ss.insertSheet("clientes");
  var headers = ["id", "name", "address", "email", "phone"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  return sheet;
}

function createOrcamentosSheet(ss) {
  var sheet = ss.insertSheet("orcamentos");
  var headers = ["number", "clientId", "clientName", "date", "deliveryDate", "itens", "observations", "status", "totalValue"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
  return sheet;
}

function createConfigSheet(ss) {
  var sheet = ss.insertSheet("config");
  sheet.getRange("A1").setValue(12001);
  return sheet;
}
