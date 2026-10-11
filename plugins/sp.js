(function () {
    'use strict';
    var localPath = './plugins/SaloPower/SaloPower.js';
    var remoteUrl = 'https://lampame.github.io/main/SaloPower/SaloPower.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
