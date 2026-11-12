/**
 * Coin Castor — Ardenne-boekingen uit de mailbox van info@coincastor.be naar de agenda
 *
 * Draait in het Google-account info@coincastor.be (apart project, los van het
 * boekingsformulier). Elk uur:
 *  1. zoekt het "Zelfbilling ... (BAROUDEUR)"-mails van Ardenne Résidences
 *  2. haalt er naam, aankomst, vertrek, boekingsnummer en bedrag uit
 *  3. zet de boeking in de agenda info@coincastor.be (15u tot 11u)
 *     tenzij die er al staat (zelfde familienaam of boekingsnummer in die periode)
 *  4. geeft de mail het label "CoinCastor verwerkt" zodat ze maar één keer verwerkt wordt
 *
 * Het verstuurt niets naar niemand. vandenbulckeg@gmail.com wordt als gast
 * toegevoegd zonder uitnodigingsmail.
 *
 * Eerste keer: kies bovenaan de functie "testZonderSchrijven" en klik Uitvoeren.
 * Die toont in het logboek wat het zou doen, zonder iets aan te maken.
 */

const CALENDAR_ID = 'info@coincastor.be';
const TZ = 'Europe/Brussels';
const LABEL_NAAM = 'CoinCastor verwerkt';
const GAST = 'vandenbulckeg@gmail.com';
const LOCATIE = 'Lavaux 18, 4980 Trois-Ponts';
const ZOEK = 'from:info@ardenneresidences.com subject:Zelfbilling newer_than:60d';

function verwerkArdenneMails() {
  verwerk_(false);
}

function testZonderSchrijven() {
  verwerk_(true);
}

/** Maakt de uurlijkse trigger aan (één keer uitvoeren). */
function installeerTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'verwerkArdenneMails')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('verwerkArdenneMails').timeBased().everyHours(1).create();
  Logger.log('Uurlijkse trigger staat klaar.');
}

function verwerk_(droog) {
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('Agenda ' + CALENDAR_ID + ' niet gevonden. Draait dit script wel in het account info@coincastor.be?');
  const label = GmailApp.getUserLabelByName(LABEL_NAAM) || (droog ? null : GmailApp.createLabel(LABEL_NAAM));

  const threads = GmailApp.search(ZOEK, 0, 50);
  threads.forEach(thread => {
    if (label && thread.getLabels().some(l => l.getName() === LABEL_NAAM)) return;

    const msg = thread.getMessages()[0];
    const b = leesMail_(msg.getSubject(), msg.getPlainBody());
    if (!b) {
      Logger.log('⚠️ Kon mail niet lezen, overgeslagen: ' + msg.getSubject());
      return; // geen label: blijft zichtbaar voor een volgende poging / manuele check
    }

    const start = Utilities.parseDate(b.aankomst + ' 15:00', TZ, 'dd/MM/yyyy HH:mm');
    const einde = Utilities.parseDate(b.vertrek + ' 11:00', TZ, 'dd/MM/yyyy HH:mm');
    const bestaande = cal.getEvents(start, einde);

    const zelfde = bestaande.find(e => {
      const t = norm_(e.getTitle() + ' ' + e.getDescription());
      return t.includes(norm_(b.familienaam)) || (b.nummer && t.includes(b.nummer));
    });
    if (zelfde) {
      Logger.log('Staat al in de agenda: ' + zelfde.getTitle());
      if (!droog) thread.addLabel(label);
      return;
    }

    const conflict = bestaande.map(e => e.getTitle());
    const titel = b.naam + ' — via Ardenne Résidences';
    const beschrijving = [
      'Boeking via Ardenne Résidences, op naam van ' + b.naam + ' (boekingsnr. ' + (b.nummer || 'onbekend') + ').',
      'Samenstelling: onbekend, na te vullen (staat niet in de zelfbilling).',
      'Bed- en badlinnen: standaard NIET voorzien (Ardenne).',
      'Huur: ' + (b.bedrag || 'onbekend') + ' — betaling via het platform (zelfbilling).',
      conflict.length ? '⚠️ OVERLAPT met: ' + conflict.join(', ') : '',
      'Automatisch aangemaakt door het script in info@coincastor.be op ' +
        Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm') + '.'
    ].filter(Boolean).join('\n');

    if (droog) {
      Logger.log('ZOU AANMAKEN: ' + titel + ' | ' + b.aankomst + ' 15u → ' + b.vertrek + ' 11u\n' + beschrijving);
      return;
    }
    cal.createEvent(titel, start, einde, {
      description: beschrijving,
      location: LOCATIE,
      guests: GAST,
      sendInvites: false
    });
    thread.addLabel(label);
    Logger.log('Aangemaakt: ' + titel);
  });
}

/** Haalt de gegevens uit onderwerp en tekst van een zelfbilling-mail. */
function leesMail_(onderwerp, tekst) {
  const m = onderwerp.match(/van (\d{2}\/\d{2}\/\d{4}) tot (\d{2}\/\d{2}\/\d{4}) op naam van (.+?)\s*\(P\d+\)/i);
  if (!m) return null;
  const ruw = m[3].trim();                       // bv. "M.DUCHÊNE"
  const delen = ruw.split('.');
  const initiaal = delen.length > 1 ? delen[0].trim().toUpperCase() : '';
  const familienaam = mooi_(delen.length > 1 ? delen.slice(1).join('.') : ruw);
  const nummer = (tekst.match(/Boekingsnummer\s*:\s*(\d+)/i) || [])[1] || '';
  const bedrag = (tekst.match(/(\d[\d.]*,\d{2}\s*€)/) || [])[1] || '';
  return {
    aankomst: m[1],
    vertrek: m[2],
    familienaam: familienaam,
    naam: (initiaal ? initiaal + '. ' : '') + familienaam,
    nummer: nummer,
    bedrag: bedrag
  };
}

/** "DUCHÊNE" → "Duchêne", "VAN DEN BOSCH" → "Van Den Bosch" */
function mooi_(s) {
  return s.trim().toLowerCase().replace(/(^|[\s\-'])(\S)/g, (_, a, b) => a + b.toUpperCase());
}

/** Kleine letters zonder accenten, om namen te vergelijken. */
function norm_(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
