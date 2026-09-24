/*
 * Coin Castor — gedeelde agenda van tijdsgebonden activiteiten in de buurt.
 * EEN lijst voor alle huurderspagina's: elke overzichtspagina toont automatisch
 * enkel de items die overlappen met het verblijf (data-from / data-to op #agenda).
 *
 * Nieuw item toevoegen: kopieer een regel, vul start/end in (YYYY-MM-DD, end mag
 * gelijk zijn aan start). 'note' = optionele extra waarschuwing (bv. data nog
 * niet bevestigd). Oude items mogen blijven staan, ze verschijnen niet meer.
 */
var COIN_AGENDA = [
  { start: '2026-09-01', end: '2026-12-01', icon: '🖼️', title: 'Expo "Cheveux & autres poils"', place: 'Espace culturel, Trois-Ponts', desc: 'Kunsttentoonstelling in het cultureel centrum. Di–vr 10u–17u, weekend 14u–17u.', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-09-15', end: '2026-10-15', icon: '🦌', title: 'Bronstseizoen van de herten', place: 'Overal in de bossen rond het huis', desc: 'Half september tot half oktober burlen de herten. Ga bij valavond even stil buiten staan of wandel naar de bosrand. Kans is groot dat je ze hoort!' },
  { start: '2026-09-25', end: '2026-09-25', icon: '🎉', title: 'Groot feest op de Place du Marché', place: 'Trois-Ponts · 5 min. rijden', desc: 'Dorpsfeest op het marktplein van Trois-Ponts.', url: 'https://www.haute-ardenne.be/en/events' },
  { start: '2026-09-26', end: '2026-09-26', icon: '🚵', title: 'Be Activ-dag', place: 'Baraque de Fraiture · ca. 25 min. rijden', desc: 'Sport- en activiteitendag aan het skistation van Baraque de Fraiture.', url: 'https://www.haute-ardenne.be/en/events' },
  { start: '2026-09-27', end: '2026-09-27', icon: '💿', title: 'Vinylbeurs', place: 'Lierneux · ca. 15 min. rijden', desc: 'Beurs om platen te kopen en te ruilen.', url: 'https://www.haute-ardenne.be/en/events' },
  { start: '2026-09-27', end: '2026-09-27', icon: '🧺', title: 'Rommelmarkt', place: 'Rencheux (Vielsalm) · ca. 15 min. rijden', desc: 'Rommelmarkt in het dorp Rencheux.', url: 'https://www.haute-ardenne.be/en/events' },
  { start: '2026-10-09', end: '2026-10-10', icon: '🎶', title: 'Concerten in de kelders van de abdij', place: 'Abbaye de Stavelot · 15 min. rijden', desc: 'Vrijdag hiphop (Cinsi + Nicou), zaterdag Franstalig chanson (Muriel d\'Ailleurs + Saule).', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-10-10', end: '2026-10-10', icon: '🏃', title: 'Night Marathon', place: 'Circuit Spa-Francorchamps · ca. 20 min. rijden', desc: 'Lopen bij nacht op het circuit, met hoofdlamp de Raidillon op: 7, 14, 21 of 42 km. Ook leuk om te komen supporteren.', url: 'https://www.night-marathon.com/' },
  { start: '2026-10-17', end: '2026-11-08', icon: '🎃', title: 'Halloween met de Smurfen', place: 'Plopsaland Ardennes, Coo · 10 min. rijden', desc: 'Het hele park in Halloween-sfeer, met shows van Gargamel & Azrael en Smurfen in griezelkostuum.', url: 'https://www.plopsa.com/nl/plopsaland-ardennes' },
  { start: '2026-10-18', end: '2026-10-18', icon: '🕺', title: 'Superska — dansles voor kinderen', place: 'Espace culturel, Trois-Ponts', desc: 'Swingende dansles op rock, ska en jazz voor jong publiek.', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-10-22', end: '2026-10-22', icon: '🎺', title: 'Concert Mathilde Renault & Antoine Dawans', place: 'Réfectoire des Moines, Stavelot', desc: 'Akoestische jazz-pop met piano, zang en trompet.', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-11-08', end: '2026-11-08', icon: '📷', title: 'Fotowandeling in Logbiermé', place: 'Logbiermé (Wanne) · 5 min. rijden', desc: 'Begeleide fotowandeling door de Ardense bossen, vlak bij het huis.', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-11-13', end: '2026-11-14', icon: '🎷', title: 'Jazzweekend "Hommage à Steve"', place: 'Abbaye de Stavelot · 15 min. rijden', desc: 'Expo en jazzconcerten ter ere van saxofonist Steve Houben.', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-11-27', end: '2026-12-20', icon: '🎄', title: 'Kerstmarkt Monschau', place: 'Monschau (DE) · ca. 45 min. rijden', desc: 'Sfeervolle kerstmarkt in het verlichte oude stadje. Enkel in de adventsweekends: vr & za 11u–21u, zo 11u–20u.', url: 'https://www.monschau.de/tourismus/weihnachtsmarkt/' },
  { start: '2026-11-27', end: '2027-01-03', icon: '🎄', title: 'Cité de Noël', place: 'Malmedy · 15 min. rijden', desc: 'Kerstmarkt in het centrum van Malmedy.', url: 'https://www.citedenoel.be/', note: 'Vorig jaar liep de markt tot begin januari. Check de website voor de data van dit jaar.' },
  { start: '2026-11-27', end: '2026-12-30', icon: '⛸️', title: 'Village de Noël & schaatsbaan', place: 'Luik · ca. 50 min. rijden', desc: 'Een van de grootste kerstmarkten van België, met een schaatsbaan die meestal tot begin januari open blijft.', url: 'https://www.villagedenoel.be/programme', note: 'Vorig jaar tot 30 december (schaatsbaan tot 3 januari). Check de website voor de data van dit jaar.' },
  { start: '2026-12-26', end: '2027-01-02', icon: '🏰', title: 'Kerstmarkt op kasteel Reinhardstein', place: 'Robertville · ca. 30 min. rijden', desc: 'Kerstmarkt in en rond het middeleeuwse kasteel boven de stuwdam.', note: 'Data gebaseerd op vorig jaar. Even checken voor je vertrekt.' },
  { start: '2026-12-27', end: '2026-12-27', icon: '🔮', title: '"La Boule Enchantée" — kindervoorstelling', place: 'Réfectoire des Moines, Stavelot', desc: 'Muzikale voorstelling met poppen, schaduwtheater en zandanimatie (vanaf 4 jaar).', url: 'https://www.ccstp.be/agenda/liste/' },
  { start: '2026-12-30', end: '2026-12-30', icon: '🐘', title: '"Chromatique" — dansvoorstelling voor kinderen', place: 'Espace culturel, Trois-Ponts', desc: 'Hedendaagse versie van Saint-Saëns\' Carnaval der dieren (vanaf 2,5 jaar).', url: 'https://www.ccstp.be/agenda/liste/' }
];

(function () {
  var el = document.getElementById('agenda');
  if (!el) return;
  var sec = el.closest('section');
  var from = el.getAttribute('data-from'), to = el.getAttribute('data-to');
  var M = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  function d(s) { var p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  function fmt(s) { var x = d(s); return x.getDate() + ' ' + M[x.getMonth()]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var items = COIN_AGENDA.filter(function (e) { return e.start <= to && e.end >= from; })
    .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  if (!items.length) { if (sec) sec.style.display = 'none'; return; }
  el.innerHTML = items.map(function (e) {
    var when = e.start === e.end ? fmt(e.start) : fmt(e.start) + ' – ' + fmt(e.end);
    return '<div class="ag-item">' +
      '<div class="ag-date">' + esc(when) + '</div>' +
      '<div class="ag-body">' +
        '<h3>' + (e.icon ? e.icon + ' ' : '') + esc(e.title) + '</h3>' +
        '<p class="ag-place">' + esc(e.place) + '</p>' +
        '<p>' + esc(e.desc) + '</p>' +
        (e.note ? '<p class="ag-note">⚠️ ' + esc(e.note) + '</p>' : '') +
        (e.url ? '<a class="ag-link" href="' + esc(e.url) + '" target="_blank" rel="noopener">Meer info →</a>' : '') +
      '</div></div>';
  }).join('');
})();
