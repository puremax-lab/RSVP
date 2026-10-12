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
var ADMIN_KEY = 'CHANGE-MOI-2026'; // ⚠️ à remplacer avant de déployer !
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

    // Notification "nouveau message" envoyée par le site quand quelqu'un écrit
    // à son binôme Secret Santa. Pas de ADMIN_KEY ici (n'importe quel invité
    // connecté peut l'appeler) : le message envoyé est toujours le même texte
    // générique codé ci-dessous, jamais fourni par l'appelant, donc ça ne peut
    // pas servir à envoyer un contenu arbitraire à quelqu'un.
    if (data.action === 'notifyPairMessage') {
      return jsonOut_(notifyPairMessage_(data.toEmail));
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

function notifyPairMessage_(toEmail) {
  var email = String(toEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'invalid_email' };

  var quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) return { ok: false, error: 'quota_exceeded' };

  try {
    MailApp.sendEmail({
      to: email,
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
