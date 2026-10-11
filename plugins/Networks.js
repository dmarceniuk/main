(function () {
    'use strict';
    var LIST_DISPLAY_MODE = Object.freeze({ HIDE: 0, LOGO: 1, TEXT: 2 });
    var EXTRA_BTN_DISPLAY_MODE = Object.freeze({ HIDE: 0, LOGO: 1, TEXT: 2, LIST_BTN: 3 });
    var settings = { platfroms_tv_list_mode: -1, platfroms_tv_list_max_visible: -1, platfroms_tv_extra_btn_mode: -1, platfroms_movie_list_mode: -1, platfroms_movie_list_max_visible: -1, platfroms_movie_extra_btn_mode: -1, studios_list_mode: -1, studios_list_max_visible: -1, platforms_mobile_center: false, networks_margin_top: '-3em', networks_margin_bottom: '3em', networks_margin_buttons: '0.5em', networks_btn_height: '2.2em' };
    var network = new Lampa.Reguest();
    var customLogos = {
        '20th century': { url: 'https://raw.githubusercontent.com/ko31k/LMP/main/wwwroot/img/20th-Century-Fox-Logo.png' },
        'twentieth century': { url: 'https://raw.githubusercontent.com/ko31k/LMP/main/wwwroot/img/20th-Century-Fox-Logo.png' },
        '127928': { url: 'https://raw.githubusercontent.com/ko31k/LMP/main/wwwroot/img/20th-Century-Fox-Logo.png' },
        'h0rjx5vjw5r8yenubstfarjclt4': { url: 'https://raw.githubusercontent.com/ko31k/LMP/main/wwwroot/img/20th-Century-Fox-Logo.png' },
        '1+1 media': { forceText: true }
    };
    function getCustomLogo(name, path, id) {
        var searchStr = ((name || '') + ' ' + (path || '') + ' ' + (id || '')).toLowerCase();
        for (var key in customLogos) {
            if (searchStr.indexOf(key.toLowerCase()) !== -1) return customLogos[key];
        }
        return null;
    }
    function formatCSSValue(value) {
        var val = (value + '').trim();
        if (val === '') return '0em';
        if (/^-?\d*\.?\d+$/.test(val)) return val + 'em';
        return val;
    }
    function addLocalization() {
        Lampa.Lang.add({
            tmdb_networks_open: { en: 'Open', uk: 'Відкрити' },
            tmdb_networks_top: { en: 'Top', uk: 'Популярні' },
            tmdb_networks_new: { en: 'New', uk: 'Новинки' },
            tmdb_networks_hide: { en: 'Hide', uk: 'Сховати' },
            tmdb_networks_plugin_platforms: { en: 'Platforms and Studios', uk: 'Платформи та студії' },
            tmdb_networks_plugin_platforms_setting_descr: { en: 'Display configuration settings for platforms adn studios in cards', uk: 'Налаштування відображення платформ та студій-виробників у картках' },
            tmdb_networks_plugin_about: { en: 'About the plugin', uk: 'Про плагін' },
            tmdb_networks_plugin_descr: { en: 'The plugin adds buttons for streaming services and platforms to cards, showing where movies and series were released or sold, making them easier to find. Buttons with production studios are also added.', uk: 'Модифікація плагіну від @levende, @Yaroslav_Films. Додає в картки кнопки стримінгових сервісів і платформ, де виходили або продавалися фільми та серіали, що спрощує їх пошук. Також додаються кнопки з виробничими студіями.' },
            platfroms_list: { en: 'List', uk: 'Перелік' },
            platfroms_list_limit: { en: 'List limit', uk: 'Ліміт переліку' },
            platform_display_hide: { en: 'Do not show', uk: 'Не показувати' },
            platform_display_logo: { en: 'Logo', uk: 'Логотип' },
            platform_display_name: { en: 'Name', uk: 'Назва' },
            platform_display_combo_btn: { en: 'Select button', uk: 'Кнопка з вибором' },
            platform_extra_btn: { en: 'Extra button', uk: 'Додаткова кнопка' },
            studios_title: { en: 'Studios', uk: 'Студії' },
            platforms_mobile_center: { en: 'Center on mobile', uk: 'Центрувати на смартфонах' },
            networks_margins_title: { en: 'Sizes and margins', uk: 'Розміри та відступи' },
            networks_margins_descr: { en: 'Configure spacing and button sizes', uk: 'Налаштування розмірів та відступів' },
            networks_margin_top: { en: 'Top margin', uk: 'Відступ зверху' },
            networks_margin_bottom: { en: 'Bottom margin', uk: 'Відступ знизу' },
            networks_margin_buttons: { en: 'Margin between buttons', uk: 'Відступ між кнопками' },
            networks_btn_height: { en: 'Button height', uk: 'Висота кнопок' },
            networks_margin_input_descr: { en: 'Manual entry (e.g., 2.2, 10px, -3)', uk: 'Ручний ввід (напр. 2.2, 10px, -3)' },
            tmdb_networks_reset: { en: 'Reset to defaults', uk: 'Скинути за замовчуванням' },
            tmdb_networks_reset_descr: { en: 'Restore default margin and size values', uk: 'Повернути стандартні значення відступів та розмірів' }
        });
    }
    function createNetworkButton(network, index, type, mode, limit) {
        var networkBtn = $('<div class="tag-count selector network-btn platform-btn"></div>');
        var custom = getCustomLogo(network.name, network.logo_path, network.id);
        if (mode == LIST_DISPLAY_MODE.LOGO && (network.logo_path || custom)) {
            networkBtn.addClass('network-logo');
            networkBtn.addClass(type);
            networkBtn.append($('<div class="tag-count overlay"></div>'));
            var imgSrc = custom ? custom.url : Lampa.TMDB.image("t/p/w300" + network.logo_path);
            var logo = $('<img/>').attr({ src: imgSrc, alt: network.name });
            networkBtn.append(logo);
        } else {
            networkBtn.append($('<div class="tag-count__name">' + network.name + '</div>'));
        }
        if (index >= limit) networkBtn.addClass('hide');
        networkBtn.on('hover:enter', function () { onNetworkButtonClick(network, this, type); });
        return networkBtn;
    }
    function createStudioButton(company, type, mode, index, limit) {
        var btn = $('<div class="tag-count selector network-btn studio-btn"></div>');
        var custom = getCustomLogo(company.name, company.logo_path, company.id);
        if (custom && custom.forceText) {
            company.logo_path = null;
            custom = null;
        }
        if (mode == LIST_DISPLAY_MODE.LOGO && (company.logo_path || custom)) {
            btn.addClass('network-logo');
            btn.addClass(type);
            btn.append($('<div class="tag-count overlay"></div>'));
            var imgSrc = custom ? custom.url : Lampa.TMDB.image("t/p/w300" + company.logo_path);
            var logo = $('<img/>').attr({ src: imgSrc, alt: company.name });
            btn.append(logo);
        } else {
            btn.append($('<div class="tag-count__name">' + company.name + '</div>'));
        }
        if (index >= limit) btn.addClass('hide');
        btn.on('hover:enter click', function () {
            Lampa.Activity.push({ url: 'movie', id: company.id, title: company.name, component: 'company', source: 'tmdb', page: 1 });
        });
        return btn;
    }
    function createMoreButton(hiddenCount, limit, container) {
        var moreBtn = $('<div class="tag-count selector network-btn network-more"><div class="tag-count__name">' + Lampa.Lang.translate('more') + '</div><div class="tag-count__count">' + hiddenCount + '</div></div>');
        moreBtn.on('hover:enter', function () {
            $('.network-btn.hide', container).removeClass('hide');
            $(this).addClass('hide');
            Lampa.Controller.collectionFocus($('.network-btn', container).eq(limit + 1), Lampa.Activity.active().activity.render());
        });
        return moreBtn;
    }
    function createHideButton(limit, container) {
        var hideBtn = $('<div class="tag-count selector network-btn hide-btn hide"><div class="tag-count__name">' + Lampa.Lang.translate('tmdb_networks_hide') + '</div></div>');
        hideBtn.on('hover:enter', function () {
            $(this).addClass('hide');
            $('.network-btn', container).not('.network-more').not('.hide-btn').each(function(idx) {
                if (idx >= limit) $(this).addClass('hide');
            });
            var moreBtn = $('.network-more', container);
            moreBtn.removeClass('hide');
            Lampa.Controller.collectionFocus(moreBtn, Lampa.Activity.active().activity.render());
        });
        return hideBtn;
    }
    function getMovieProviders(movie, callback) {
        var allowedCountryCodes = ['US', 'RU'];
        var excludeKeywords = ['Free', 'Ad', 'With Ads', 'Free with Ads', 'Plex', 'Tubi', 'Pluto TV', 'Google Play', 'Youtube', 'Max Amazon Channel'];
        var maxDisplayPriority = 20;
        var url = Lampa.TMDB.api('movie/' + movie.id + '/watch/providers?api_key=' + Lampa.TMDB.key());
        network.silent(url, function (data) {
            if (!data.results) return callback([]);
            var countryCodes = Object.keys(data.results).filter(function(countryCode) { return allowedCountryCodes.indexOf(countryCode) !== -1; });
            var providers = [];
            var uniqueProviders = [];
            countryCodes.forEach(function(countryCode) {
                var countryProviders = (data.results[countryCode].flatrate || []).concat(data.results[countryCode].rent || []).concat(data.results[countryCode].buy || []);
                countryProviders.forEach(function(provider) { provider.country_code = countryCode });
                providers = providers.concat(countryProviders);
            });
            providers.forEach(function (provider) {
                if (provider.display_priority > maxDisplayPriority) return;
                if (uniqueProviders.some(function(p) { return p.id == provider.provider_id } )) return;
                var name = provider.provider_name;
                var excluded = excludeKeywords.some(function (keyword) { return name.toLowerCase().indexOf(keyword.toLowerCase()) !== -1; });
                if (excluded) return;
                uniqueProviders.push({ id: provider.provider_id, name: name, logo_path: provider.logo_path, display_priority: provider.display_priority, country_code: provider.country_code });
            });
            uniqueProviders = uniqueProviders.sort(function (a, b) { return a.display_priority - b.display_priority });
            callback(uniqueProviders);
        });
    }
    function getNetworks(object, callback) {
        var movie = object.card;
        if (!movie || movie.source !== 'tmdb') return callback([]);
        var getFn = movie.networksList ? function() { callback(movie.networksList); } : movie.networks ? function() { callback(movie.networks); } : getMovieProviders;
        getFn(movie, function(networks) {
            movie.networksList = networks;
            callback(networks);
        });
    }
    function renderExtraBtn(render, networks, type) {
        $('.button--plaftorms', render).remove();
        var displayMode = settings['platfroms_' + type + '_extra_btn_mode'];
        var container = $('.full-start-new__buttons', render);
        var btn = $('<div class="full-start__button selector button--plaftorms"></div>');
        switch (displayMode) {
            case EXTRA_BTN_DISPLAY_MODE.LOGO:
            case EXTRA_BTN_DISPLAY_MODE.TEXT: {
                btn = createNetworkButton(networks[0], 0, type, displayMode, 1);
                btn.removeClass('tag-count').addClass('full-start__button').addClass('button--plaftorms');
                btn.css('height', $('.full-start__button', render).first().outerHeight() + 'px');
                break;
            }
            case EXTRA_BTN_DISPLAY_MODE.LIST_BTN: {
                var title = Lampa.Lang.translate('tmdb_networks_plugin_platforms');
                btn.html('<svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="512.000000pt" height="512.000000pt" viewBox="0 0 512.000000 512.000000"><g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="currentColor"><path d="M895 4306 c-16 -7 -59 -44 -95 -82 -284 -302 -487 -669 -586 -1060 -57 -227 -69 -330 -69 -604 0 -274 12 -377 69 -604 86 -339 253 -666 483 -943 156 -189 209 -225 300 -208 49 9 109 69 118 118 13 67 -1 103 -72 180 -389 422 -583 908 -583 1457 0 551 193 1032 584 1459 45 48 67 81 72 105 24 131 -102 234 -221 182z"/><path d="M4095 4306 c-41 -18 -83 -69 -91 -111 -12 -65 3 -102 73 -178 388 -422 583 -909 583 -1457 0 -548 -195 -1035 -583 -1457 -71 -77 -85 -113 -72 -180 9 -49 69 -109 118 -118 77 -15 105 -1 199 96 272 279 482 659 583 1053 58 225 70 331 70 606 0 275 -12 381 -70 606 -101 394 -301 756 -585 1058 -88 94 -148 116 -225 82z"/><path d="M1525 3695 c-83 -28 -274 -269 -364 -458 -53 -111 -95 -234 -123 -358 -20 -91 -23 -130 -23 -319 0 -189 3 -228 23 -319 28 -124 70 -247 123 -358 92 -193 290 -440 371 -461 102 -27 198 46 198 151 0 60 -8 76 -83 157 -32 36 -83 101 -112 145 -142 215 -205 425 -205 685 0 260 63 470 205 685 29 44 80 109 112 145 75 81 83 97 83 158 0 107 -103 181 -205 147z"/><path d ="M3513 3700 c-76 -17 -123 -76 -123 -153 0 -60 8 -76 83 -157 153 -168 262 -390 302 -614 19 -114 19 -318 0 -432 -40 -224 -149 -446 -302 -614 -75 -81 -83 -97 -83 -157 0 -105 96 -178 198 -151 81 21 279 268 371 461 53 111 95 234 123 358 20 91 23 130 23 319 0 189 -3 228 -23 319 -61 273 -193 531 -367 719 -88 95 -133 118 -202 102z"/><path d="M2435 3235 c-417 -77 -668 -518 -519 -912 111 -298 421 -488 723 -445 326 46 557 277 603 603 41 289 -136 595 -412 710 -130 55 -260 69 -395 44z m197 -316 c77 -17 137 -50 190 -107 57 -61 83 -110 98 -190 22 -111 -12 -222 -96 -312 -138 -148 -359 -156 -510 -18 -96 88 -138 210 -114 330 16 82 42 132 99 191 52 55 97 81 174 102 65 17 92 18 159 4z"/></g></svg><span>' + title + '</span>');
                    btn.on('hover:enter', function () {
                        var controllerName = Lampa.Controller.enabled().name;
                        Lampa.Select.show({
                            title: title,
                            items: networks.map(function(n) { return { title: n.name, network: n }; }),
                            onBack: function () { Lampa.Controller.toggle(controllerName); Lampa.Controller.collectionFocus(btn, render); },
                            onSelect: function (action) { onNetworkButtonClick(action.network, null, type, controllerName); }
                        });
                    });
                    break;
                }
                default: return;
            }
            container.append(btn);
            Lampa.Activity.active().activity.toggle();
        }
        function renderNetworks() {
            var object = Lampa.Activity.active();
            var render = object.activity.render();
            var detailedMovie = render.data('movie') || render.data('item') || object.card;
            $('.tmdb-networks', render).remove();
            getNetworks(object, function(networks) {
                var type = object.method;
                var displayMode = settings['platfroms_' + type + '_list_mode'];
                var studiosMode = settings.studios_list_mode;
                var companies = (detailedMovie && detailedMovie.production_companies) ? detailedMovie.production_companies : [];
                var validStudios = companies.filter(function(company) {
                    if (!company.id) return false;
                    var custom = getCustomLogo(company.name, company.logo_path, company.id);
                    return studiosMode != LIST_DISPLAY_MODE.LOGO || company.logo_path || custom;
                });
                var hasPlatforms = displayMode != LIST_DISPLAY_MODE.HIDE && networks.length > 0;
                var hasStudios = studiosMode != LIST_DISPLAY_MODE.HIDE && validStudios.length > 0;
                if (!hasPlatforms && !hasStudios) return;
                if (networks.length > 0) renderExtraBtn(render, networks, type, object);
                var wrapClass = settings.platforms_mobile_center ? 'networks-wrapper center-on-mobile' : 'networks-wrapper';
                var mTop = formatCSSValue(settings.networks_margin_top);
                var mBot = formatCSSValue(settings.networks_margin_bottom);
                var mGap = formatCSSValue(settings.networks_margin_buttons);
                var btnH = formatCSSValue(settings.networks_btn_height);
                var networksLine = $('<div class="tmdb-networks" style="margin-top:' + mTop + '; --tmdb-net-gap:' + mGap + '; --tmdb-net-btn-h:' + btnH + ';"><div class="items-line__body" style="margin-bottom:' + mBot + ';"><div class="full-descr"><div class="full-descr__left"><div class="full-descr__tags ' + wrapClass + '" style="margin-top:0;"></div></div></div></div></div>');
                var container = $('.full-descr__tags', networksLine);
                var platformsContainer = null;
                var studiosContainer = null;
                var separator = null;
                if (hasPlatforms) {
                    platformsContainer = $('<div class="platforms-group"></div>');
                    var displayLimit = settings['platfroms_' + type + '_list_max_visible'];
                    var hasMoreBtn = false;
                    networks.forEach(function (network, index) {
                        platformsContainer.append(createNetworkButton(network, index, type, displayMode, displayLimit));
                        if (networks.length > displayLimit && index === displayLimit - 1) {
                            platformsContainer.append(createMoreButton(networks.length - displayLimit, displayLimit, platformsContainer));
                            hasMoreBtn = true;
                        }
                    });
                    if (hasMoreBtn) platformsContainer.append(createHideButton(displayLimit, platformsContainer));
                    container.append(platformsContainer);
                }
                if (hasPlatforms && hasStudios) {
                    separator = $('<div class="network-separator"></div>');
                    container.append(separator);
                }
                if (hasStudios) {
                    studiosContainer = $('<div class="studios-group"></div>');
                    var studiosLimit = settings.studios_list_max_visible;
                    var hasStudioMoreBtn = false;
                    validStudios.forEach(function(company, index) {
                        studiosContainer.append(createStudioButton(company, type, studiosMode, index, studiosLimit));
                        if (validStudios.length > studiosLimit && index === studiosLimit - 1) {
                            studiosContainer.append(createMoreButton(validStudios.length - studiosLimit, studiosLimit, studiosContainer));
                            hasStudioMoreBtn = true;
                        }
                    });
                    if (hasStudioMoreBtn) studiosContainer.append(createHideButton(studiosLimit, studiosContainer));
                    container.append(studiosContainer);
                }
                if (container.children().length > 0) {
                    $('.items-line', render).eq(0).prepend(networksLine);
                    if (hasPlatforms && hasStudios && separator && platformsContainer && studiosContainer) {
                        var eventName = 'resize.tmdbnet_' + Date.now();
                        var checkSeparatorWrap = function() {
                            if (!document.body.contains(separator[0])) {
                                $(window).off(eventName);
                                return;
                            }
                            if (platformsContainer.length && studiosContainer.length) {
                                var pTop = platformsContainer.offset().top;
                                var sTop = studiosContainer.offset().top;
                                if (sTop > pTop + 10) separator.hide();
                                else separator.show();
                            }
                        };
                        setTimeout(checkSeparatorWrap, 100);
                        $(window).on(eventName, checkSeparatorWrap);
                    }
                }
            });
        }
        function onNetworkButtonClick(network, element, type, controller) {
            var isTv = type == 'tv';
            var controllerName = controller || Lampa.Controller.enabled().name;
            var releaseDateField = isTv ? 'first_air_date' : 'primary_release_date';
            var topFilter = { 'vote_count.gte': 10 };
            var newFilter = { 'vote_count.gte': 10 };
            newFilter[releaseDateField + '.lte'] = new Date().toISOString().split('T')[0];
            var menu = [
                { title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_top').toLowerCase(), sort_by: '', type: Lampa.Lang.translate('tmdb_networks_top'), filter: topFilter },
                { title: Lampa.Lang.translate('tmdb_networks_open') + ' ' + Lampa.Lang.translate('tmdb_networks_new').toLowerCase(), sort_by: releaseDateField + '.desc', type: Lampa.Lang.translate('tmdb_networks_new'), filter: newFilter }
            ];
            if (network.country_code) {
                menu.forEach(function(selectItem) {
                    selectItem.filter.watch_region = network.country_code;
                    selectItem.filter.with_watch_providers = network.id;
                });
            }
            var categoryLangKey = isTv ? 'menu_tv' : 'menu_movies';
            Lampa.Select.show({
                title: network.name + ' ' + Lampa.Lang.translate(categoryLangKey),
                items: menu,
                onBack: function () { Lampa.Controller.toggle(controllerName); Lampa.Controller.collectionFocus(element, Lampa.Activity.active().activity.render()); },
                onSelect: function (action) {
                    Lampa.Activity.push({ url: 'discover/' + type, title: network.name + ' ' + action.type + ' ' + Lampa.Lang.translate(categoryLangKey), component: 'category_full', networks: network.id, sort_by: action.sort_by, source: 'tmdb', card_type: true, page: 1, filter: action.filter });
                }
            });
        }
        function showSettingsMenu() {
            Lampa.Settings.create('platforms', { template: 'settings_platforms', onBack: function() { Lampa.Settings.create('interface'); } });
        }
        function addSettingsByType(type) {
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { name: 'platfroms_' + type + '_list_mode', type: 'select', values: { '0': Lampa.Lang.translate('platform_display_hide'), '1': Lampa.Lang.translate('platform_display_logo'), '2': Lampa.Lang.translate('platform_display_name') }, default: settings['platfroms_' + type + '_list_mode'] }, field: { name: Lampa.Lang.translate('platfroms_list') }, onChange: initSettings });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { name: 'platfroms_' + type + '_list_max_visible', type: 'select', values: { 1: 1, 2: 2, 3: 3, 5: 5 }, default: settings['platfroms_' + type + '_list_max_visible'] }, field: { name: Lampa.Lang.translate('platfroms_list_limit') }, onChange: initSettings });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { name: 'platfroms_' + type + '_extra_btn_mode', type: 'select', values: { '0': Lampa.Lang.translate('platform_display_hide'), '1': Lampa.Lang.translate('platform_display_logo'), '2': Lampa.Lang.translate('platform_display_name'), '3': Lampa.Lang.translate('platform_display_combo_btn') }, default: settings['platfroms_' + type + '_extra_btn_mode'] }, field: { name: Lampa.Lang.translate('platform_extra_btn') }, onChange: initSettings });
        }
        function addSettings() {
            Lampa.Template.add('settings_platforms', '<div></div>');
            Lampa.Template.add('settings_platforms_margins', '<div></div>');
            Lampa.SettingsApi.addParam({ component: 'interface', param: { type: 'button', component: 'platforms' }, field: { name: Lampa.Lang.translate('tmdb_networks_plugin_platforms'), description: Lampa.Lang.translate('tmdb_networks_plugin_platforms_setting_descr') }, onChange: showSettingsMenu });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { type: 'button', component: 'about' }, field: { name: Lampa.Lang.translate('tmdb_networks_plugin_about'), description: Lampa.Lang.translate('menu_about') }, onChange: showAbout });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { type: 'title' }, field: { name: Lampa.Lang.translate('menu_tv') } });
            addSettingsByType('tv');
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { type: 'title' }, field: { name: Lampa.Lang.translate('menu_movies') } });
            addSettingsByType('movie');
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { type: 'title' }, field: { name: Lampa.Lang.translate('studios_title') } });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { name: 'studios_list_mode', type: 'select', values: { '0': Lampa.Lang.translate('platform_display_hide'), '1': Lampa.Lang.translate('platform_display_logo') }, default: settings.studios_list_mode }, field: { name: Lampa.Lang.translate('platfroms_list') }, onChange: initSettings });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { name: 'studios_list_max_visible', type: 'select', values: { 1: 1, 2: 2, 3: 3, 5: 5, 10: 10 }, default: settings.studios_list_max_visible }, field: { name: Lampa.Lang.translate('platfroms_list_limit') }, onChange: initSettings });
            var isMobileCenter = Lampa.Storage.get('platforms_mobile_center', false);
            var mobileCenterDefault = (isMobileCenter === true || isMobileCenter === 'true');
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { name: 'platforms_mobile_center', type: 'trigger', default: mobileCenterDefault }, field: { name: Lampa.Lang.translate('platforms_mobile_center') }, onChange: function (value) { Lampa.Storage.set('platforms_mobile_center', value); settings.platforms_mobile_center = value; } });
            Lampa.SettingsApi.addParam({ component: 'platforms', param: { type: 'button', component: 'platforms_margins' }, field: { name: Lampa.Lang.translate('networks_margins_title'), description: Lampa.Lang.translate('networks_margins_descr') }, onChange: function() { Lampa.Settings.create('platforms_margins', { template: 'settings_platforms_margins', onBack: showSettingsMenu }); } });
            var marginSettings = ['top', 'bottom', 'buttons'];
            marginSettings.forEach(function(pos) {
                Lampa.SettingsApi.addParam({
                    component: 'platforms_margins',
                    param: { name: 'networks_margin_' + pos, type: 'input', values: '', default: settings['networks_margin_' + pos] },
                    field: { name: Lampa.Lang.translate('networks_margin_' + pos), description: Lampa.Lang.translate('networks_margin_input_descr') },
                    onChange: function (value) {
                        var formattedValue = formatCSSValue(value);
                        Lampa.Storage.set('networks_margin_' + pos, formattedValue);
                        settings['networks_margin_' + pos] = formattedValue;
                        var networksEl = $('.tmdb-networks');
                        if (networksEl.length) {
                            if (pos === 'top') networksEl.css('margin-top', formattedValue);
                            if (pos === 'bottom') networksEl.find('.items-line__body').css('margin-bottom', formattedValue);
                            if (pos === 'buttons') networksEl.css('--tmdb-net-gap', formattedValue);
                        }
                        Lampa.Settings.update();
                    }
                });
            });
            Lampa.SettingsApi.addParam({
                component: 'platforms_margins',
                param: { name: 'networks_btn_height', type: 'input', values: '', default: settings.networks_btn_height },
                field: { name: Lampa.Lang.translate('networks_btn_height'), description: Lampa.Lang.translate('networks_margin_input_descr') },
                onChange: function (value) {
                    var formattedValue = formatCSSValue(value);
                    Lampa.Storage.set('networks_btn_height', formattedValue);
                    settings.networks_btn_height = formattedValue;
                    var networksEl = $('.tmdb-networks');
                    if (networksEl.length) networksEl.css('--tmdb-net-btn-h', formattedValue);
                    Lampa.Settings.update();
                }
            });
            Lampa.SettingsApi.addParam({
                component: 'platforms_margins',
                param: { type: 'button' },
                field: { name: Lampa.Lang.translate('tmdb_networks_reset'), description: Lampa.Lang.translate('tmdb_networks_reset_descr') },
                onChange: function() {
                    var defaults = { top: '-3em', bottom: '3em', buttons: '0.5em', height: '2.2em' };
                    Lampa.Storage.set('networks_margin_top', defaults.top);
                    settings.networks_margin_top = defaults.top;
                    Lampa.Storage.set('networks_margin_bottom', defaults.bottom);
                    settings.networks_margin_bottom = defaults.bottom;
                    Lampa.Storage.set('networks_margin_buttons', defaults.buttons);
                    settings.networks_margin_buttons = defaults.buttons;
                    Lampa.Storage.set('networks_btn_height', defaults.height);
                    settings.networks_btn_height = defaults.height;
                    var networksEl = $('.tmdb-networks');
                    if (networksEl.length) {
                        networksEl.css('margin-top', defaults.top);
                        networksEl.find('.items-line__body').css('margin-bottom', defaults.bottom);
                        networksEl.css('--tmdb-net-gap', defaults.buttons);
                        networksEl.css('--tmdb-net-btn-h', defaults.height);
                    }
                    Lampa.Settings.update();
                }
            });
        }
        function showAbout() {
            var html = '<p>' + Lampa.Lang.translate('tmdb_networks_plugin_descr') + '</p>';
            var controller = Lampa.Controller.enabled().name;
            Lampa.Select.show({ title: Lampa.Lang.translate('tmdb_networks_plugin_about'), items: [{ title: html, disabled: true }], onSelect: function () { Lampa.Controller.toggle(controller); }, onBack: function () { Lampa.Controller.toggle(controller); } });
        }
        function initSettings() {
            settings.platfroms_tv_list_mode = Lampa.Storage.get('platfroms_tv_list_mode', LIST_DISPLAY_MODE.LOGO);
            settings.platfroms_tv_list_max_visible = Lampa.Storage.get('platfroms_tv_list_max_visible', 3);
            settings.platfroms_tv_extra_btn_mode = Lampa.Storage.get('platfroms_tv_extra_btn_mode', EXTRA_BTN_DISPLAY_MODE.HIDE);
            settings.platfroms_movie_list_mode = Lampa.Storage.get('platfroms_movie_list_mode', LIST_DISPLAY_MODE.TEXT);
            settings.platfroms_movie_list_max_visible = Lampa.Storage.get('platfroms_movie_list_max_visible', 3);
            settings.platfroms_movie_extra_btn_mode = Lampa.Storage.get('platfroms_movie_extra_btn_mode', EXTRA_BTN_DISPLAY_MODE.HIDE);
            settings.studios_list_mode = Lampa.Storage.get('studios_list_mode', LIST_DISPLAY_MODE.LOGO);
            settings.studios_list_max_visible = Lampa.Storage.get('studios_list_max_visible', 3);
            var isMC = Lampa.Storage.get('platforms_mobile_center', false);
            settings.platforms_mobile_center = (isMC === true || isMC === 'true');
            settings.networks_margin_top = Lampa.Storage.get('networks_margin_top', '-3em');
            settings.networks_margin_bottom = Lampa.Storage.get('networks_margin_bottom', '3em');
            settings.networks_margin_buttons = Lampa.Storage.get('networks_margin_buttons', '0.5em');
            settings.networks_btn_height = Lampa.Storage.get('networks_btn_height', '2.2em');
        }
        function startPlugin() {
            if (window.tmdb_networks) return;
            window.tmdb_networks = true;
            $('<style>').prop('type', 'text/css').html('.networks-wrapper { display: flex; flex-wrap: wrap; align-items: center; } .platforms-group, .studios-group { display: flex; flex-wrap: wrap; align-items: center; } .platforms-group > *, .studios-group > * { margin-right: var(--tmdb-net-gap, 0.5em); margin-bottom: var(--tmdb-net-gap, 0.5em); } .network-btn { height: var(--tmdb-net-btn-h, 2.2em); display: inline-flex; align-items: center; justify-content: center; overflow: hidden; } .full-descr__left .tag-count.network-btn::before { display: none !important; content: none !important; } .network-separator { width: 2px; height: 1.8em; background: rgba(255,255,255,0.2); margin: 0 var(--tmdb-net-gap, 0.5em) var(--tmdb-net-gap, 0.5em) 0.1em; border-radius: 2px; } .network-logo { background-color: #ffffff !important; position: relative; padding: 0.3em 0.6em; border-radius: 0.6em; } .network-logo img { height: calc(var(--tmdb-net-btn-h, 2.2em) * 0.7); width: auto; max-width: 100%; object-fit: contain; border-radius: 0; } .network-logo .overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0); border-radius: 0.6em; } .network-logo.full-start__button .overlay { border-radius: 1em; } .network-logo.focus { box-shadow: 0 0 0 0.2em #fff !important; } .network-logo.focus .overlay { background: rgba(0, 0, 0, 0.2) !important; } @media (max-width: 768px) { .center-on-mobile { justify-content: center; } .center-on-mobile .platforms-group, .center-on-mobile .studios-group { justify-content: center; } }').appendTo('head');
            initSettings();
            addLocalization();
            addSettings();
            var originalTMDBImage = Lampa.TMDB.image;
            Lampa.TMDB.image = function(url) {
                if (url && typeof url === 'string' && url.indexOf('h0rjX5vjW5r8yEnUBStFarjcLT4') !== -1) return 'https://raw.githubusercontent.com/ko31k/LMP/main/wwwroot/img/20th-Century-Fox-Logo.png';
                return originalTMDBImage.call(this, url);
            };
            Lampa.Listener.follow('activity,full', function (e) {
                if (e.type === 'complite' || e.type === 'archive') renderNetworks();
            });
        }
        if (window.appready) startPlugin();
        else Lampa.Listener.follow('app', function (event) { if (event.type === 'ready') startPlugin(); });
    })();
