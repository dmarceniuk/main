# 🛠️ Технічний Довідник: Архітектура Онлайн-Джерел у Lampa

Цей документ містить поглиблений технічний аналіз того, як влаштовані онлайн-балансери у Lampa, детальний розбір реалізації **BanderaOnline** та **StreamHub**, а також покроковий посібник зі створення власного онлайн-джерела з нуля.

---

## 1. Концепція та Архітектура Онлайн-Джерел у Lampa

У стандартному стані Lampa — це каталог метаданих, що бере постери, описи, акторський склад та трейлери з **TMDB (The Movie Database)**.

На відміну від торентів (де TorrServer скачує шматки файлу через P2P-сворм), **онлайн-джерела (балансери)** працюють за класичною моделлю HTTP Live Streaming (HLS) або прямого MP4-відео:
1. Користувач відкриває картку фільму/серіалу.
2. Плагін перехоплює подію побудови картки та додає кнопку перегляду («Дивитися онлайн», «Bandera Online», «StreamHub»).
3. При натисканні на кнопку плагін отримує дані картки (`movie`: назва, оригінальна назва, рік виходу, IMDB ID, TMDB ID).
4. Плагін звертається до бекенду або безпосередньо до сайту-балансера і шукає відповідний реліз.
5. Якщо це серіал — формується список сезонів і серій (із TMDB або каталогу сайту).
6. Для обраного епізоду витягується посилання на мастер-плейлист HLS (`.m3u8`) або прямий `.mp4`.
7. Посилання передається у відеоплеєр Lampa (`Lampa.Player.play()`), який відтворює відео через стандартний HTML5 `<video>` або нативний апаратний декодер Smart TV.

---

## 2. Ключові API та Компоненти Lampa

Плагін для Lampa спирається на такі системні класи:

| Клас / Метод | Призначення |
| :--- | :--- |
| `Lampa.Listener.follow(event, callback)` | Перехоплення життєвого циклу застосунку. Головна подія для картки: `full` з типом `complite`. |
| `Lampa.Component.add(name, classFunction)` | Реєстрація нового екрана (модуля перегляду). |
| `Lampa.Activity.push(params)` | Перехід на новий екран. Додає екран у стек історії для кнопки «Назад». |
| `Lampa.Controller.add(name, handlers)` | Реєстрація логіки керування пультом телевізора (D-Pad, стрілки, OK, Back). |
| `Lampa.Controller.toggle(name)` | Перемикання активного фокусу пульта на зареєстрований контролер. |
| `Lampa.Player.play(params)` | Запуск відтворення відео у вбудованому плеєрі. |
| `Lampa.Player.playlist(items)` | Передача списку відтворення (наступні серії). |
| `Lampa.Storage.get / set` | Робота з локальним сховищем (налаштування, історія, останній балансер). |
| `Lampa.Template.add / get` | Реєстрація та рендеринг HTML-шаблонів із підстановкою змінних. |

---

## 3. Глибокий Розбір: Як влаштований BanderaOnline.js

Файл `BanderaOnline.js` — це складний комбінований плагін, який поєднує:
1. **Централізований бекенд-шлюз**: `https://bbe.lme.isroot.in/api/v2`
2. **Вбудований клієнтський скрапер**: для `uaserials.com` із дешифруванням скриптів на льоту.

### 3.1. Клієнтський скрапінг UASerials
Для сайту UASerials плагін виконує прямий парсинг просто у браузері користувача:
1. **Обхід CORS**: Запити до `uaserials.com` проксуються через `https://api.framextv.tech/api/proxy?url=`, оскільки браузери та Smart TV блокують крос-доменні запити до сторонніх сайтів.
2. **Пошук**:
   ```javascript
   var searchUrl = 'https://uaserials.com/index.php?do=search&subaction=search&story=' + encodeURIComponent(title);
   ```
3. **Вибір правильної картки**: Функція `scoreUASerialsCard()` порівнює назву картки зі знайденими результатами, враховуючи рік і тип контенту.
4. **Витяг плеєра Tortuga та дешифрування**:
   - UASerials ховає посилання у зашифрованих атрибутах.
   - Плагін використовує бібліотеку **CryptoJS** та алгоритм `CryptoJS.PBKDF2` із фіксованим ключем:
     ```javascript
     var UASERIALS_KEY = '297796CCB81D255125';
     var cKey = CryptoJS.PBKDF2(UASERIALS_KEY, cSalt, { keySize: 256/32, iterations: 1000 });
     ```
   - Після дешифрування витягується посилання на плеєр Tortuga.
   - Код фрейму Tortuga містить рядок base64, який декодується функцією `uaserialsTortugaDecode()`.
5. **Стрімінг HLS**: Отримане пряме посилання на `.m3u8` передається через оптимізований HLS-проксі `https://stream.ernax.pro/proxy-hls?url=...` напряму у плеєр Lampa.

### 3.2. Централізований шлюз API v2
Для інших джерел (UAFlix, Makhno, Filmix, BambooUA, AnimeOn, Mikai, Starlight, Franko):
- Робиться запит `GET https://bbe.lme.isroot.in/api/v2/search?title=...&imdb_id=...&sources=...`.
- Бекенд повертає нормалізовану структуру серій, перекладів та прямих посилань.
- Якщо користувач налаштував авторизацію Filmix (через введення коду на `filmix.my/consoles`), плагін передає `device_id` та `token`, відкриваючи преміум-якості 1080p/4K.

---

## 4. Глибокий Розбір: Як влаштований StreamHub

Проєкт **StreamHub** розбитий на чіткі мікросервіси:
- `core/` — єдиний вхідний API-шлюз (`POST /query`).
- `providers/` — незалежні модулі парсингу:
  - `rezka-provider/` — емулює запити до дзеркал HDRezka, витягує плейлисти CDN та субтитри.
  - `eneyida-provider/` — парсить сторінки Eneyida.tv та конфігурації PlayerJS.
  - `uaflix-provider/` — скрапить відеофрейми з UAFlix.
  - `uaserial-provider/` — парсить серіали з UASerial.tv.
  - `kodik-provider/` — працює з офіційним API Kodik.
- `adapters/lampa-adapter/`:
  - Надає ендпоінт `GET /streams?imdb=...&query=...&season=...&episode=...`
  - Перетворює запит від Lampa у запит до Core і повертає список стрімів:
    ```json
    {
      "streams": [
        {
          "title": "HDRezka (Ukr Dub)",
          "url": "https://stream.provider/master.m3u8",
          "quality": "1080p",
          "source": "rezka",
          "subtitles": []
        }
      ]
    }
    ```

---

## 5. Покроковий Посібник: Як Створити Власний Онлайн-Плагін для Lampa

Нижче наведено повноцінний шаблон нового плагіна онлайн-джерела, який ви можете скопіювати та адаптувати під будь-який онлайн-кінотеатр або балансер.

### Крок 1. Структура файлу `my-custom-online.js`

```javascript
(function () {
  'use strict';

  var PLUGIN_NAME = 'my_online_source';
  var COMPONENT_NAME = 'my_online_component';

  // Локалізація
  Lampa.Lang.add({
    my_online_title: { ru: 'Мій Онлайн', uk: 'Мій Онлайн', en: 'My Online' },
    my_online_empty: { ru: 'Потоки не найдены', uk: 'Потоки не знайдено', en: 'Streams not found' }
  });

  // 1. Додавання кнопки на картку фільму
  function addButton() {
    Lampa.Listener.follow('full', function (e) {
      if (e.type === 'complite') {
        var render = e.object.activity.render();
        if (!render || render.find('.view--my-online').length) return;

        var btn = $(
          '<div class="full-start__button selector view--my-online">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">' +
              '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>' +
            '</svg>' +
            '<span>' + Lampa.Lang.translate('my_online_title') + '</span>' +
          '</div>'
        );

        btn.on('hover:enter', function () {
          Lampa.Component.add(COMPONENT_NAME, OnlineComponent);
          Lampa.Activity.push({
            url: '',
            title: Lampa.Lang.translate('my_online_title'),
            component: COMPONENT_NAME,
            movie: e.data.movie,
            page: 1
          });
        });

        // Надійне розміщення кнопки поруч із іншими діями
        var target = render.find('.view--bandera-online');
        if (!target.length) target = render.find('.view--torrent');
        if (!target.length) target = render.find('.button--play');
        if (target.length) target.after(btn);
        else render.find('.full-start-new__buttons').append(btn);
      }
    });
  }

  // 2. Реалізація екрана вибору серій та потоків
  function OnlineComponent(object) {
    var scroll = new Lampa.Scroll({ mask: true });
    var files = new Lampa.Explorer(object);
    var last;

    this.create = function () { return files.render(); };
    this.render = function () { return files.render(); };

    this.start = function () {
      var movie = object.movie || {};
      this.loading(true);
      fetchStreams(movie);
    };

    var fetchStreams = function (movie) {
      // ПРИКЛАД: Запит до вашого API
      var query = movie.original_title || movie.title;
      var year = movie.release_date ? movie.release_date.slice(0, 4) : '';
      var imdb = movie.imdb_id || '';

      var apiUrl = 'https://my-backend-proxy.example/api/search?q=' + encodeURIComponent(query) + '&year=' + year + '&imdb=' + imdb;

      fetch(apiUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data || !data.streams || !data.streams.length) {
            drawEmpty();
            return;
          }
          drawStreams(data.streams, movie);
        })
        .catch(function () {
          drawEmpty();
        });
    };

    var drawStreams = function (streams, movie) {
      scroll.clear();

      streams.forEach(function (stream) {
        var card = $(
          '<div class="online-item selector" style="padding:1em;background:rgba(255,255,255,0.08);margin-bottom:.5em;border-radius:.4em;">' +
            '<div style="font-size:1.2em;font-weight:bold;">' + (stream.title || movie.title) + '</div>' +
            '<div style="opacity:0.7;font-size:0.9em;margin-top:.2em;">' + (stream.quality || '1080p') + ' · ' + (stream.voice || 'Оригінал') + '</div>' +
          '</div>'
        );

        card.on('hover:enter', function () {
          // 3. Запуск відео у плеєрі
          Lampa.Player.play({
            title: movie.title + ' - ' + stream.title,
            url: stream.url, // Прямий HLS .m3u8 або .mp4
            quality: stream.quality,
            subtitles: stream.subtitles || []
          });

          Lampa.Player.playlist([{
            title: stream.title,
            url: stream.url
          }]);
        });

        card.on('hover:focus', function (e) {
          last = e.target;
          scroll.update($(e.target), true);
        });

        scroll.append(card);
      });

      files.appendFiles(scroll.render());

      // 4. Підключення пульта керування
      Lampa.Controller.add(COMPONENT_NAME, {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || scroll.render().find('.selector').first(), scroll.render());
        },
        back: function () {
          Lampa.Activity.backward();
        }
      });
      Lampa.Controller.toggle(COMPONENT_NAME);
    };

    var drawEmpty = function () {
      scroll.clear();
      scroll.append($('<div style="padding:3em 1em;text-align:center;font-size:1.3em;">' + Lampa.Lang.translate('my_online_empty') + '</div>'));
      files.appendFiles(scroll.render());
      Lampa.Controller.add(COMPONENT_NAME, {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
        },
        back: function () {
          Lampa.Activity.backward();
        }
      });
      Lampa.Controller.toggle(COMPONENT_NAME);
    };

    this.loading = function (status) {
      if (status) {
        files.clear();
        files.appendFiles($('<div class="broadcast__scan"><div></div></div>'));
      }
    };

    this.pause = function () {};
    this.stop = function () {};
    this.destroy = function () {
      scroll.destroy();
      files.destroy();
    };
  }

  // Ініціалізація плагіна
  if (window.Lampa && Lampa.Listener) {
    addButton();
  } else {
    var timer = setInterval(function () {
      if (window.Lampa && Lampa.Listener) {
        clearInterval(timer);
        addButton();
      }
    }, 150);
  }
})();
```

---

## 6. Як вирішувати проблему CORS на Smart TV

Головна перешкода при написанні клієнтських скраперів для Smart TV — політика **Same-Origin Policy (CORS)**.

Якщо спробувати зробити `fetch('https://some-cinema.net/search')` прямо з браузера телевізора:
Браузер заблокує запит із помилкою `CORS header 'Access-Control-Allow-Origin' missing`.

### Робочі способи обходу CORS:
1. **Безкоштовний Cloudflare Worker (Найкращий спосіб)**:
   Напишіть простий проксі у Cloudflare Workers (безкоштовно 100 000 запитів на добу):
   ```javascript
   export default {
     async fetch(request) {
       const url = new URL(request.url).searchParams.get('url');
       if (!url) return new Response('Missing url parameter', { status: 400 });
       const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ...' } });
       const headers = new Headers(response.headers);
       headers.set('Access-Control-Allow-Origin', '*');
       return new Response(response.body, { status: response.status, headers });
     }
   };
   ```
2. **Власний Node.js / Express бекенд (як у StreamHub)**:
   Сервер робить HTTP-запит до балансера від свого імені (на бекенді CORS обмежень немає), витягує прямий HLS `.m3u8` і віддає його клієнту з заголовком `Access-Control-Allow-Origin: *`.
3. **Публічні проксі спільноти**:
   Використання готових CORS-проксі LME (`https://api.framextv.tech/api/proxy?url=`).
