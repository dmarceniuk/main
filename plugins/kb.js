(function () {
    'use strict';
    var localPath = './plugins/kinobaza/kinobaza.js';
    var remoteUrl = 'https://lampame.github.io/main/kinobaza/kinobaza.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
