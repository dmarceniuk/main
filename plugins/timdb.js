(function () {
    'use strict';
    var localPath = './plugins/imdb_trailers/imdb_trailers.js';
    var remoteUrl = 'https://lampame.github.io/main/imdb_trailers/imdb_trailers.js';
    Lampa.Utils.putScriptAsync([localPath], function () { }, function () {
        Lampa.Utils.putScriptAsync([remoteUrl], function () { });
    });
})();
