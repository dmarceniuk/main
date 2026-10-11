(function () {
    'use strict';
    var localPath = './plugins/Nightingale/Nightingale.js';
    var remoteUrl = 'https://lampame.github.io/main/Nightingale/Nightingale.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
