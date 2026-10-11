(function () {
    'use strict';
    var localPath = './plugins/MovieEnhancer/MovieEnhancer.js';
    var remoteUrl = 'https://lampame.github.io/main/MovieEnhancer/MovieEnhancer.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
