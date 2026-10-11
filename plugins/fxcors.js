export default {
    async fetch(request, _env) {
        return await handleRequest(request);
    }
}

async function handleRequest(request) {
    let reqHeaders = new Headers(request.headers),
        outBody, outStatus = 200,
        outStatusText = 'OK',
        outCt = null,
        outHeaders = new Headers({
            "Access-Control-Allow-Origin": reqHeaders.get('Origin') || reqHeaders.get('Referer') || "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": reqHeaders.get('Access-Control-Allow-Headers') || "Accept, Origin, Content-Type, Authorization, X-Requested-With, X-Signalr-User-Agent, Cache-Control, DNT, If-Modified-Since, Keep-Alive, User-Agent, realip, x-cookie"
        });

    try {
        let url = request.url.substr(8);
        url = url.substr(url.indexOf('/') + 1);

        if (request.method == "OPTIONS" || url.length < 3 || url.indexOf('.') == -1 || url == "favicon.ico" || url == "robots.txt") {
            const invalid = !(request.method == "OPTIONS" || url.length === 0)
            outBody = JSON.stringify({
                code: invalid ? 400 : 0,
                usage: 'Host/{URL}'
            });
            outCt = "application/json";
            outStatus = invalid ? 400 : 200;
        } else {
            url = fixUrl(url);
            const apiUrl = new URL(url);

            let fp = { 
                method: request.method,
                headers: {}
            }

            const allowHeaders = ['connection', 'accept-encoding'];
            let he = reqHeaders.entries();
            for (let h of he) {
                const key = h[0],
                    value = h[1];
                if (allowHeaders.includes(key.toLowerCase())) {
                    fp.headers[key] = value;
                }
            }

            fp.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';

            if (url.indexOf('rezka') >= 0 || url.indexOf('kinopub.me') {
                fp.headers['X-Real-IP'] = reqHeaders.get('realip') || request.headers.get('CF-Connecting-IP');
                fp.headers['Origin'] = apiUrl.origin;
                fp.headers['Referer'] = apiUrl.origin + "/"; 
                fp.headers['cookie'] = reqHeaders.get('Cookie') || reqHeaders.get('X-Cookie') || 'PHPSESSID=ulsp3783953bm7ejojgakcicco; dle_user_token=3c7bafea181a12a4b2d2dc2555fcc86c; _ym_uid=170332480144901774; _ym_d=1703324801; _ym_isad=2; _ym_visorc=b';
            }
            else if (url.indexOf('filmix.') >= 0) {
                fp.headers['Origin'] = apiUrl.origin;
                fp.headers['Referer'] = apiUrl.origin + "/search/"; 
                fp.headers['X-Requested-With'] = 'XMLHttpRequest';
                fp.headers['Sec-Fetch-Site'] = 'same-origin';
                fp.headers['Sec-Fetch-Mode'] = 'cors';
                fp.headers['Sec-Fetch-Dest'] = 'empty';
                fp.headers['Cookie'] = 'x-a-key=sinatra; FILMIXNET=2g5orcue70hmbkugbr7vi431l0; _ga_GYLWSWSZ3C=GS1.1.1703578122.1.0.1703578122.0.0.0; _ga=GA1.1.1855910641.1703578123';
                fp.headers['Accept-Language'] = 'ru-RU,ru;q=0.9';
            }
            else if (apiUrl.hostname.endsWith("cdnmovies-stream.online") || apiUrl.hostname.endsWith("cdnmovies-hls-stream.online") || apiUrl.hostname.endsWith(".sarnage.cc")) {
                fp.headers['X-Real-IP'] = reqHeaders.get('CF-Connecting-IP');
                fp.headers['Origin'] = 'https://cdnmovies.net'; 
                fp.headers['Referer'] = 'https://cdnmovies.net/';
            }
            else if (url.indexOf('m.chaturbate.com') >= 0) {
                fp.headers['user-agent'] = 'Mozilla/5.0 (Linux armv9; U; en;) AppleWebKit/537.17 (Grundig;KU;08.005.03;) CE-HTML/1.0 ARCELIKAS HbbTV/1.1.1 (MWB;Arcelik_Gen3;RC_V2;Arcelik;KU;KYGRMR.U.-.-.-.V08.005.03;en-TR;wired;prod;)';
            } 
            else if (url.indexOf('cdntrex.com') >= 0) {
                fp.headers['referer'] = 'https://www.porntrex.com/';
            } 
            else if (url.indexOf('pornhub.com') >= 0) {
                fp.headers['cookie'] = 'platform=pc; bs=ukbqk2g03joiqzu68gitadhx5bhkm48j; ss=250837987735652383; fg_0d2ec4cbd943df07ec161982a603817e=56239.100000; atatusScript=hide; _gid=GA1.2.309162272.1686472069; d_fs=1; d_uidb=2f5e522a-fa28-a0fe-0ab2-fd90f45d96c0; d_uid=2f5e522a-fa28-a0fe-0ab2-fd90f45d96c0; d_uidb=2f5e522a-fa28-a0fe-0ab2-fd90f45d96c0; accessAgeDisclaimerPH=1; cookiesBannerSeen=1; _gat=1; __s=64858645-42FE722901BBA6E6-125476E1; __l=64858645-42FE722901BBA6E6-125476E1; hasVisited=1; fg_f916a4d27adf4fc066cd2d778b4d388e=78731.100000; fg_fa3f0973fd973fca3dfabc86790b408b=12606.100000; _ga_B39RFFWGYY=GS1.1.1686472069.1.1.1686472268.0.0.0; _ga=GA1.1.1515398043.1686472069';
            } 

            if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
                const ct = (reqHeaders.get('content-type') || "").toLowerCase();
                if (ct.includes('application/json')) {
                    fp.body = JSON.stringify(await request.json());
                } else if (ct.includes('application/text') || ct.includes('text/html')) {
                    fp.body = await request.text();
                } else if (ct.includes('form')) {
                    fp.body = await request.formData();
                } else {
                    fp.body = await request.blob();
                }
            }

            let fr = (await fetch(url, fp));
            outCt = fr.headers.get('content-type');
            outStatus = fr.status;
            outStatusText = fr.statusText;
            outBody = fr.body;
        }
    } catch (err) {
        outCt = "application/json";
        outBody = JSON.stringify({
            code: -1,
            msg: JSON.stringify(err.stack) || err
        });
        outStatus = 500;
    }

    if (outCt && outCt != "") {
        outHeaders.set("content-type", outCt);
    }

    let response = new Response(outBody, {
        status: outStatus,
        statusText: outStatusText,
        headers: outHeaders
    })

    return response;
}

function fixUrl(url) {
    if (url.includes("://")) {
        return url;
    } else if (url.includes(':/')) {
        return url.replace(':/', '://');
    } else {
        return "http://" + url;
    }
}