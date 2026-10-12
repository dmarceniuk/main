(function () {
    'use strict';

    var script = document.currentScript || Array.from(document.scripts || []).pop();
    var base = (script && script.src) ? script.src.replace(/\/[^/]+$/, '') : 'https://dmarceniuk.github.io/main';
    if (base.endsWith('/plugins')) {
        base = base.replace(/\/plugins$/, '');
    }
    var remoteCrypto = base + '/crypto-js.min.js';
    var remoteBo = base + '/BanderaOnline/BanderaOnline.js';

    if (!window.CryptoJS || !window.bandera_online) {
        Lampa.Utils.putScriptAsync([remoteCrypto, remoteBo], function () { });
    }

    if (window.plugin_uaserials_btn_ready) return;
    window.plugin_uaserials_btn_ready = true;

    function addUASerialsButton() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                if (!render || render.find('.view--uaserials').length || render.find('.view--bandera-online').length) return;

                var btn = $('<div class="full-start__button selector view--uaserials" data-subtitle="UASerials.com"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 4.5V19.5L18.5 12L5 4.5Z" fill="#10b981" stroke="#059669" stroke-width="1.5" stroke-linejoin="round"/></svg><span>UASerials</span></div>');

                btn.on('hover:enter', function () {
                    Lampa.Storage.set('bandera_online_balanser', 'uaserials');
                    if (e.data && e.data.movie && e.data.movie.id) {
                        var last_select_balanser = Lampa.Storage.cache('bandera_online_last_balanser', 3000, {});
                        last_select_balanser[e.data.movie.id] = 'uaserials';
                        Lampa.Storage.set('bandera_online_last_balanser', last_select_balanser);
                    }

                    var movieTitle = (e.data && e.data.movie && (e.data.movie.title || e.data.movie.name)) || '';
                    Lampa.Activity.push({
                        url: '',
                        title: "UASerials" + (movieTitle ? " - " + movieTitle : ""),
                        component: 'bandera_online',
                        search: e.data.movie.title,
                        search_one: e.data.movie.title,
                        search_two: e.data.movie.original_title,
                        movie: e.data.movie,
                        page: 1
                    });
                });

                var boBtn = render.find('.full-start-new__buttons .view--bandera-online');
                if (boBtn.length) {
                    boBtn.after(btn);
                } else {
                    var newButtons = render.find('.full-start-new__buttons');
                    if (newButtons.length) {
                        var playBtn = newButtons.find('.button--play');
                        if (playBtn.length) playBtn.after(btn);
                        else newButtons.prepend(btn);
                    } else {
                        var classicButtons = render.find('.full-start__buttons');
                        if (classicButtons.length) {
                            var classicBo = classicButtons.find('.view--bandera-online');
                            if (classicBo.length) classicBo.after(btn);
                            else classicButtons.prepend(btn);
                        } else {
                            render.find('.full-start-new, .full-start').first().append(btn);
                        }
                    }
                }

                var container = render.find('.buttons--container');
                if (container.length && !container.find('.view--uaserials').length) {
                    var cloneBtn = btn.clone(true);
                    container.append(cloneBtn);
                }
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
