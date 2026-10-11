(function () {
    'use strict';
    var localPath = './plugins/TraktTV/TraktTV.js';
    var remoteUrl = 'https://lampame.github.io/main/TraktTV/TraktTV.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
