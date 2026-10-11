(function () {
    'use strict';
    var localPath = './plugins/NightingaleNotifications/NightingaleNotifications.js';
    var remoteUrl = 'https://lampame.github.io/main/NightingaleNotifications/NightingaleNotifications.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
