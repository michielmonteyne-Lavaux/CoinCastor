/**
 * Coin Castor — Boekingsaanvragen → Google Agenda
 * ------------------------------------------------
 * Deze webapp ontvangt boekingsaanvragen van het formulier op coincastor.be
 * en maakt automatisch een VOORLOPIGE afspraak aan in de gedeelde agenda.
 *
 * De afspraak krijgt:
 *   - titel "AANVRAAG — Voornaam Achternaam"
 *   - oranje kleur (= visueel "nog te bevestigen")
 *   - een beschrijving met alle ingevulde gegevens + de melding dat het
 *     via het website-formulier is binnengekomen.
 *
 * Dit bestand is een referentiekopie. De code draait in werkelijkheid in
 * Google Apps Script (script.google.com), niet vanuit deze repo.
 *
 * INSTELLEN: vul hieronder bij CALENDAR_ID het ID van je gedeelde agenda in.
 */

// ── INSTELLINGEN ─────────────────────────────────────────────
// Plak hier het ID van de gedeelde agenda "Coin Castor — Boekingen".
// Vinden via: Google Agenda > bij de agenda op "..." > Instellingen >
// onderaan bij "Agenda integreren" > veld "Agenda-ID".
// Ziet eruit als: abc123...@group.calendar.google.com
const CALENDAR_ID = 'PLAK_HIER_HET_AGENDA_ID';

// Aantal nachten per type verblijf (komt overeen met de website).
const NIGHTS = { weekend: 3, midweek: 4, week: 7, verlengd: 4 };

// Leesbare labels per type verblijf.
const TYPE_LABEL = {
  weekend:  'Weekend (3 nachten)',
  midweek:  'Midweek (4 nachten)',
  week:     'Volledige week (7 nachten)',
  verlengd: 'Verlengd weekend (4 nachten)',
  aanvraag: 'Andere periode — duur op aanvraag',
};
// ─────────────────────────────────────────────────────────────


/**
 * Wordt opgeroepen wanneer het website-formulier een aanvraag doorstuurt.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const voornaam    = (data.voornaam     || '').toString().trim();
    const familienaam = (data.familienaam  || '').toString().trim();
    const naam        = (voornaam + ' ' + familienaam).trim() || 'Onbekend';
    const email       = (data.email        || '').toString().trim();
    const gezelschap  = (data.gezelschap   || '').toString().trim();
    const type        = (data.periode_type || 'aanvraag').toString().trim();
    const aankomst    = (data.aankomstdatum|| '').toString().trim();  // 'YYYY-MM-DD'
    const prijs       = (data.prijs_berekend|| '').toString().trim();
    const korting     = (data.kortingscode || '').toString().trim();
    const wensen      = (data.wensen       || '').toString().trim();

    if (!aankomst) {
      return _out({ ok: false, error: 'geen aankomstdatum ontvangen' });
    }

    // ── Datums berekenen ──
    const p = aankomst.split('-');
    const start = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const nights = NIGHTS[type];               // undefined bij type 'aanvraag'
    const end = new Date(start);
    if (nights) {
      end.setDate(start.getDate() + nights);   // einddatum = uitcheckdag (exclusief)
    } else {
      end.setDate(start.getDate() + 1);        // 'aanvraag': 1-daagse markering
    }

    // ── Agenda ophalen ──
    const cal = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!cal) {
      return _out({ ok: false, error: 'agenda niet gevonden — controleer CALENDAR_ID' });
    }

    // ── Beschrijving samenstellen ──
    const nu = Utilities.formatDate(new Date(), 'Europe/Brussels', "d/MM/yyyy 'om' HH:mm");
    const regels = [
      '📩 Binnengekomen via het boekingsformulier op coincastor.be',
      'Aangevraagd op: ' + nu,
      '',
      'Naam: ' + naam,
      'E-mail: ' + (email || '—'),
      'Gezelschap: ' + (gezelschap || '—'),
      'Type verblijf: ' + (TYPE_LABEL[type] || type),
      'Prijs (indicatief): ' + (prijs || '—'),
    ];
    if (korting) regels.push('Kortingscode: ' + korting);
    regels.push('Vragen / wensen: ' + (wensen || '—'));
    regels.push('');
    regels.push('⚠️ Dit is een AANVRAAG — nog niet bevestigd. Bevestig met de huurder, ' +
                'pas daarna de titel en kleur van deze afspraak aan.');
    const beschrijving = regels.join('\n');

    // ── Afspraak aanmaken ──
    const event = cal.createAllDayEvent('AANVRAAG — ' + naam, start, end, {
      description: beschrijving,
    });
    event.setColor(CalendarApp.EventColor.ORANGE);  // oranje = voorlopig

    return _out({ ok: true, eventId: event.getId() });

  } catch (err) {
    return _out({ ok: false, error: String(err) });
  }
}


/**
 * GET-verzoek: handig om in de browser te testen of de webapp leeft.
 */
function doGet() {
  return _out({ ok: true, status: 'Coin Castor boekings-webapp draait' });
}


/**
 * Hulpfunctie: stuurt een JSON-antwoord terug.
 */
function _out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
