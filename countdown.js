// Countdown to the party, shared by the invitation and the guest space.
// It reads the event date/time as typed in the admin ("Samedi 19 décembre
// 2026", "18h00") and updates days / hours / minutes every 20 seconds.
(function(){
  var MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var DEFAULT = { date: 'Samedi 19 décembre 2026', heure: '18h00' };

  // Paris time: +01:00 in winter, +02:00 from the last Sunday of March to the
  // last Sunday of October.
  function parisOffset(year, monthIndex, day){
    function lastSunday(m){ var d = new Date(Date.UTC(year, m + 1, 0)); return d.getUTCDate() - d.getUTCDay(); }
    var after = monthIndex > 2 || (monthIndex === 2 && day >= lastSunday(2));
    var before = monthIndex < 9 || (monthIndex === 9 && day < lastSunday(9));
    return after && before ? '+02:00' : '+01:00';
  }

  function parse(dateText, timeText){
    var text = String(dateText || '').toLowerCase();
    var day, month, year;
    var m = text.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/);
    if(m && MONTHS.indexOf(m[2]) !== -1){
      day = Number(m[1]); month = MONTHS.indexOf(m[2]); year = Number(m[3]);
    } else if((m = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))){
      day = Number(m[1]); month = Number(m[2]) - 1; year = Number(m[3]);
    } else {
      return null;
    }
    var t = String(timeText || '').match(/(\d{1,2})\s*[h:]\s*(\d{2})?/i);
    var hours = t ? Number(t[1]) : 0, minutes = t && t[2] ? Number(t[2]) : 0;
    function pad(n){ return String(n).padStart(2, '0'); }
    var iso = year + '-' + pad(month + 1) + '-' + pad(day) + 'T' + pad(hours) + ':' + pad(minutes) + ':00' + parisOffset(year, month, day);
    var date = new Date(iso);
    return isNaN(date) ? null : date;
  }

  var state = { target: parse(DEFAULT.date, DEFAULT.heure), date: DEFAULT.date, heure: DEFAULT.heure, roots: [] };

  function render(){
    var left = state.target ? state.target.getTime() - Date.now() : 0;
    state.roots.forEach(function(root){
      var units = root.querySelector('.cd-units');
      var done = root.querySelector('.cd-done');
      if(left <= 0){
        units.hidden = true; done.hidden = false;
      } else {
        units.hidden = false; done.hidden = true;
        var mins = Math.floor(left / 60000);
        root.querySelector('[data-cd="d"]').textContent = Math.floor(mins / 1440);
        root.querySelector('[data-cd="h"]').textContent = String(Math.floor(mins / 60) % 24).padStart(2, '0');
        root.querySelector('[data-cd="m"]').textContent = String(mins % 60).padStart(2, '0');
      }
      var when = root.querySelector('.cd-when');
      if(when) when.textContent = state.date + (state.heure ? ' · ' + state.heure : '');
    });
  }

  window.PartyCountdown = {
    // Attach to every element with data-countdown already in the page.
    start: function(){
      state.roots = [].slice.call(document.querySelectorAll('[data-countdown]'));
      render();
      setInterval(render, 20000);
    },
    // Called once the saved event details are loaded.
    setEvent: function(dateText, timeText){
      var target = parse(dateText || state.date, timeText || state.heure);
      if(target){ state.target = target; }
      if(dateText) state.date = dateText;
      if(timeText) state.heure = timeText;
      render();
    }
  };
})();
