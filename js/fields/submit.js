// Submit: teleports a couple of times, and keeps turning into a "Cancel" button that clears a field.
(function () {
  var btn = document.getElementById("f-submit");
  var CLEARABLE = { "f-name": "name", "f-email": "e-mail address", "f-pass2": "password confirmation" };
  var cancelMode = false;

  if (!Game.debug) {
    makeEvasive(btn, { radius: 50, maxEscapes: 2, enabled: Game.trolling });

    (function cycle() {
      cancelMode = !cancelMode && Game.trolling();
      btn.textContent = cancelMode ? "Cancel" : "Next";
      setTimeout(cycle, cancelMode ? 600 : 1300);
    })();
  }

  btn.addEventListener("click", function () {
    if (!cancelMode) { Game.submit(); return; }

    var filled = Object.keys(CLEARABLE).filter(function (id) { return document.getElementById(id).value; });
    if (!filled.length) {
      Dialog.alert("Form cancelled. There was nothing to clear, so nothing happened.", "info", "Cancelled");
      return;
    }
    var id = filled[Math.floor(Math.random() * filled.length)];
    var input = document.getElementById(id);
    input.value = "";
    input.dispatchEvent(new Event("input"));
    Dialog.alert("Form cancelled. Your " + CLEARABLE[id] + " has been cleared.", "info", "Cancelled");
  });
})();
