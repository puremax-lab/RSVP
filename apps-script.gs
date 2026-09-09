/**
 * Christmas Party II — backend RSVP (Google Apps Script)
 * ---------------------------------------------------------
 * Ce script transforme une Google Sheet en petite base de données :
 *  - doPost()  → un invité confirme sa présence depuis le site → ajoute une ligne
 *  - doGet()   → le tableau de bord admin lit toutes les lignes (protégé par ADMIN_KEY)
 *
 * INSTALLATION (5 minutes) :
 *  1. Allez sur https://sheets.google.com et créez une Google Sheet vide.
 *     Nommez-la par exemple "RSVP Christmas Party II".
 *  2. Menu Extensions > Apps Script.
 *  3. Supprimez le code par défaut (myFunction...) et collez TOUT ce fichier à la place.
 *  4. Changez la valeur d'ADMIN_KEY ci-dessous par un mot de passe à vous
 *     (c'est ce mot de passe qui protège le tableau de bord admin — gardez-le secret,
 *     ne le partagez qu'avec les personnes qui doivent voir les confirmations).
 *  5. Cliquez sur "Déployer" (bouton bleu en haut à droite) > "Nouveau déploiement".
 *     - Cliquez sur la roue dentée à côté de "Sélectionner le type" > "Application Web".
 *     - Description : ce que vous voulez.
 *     - Exécuter en tant que : "Moi".
 *     - Qui a accès : "Tout le monde".
 *     - Cliquez sur "Déployer", puis autorisez l'accès (c'est votre propre script).
 *  6. Copiez l'URL qui se termine par "/exec" — c'est votre APPS_SCRIPT_URL.
 *     Collez-la dans index.html ET admin.html (voir README.md).
 *
 * Si vous modifiez ce script plus tard, il faut recréer un déploiement
 * ("Gérer les déploiements" > crayon > "Nouvelle version") pour que les
 * changements soient pris en compte par l'URL déjà distribuée.
 */

var SHEET_NAME = 'RSVP';
var ADMIN_KEY = 'CHANGE-MOI-2026'; // ⚠️ à remplacer avant de déployer !

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      String(data.name || '').slice(0, 200),
      String(data.attending || '').slice(0, 50),
      Number(data.guests) || 1,
      String(data.message || '').slice(0, 1000)
    ]);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  var key = e.parameter.key || '';
  if (key !== ADMIN_KEY) {
    return jsonOut_({ error: 'unauthorized' });
  }
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[1]) continue; // ligne vide
    out.push({
      date: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      name: row[1],
      attending: row[2],
      guests: row[3],
      message: row[4]
    });
  }
  return jsonOut_(out);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Date', 'Nom', 'Présence', 'Invités', 'Message']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
