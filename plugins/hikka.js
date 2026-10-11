(function () {
    'use strict';
    var localPath = './plugins/hikka/hikka.js';
    var remoteUrl = 'https://lampame.github.io/main/hikka/hikka.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
