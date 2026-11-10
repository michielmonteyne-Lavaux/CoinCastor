/**
 * Coin Castor — Poetsinfo feedback + live vertaling + poetstijd
 * ----------------------------------------------------------------
 * Backend voor de poetsinfo-pagina (poets/3574ejwrhdsdw.html). Laat Irina
 * (en Michiel) een bericht opslaan in hun eigen taal; dit script vertaalt
 * het automatisch naar de twee andere talen (gratis, via LanguageApp).
 * Laat Irina ook per boeking registreren hoe lang ze heeft gepoetst.
 * Bewaart alles in een Google Sheet (tabbladen "feedback" en "cleantime")
 * die het bij het eerste gebruik zelf aanmaakt.
 *
 * Dit bestand is een referentiekopie. De code draait in werkelijkheid in
 * Google Apps Script (script.google.com), niet vanuit deze repo — het is
 * een APART project van coincastor-boekingen.gs (bewust losgekoppeld, zodat
 * een fout hierin nooit de kalender/boekingsflow kan raken).
 *
 * ── EENMALIGE SETUP ──
 *  1. Ga naar https://script.google.com → "Nieuw project".
 *  2. Verwijder de standaardcode en plak deze volledige inhoud.
 *  3. Hernoem het project bovenaan naar bv. "Coin Castor — Poetsinfo".
 *  4. Klik Opslaan (💾).
 *  5. Deploy > Nieuwe implementatie > type "Webapp":
 *       - Uitvoeren als: Ik (jouw account)
 *       - Toegang: Iedereen
 *     Klik Implementeren, geef toestemming waar gevraagd.
 *  6. Kopieer de /exec-URL die je krijgt en bezorg die aan Claude — die
 *     wordt ingevuld als POETSINFO_API_URL in poets/3574ejwrhdsdw.html.
 *
 * ── BOEKINGEN LIVE UIT DE AGENDA (sinds nov 2026) ──
 * ?action=bookings leest de agenda info@coincastor.be en geeft de boekingen
 * terug (naam, data, uren, aantal gasten, linnen). De poetspagina haalt ze
 * daar live op, dus nieuwe/gewijzigde/geannuleerde boekingen staan er
 * automatisch op. Wat de pagina herkent in een agenda-afspraak:
 *   - titel "Naam (6+2+1) — via ..." → volwassenen+kinderen+baby's
 *     (of in de beschrijving: "6 volwassenen", "2 kinderen", "1 baby")
 *   - beschrijving met "linnen ... voorzien/inclusief" of "linnen ... NIET"
 *   - "Privé" in titel of beschrijving → eigen gebruik
 *   - afspraken die met "AANVRAAG" beginnen worden overgeslagen.
 * Na het plakken van deze versie: kies "testBoekingen" in de dropdown en
 * klik Uitvoeren om de agenda-toestemming te geven.
 *
 * ── NA ELKE CODE-WIJZIGING ──
 * Deploy > Implementaties beheren > potlood-icoon > Versie "Nieuwe versie"
 * > Implementeren. Zonder dit blijft de oude versie actief.
 */

// ── GET: lijst opvragen, of POST-achtige "save" via querystring ──
// (bewust als GET i.p.v. POST gebouwd: Apps Script-webapps geven bij een
// gewoon fetch()-GET-verzoek betrouwbaar leesbare CORS-headers terug, wat
// bij POST met een leesbaar antwoord in de praktijk niet gegarandeerd is.)
function doGet(e) {
  try {
    const action = (e.parameter.action || 'list').toString();

    if (action === 'bookings') {
      return _out({ ok: true, bookings: getBookings_() });
    }
    if (action === 'save') {
      return _handleSave(e.parameter);
    }
    if (action === 'delete') {
      return _handleDelete(e.parameter);
    }
    if (action === 'savecleantime') {
      return _handleSaveCleanTime(e.parameter);
    }
    if (action === 'deletecleantime') {
      return _handleDeleteCleanTime(e.parameter);
    }

    // default: 'list' — geeft feedback EN poetstijd in één keer terug
    const sheet = getSheet_();
    const rows = sheet.getDataRange().getValues();
    rows.shift(); // kopregel weg
    const feedback = rows
      .filter(r => r[0]) // lege rijen overslaan
      .map(r => ({
        id: r[0], bookingId: r[1], at: r[2], sourceLang: r[3],
        nl: r[4], fr: r[5], ru: r[6],
      }));

    const ctSheet = getCleanTimeSheet_();
    const ctRows = ctSheet.getDataRange().getValues();
    ctRows.shift();
    const cleantime = ctRows
      .filter(r => r[0])
      .map(r => ({ id: r[0], bookingId: r[1], at: r[2], minutes: r[3] }));

    return _out({ ok: true, feedback: feedback, cleantime: cleantime });
  } catch (err) {
    return _out({ ok: false, error: String(err) });
  }
}

function _handleSave(params) {
  const bookingId  = (params.bookingId || '').toString().trim();
  const sourceLang = (params.lang || '').toString().trim();
  const text       = (params.text || '').toString().trim();

  if (!bookingId || !sourceLang || !text) {
    return _out({ ok: false, error: 'bookingId, lang en text zijn verplicht' });
  }
  const KNOWN_LANGS = ['nl', 'fr', 'ru'];
  if (KNOWN_LANGS.indexOf(sourceLang) === -1) {
    return _out({ ok: false, error: 'onbekende taal: ' + sourceLang });
  }

  const translations = {};
  translations[sourceLang] = text;
  KNOWN_LANGS.filter(l => l !== sourceLang).forEach(function (t) {
    try {
      translations[t] = LanguageApp.translate(text, sourceLang, t);
    } catch (err) {
      translations[t] = text; // vertalen mislukt — origineel tonen i.p.v. niets
    }
  });

  const id = Utilities.getUuid();
  const at = new Date().toISOString();
  const sheet = getSheet_();
  sheet.appendRow([id, bookingId, at, sourceLang, translations.nl, translations.fr, translations.ru]);

  return _out({
    ok: true,
    entry: { id: id, bookingId: bookingId, at: at, sourceLang: sourceLang,
              nl: translations.nl, fr: translations.fr, ru: translations.ru },
  });
}

function _handleDelete(params) {
  const id = (params.id || '').toString().trim();
  if (!id) {
    return _out({ ok: false, error: 'id is verplicht' });
  }

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) { // rij 0 = kopregel
    if (values[i][0] === id) {
      sheet.deleteRow(i + 1); // Sheets is 1-based
      return _out({ ok: true });
    }
  }
  return _out({ ok: false, error: 'niet gevonden' });
}

function _handleSaveCleanTime(params) {
  const bookingId = (params.bookingId || '').toString().trim();
  const minutes = parseInt(params.minutes, 10);

  if (!bookingId || !minutes || minutes <= 0) {
    return _out({ ok: false, error: 'bookingId en minutes (>0) zijn verplicht' });
  }

  const id = Utilities.getUuid();
  const at = new Date().toISOString();
  const sheet = getCleanTimeSheet_();
  sheet.appendRow([id, bookingId, at, minutes]);

  return _out({
    ok: true,
    entry: { id: id, bookingId: bookingId, at: at, minutes: minutes },
  });
}

function _handleDeleteCleanTime(params) {
  const id = (params.id || '').toString().trim();
  if (!id) {
    return _out({ ok: false, error: 'id is verplicht' });
  }

  const sheet = getCleanTimeSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) { // rij 0 = kopregel
    if (values[i][0] === id) {
      sheet.deleteRow(i + 1); // Sheets is 1-based
      return _out({ ok: true });
    }
  }
  return _out({ ok: false, error: 'niet gevonden' });
}

/**
 * Geeft het Sheet-tabblad "feedback" terug, en maakt bij het allereerste
 * gebruik automatisch een nieuwe spreadsheet "Coin Castor — Poetsinfo
 * feedback" aan (ID wordt onthouden in de scripteigenschappen).
 */
function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  let ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { id = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('Coin Castor — Poetsinfo feedback');
    props.setProperty('SHEET_ID', ss.getId());
  }
  let sheet = ss.getSheetByName('feedback');
  if (!sheet) {
    sheet = ss.insertSheet('feedback');
    sheet.appendRow(['id', 'bookingId', 'at', 'sourceLang', 'nl', 'fr', 'ru']);
    const def = ss.getSheetByName('Sheet1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  }
  return sheet;
}

/**
 * Geeft het Sheet-tabblad "cleantime" terug (poetstijd per boeking), in
 * dezelfde spreadsheet als "feedback" — maakt het tabblad aan indien nodig.
 */
function getCleanTimeSheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  let ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { id = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('Coin Castor — Poetsinfo feedback');
    props.setProperty('SHEET_ID', ss.getId());
  }
  let sheet = ss.getSheetByName('cleantime');
  if (!sheet) {
    sheet = ss.insertSheet('cleantime');
    sheet.appendRow(['id', 'bookingId', 'at', 'minutes']);
  }
  return sheet;
}

// ── Boekingen uit de agenda ──
const BOOKING_CALENDAR_ID = 'info@coincastor.be';

function getBookings_() {
  const cal = CalendarApp.getCalendarById(BOOKING_CALENDAR_ID);
  if (!cal) throw new Error('Agenda niet gevonden: ' + BOOKING_CALENDAR_ID);
  const tz = 'Europe/Brussels';
  const from = new Date(); from.setDate(from.getDate() - 60);
  const to = new Date(); to.setFullYear(to.getFullYear() + 2);
  const fmtD = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const fmtT = d => Utilities.formatDate(d, tz, 'HH:mm');

  return cal.getEvents(from, to)
    .filter(ev => !/^\s*AANVRAAG/i.test(ev.getTitle()))
    .map(ev => {
      const title = ev.getTitle() || '';
      const desc = ev.getDescription() || '';
      const allDay = ev.isAllDayEvent();
      const start = ev.getStartTime();
      let end = ev.getEndTime();
      if (allDay) end = new Date(end.getTime() - 12 * 3600 * 1000); // einddatum is exclusief

      // aantallen: eerst "(a+b+c)" in de titel, anders de beschrijving
      let adults = null, children = null, baby = null;
      const m = title.match(/\((\d+)\s*\+\s*(\d+)(?:\s*\+\s*(\d+))?\)/);
      if (m) {
        adults = +m[1]; children = +m[2]; baby = m[3] != null ? +m[3] : 0;
      } else {
        const a = desc.match(/(\d+)\s*volwassen/i);
        const k = desc.match(/(\d+)\s*kind/i);
        const b = desc.match(/(\d+)\s*bab/i);
        if (a) { adults = +a[1]; children = k ? +k[1] : 0; baby = b ? +b[1] : 0; }
      }

      // linnen
      let linen = null;
      const lines = desc.split(/[\n.]/).filter(l => /linnen/i.test(l));
      if (lines.some(l => /niet/i.test(l))) linen = false;
      else if (lines.some(l => /voorzien|inclusief|inbegrepen/i.test(l))) linen = true;

      const priv = /priv[ée]/i.test(title + ' ' + desc);

      let name = title
        .replace(/^\s*(GEBOEKT|Coin Castor)\s*[—–-]\s*/i, '')
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/\s+[—–-]\s+.*$/, '') // alles na ' — ' weg (niet het streepje in 'Anna-Nora')
        .trim();
      if (/^priv[ée]/i.test(name)) name = null;

      return {
        type: priv ? 'private' : 'guest',
        arrival: fmtD(start), arrivalTime: allDay ? null : fmtT(start),
        departure: fmtD(end), departureTime: allDay ? null : fmtT(end),
        guestName: name || null,
        adults: adults, children: children, baby: baby,
        linenProvided: priv ? null : linen,
      };
    });
}

/**
 * TESTFUNCTIE — selecteer "testBoekingen" en klik Uitvoeren (geeft ook de
 * nodige toestemming voor de agenda). Toont wat de poetspagina zal zien.
 */
function testBoekingen() {
  Logger.log(JSON.stringify(getBookings_(), null, 2));
}

/**
 * TESTFUNCTIE — selecteer "testVertaal" in de dropdown en klik Uitvoeren,
 * bekijk het resultaat via Uitvoering weergeven / Logger.
 */
function testVertaal() {
  Logger.log(LanguageApp.translate('Het bed in de grote kamer is kapot.', 'nl', 'ru'));
  Logger.log(LanguageApp.translate('Кровать в большой комнате сломана.', 'ru', 'nl'));
}

/**
 * Hulpfunctie: stuurt een JSON-antwoord terug.
 */
function _out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
