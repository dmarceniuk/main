(function () {
    'use strict'

    if (window.plugin_voboost_ready) return
    window.plugin_voboost_ready = true

    var STORAGE_KEY = 'player_volume_boost'

    var VALUES = {
        '100': '100%',
        '110': '110%',
        '125': '125%',
        '150': '150%',
        '175': '175%',
        '200': '200%',
        '250': '250%',
        '300': '300%',
        '400': '400%',
        '500': '500%'
    }

    var STEPS = ['100', '110', '125', '150', '175', '200', '250', '300', '400', '500']

    var LOUD = 250

    var ICON = '<svg viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="0.9" y="6.4" width="4.2" height="8.2" rx="1.6" fill="currentColor"/>'
        + '<path d="M6.2 7.5c0-.6.3-1.2.9-1.6l3.5-2.5c1.2-.9 3.1-.2 3.1 1.1v12c0 1.3-1.9 2-3.1 1.1l-3.5-2.5c-.6-.4-.9-1-.9-1.6V7.5z" fill="currentColor"/>'
        + '<rect x="15" y="9.6" width="5.6" height="1.9" rx="0.95" fill="currentColor"/>'
        + '<rect x="16.85" y="7.75" width="1.9" height="5.6" rx="0.95" fill="currentColor"/>'
        + '</svg>'

    var STYLE = ''
        + '.player-panel__voboost{position:relative}'
        + '.player-panel__voboost .voboost-badge{position:absolute;top:-0.15em;right:-0.5em;min-width:1em;text-align:center;font-size:0.85em;line-height:1;font-weight:600;padding:0.25em 0.35em;border-radius:1em;background-color:#fff;color:#000}'
        + '.player-panel__voboost.focus .voboost-badge{background-color:#000;color:#fff}'
        + '.player-panel__voboost--idle .voboost-badge{display:none}'
        + '.player-panel__voboost--blocked > svg{opacity:0.4}'
        + '.player.youtube .player-panel__voboost{display:none !important}'
        + '.voboost-osd{position:absolute;left:50%;bottom:1.5em;transform:translateX(-50%);display:flex;align-items:center;padding:0.7em 1.3em;border-radius:1em;background-color:rgba(255,255,255,0.1);backdrop-filter:blur(1em);opacity:0;pointer-events:none;transition:opacity 0.2s,bottom 0.3s}'
        + '.voboost-osd--visible{opacity:1}'
        + '.voboost-osd__icon{flex-shrink:0;margin-right:0.8em}'
        + '.voboost-osd__icon > svg{width:1.7em;height:1.7em}'
        + '.voboost-osd__body{min-width:7em}'
        + '.voboost-osd__value{font-size:1.3em;font-weight:600;line-height:1.2}'
        + '.voboost-osd__line{height:0.3em;margin-top:0.5em;border-radius:2em;background-color:rgba(255,255,255,0.25);overflow:hidden}'
        + '.voboost-osd__line > div{height:100%;width:0;border-radius:2em;background-color:#fff;transition:width 0.2s}'
        + '.player--panel-visible .voboost-osd{bottom:11em}'

    Lampa.Lang.add({
        voboost_title: {
            ru: 'Усиление звука',
            en: 'Volume boost',
            uk: 'Підсилення звуку'
        },
        voboost_descr: {
            ru: 'Программное усиление громкости выше 100%',
            en: 'Software volume amplification above 100%',
            uk: 'Програмне підсилення гучності понад 100%'
        },
        voboost_off: {
            ru: 'Выключено',
            en: 'Disabled',
            uk: 'Вимкнено'
        },
        voboost_loud: {
            ru: 'Возможны искажения звука',
            en: 'Audio distortion is possible',
            uk: 'Можливі спотворення звуку'
        },
        voboost_unsupported: {
            ru: 'Устройство не поддерживает усиление',
            en: 'The device does not support boost',
            uk: 'Пристрій не підтримує підсилення'
        },
        voboost_conflict: {
            ru: 'Усиление звука не работает вместе с нормализацией. Отключите нормализацию звука в настройках плеера.',
            en: 'Volume boost does not work together with normalization. Disable audio normalization in the player settings.',
            uk: 'Підсилення звуку не працює разом з нормалізацією. Вимкніть нормалізацію звуку в налаштуваннях плеєра.'
        },
        voboost_conflict_short: {
            ru: 'Недоступно, включена нормализация',
            en: 'Unavailable, normalization is on',
            uk: 'Недоступно, увімкнена нормалізація'
        },
        voboost_conflict_fix: {
            ru: 'Отключить нормализацию звука',
            en: 'Disable audio normalization',
            uk: 'Вимкнути нормалізацію звуку'
        },
        voboost_conflict_done: {
            ru: 'Нормализация отключена. Перезапустите воспроизведение, чтобы усиление заработало.',
            en: 'Normalization is off. Restart playback to apply the boost.',
            uk: 'Нормалізацію вимкнено. Перезапустіть відтворення, щоб підсилення запрацювало.'
        }
    })

    var audio_context = null
    var current = { video: null, source: null, gain: null }
    var notified_conflict = false
    var osd = { html: null, timer: null }

    function boostPercent() {
        var value = parseInt(Lampa.Storage.get(STORAGE_KEY, '100'), 10) || 100

        return STEPS.indexOf(String(value)) >= 0 ? value : 100
    }

    function boostFactor() {
        return Math.max(1, boostPercent() / 100)
    }

    function supported() {
        return Boolean(window.AudioContext || window.webkitAudioContext)
    }

    function normalizationOn() {
        return Boolean(Lampa.Storage.field('player_normalization'))
    }

    function isMediaElement(video) {
        return video && (video.tagName === 'VIDEO' || video.tagName === 'AUDIO') && typeof video.canPlayType === 'function'
    }

    function ensureContext() {
        if (audio_context) return audio_context

        var Ctx = window.AudioContext || window.webkitAudioContext

        if (!Ctx) return null

        try {
            audio_context = new Ctx()
        }
        catch (e) {
            audio_context = null
        }

        return audio_context
    }

    function resumeContext() {
        if (audio_context && audio_context.state === 'suspended') {
            try { audio_context.resume() } catch (e) {}
        }
    }

    function warnConflict() {
        if (notified_conflict) return

        notified_conflict = true

        Lampa.Noty.show(Lampa.Lang.translate('voboost_conflict'))
    }

    function applyGain() {
        if (!current.gain) return

        resumeContext()

        var value = boostFactor()

        try {
            current.gain.gain.setTargetAtTime(value, audio_context.currentTime, 0.05)
        }
        catch (e) {
            current.gain.gain.value = value
        }
    }

    function attach(video) {
        if (!isMediaElement(video)) return false

        if (video.__voboost) {
            current = { video: video, source: video.__voboost.source, gain: video.__voboost.gain }

            applyGain()

            return 'reused'
        }

        if (boostFactor() <= 1) return false

        if (normalizationOn()) {
            warnConflict()

            return false
        }

        var ctx = ensureContext()

        if (!ctx) return false

        resumeContext()

        var source

        try {
            source = ctx.createMediaElementSource(video)
        }
        catch (e) {
            warnConflict()

            console.log('VoBoost', 'createMediaElementSource error:', e && e.message)

            return false
        }

        var gain = ctx.createGain()

        source.connect(gain)
        gain.connect(ctx.destination)

        video.__voboost = { source: source, gain: gain }

        current = { video: video, source: source, gain: gain }

        applyGain()

        console.log('VoBoost', 'attached', boostPercent() + '%')

        return 'created'
    }

    function detach() {
        try {
            if (current.source) current.source.disconnect()
            if (current.gain) current.gain.disconnect()
        }
        catch (e) {}

        if (current.video) delete current.video.__voboost

        current = { video: null, source: null, gain: null }
        notified_conflict = false
    }

    function osdRender() {
        if (osd.html) return osd.html

        osd.html = $('<div class="voboost-osd">'
            + '<div class="voboost-osd__icon">' + ICON + '</div>'
            + '<div class="voboost-osd__body">'
            + '<div class="voboost-osd__value"></div>'
            + '<div class="voboost-osd__line"><div></div></div>'
            + '</div>'
            + '</div>')

        return osd.html
    }

    function osdShow() {
        if (!playerOpened()) return

        var player = Lampa.Player.render()

        if (!player || !player.length) return

        var percent = boostPercent()
        var index = STEPS.indexOf(String(percent))
        var fill = index <= 0 ? 0 : (index / (STEPS.length - 1)) * 100
        var html = osdRender()

        if (!html.parent().length) player.append(html)

        html.find('.voboost-osd__value').text(percent === 100 ? Lampa.Lang.translate('voboost_off') : percent + '%')
        html.find('.voboost-osd__line > div').css('width', fill + '%')

        html.addClass('voboost-osd--visible')

        clearTimeout(osd.timer)

        osd.timer = setTimeout(function () {
            html.removeClass('voboost-osd--visible')
        }, 1400)
    }

    function osdHide() {
        clearTimeout(osd.timer)

        if (osd.html) osd.html.removeClass('voboost-osd--visible').detach()
    }

    function panel() {
        var html = Lampa.PlayerPanel.render && Lampa.PlayerPanel.render()

        return html && html.length ? html : null
    }

    function button() {
        var html = panel()

        if (!html) return null

        var exists = html.find('.player-panel__voboost')

        if (exists.length) return exists

        var btn = $('<div class="player-panel__voboost button selector">' + ICON
            + '<div class="tooltip"></div>'
            + '<div class="voboost-badge"></div>'
            + '</div>')

        var group = html.find('.player-panel__tv-visible .player-panel__box-buttons').last()

        if (!group.length) return null

        var fullscreen = group.find('.player-panel__fullscreen')

        if (fullscreen.length) btn.insertBefore(fullscreen)
        else group.append(btn)

        btn.on('hover:enter', function () {
            if (btn[0].long_time && Date.now() - btn[0].long_time < 500) return

            openBoostSelect(Lampa.Controller.enabled().name)
        })

        btn.on('hover:long', function () {
            if (boostPercent() === 100) return

            changeBoost('100')
        })

        return btn
    }

    function updateButton() {
        var btn = button()

        if (!btn) return

        var percent = boostPercent()
        var title = Lampa.Lang.translate('voboost_title')

        btn.toggleClass('hide', !supported())
        btn.toggleClass('player-panel__voboost--idle', percent === 100)
        btn.toggleClass('player-panel__voboost--blocked', normalizationOn())

        btn.find('.voboost-badge').text(percent)
        btn.find('.tooltip').text(percent === 100 ? title : title + ' · ' + percent + '%')
    }

    function statusText() {
        if (!supported()) return Lampa.Lang.translate('voboost_unsupported')

        var percent = boostPercent()
        var text = percent === 100 ? Lampa.Lang.translate('voboost_off') : percent + '%'

        if (normalizationOn()) return text + ' · ' + Lampa.Lang.translate('voboost_conflict_short')

        return text
    }

    function changeBoost(value) {
        Lampa.Storage.set(STORAGE_KEY, value)
    }

    function playerOpened() {
        return Boolean(Lampa.Player.opened && Lampa.Player.opened())
    }

    function onChanged() {
        updateButton()

        if (!playerOpened()) return

        attach(Lampa.PlayerVideo.video())

        applyGain()

        osdShow()

        if (boostFactor() > 1 && normalizationOn()) warnConflict()
    }

    function openPlayerSettings() {
        var html = panel()

        if (html) html.find('.player-panel__settings').trigger('hover:enter')
    }

    function openBoostSelect(back) {
        var selected = String(boostPercent())

        var goBack = back === 'settings' ? openPlayerSettings : function () {
            Lampa.Controller.toggle(back)
        }

        var items = STEPS.map(function (key) {
            var item = {
                title: VALUES[key],
                value: key,
                selected: key === selected
            }

            if (key === '100') item.subtitle = Lampa.Lang.translate('voboost_off')
            else if (parseInt(key, 10) >= LOUD) item.subtitle = Lampa.Lang.translate('voboost_loud')

            return item
        })

        if (normalizationOn()) {
            items.unshift({
                title: Lampa.Lang.translate('voboost_title'),
                separator: true
            })

            items.unshift({
                title: Lampa.Lang.translate('voboost_conflict_fix'),
                subtitle: Lampa.Lang.translate('voboost_conflict'),
                fix: true
            })
        }

        Lampa.Select.show({
            title: Lampa.Lang.translate('voboost_title'),
            items: items,
            nohide: true,
            onBack: goBack,
            onSelect: function (a) {
                if (a.fix) {
                    Lampa.Storage.set('player_normalization', false)

                    Lampa.Noty.show(Lampa.Lang.translate('voboost_conflict_done'))

                    return openBoostSelect(Lampa.Platform.screen('mobile') ? 'player' : 'player_panel')
                }

                changeBoost(a.value)
            }
        })
    }

    function isPlayerSettings(active) {
        if (!active || !active.nomark || !active.items || !active.items.length) return false

        if (!playerOpened()) return false

        return active.items.some(function (item) {
            return item.method === 'size' || item.method === 'speed'
        })
    }

    function injectSettingsItem(active) {
        var exists = active.items.some(function (item) { return item.voboost })

        if (exists) return

        var entry = {
            voboost: true,
            title: Lampa.Lang.translate('voboost_title'),
            subtitle: statusText(),
            onSelect: function () {
                openBoostSelect('settings')
            }
        }

        var index = -1

        active.items.forEach(function (item, i) {
            if (item.method === 'speed') index = i
        })

        if (index >= 0) active.items.splice(index + 1, 0, entry)
        else active.items.push(entry)
    }

    function addSettingsParam() {
        Lampa.SettingsApi.addParam({
            component: 'player',
            param: {
                name: STORAGE_KEY,
                type: 'select',
                values: VALUES,
                default: '100'
            },
            field: {
                name: Lampa.Lang.translate('voboost_title'),
                description: Lampa.Lang.translate('voboost_descr')
            }
        })
    }

    function listen() {
        Lampa.PlayerVideo.listener.follow('canplay', onReady)
        Lampa.PlayerVideo.listener.follow('play', onReady)

        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name === STORAGE_KEY) onChanged()
            if (e.name === 'player_normalization') updateButton()
        })

        Lampa.Select.listener.follow('preshow', function (e) {
            if (isPlayerSettings(e.active)) injectSettingsItem(e.active)
        })

        Lampa.Player.listener.follow('start', updateButton)

        Lampa.Player.listener.follow('destroy', function () {
            detach()

            osdHide()
        })
    }

    function onReady() {
        var result = attach(Lampa.PlayerVideo.video())

        updateButton()

        if (result === 'created' && boostFactor() > 1) osdShow()
    }

    function startPlugin() {
        $('<style>' + STYLE + '</style>').appendTo('head')

        listen()

        updateButton()
    }

    addSettingsParam()

    if (window.appready) startPlugin()
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin()
        })
    }
})()