/**
 * Christmas Party II — backend RSVP (Google Apps Script)
 * ---------------------------------------------------------
 * Ce script transforme une Google Sheet en petite base de données :
 *  - doPost()  → un invité confirme sa présence depuis le site → ajoute une ligne
 *                (refusée si le même prénom + nom existe déjà), ou supprime
 *                une ligne depuis l'admin (protégé par ADMIN_KEY). Sert aussi à
 *                envoyer les e-mails : annonces groupées depuis l'admin (protégé
 *                par ADMIN_KEY) et notifications "nouveau message" Secret Santa
 *                déclenchées par l'espace invité (pas de clé, texte toujours fixe).
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
var PAIR_SHEET_NAME = 'PairEmails'; // table cachée : jamais exposée à un invité
var ADMIN_KEY = 'YESHUA';
var MEMBER_URL = 'https://puremax-lab.github.io/RSVP/member.html';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();

    // Suppression d'une ligne depuis l'admin (protégée par ADMIN_KEY)
    if (data.action === 'delete') {
      if (data.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'unauthorized' });
      return jsonOut_(deleteRow_(sheet, data.date));
    }

    // Envoi d'un e-mail groupé à une liste d'invités (protégé par ADMIN_KEY).
    // Utilisé par l'espace organisateur pour diffuser une annonce par e-mail
    // à tous les invités ayant déjà créé leur compte.
    if (data.action === 'sendUpdate') {
      if (data.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'unauthorized' });
      return jsonOut_(sendUpdate_(data.subject, data.body, data.recipients));
    }

    // Enregistrement des emails d'un binôme Secret Santa au moment du tirage
    // (protégé par ADMIN_KEY). Stocké uniquement dans une table cachée côté
    // serveur — jamais renvoyé ni lisible par un invité, pour que le nom et
    // l'email de l'autre personne ne transitent jamais vers le mauvais camp.
    if (data.action === 'registerPairEmails') {
      if (data.key !== ADMIN_KEY) return jsonOut_({ ok: false, error: 'unauthorized' });
      return jsonOut_(registerPairEmails_(data.pairs));
    }

    // Notification "nouveau message" envoyée par le site quand quelqu'un écrit
    // à son binôme Secret Santa. Pas de ADMIN_KEY ici (n'importe quel invité
    // connecté peut l'appeler), mais le texte envoyé est toujours le même
    // message générique codé ci-dessous (jamais fourni par l'appelant), et
    // l'email du destinataire est résolu côté serveur à partir de la table
    // cachée — il n'est jamais renvoyé au navigateur de l'appelant.
    if (data.action === 'notifyPairMessage') {
      return jsonOut_(notifyPairMessage_(data.pairId, data.senderEmail));
    }

    var name = String(data.name || '').trim().slice(0, 200);
    if (!name) return jsonOut_({ ok: false, error: 'empty_name' });

    // Un(e) même invité(e) (prénom + nom, insensible à la casse) ne peut
    // pas s'inscrire deux fois.
    if (isDuplicate_(sheet, name)) {
      return jsonOut_({ ok: false, duplicate: true });
    }

    sheet.appendRow([
      new Date(),
      name,
      String(data.attending || '').slice(0, 50),
      Number(data.guests) || 1,
      String(data.message || '').slice(0, 1000)
    ]);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function isDuplicate_(sheet, name) {
  var normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var existing = String(values[i][1] || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (existing === normalized) return true;
  }
  return false;
}

function deleteRow_(sheet, dateKey) {
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var rowDate = values[i][0] instanceof Date ? values[i][0].toISOString() : String(values[i][0]);
    if (rowDate === dateKey) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not_found' };
}

function sendUpdate_(subject, body, recipients) {
  subject = String(subject || 'Christmas Party II — mise à jour').trim().slice(0, 150);
  body = String(body || '').trim();
  if (!body) return { ok: false, error: 'empty_body' };

  if (!Array.isArray(recipients)) recipients = [];
  // Nettoyage : emails valides, uniques, en minuscules.
  var seen = {};
  var clean = [];
  recipients.forEach(function (raw) {
    var email = String(raw || '').trim().toLowerCase();
    if (!email || seen[email]) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    seen[email] = true;
    clean.push(email);
  });
  if (!clean.length) return { ok: false, error: 'no_recipients' };

  var quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) return { ok: false, error: 'quota_exceeded' };
  if (clean.length > quota) clean = clean.slice(0, quota);

  var sent = [];
  var failed = [];
  clean.forEach(function (email) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body,
        name: 'Christmas Party II'
      });
      sent.push(email);
    } catch (err) {
      failed.push(email);
    }
  });

  return { ok: true, sent: sent.length, failed: failed };
}

function getPairSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PAIR_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PAIR_SHEET_NAME);
    sheet.appendRow(['PairId', 'EmailA', 'EmailB']);
    sheet.setFrozenRows(1);
    sheet.hideSheet(); // table technique : pas destinée à être consultée
  }
  return sheet;
}

// Enregistre (ou remplace) les emails de chaque binôme. pairs est un tableau
// de { pairId, emailA, emailB }. Un tirage au sort réécrit toujours tous les
// binômes, donc chaque pairId est mis à jour s'il existe déjà, sinon ajouté.
function registerPairEmails_(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) return { ok: false, error: 'empty_pairs' };

  var sheet = getPairSheet_();
  var values = sheet.getDataRange().getValues();
  var rowByPairId = {};
  for (var i = 1; i < values.length; i++) {
    rowByPairId[String(values[i][0])] = i + 1; // ligne réelle (1-indexée)
  }

  var saved = 0;
  pairs.forEach(function (p) {
    var pairId = String((p && p.pairId) || '').trim();
    var emailA = String((p && p.emailA) || '').trim().toLowerCase();
    var emailB = String((p && p.emailB) || '').trim().toLowerCase();
    if (!pairId || !emailA || !emailB) return;

    var row = rowByPairId[pairId];
    if (row) {
      sheet.getRange(row, 1, 1, 3).setValues([[pairId, emailA, emailB]]);
    } else {
      sheet.appendRow([pairId, emailA, emailB]);
      rowByPairId[pairId] = sheet.getLastRow();
    }
    saved++;
  });

  return { ok: true, saved: saved };
}

function findPairEmails_(pairId) {
  var sheet = getPairSheet_();
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === pairId) {
      return { emailA: String(values[i][1] || '').toLowerCase(), emailB: String(values[i][2] || '').toLowerCase() };
    }
  }
  return null;
}

// Résout le destinataire côté serveur à partir de la table cachée : on
// n'envoie jamais à l'appelant l'email de l'autre personne, seulement un
// accusé de succès/échec.
function notifyPairMessage_(pairId, senderEmail) {
  pairId = String(pairId || '').trim();
  var sender = String(senderEmail || '').trim().toLowerCase();
  if (!pairId || !sender) return { ok: false, error: 'missing_params' };

  var pair = findPairEmails_(pairId);
  if (!pair) return { ok: false, error: 'unknown_pair' };

  var target = null;
  if (pair.emailA === sender) target = pair.emailB;
  else if (pair.emailB === sender) target = pair.emailA;
  if (!target) return { ok: false, error: 'sender_mismatch' };

  var quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) return { ok: false, error: 'quota_exceeded' };

  try {
    MailApp.sendEmail({
      to: target,
      subject: 'Nouveau message — Christmas Party II 🎁',
      body: 'Tu as reçu un nouveau message dans ton espace Secret Santa.\n\n' +
            'Connecte-toi pour le lire : ' + MEMBER_URL,
      name: 'Christmas Party II'
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
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
