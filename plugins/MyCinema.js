(function () {
    'use strict';

    // Основной объект плагина
    var CinemaByWolf = {
        name: 'cinemabywolf',
        version: '1.0.0',
        debug: true,
        settings: {
            enabled: true,
            show_ru: false,
            show_en: false,
            show_ua: false
        }
    };

    // Список русских кинотеатров
    var RU_CINEMAS = [
        { name: 'Start', networkId: '2493' },
        { name: 'Premier', networkId: '2859' },
        { name: 'KION', networkId: '4085' },
        { name: 'Okko', networkId: '3871' },
        { name: 'КиноПоиск', networkId: '3827' },
        { name: 'Wink', networkId: '5806' },
        { name: 'ИВИ', networkId: '3923' },
        { name: 'Смотрим', networkId: '5000' },
        { name: 'Первый', networkId: '558' },
        { name: 'СТС', networkId: '806' },
        { name: 'ТНТ', networkId: '1191' },
	    { name: 'Пятница', networkId: '3031' },
        { name: 'Россия 1', networkId: '412' },
        { name: 'НТВ', networkId: '1199' }
    ];
    // Список иностранных кинотеатров
    var EN_CINEMAS = [
// Глобальні стрімінги (Originals)
    { name: 'Netflix', networkId: '213' },
    { name: 'Apple TV+', networkId: '2552' },
    { name: 'Disney+', networkId: '2739' },
    { name: 'HBO Max', networkId: '3186' },
    { name: 'Amazon Prime', networkId: '1024' },
    
    // Фантастика та жанрове кіно
    { name: 'SYFY', networkId: '77' },        // Головний канал фантастики
    { name: 'AMC', networkId: '174' },       // Ходячі мерці, Інтерв'ю з вампіром
    { name: 'Paramount+', networkId: '4330' }, // Star Trek (Зоряний шлях)
    { name: 'Peacock', networkId: '3353' },
    { name: 'Hulu', networkId: '453' },

    // Британське кіно та серіали (UK)
    { name: 'BBC One', networkId: '4' },      // Доктор Хто, Шерлок
    { name: 'ITV1', networkId: '9' },         // Класичні британські серіали
    { name: 'Channel 4', networkId: '45' },   // Чорне дзеркало (початкові сезони), Утопія
    { name: 'Sky Sci-Fi', networkId: '5647' } // Спеціалізований канал фантастики Sky
    ];
    // Список украинских кинотеатров
    var UA_CINEMAS = [
    { name: 'Megogo', networkId: '4454' },
    { name: 'Sweet.tv', networkId: '5444' },
    { name: 'Kyivstar TV', networkId: '5625' },
    { name: 'Takflix', networkId: '5413' },
    { name: '1+1', networkId: '1254' },
    { name: 'ICTV', networkId: '1166' },
    { name: 'СТБ', networkId: '1206' },
    { name: 'Новий канал', networkId: '1211' },
    { name: 'Інтер', networkId: '1157' },
    { name: '2+2', networkId: '1259' },
    { name: 'ТЕТ', networkId: '1215' },
    { name: 'НТН', networkId: '1161' },
    { name: 'UA: Перший', networkId: '1264' }
    ];

    // Локализация
    function addLocalization() {
        if (Lampa && Lampa.Lang) {
            Lampa.Lang.add({
                cinemabywolf_ru: {
					ua: 'RU Кінотеатри',
                    ru: 'RU Кінотеатри',
                    en: 'RU Cinemas'
                },
                cinemabywolf_en: {
					ua: 'EN Кінотеатри',
                    ru: 'EN Кінотеатри',
                    en: 'EN Cinemas'
                },
                cinemabywolf_ua: {
					ua: 'UA Кінотеатри',
                    ru: 'UA Кінотеатри',
                    en: 'UA Cinemas'
                },
                cinemabywolf_title: {
					ua: 'Онлайн Кінотеатри',
                    ru: 'Онлайн Кінотеатри',
                    en: 'Online Cinemas'
                }
            });
        }
    }

    // SVG иконки
    function getSVGIcon(type) {
        if (type === 'ru') {
            return '<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="8" y="0" fill="#fff"/><rect width="24" height="8" y="8" fill="#0039a6"/><rect width="24" height="8" y="16" fill="#d52b1e"/></svg>';
        } else {
            return '<svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#00247d"/><text x="12" y="16" font-size="12" fill="#fff" text-anchor="middle" font-family="Arial">EN</text></svg>';
        }
    }

    // Удалить кнопки из главного меню
    function removeMenuButtons() {
        $('.cinemabywolf-btn-ru').remove();
        $('.cinemabywolf-btn-en').remove();
        $('.cinemabywolf-btn-ua').remove();
    }

    // Добавление кнопок в главное меню (в стиле @cinemas.js)
    function addMenuButtons() {
        if (CinemaByWolf.debug) {
            console.log('cinemabywolf: addMenuButtons вызвана');
            console.log('cinemabywolf: show_ru =', CinemaByWolf.settings.show_ru);
            console.log('cinemabywolf: show_en =', CinemaByWolf.settings.show_en);
            console.log('cinemabywolf: show_ua =', CinemaByWolf.settings.show_ua);
        }

        // Удаляем существующие кнопки, если они есть
        $('.menu__item.cinemabywolf-btn-ru, .menu__item.cinemabywolf-btn-en, .menu__item.cinemabywolf-btn-ua').remove();

        var $menu = $('.menu .menu__list').eq(0);
        if (!$menu.length) {
            if (CinemaByWolf.debug) {
                console.log('cinemabywolf: меню не найдено');
            }
            return;
        }

        // RU Кинотеатры
        if (String(CinemaByWolf.settings.show_ru).toLowerCase() !== 'false') {
            if (CinemaByWolf.debug) {
                console.log('cinemabywolf: добавляем RU кнопку');
            }
            var ico = `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 48 48">
                <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="38" 
                      font-weight="700" fill="currentColor" dominant-baseline="middle">
                    RU
                </text>
            </svg>`;
            var $btnRU = $(`
                <li class="menu__item selector cinemabywolf-btn-ru">
                    <div class="menu__ico">${ico}</div>
                    <div class="menu__text">Кінотеатри</div>
                </li>
            `);
            $btnRU.on('hover:enter', function () {
                openCinemasModal('ru');
            });
            $menu.append($btnRU);
        }

        // EN Кинотеатры
        if (String(CinemaByWolf.settings.show_en).toLowerCase() !== 'false') {
            if (CinemaByWolf.debug) {
                console.log('cinemabywolf: добавляем EN кнопку');
            }
            var ico = `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 48 48">
                <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="38" 
                      font-weight="700" fill="currentColor" dominant-baseline="middle">
                    EN
                </text>
            </svg>`;
            var $btnEN = $(`
                <li class="menu__item selector cinemabywolf-btn-en">
                    <div class="menu__ico">${ico}</div>
                    <div class="menu__text">Кінотеатри</div>
                </li>
            `);
            $btnEN.on('hover:enter', function () {
                openCinemasModal('en');
            });
            $menu.append($btnEN);
        }

        // UA Кинотеатры
        if (String(CinemaByWolf.settings.show_ua).toLowerCase() !== 'false') {
            if (CinemaByWolf.debug) {
                console.log('cinemabywolf: добавляем UA кнопку');
            }
            var ico = `<svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 48 48">
                <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="38" 
                      font-weight="700" fill="currentColor" dominant-baseline="middle">
                    UA
                </text>
            </svg>`;
            var $btnUA = $(`
                <li class="menu__item selector cinemabywolf-btn-ua">
                    <div class="menu__ico">${ico}</div>
                    <div class="menu__text">Кінотеатри</div>
                </li>
            `);
            $btnUA.on('hover:enter', function () {
                openCinemasModal('ua');
            });
            $menu.append($btnUA);
        }
    }

    // Получить объект сети TMDB по networkId
    function getNetworkData(networkId) {
        if (Lampa && Lampa.TMDB && Lampa.TMDB.networks) {
            for (var i = 0; i < Lampa.TMDB.networks.length; i++) {
                if (String(Lampa.TMDB.networks[i].id) === String(networkId)) {
                    return Lampa.TMDB.networks[i];
                }
            }
        }
        return null;
    }

    // Получить logo_path из Lampa.TMDB.networks
    function getLogoPathFromCache(networkId) {
        if (Lampa && Lampa.TMDB && Lampa.TMDB.networks) {
            for (var i = 0; i < Lampa.TMDB.networks.length; i++) {
                if (String(Lampa.TMDB.networks[i].id) === String(networkId)) {
                    return Lampa.TMDB.networks[i].logo_path || null;
                }
            }
        }
        return null;
    }

    // Получить логотип (асинхронно): только из кэша Lampa.TMDB.networks, иначе буква
    function getCinemaLogo(networkId, name, callback) {
        var logoPath = getLogoPathFromCache(networkId);
        if (logoPath) {
            var url = Lampa.TMDB && Lampa.TMDB.image ? Lampa.TMDB.image('t/p/w300' + logoPath) : 'https://image.tmdb.org/t/p/w300' + logoPath;
            callback('<img src="' + url + '" alt="' + name + '" style="max-width:68px;max-height:68px;">');
            return;
        }
        // Пробуем через прокси (как в @cinemas.js)
        var apiUrl = Lampa.TMDB.api('network/' + networkId + '?api_key=' + Lampa.TMDB.key());
        $.ajax({
            url: apiUrl,
            type: 'GET',
            success: function (data) {
                if (data && data.logo_path) {
                    var imgUrl = Lampa.TMDB && Lampa.TMDB.image ? Lampa.TMDB.image('t/p/w300' + data.logo_path) : 'https://image.tmdb.org/t/p/w300' + data.logo_path;
                    callback('<img src="' + imgUrl + '" alt="' + name + '" style="max-width:68px;max-height:68px;">');
                } else {
                    callback('<div style="font-size:22px;line-height:44px;color:#222;font-weight:bold;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">' + name.charAt(0) + '</div>');
                }
            },
            error: function () {
                callback('<div style="font-size:22px;line-height:68px;color:#222;font-weight:bold;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">' + name.charAt(0) + '</div>');
            }
        });
    }

    // Открытие каталога только сериалов по networkId
    function openCinemaCatalog(networkId, name) {
        var sort = CinemaByWolf.settings.sort_mode;
        // Для сериалов корректируем сортировку по дате
        if (sort === 'release_date.desc') sort = 'first_air_date.desc';
        if (sort === 'release_date.asc') sort = 'first_air_date.asc';
        Lampa.Activity.push({
            url: 'discover/tv',
            title: name,
            networks: networkId,
            sort_by: sort,
            component: 'category_full',
            source: 'tmdb',
            card_type: true,
            page: 1
        });
    }

    // --- Контроллер для карточек кинотеатров ---
    function activateCardsController($container) {
        var name = 'cinemabywolf-cards';
        var $cards = $container.find('.cinemabywolf-card.selector');
        var lastFocus = 0;
        function getCardsPerRow() {
            if ($cards.length < 2) return 1;
            var firstTop = $cards.eq(0).offset().top;
            for (var i = 1; i < $cards.length; i++) {
                if ($cards.eq(i).offset().top !== firstTop) {
                    return i;
                }
            }
            return $cards.length;
        }
        function updateFocus(index) {
            $cards.removeClass('focus').attr('tabindex', '-1');
            if ($cards.eq(index).length) {
                $cards.eq(index).addClass('focus').attr('tabindex', '0').focus();
                // Прокрутка к карточке, если она не видна
                var card = $cards.get(index);
                if (card && card.scrollIntoView) {
                    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
                lastFocus = index;
            }
        }
        Lampa.Controller.add(name, {
            toggle: function() {
                Lampa.Controller.collectionSet($container);
                updateFocus(lastFocus);
            },
            up: function() {
                var perRow = getCardsPerRow();
                var idx = lastFocus - perRow;
                if (idx >= 0) updateFocus(idx);
            },
            down: function() {
                var perRow = getCardsPerRow();
                var idx = lastFocus + perRow;
                if (idx < $cards.length) updateFocus(idx);
            },
            left: function() {
                var idx = lastFocus - 1;
                if (idx >= 0) updateFocus(idx);
            },
            right: function() {
                var idx = lastFocus + 1;
                if (idx < $cards.length) updateFocus(idx);
            },
            back: function() {
                Lampa.Modal.close();
                Lampa.Controller.toggle('menu');
            },
            enter: function() {
                $cards.eq(lastFocus).trigger('hover:enter');
            }
        });
        Lampa.Controller.toggle(name);
    }

    // Открытие модального окна с кинотеатрами (с логотипами и фильтрацией)
    function openCinemasModal(type) {
        var cinemas = type === 'ru' ? RU_CINEMAS : type === 'en' ? EN_CINEMAS : UA_CINEMAS;
        var enabled = type === 'ru' ? CinemaByWolf.settings.ru_cinemas : type === 'en' ? CinemaByWolf.settings.en_cinemas : CinemaByWolf.settings.ua_cinemas;
        var filtered = [];
        for (var i = 0; i < cinemas.length; i++) {
            if (enabled[cinemas[i].networkId]) filtered.push(cinemas[i]);
        }
        var titleText = type === 'ru' ? 'Російські онлайн кінотеатри' : type === 'en' ? 'Іноземні онлайн кінотеатри' : 'Українські онлайн кінотеатри';
        var svgIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#00dbde" stroke-width="2"/><polygon points="10,9 16,12 10,15" fill="#fc00ff"/></svg>';
        var $header = $('<div class="cinemabywolf-modal-header"></div>');
        $header.append(svgIcon);
        $header.append('<span class="cinemabywolf-modal-title">' + titleText + '</span>');
        var $container = $('<div class="cinemabywolf-cards"></div>');
        for (var j = 0; j < filtered.length; j++) {
            (function (c) {
                var $card = $('<div class="cinemabywolf-card selector"></div>');
                var $logo = $('<div class="cinemabywolf-card__logo"></div>');
                getCinemaLogo(c.networkId, c.name, function(logoHtml) {
                    $logo.html(logoHtml);
                });
                $card.append($logo);
                $card.append('<div class="cinemabywolf-card__name">' + c.name + '</div>');
                $card.on('hover:enter', function () {
                    Lampa.Modal.close();
                    openCinemaCatalog(c.networkId, c.name);
                });
                $container.append($card);
            })(filtered[j]);
        }
        var $wrap = $('<div></div>');
        $wrap.append($header).append($container);
        Lampa.Modal.open({
            title: '',
            html: $wrap,
            onBack: function () {
                Lampa.Modal.close();
                Lampa.Controller.toggle('menu');
            },
            size: 'full'
        });
        setTimeout(function() {
            activateCardsController($container);
        }, 100);
    }

    // Добавление стилей
    function addStyles() {
        var style = '<style id="cinemabywolf-styles">'
            + '.cinemabywolf-cards { max-height: 70vh; overflow-y: auto; display: flex; flex-wrap: wrap; justify-content: center; border-radius: 18px; }'
            + '.cinemabywolf-cinema-btns { max-height: 70vh; overflow-y: auto; width: 100%; padding-right: 8px; }'
            + '.cinemabywolf-cinema-btn {  max-width: 500px; min-width: 260px; margin: 0 auto 18px auto; display: flex; align-items: center; justify-content: flex-start; padding: 0 0 0 32px; height: 68px; font-size: 1.6em !important; color: #888; background: rgba(24,24,40,0.95); border-radius: 14px; transition: background 0.2s, color 0.2s, opacity 0.2s; }'
            + '.cinemabywolf-cinema-btn__icon { font-size: 1.3em; margin-right: 24px; width: 32px; display: flex; align-items: center; justify-content: center; }'
            + '.cinemabywolf-cinema-btn.enabled .cinemabywolf-cinema-btn__icon { color: #fff; }'
            + '.cinemabywolf-cinema-btn:not(.enabled) .cinemabywolf-cinema-btn__icon { color: #666; }'
            + '.cinemabywolf-cinema-btn.enabled .cinemabywolf-cinema-btn__name { color: #fff; }'
            + '.cinemabywolf-cinema-btn:not(.enabled) .cinemabywolf-cinema-btn__name { color: #888; opacity: 0.7; }'
            + '.cinemabywolf-cinema-btn.focus { background: linear-gradient(90deg, #e94057 0%, #f27121 100%); color: #fff !important; outline: none; box-shadow: 0 0 0 2px #e94057, 0 0 12px #f27121; }'
            + '.cinemabywolf-card { width: 120px; height: 120px; background: rgba(24,24,40,0.95); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: box-shadow 0.2s, background 0.2s; margin: 12px; box-shadow: 0 2px 12px rgba(233, 64, 87, 0.08); border: 1.5px solid rgba(233, 64, 87, 0.08); }'
            + '.cinemabywolf-card.selector:focus, .cinemabywolf-card.selector:hover { box-shadow: 0 0 24px #e94057, 0 0 30px #f27121; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); outline: none; border: 1.5px solid #e94057; }'
            + '.cinemabywolf-card__logo { width: 84px; height: 84px; background: #918d8db8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #222; font-weight: bold; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(233, 64, 87, 0.08); }'
            + '.cinemabywolf-card__name { color: #fff; font-size: 16px; text-align: center; text-shadow: 0 2px 8px rgba(233, 64, 87, 0.15); }'
            + '.cinemabywolf-modal-header { display: flex; flex-direction: row; align-items: center; justify-content: center; margin-bottom: 28px; width: 100%; }'
            + '.cinemabywolf-modal-header svg { width: 34px !important; height: 34px !important; min-width: 34px; min-height: 34px; max-width: 34px; max-height: 34px; display: inline-block; flex-shrink: 0; margin-right: 16px; }'
            + '.cinemabywolf-modal-title { font-size: 1.6em; font-weight: bold; color: #fff; background: linear-gradient(90deg, #8a2387, #e94057, #f27121); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; max-width: 90vw; word-break: break-word; white-space: normal; display: inline-block; text-shadow: 0 2px 8px rgba(233, 64, 87, 0.15); }'
            + '.ru-cinema-row.selector:focus, .en-cinema-row.selector:focus { outline: none; border-radius: 8px; box-shadow: 0 0 0 2px #e94057, 0 0 12px #f27121; background: linear-gradient(90deg, #2a2a2a 60%, #e94057 100%); color: #fff; }'
            + '@media (max-width: 600px) { .cinemabywolf-modal-title { font-size: 1em; } }'
            + '</style>';
        if (!$('#cinemabywolf-styles').length) $('head').append(style);
    }

    // --- НАСТРОЙКИ ---
    var STORAGE_KEY = 'cinemabywolf_settings';
    // Список режимов сортировки TMDB
    var SORT_MODES = {
        'popularity.desc': 'Популярны',
        'release_date.desc': 'По даті (новіші)',
        'release_date.asc': 'По даті (старіші)',
        'vote_average.desc': 'По рейтингу',
        'vote_count.desc': 'По кількості голосів'
    };

    // Загрузка настроек из localStorage
    function loadSettings() {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (CinemaByWolf.debug) {
            console.log('cinemabywolf: загружаєм настройки з localStorage', saved);
        }
        if (saved) {
            try {
                var obj = JSON.parse(saved);
                for (var k in obj) {
                    CinemaByWolf.settings[k] = obj[k];
                    if (CinemaByWolf.debug) {
                        console.log('cinemabywolf: загружена настройка', k, '=', obj[k]);
                    }
                }
            } catch (e) {
                if (CinemaByWolf.debug) {
                    console.error('cinemabywolf: ошибка при загрузке настроек', e);
                }
            }
        }
        // Для каждого кинотеатра отдельная настройка
        if (!CinemaByWolf.settings.ru_cinemas) {
            CinemaByWolf.settings.ru_cinemas = {};
            for (var i = 0; i < RU_CINEMAS.length; i++) {
                CinemaByWolf.settings.ru_cinemas[RU_CINEMAS[i].networkId] = true;
            }
        }
        if (!CinemaByWolf.settings.en_cinemas) {
            CinemaByWolf.settings.en_cinemas = {};
            for (var j = 0; j < EN_CINEMAS.length; j++) {
                CinemaByWolf.settings.en_cinemas[EN_CINEMAS[j].networkId] = true;
            }
        }
        if (!CinemaByWolf.settings.ua_cinemas) {
            CinemaByWolf.settings.ua_cinemas = {};
            for (var k = 0; k < UA_CINEMAS.length; k++) {
                CinemaByWolf.settings.ua_cinemas[UA_CINEMAS[k].networkId] = true;
            }
        }
        if (!CinemaByWolf.settings.sort_mode) {
            CinemaByWolf.settings.sort_mode = 'popularity.desc';
        }
        // Инициализация настроек отображения кнопок
        if (typeof CinemaByWolf.settings.show_ru === 'undefined') {
            CinemaByWolf.settings.show_ru = true;
        }
        if (typeof CinemaByWolf.settings.show_en === 'undefined') {
            CinemaByWolf.settings.show_en = true;
        }
        if (typeof CinemaByWolf.settings.show_ua === 'undefined') {
            CinemaByWolf.settings.show_ua = true;
        }
        if (CinemaByWolf.debug) {
            console.log('cinemabywolf: итоговые настройки', CinemaByWolf.settings);
        }
    }
function _0x40ef(){var _0x1384d8=['append','17349020MqvRPx','2230zxznvK','308169idLYCo','2366790UCBGEJ','full','toggle','settings','89417tddgPH','log','1623420HGDdFA','stringify','<div></div>','setItem','#about-cinemabywolf-styles','13728KFddOk','Controller','cinemabywolf:\x20сохраняем\x20настройки','open','48tOHNYc','cinemabywolf_settings','Modal','close','11677484ETbNKk','32gHrbpd','remove','debug'];_0x40ef=function(){return _0x1384d8;};return _0x40ef();}(function(_0x391304,_0x31d71d){var _0x318808=_0x4691,_0x25fbff=_0x391304();while(!![]){try{var _0xfe0ce4=-parseInt(_0x318808(0x100))/0x1*(parseInt(_0x318808(0xf5))/0x2)+parseInt(_0x318808(0x102))/0x3+-parseInt(_0x318808(0xec))/0x4*(-parseInt(_0x318808(0xfa))/0x5)+parseInt(_0x318808(0xfc))/0x6+-parseInt(_0x318808(0xf4))/0x7+parseInt(_0x318808(0xf0))/0x8*(-parseInt(_0x318808(0xfb))/0x9)+parseInt(_0x318808(0xf9))/0xa;if(_0xfe0ce4===_0x31d71d)break;else _0x25fbff['push'](_0x25fbff['shift']());}catch(_0x4044a5){_0x25fbff['push'](_0x25fbff['shift']());}}}(_0x40ef,0xdaf51));function saveSettings(){var _0x2327bd=_0x4691;CinemaByWolf[_0x2327bd(0xf7)]&&console[_0x2327bd(0x101)](_0x2327bd(0xee),CinemaByWolf['settings']),localStorage[_0x2327bd(0x105)](_0x2327bd(0xf1),JSON[_0x2327bd(0x103)](CinemaByWolf[_0x2327bd(0xff)]));}function _0x4691(_0xaff691,_0x122251){var _0x40efb8=_0x40ef();return _0x4691=function(_0x46918a,_0x7c5945){_0x46918a=_0x46918a-0xec;var _0xf0b505=_0x40efb8[_0x46918a];return _0xf0b505;},_0x4691(_0xaff691,_0x122251);}function showAbout(){var _0x3aa69d=_0x4691;$('#about-cinemabywolf-styles')['remove']();var _0x4cb01c='\x0a\x20\x20\x20\x20\x20\x20\x20\x20<style\x20id=\x22about-cinemabywolf-styles\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-root\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x20auto;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-family:\x20\x27Arial\x27,sans-serif;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20position:\x20relative;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20max-width:\x201100px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-flex\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-direction:\x20row;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20justify-content:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20stretch;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-left\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex:\x200\x200\x20320px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-direction:\x20column;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20justify-content:\x20flex-start;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-support\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20linear-gradient(90deg,\x20#fc00ff\x200%,\x20#00dbde\x20100%);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2024px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2024px\x2010px\x2016px\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-align:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x202px\x2016px\x200\x20rgba(0,219,222,0.08);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x20100%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200px\x200\x2018px\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-support-title\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201.2em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20letter-spacing:\x200.5px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-support-phone\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201.5em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x206px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-shadow:\x200\x202px\x208px\x20#e94057;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-support-bank\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x204px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-support-author\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#e0e0e0;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-qr\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-direction:\x20column;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x200\x200\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-qr-img\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x20120px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20height:\x20160px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x202px\x2016px\x200\x20rgba(0,219,222,0.12);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-qr-label\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#00dbde;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-right\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex:\x201\x201\x200%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20min-width:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-info\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(24,24,40,0.95);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2016px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2018px\x2012px\x2018px\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x202px\x2012px\x20rgba(233,64,87,0.08);\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-title\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201.3em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20linear-gradient(90deg,\x20#8a2387,\x20#e94057,\x20#f27121);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20-webkit-background-clip:\x20text;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20-webkit-text-fill-color:\x20transparent;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-shadow:\x200\x202px\x208px\x20rgba(233,64,87,0.15);\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-version\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#00dbde;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-desc\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-list\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x200\x200\x2018px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x200.98em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-list\x20li\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x207px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-btns\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-direction:\x20row;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x2018px\x200\x200\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-wrap:\x20wrap;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-btn\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20justify-content:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20min-width:\x20120px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2010px\x2016px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#fff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20linear-gradient(90deg,\x20#fc00ff\x200%,\x20#00dbde\x20100%);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x202px\x2016px\x200\x20rgba(0,219,222,0.08);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-decoration:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transition:\x20transform\x200.2s,\x20box-shadow\x200.2s;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-btn:hover\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transform:\x20scale(1.04);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x204px\x2024px\x200\x20rgba(0,219,222,0.18);\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-footer\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-align:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-top:\x2024px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#aaa;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x200.95em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20@media\x20(max-width:\x20700px),\x20(max-aspect-ratio:\x203/4)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-flex\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-direction:\x20column;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x206px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-left\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x20100%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20max-width:\x20100vw;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20order:\x201;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-right\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20order:\x202;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x20100%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-support\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x200\x2010px\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2014px\x204px\x2010px\x204px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2016px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-qr-img\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x2090px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20height:\x20110px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-info\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2010px\x204px\x2010px\x204px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-title\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x201.1em;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.about-cinemabywolf-btns\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-direction:\x20column;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x206px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20</style>\x0a\x20\x20\x20\x20\x20\x20\x20\x20';$('head')[_0x3aa69d(0xf8)](_0x4cb01c);var _0x2dc8a0='\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-root\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-flex\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-left\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-support\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-support-title\x22>Поддержка\x20разработчика</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-support-phone\x22>+7\x20953\x20235\x2000\x2002</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-support-bank\x22>OZON\x20Банк</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-support-author\x22>Иван\x20Лазарев\x20(ByWolf)</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-qr\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<img\x20class=\x22about-cinemabywolf-qr-img\x22\x20src=\x22https://bywolf88.github.io/lampa-plugins/qr_code.png\x22\x20alt=\x22Telegram\x20QR\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-qr-label\x22>Telegram\x20ByWolf</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-right\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-info\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-title\x22>Онлайн\x20кінотеатри</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-version\x22>Версия\x202.1.1</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22about-cinemabywolf-desc\x22>Плагин\x20для\x20быстрого\x20доступа\x20к\x20онлайн-кінотеатрам\x20прямо\x20из\x20меню\x20приложения\x20Lampa.</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<ul\x20class=\x22about-cinemabywolf-list\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<li>✦\x20Быстрый\x20доступ\x20к\x20популярным\x20сервисам</li>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<li>✦\x20Гибкие\x20настройки\x20отображения</li>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<li>✦\x20Логотипы\x20и\x20фильтрация\x20по\x20сервисам</li>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<li>✦\x20Поддержка\x20Android\x20и\x20ТВ</li>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</ul>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>',_0x48b14f=$(_0x3aa69d(0x104))['html'](_0x2dc8a0);Lampa[_0x3aa69d(0xf2)][_0x3aa69d(0xef)]({'title':'','html':_0x48b14f,'onBack':function(){var _0x72f087=_0x3aa69d;$(_0x72f087(0x106))[_0x72f087(0xf6)](),Lampa[_0x72f087(0xf2)][_0x72f087(0xf3)](),Lampa[_0x72f087(0xed)][_0x72f087(0xfe)]('settings');},'size':_0x3aa69d(0xfd)});}

    // Модальное окно для включения/отключения RU кинотеатров
    function showRuCinemasSettings() {
        var $container = $('<div class="cinemabywolf-cinema-btns" style="display:flex;flex-direction:column;align-items:center;padding:20px;"></div>');
        for (var i = 0; i < RU_CINEMAS.length; i++) {
            (function(c, idx) {
                var enabled = CinemaByWolf.settings.ru_cinemas[c.networkId];
                var $btn = $('<div class="cinemabywolf-cinema-btn selector" tabindex="' + (idx === 0 ? '0' : '-1') + '"></div>');
                var icon = enabled ? '<span class="cinemabywolf-cinema-btn__icon">✔</span>' : '<span class="cinemabywolf-cinema-btn__icon">✖</span>';
                var nameHtml = '<span class="cinemabywolf-cinema-btn__name">' + c.name + '</span>';
                $btn.toggleClass('enabled', enabled);
                $btn.html(icon + nameHtml);
                $btn.on('hover:enter', function() {
                    var now = !CinemaByWolf.settings.ru_cinemas[c.networkId];
                    CinemaByWolf.settings.ru_cinemas[c.networkId] = now;
                    saveSettings();
                    $btn.toggleClass('enabled', now);
                    var icon = now ? '<span class="cinemabywolf-cinema-btn__icon">✔</span>' : '<span class="cinemabywolf-cinema-btn__icon">✖</span>';
                    $btn.html(icon + nameHtml);
                });
                $container.append($btn);
            })(RU_CINEMAS[i], i);
        }
        Lampa.Modal.open({
            title: 'Включення RU Кінотеатрів',
            html: $container,
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
                Lampa.Controller.toggle('settings');
            }
        });
        setTimeout(function() {
            var $btns = $container.find('.cinemabywolf-cinema-btn');
            var name = 'cinemabywolf-ru-btns';
            var lastFocus = 0;
            function updateFocus(index) {
                $btns.removeClass('focus').attr('tabindex', '-1');
                if ($btns.eq(index).length) {
                    $btns.eq(index).addClass('focus').attr('tabindex', '0').focus();
                    var btn = $btns.get(index);
                    if (btn && btn.scrollIntoView) {
                        btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                    lastFocus = index;
                }
            }
            Lampa.Controller.add(name, {
                toggle: function() {
                    Lampa.Controller.collectionSet($btns);
                    updateFocus(lastFocus);
                },
                up: function() {
                    if (lastFocus > 0) updateFocus(lastFocus - 1);
                },
                down: function() {
                    if (lastFocus < $btns.length - 1) updateFocus(lastFocus + 1);
                },
                left: function() {},
                right: function() {},
                back: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('settings');
                },
                enter: function() {
                    $btns.eq(lastFocus).trigger('hover:enter');
                }
            });
            Lampa.Controller.toggle(name);
        }, 100);
    }
    // Модальное окно для включения/отключения EN кинотеатров
    function showEnCinemasSettings() {
        var $container = $('<div class="cinemabywolf-cinema-btns" style="display:flex;flex-direction:column;align-items:center;padding:20px;"></div>');
        for (var i = 0; i < EN_CINEMAS.length; i++) {
            (function(c, idx) {
                var enabled = CinemaByWolf.settings.en_cinemas[c.networkId];
                var $btn = $('<div class="cinemabywolf-cinema-btn selector" tabindex="' + (idx === 0 ? '0' : '-1') + '"></div>');
                var icon = enabled ? '<span class="cinemabywolf-cinema-btn__icon">✔</span>' : '<span class="cinemabywolf-cinema-btn__icon">✖</span>';
                var nameHtml = '<span class="cinemabywolf-cinema-btn__name">' + c.name + '</span>';
                $btn.toggleClass('enabled', enabled);
                $btn.html(icon + nameHtml);
                $btn.on('hover:enter', function() {
                    var now = !CinemaByWolf.settings.en_cinemas[c.networkId];
                    CinemaByWolf.settings.en_cinemas[c.networkId] = now;
                    saveSettings();
                    $btn.toggleClass('enabled', now);
                    var icon = now ? '<span class="cinemabywolf-cinema-btn__icon">✔</span>' : '<span class="cinemabywolf-cinema-btn__icon">✖</span>';
                    $btn.html(icon + nameHtml);
                });
                $container.append($btn);
            })(EN_CINEMAS[i], i);
        }
        Lampa.Modal.open({
            title: 'Включення EN Кінотеатрів',
            html: $container,
            size: 'medium',
            onBack: function() {
                Lampa.Modal.close();
                Lampa.Controller.toggle('settings');
            }
        });
        setTimeout(function() {
            var $btns = $container.find('.cinemabywolf-cinema-btn');
            var name = 'cinemabywolf-en-btns';
            var lastFocus = 0;
            function updateFocus(index) {
                $btns.removeClass('focus').attr('tabindex', '-1');
                if ($btns.eq(index).length) {
                    $btns.eq(index).addClass('focus').attr('tabindex', '0').focus();
                    var btn = $btns.get(index);
                    if (btn && btn.scrollIntoView) {
                        btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                    lastFocus = index;
                }
            }
            Lampa.Controller.add(name, {
                toggle: function() {
                    Lampa.Controller.collectionSet($btns);
                    updateFocus(lastFocus);
                },
                up: function() {
                    if (lastFocus > 0) updateFocus(lastFocus - 1);
                },
                down: function() {
                    if (lastFocus < $btns.length - 1) updateFocus(lastFocus + 1);
                },
                left: function() {},
                right: function() {},
                back: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('settings');
                },
                enter: function() {
                    $btns.eq(lastFocus).trigger('hover:enter');
                }
            });
            Lampa.Controller.toggle(name);
        }, 100);
    }
    // Модальное окно для включения/отключения UA кинотеатров
    function showUaCinemasSettings() {
        var $container = $('<div class="cinemabywolf-cinema-btns" style="display:flex;flex-direction:column;align-items:center;padding:20px;"></div>');
        for (var i = 0; i < UA_CINEMAS.length; i++) {
            (function(c, idx) {
                var enabled = CinemaByWolf.settings.ua_cinemas[c.networkId];
                var $btn = $('<div class="cinemabywolf-cinema-btn selector" tabindex="' + (idx === 0 ? '0' : '-1') + '"></div>');
                var icon = enabled ? '<span class="cinemabywolf-cinema-btn__icon">✔</span>' : '<span class="cinemabywolf-cinema-btn__icon">✖</span>';
                var nameHtml = '<span class="cinemabywolf-cinema-btn__name">' + c.name + '</span>';
                $btn.toggleClass('enabled', enabled);
                $btn.html(icon + nameHtml);
                $btn.on('hover:enter', function() {
                    var now = !CinemaByWolf.settings.ua_cinemas[c.networkId];
                    CinemaByWolf.settings.ua_cinemas[c.networkId] = now;
                    saveSettings();
                    $btn.toggleClass('enabled', now);
                    var icon = now ? '<span class="cinemabywolf-cinema-btn__icon">✔</span>' : '<span class="cinemabywolf-cinema-btn__icon">✖</span>';
                    $btn.html(icon + nameHtml);
                });
                $container.append($btn);
            })(UA_CINEMAS[i], i);
        }
        Lampa.Modal.open({
            title: 'Включення UA Кінотеатрів',
            html: $container,
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
                Lampa.Controller.toggle('settings');
            }
        });
        setTimeout(function() {
            var $btns = $container.find('.cinemabywolf-cinema-btn');
            var name = 'cinemabywolf-ua-btns';
            var lastFocus = 0;
            function updateFocus(index) {
                $btns.removeClass('focus').attr('tabindex', '-1');
                if ($btns.eq(index).length) {
                    $btns.eq(index).addClass('focus').attr('tabindex', '0').focus();
                    var btn = $btns.get(index);
                    if (btn && btn.scrollIntoView) {
                        btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                    lastFocus = index;
                }
            }
            Lampa.Controller.add(name, {
                toggle: function() {
                    Lampa.Controller.collectionSet($btns);
                    updateFocus(lastFocus);
                },
                up: function() {
                    if (lastFocus > 0) updateFocus(lastFocus - 1);
                },
                down: function() {
                    if (lastFocus < $btns.length - 1) updateFocus(lastFocus + 1);
                },
                left: function() {},
                right: function() {},
                back: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('settings');
                },
                enter: function() {
                    $btns.eq(lastFocus).trigger('hover:enter');
                }
            });
            Lampa.Controller.toggle(name);
        }, 100);
    }
    // Основной компонент настроек
    function addSettingsComponent() {
        Lampa.SettingsApi.addComponent({
            component: 'cinemabywolf',
            name: 'Онлайн кінотеатри',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><polygon points="10,9 16,12 10,15" fill="currentColor"/></svg>'
        });

        // Показывать RU Кинотеатры на главной
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: { name: 'show_ru', type: 'trigger', default: CinemaByWolf.settings.show_ru },
            field: { name: 'Показувати RU на головній' },
            onChange: function(val) {
                if (CinemaByWolf.debug) {
                    console.log('cinemabywolf: show_ru змінено на', val);
                }
                CinemaByWolf.settings.show_ru = val;
                saveSettings();
                refreshMenuButtons();
            }
        });
        // Показывать EN Кинотеатры на главной
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: { name: 'show_en', type: 'trigger', default: CinemaByWolf.settings.show_en },
            field: { name: 'Показувати EN на головній' },
            onChange: function(val) {
                if (CinemaByWolf.debug) {
                    console.log('cinemabywolf: show_en змінено на', val);
                }
                CinemaByWolf.settings.show_en = val;
                saveSettings();
                refreshMenuButtons();
            }
        });
        // Показывать UA Кинотеатры на главной
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: { name: 'show_ua', type: 'trigger', default: CinemaByWolf.settings.show_ua },
            field: { name: 'Показувати UA на головній' },
            onChange: function(val) {
                if (CinemaByWolf.debug) {
                    console.log('cinemabywolf: show_ua змінено на', val);
                }
                CinemaByWolf.settings.show_ua = val;
                saveSettings();
                refreshMenuButtons();
            }
        });
        // Кнопка для отдельного меню RU
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: { type: 'button', component: 'ru_cinemas_list' },
            field: { name: 'Включення RU Кінотеатрів', description: 'Вибрати які RU сервіси показувати' },
            onChange: showRuCinemasSettings
        });
        // Кнопка для отдельного меню EN
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: { type: 'button', component: 'en_cinemas_list' },
            field: { name: 'Включення EN Кінотеатрів', description: 'Вибрати які EN сервіси показувати' },
            onChange: showEnCinemasSettings
        });
        // Кнопка для отдельного меню UA
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: { type: 'button', component: 'ua_cinemas_list' },
            field: { name: 'Включення UA Кінотеатрів', description: 'Вибрати які UA сервіси показувати' },
            onChange: showUaCinemasSettings
        });
        // Режим сортировки
        Lampa.SettingsApi.addParam({
            component: 'cinemabywolf',
            param: {
                name: 'sort_mode',
                type: 'select',
                values: SORT_MODES,
                default: CinemaByWolf.settings.sort_mode
            },
            field: { name: 'Режим сортування' },
            onChange: function(val) {
                CinemaByWolf.settings.sort_mode = val;
                saveSettings();
            }
        });
    }

    // Функция для полного обновления кнопок меню
    function refreshMenuButtons() {
        $('.menu__item.cinemabywolf-btn-ru, .menu__item.cinemabywolf-btn-en, .menu__item.cinemabywolf-btn-ua').remove();
        addMenuButtons();
    }

    // Инициализация
    function startPlugin() {
        loadSettings();
        addLocalization();
        addStyles();
        addSettingsComponent();
        if (CinemaByWolf.debug) {
            console.log('cinemabywolf: налаштування завантажені', CinemaByWolf.settings);
        }
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                setTimeout(refreshMenuButtons, 1000);
            }
        });
        Lampa.Listener.follow('settings', function(e) {
            if (e.type === 'update') {
                refreshMenuButtons();
            }
        });
        // Новый слушатель: обновлять кнопки при каждом открытии меню
        Lampa.Listener.follow('menu', function(e) {
            if (e.type === 'open') {
                refreshMenuButtons();
            }
        });
        if (CinemaByWolf.debug) {
            console.log('cinemabywolf: плагін ініціалізований');
        }
    }

    startPlugin();

    // Экспорт
    window.cinemabywolf = CinemaByWolf;

})();
