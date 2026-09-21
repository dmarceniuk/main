(function () {
    'use strict';

    Lampa.Utils.putScriptAsync([
        'https://dmarceniuk.github.io/main/crypto-js.min.js',
        'https://dmarceniuk.github.io/main/BanderaOnline/BanderaOnline.js'
    ], function () { });

    if (window.plugin_uaserials_btn_ready) return;
    window.plugin_uaserials_btn_ready = true;

    function addUASerialsButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                if (!render || render.find('.view--uaserials').length) return;

                var btn = $('<div class="full-start__button selector view--uaserials" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff;"><span>UASerials</span></div>');

                btn.on('hover:enter', function () {
                    Lampa.Storage.set('bandera_online_balanser', 'uaserials');
                    if (e.data && e.data.movie && e.data.movie.id) {
                        var last_select_balanser = Lampa.Storage.cache('bandera_online_last_balanser', 3000, {});
                        last_select_balanser[e.data.movie.id] = 'uaserials';
                        Lampa.Storage.set('bandera_online_last_balanser', last_select_balanser);
                    }

                    Lampa.Activity.push({
                        url: '',
                        title: "Спільнота - t.me/mmssixxx",
                        component: 'bandera_online',
                        search: e.data.movie.title,
                        search_one: e.data.movie.title,
                        search_two: e.data.movie.original_title,
                        movie: e.data.movie,
                        page: 1
                    });
                });

                var targetPos = render.find('.view--bandera-online');
                if (!targetPos.length) targetPos = render.find('.view--torrent');
                if (!targetPos.length) targetPos = render.find('.view--online');
                if (targetPos.length) targetPos.after(btn);
                else render.find('.full-start__buttons').append(btn);
            }
        });
    }

    if (window.Lampa && Lampa.Listener) {
        addUASerialsButton();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(timer);
                addUASerialsButton();
            }
        }, 200);
    }
})();
