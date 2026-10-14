// Game state, startup, submit flow and win screen.
var Game = (function () {
  var params = new URLSearchParams(location.search);
  var debug = params.get("debug") === "1";
  var fields = [];
  var attempts = 0;
  var startTime = 0;
  var started = false;
  var won = false;
  var timer = null;
  var secondPage = false;

  function $(id) { return document.getElementById(id); }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function elapsed() {
    var s = Math.floor((Date.now() - startTime) / 1000);
    var m = Math.floor(s / 60);
    return (m < 10 ? "0" : "") + m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }

  function status(msg) { $("status-msg").textContent = msg; }

  // Registered in form order; validation runs in the same order.
  // field: { validate: () => string|null, fill: () => void }
  function register(field) { fields.push(field); }

  // True when trolls should be active.
  function trolling() { return started && !debug && !won && !Dialog.isOpen(); }

  function busy(ms) {
    document.body.classList.add("busy");
    return new Promise(function (resolve) {
      setTimeout(function () { document.body.classList.remove("busy"); resolve(); }, ms);
    });
  }

  function splash() {
    var bar = $("splash-bar"), pct = $("splash-pct");
    if (debug) { $("splash").remove(); return Promise.resolve(); }
    return new Promise(function (resolve) {
      var p = 0;
      function set(v) { p = v; bar.style.width = v + "%"; pct.textContent = v + "%"; }
      function step() {
        if (p < 99) {
          set(Math.min(99, p + Math.floor(rand(3, 17))));
          setTimeout(step, rand(80, 350));
        } else {
          // Stall at 99% for a while, as is tradition.
          setTimeout(function () { set(100); setTimeout(function () { $("splash").remove(); resolve(); }, 250); }, 3000);
        }
      }
      step();
    });
  }

  function randomWaitCursor() {
    setTimeout(function () {
      if (trolling()) busy(rand(1000, 2000));
      randomWaitCursor();
    }, rand(20000, 40000));
  }

  function wireChrome() {
    $("tb-min").addEventListener("click", function () {
      Dialog.alert("Applet windows cannot be minimized.", "warn", "SecurityException");
    });
    $("tb-max").addEventListener("click", function () {
      Dialog.alert("This window is already at its maximum size.", "info");
    });
    $("tb-close").addEventListener("click", function () {
      Dialog.show({
        title: "Confirm", icon: "question",
        message: "Are you sure you want to close?\nYour progress will be lost.",
        buttons: ["Yes", "Also Yes"]
      }).then(function () { status("Close request denied by SecurityManager."); });
    });

    var menus = {
      File: function () { Dialog.alert("The File menu is not available in applet mode.", "warn"); },
      Edit: function () { Dialog.alert("Undo is not supported. Nothing is supported.", "warn"); },
      Help: function () {
        Dialog.exception("java.lang.NullPointerException",
          "\tat java.awt.HelpSystem.open(HelpSystem.java:42)\n" +
          "\tat com.form.Menu.actionPerformed(Menu.java:117)\n" +
          "\tat java.awt.EventDispatchThread.run(EventDispatchThread.java:85)");
      }
    };
    Array.prototype.forEach.call(document.querySelectorAll(".menu-item"), function (m) {
      m.addEventListener("click", menus[m.dataset.menu]);
    });
  }

  function wireKonami() {
    var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    var reversed = seq.slice().reverse();
    var pos = 0;
    var lastPage = secondPage;
    document.addEventListener("keydown", function (e) {
      if (won || Dialog.isOpen()) { pos = 0; return; }
      if (lastPage !== secondPage) { pos = 0; lastPage = secondPage; }
      var activeSeq = secondPage ? reversed : seq;
      pos = e.key === activeSeq[pos] ? pos + 1 : (e.key === activeSeq[0] ? 1 : 0);
      if (pos === activeSeq.length) {
        pos = 0;
        fields.forEach(function (f) {
          if ((f.page === 2) === secondPage && f.fill) f.fill();
        });
        status("Cheat code accepted. Shame.");
      }
    });
  }

  function back() {
    if (won) return;
    secondPage = false;
    $("second-frame").hidden = true;
    $("form-windows").classList.remove("has-second-page");
    $("form").inert = false;
    $("f-submit").focus();
    status("Page 1 of 2.");
  }

  function submit() {
    if (won) return;
    if (secondPage) {
      var missing = !$("f-occupation").value.trim() ? "occupation" :
        (!$("f-city").value.trim() ? "city" : null);
      if (missing) {
        attempts++;
        $("status-attempts").textContent = "Attempts: " + attempts;
        status("Validation failed.");
        Dialog.error("Please enter your " + missing + ".");
        return;
      }
      win();
      return;
    }
    attempts++;
    $("status-attempts").textContent = "Attempts: " + attempts;
    status("Validating...");

    for (var i = 0; i < fields.length; i++) {
      var err = fields[i].validate ? fields[i].validate() : null;
      if (err) {
        status("Validation failed.");
        Dialog.error(err);
        return;
      }
    }
    secondPage = true;
    $("form-windows").classList.add("has-second-page");
    $("second-frame").hidden = false;
    $("form").inert = true;
    $("second-heading").focus();
    status("Page 2 of 2.");
  }

  function win() {
    won = true;
    $("form").inert = false;
    $("f-final-submit").disabled = true;
    $("f-back").disabled = true;
    clearInterval(timer);
    var time = elapsed();
    $("win-name").textContent = $("f-name").value.trim();
    status("Submitting...");
    busy(1500)
      .then(function () { return Dialog.alert("Form submitted successfully!", "info", "Success"); })
      .then(function () { return busy(800); })
      .then(function () { return Dialog.alert("Your form has been lost.\nPlease try again.", "error", "Error"); })
      .then(function () { status("Retrying..."); return busy(2500); })
      .then(function () { showWin(time); });
  }

  function showWin(time) {
    $("desktop").hidden = true;
    $("win").hidden = false;
    $("win-time").textContent = time;
    $("win-attempts").textContent = attempts;

    // 256-color confetti.
    var colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ff8000", "#8000ff"];
    for (var i = 0; i < 120; i++) {
      var c = document.createElement("div");
      c.className = "confetti";
      c.style.left = rand(0, 100) + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = rand(2, 6) + "s";
      c.style.animationDelay = rand(0, 3) + "s";
      $("win").appendChild(c);
    }

    $("win-share").addEventListener("click", function () {
      var text = "I filled out the Form in " + time + " with " + attempts + " attempts. " + location.origin + location.pathname;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          Dialog.alert("Copied to clipboard.");
        }, function () { Dialog.alert(text); });
      } else {
        Dialog.alert(text);
      }
    });
    $("win-again").addEventListener("click", function () { location.reload(); });
  }

  function start() {
    wireChrome();
    $("f-back").addEventListener("click", back);
    $("f-final-submit").addEventListener("click", submit);
    wireKonami();
    $("second-form").addEventListener("submit", function (event) { event.preventDefault(); submit(); });
    register({ page: 2, fill: function () {
      $("f-occupation").value = "Applet developer";
      $("f-city").value = "Berlin";
    } });
    splash().then(function () {
      started = true;
      startTime = Date.now();
      timer = setInterval(function () { $("status-time").textContent = elapsed(); }, 1000);
      if (debug) status("Debug mode: trolls disabled.");
      randomWaitCursor();
    });
  }

  return {
    debug: debug,
    register: register,
    trolling: trolling,
    submit: submit,
    status: status,
    busy: busy,
    shuffle: shuffle,
    rand: rand,
    start: start
  };
})();
