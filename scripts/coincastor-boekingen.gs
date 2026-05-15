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
 * LET OP: na elke wijziging in script.google.com moet je opnieuw publiceren
 * (Implementeren > Implementaties beheren > potlood > Versie "Nieuwe versie"),
 * anders blijft de website de oude versie aanspreken.
 */

// ── INSTELLINGEN ──
const CALENDAR_ID = 'b16df7230206f1834b7d72a891b32a4b272912885f40d28268df3f84ac658484@group.calendar.google.com';

const NIGHTS = { weekend: 3, midweek: 4, week: 7, verlengd: 4 };

const TYPE_LABEL = {
  weekend:  'Weekend (3 nachten)',
  midweek:  'Midweek (4 nachten)',
  week:     'Volledige week (7 nachten)',
  verlengd: 'Verlengd weekend (4 nachten)',
  aanvraag: 'Andere periode — duur op aanvraag',
};
// ──────────────────


/**
 * TESTFUNCTIE — selecteer "testAgenda" in de dropdown en klik Uitvoeren.
 * Vertelt of de agenda gevonden wordt, en zo niet: welke wél zichtbaar zijn.
 */
function testAgenda() {
  Logger.log('Gezocht CALENDAR_ID: ' + CALENDAR_ID);
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (cal) {
    Logger.log('✅ Agenda gevonden: "' + cal.getName() + '"');
    const ev = cal.createAllDayEvent('TEST — mag verwijderd worden', new Date());
    Logger.log('✅ Test-afspraak aangemaakt. Event-id: ' + ev.getId());
    Logger.log('Kijk nu in Google Agenda of die TEST-afspraak van vandaag zichtbaar is.');
  } else {
    Logger.log('❌ Agenda NIET gevonden met dit ID.');
    Logger.log('--- Agenda\'s die dit account WEL kan zien: ---');
    CalendarApp.getAllCalendars().forEach(function(c) {
      Logger.log('  "' + c.getName() + '"  →  ' + c.getId());
    });
  }
}


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
      throw new Error('Agenda niet gevonden met CALENDAR_ID: ' + CALENDAR_ID);
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

    Logger.log('Afspraak aangemaakt: ' + event.getId());
    return _out({ ok: true, eventId: event.getId() });

  } catch (err) {
    Logger.log('FOUT: ' + err);
    return _out({ ok: false, error: String(err) });
  }
}


/**
 * GET-verzoek: geeft de geboekte periodes uit de gedeelde agenda terug als
 * JSON, zodat de kalender op coincastor.be ze kan tonen als "geboekt".
 * Alleen datums worden teruggegeven — geen namen, e-mails of details.
 */
function doGet() {
  try {
    const cal = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!cal) {
      return _out({ ok: false, error: 'agenda niet gevonden' });
    }

    const now = new Date();
    const van = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tot = new Date(van);
    tot.setFullYear(tot.getFullYear() + 2);  // 2 jaar vooruit kijken

    const periods = cal.getEvents(van, tot).map(function(ev) {
      var fromStr, toStr;
      if (ev.isAllDayEvent()) {
        // All-day datums teruggeven in de tijdzone van de agenda (Brussel).
        // De einddatum is exclusief (= uitcheckdag), dus 1 dag terug voor
        // de laatste overnachting.
        fromStr = Utilities.formatDate(ev.getAllDayStartDate(), 'Europe/Brussels', 'yyyy-MM-dd');
        var endStr = Utilities.formatDate(ev.getAllDayEndDate(), 'Europe/Brussels', 'yyyy-MM-dd');
        toStr = _minusOneDay(endStr);
      } else {
        fromStr = Utilities.formatDate(ev.getStartTime(), 'Europe/Brussels', 'yyyy-MM-dd');
        toStr   = Utilities.formatDate(ev.getEndTime(), 'Europe/Brussels', 'yyyy-MM-dd');
      }
      return { from: fromStr, to: toStr };
    });

    return _out({ ok: true, periods: periods });
  } catch (err) {
    return _out({ ok: false, error: String(err) });
  }
}

/**
 * Trekt één dag af van een 'yyyy-MM-dd'-string (DST-veilig via UTC).
 */
function _minusOneDay(ymd) {
  var p = ymd.split('-');
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  d.setUTCDate(d.getUTCDate() - 1);
  return Utilities.formatDate(d, 'GMT', 'yyyy-MM-dd');
}


/**
 * Hulpfunctie: stuurt een JSON-antwoord terug.
 */
function _out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
