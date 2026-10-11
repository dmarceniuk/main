(function () {
    'use strict';
    var localPath = './plugins/TryzubTV/TryzubTV.js';
    var remoteUrl = 'https://lampame.github.io/main/TryzubTV/TryzubTV.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
