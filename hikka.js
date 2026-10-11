(function() {
  'use strict';
  var script = document.currentScript || Array.from(document.scripts).pop();
  var base = (script && script.src) ? script.src.replace(/\/[^/]+$/, '') : '.';
  var targetUrl = base + '/plugins/hikka.js';
  if (window.Lampa && Lampa.Utils && Lampa.Utils.putScriptAsync) {
    Lampa.Utils.putScriptAsync([targetUrl], function () { });
  } else {
    var s = document.createElement('script');
    s.src = targetUrl;
    document.body.appendChild(s);
  }
})();
