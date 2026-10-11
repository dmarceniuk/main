(function () {
  'use strict';
  var localPath = './plugins/showy/online.js';
  var remoteUrl = 'http://showy.online/online.js';

  function loadRemote() {
    Lampa.Utils.putScriptAsync([remoteUrl + '?v=' + Date.now()], function () { });
  }

  Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
    loadRemote();
  });
})();
