
(function () {
    'use strict';

    const DEFAULT_LANG = 'en';

    const LANG_MAP = {
        // English
        US:'en', GB:'en', CA:'en', AU:'en', NZ:'en',
        IE:'en', SG:'en',

        // Asia
        JP:'ja', KR:'ko', CN:'zh-CN', TW:'zh-TW',
        HK:'zh-TW', TH:'th', ID:'id', MY:'ms',
        PH:'tl', IN:'hi', PK:'ur', BD:'bn',
        VN:'vi',

        // Europe
        FR:'fr', DE:'de', IT:'it', ES:'es',
        PT:'pt', NL:'nl', BE:'nl', CH:'de',
        AT:'de', LU:'fr',

        // Scandinavia
        SE:'sv', NO:'no', DK:'da',
        FI:'fi', IS:'is',

        // Eastern Europe
        PL:'pl', CZ:'cs', SK:'sk', HU:'hu',
        RO:'ro', BG:'bg', HR:'hr', SI:'sl',
        RS:'sr', BA:'bs', ME:'sr', MK:'mk',
        UA:'uk', RU:'ru',

        // Baltic
        LT:'lt', LV:'lv', EE:'et',

        // Southern Europe
        GR:'el', AL:'sq',

        // Middle East
        SA:'ar', AE:'ar', EG:'ar', IQ:'ar',
        MA:'ar', IL:'he', IR:'fa', AF:'fa',
        TR:'tr',

        // Latin America
        MX:'es', AR:'es', CO:'es', CL:'es',
        PE:'es', VE:'es', UY:'es', PY:'es',
        BO:'es', EC:'es',

        // Brazil
        BR:'pt',

        // Africa
        ZA:'en', NG:'en', KE:'en'
    };

    // Loading overlay
    const overlay = document.createElement('div');

    overlay.id = 'translate-overlay';

    overlay.style.cssText = `
        position:fixed;
        inset:0;
        z-index:999999;
        background:rgba(255,255,255,.48);
        backdrop-filter:blur(6px);
        display:flex;
        align-items:center;
        justify-content:center;
        transition:opacity .4s ease;
    `;

    const spinner = document.createElement('div');

    spinner.style.cssText = `
        width:36px;
        height:36px;
        border:3px solid #e0e0e0;
        border-top-color:#1877f2;
        border-radius:50%;
        animation:translate-spin .7s linear infinite;
    `;

    const style = document.createElement('style');

    style.textContent = `
        @keyframes translate-spin {
            to { transform:rotate(360deg); }
        }
    `;

    document.head.appendChild(style);
    overlay.appendChild(spinner);

    function showOverlay() {
        if (!document.getElementById('translate-overlay')) {
            document.body.appendChild(overlay);
        }
    }

    function removeOverlay() {
        overlay.style.opacity = '0';

        setTimeout(() => {
            overlay.remove();
        }, 400);
    }

    // Read Google Translate cookie
    function getCookie() {
        const match = document.cookie.match(
            /(?:^|;\s*)googtrans=([^;]*)/
        );

        return match
            ? decodeURIComponent(match[1])
            : '';
    }

    // Set Google Translate cookie
    function setCookie(lang) {
        const value = '/en/' + lang;

        const cookie =
            'googtrans=' + encodeURIComponent(value) +
            '; path=/; max-age=31536000; SameSite=Lax';

        document.cookie = cookie;

        // Try root domain for www and subdomains
        const parts = location.hostname.split('.');

        if (parts.length >= 2) {
            const rootDomain = parts.slice(-2).join('.');

            document.cookie =
                cookie + '; domain=.' + rootDomain;
        }
    }

    // Detect country from IP
    async function getCountryCode() {

        const apis = [
            async () => {
                const r = await fetch(
                    'https://ipapi.co/json/',
                    { cache: 'no-store' }
                );

                if (!r.ok) throw new Error('IPAPI error');

                const d = await r.json();

                return d.country_code;
            },

            async () => {
                const r = await fetch(
                    'https://api.country.is/',
                    { cache: 'no-store' }
                );

                if (!r.ok) throw new Error('Country API error');

                const d = await r.json();

                return d.country;
            },

            async () => {
                const r = await fetch(
                    'https://apip.cc/json',
                    { cache: 'no-store' }
                );

                if (!r.ok) throw new Error('APIP error');

                const d = await r.json();

                return d.CountryCode;
            }
        ];

        for (const api of apis) {
            try {
                const code = await api();

                if (code && /^[A-Za-z]{2}$/.test(code)) {
                    return code.toUpperCase();
                }

            } catch (e) {
                console.warn('IP detection failed:', e);
            }
        }

        return '';
    }

    // Wait for Google Translate
    function waitForTranslation(timeout = 12000) {

        return new Promise(resolve => {

            const html = document.documentElement;

            if (
                /translated-(ltr|rtl)/.test(html.className)
            ) {
                resolve(true);
                return;
            }

            const observer = new MutationObserver(() => {

                if (
                    /translated-(ltr|rtl)/.test(html.className)
                ) {
                    clearTimeout(timer);
                    observer.disconnect();
                    resolve(true);
                }
            });

            observer.observe(html, {
                attributes: true,
                attributeFilter: ['class']
            });

            const timer = setTimeout(() => {
                observer.disconnect();
                resolve(false);
            }, timeout);
        });
    }

    // Main
    async function run() {

        showOverlay();

        try {

            const country = await getCountryCode();

            console.log('[Translate] Country:', country);

            const targetLang =
                LANG_MAP[country] || DEFAULT_LANG;

            console.log('[Translate] Target language:', targetLang);

            const currentCookie = getCookie();

            const expectedCookie = '/en/' + targetLang;

            // Only reload if language has changed
            if (currentCookie !== expectedCookie) {

                setCookie(targetLang);

                console.log(
                    '[Translate] Language changed:',
                    expectedCookie
                );

                location.reload();
                return;
            }

            // Existing language is correct
            if (targetLang !== 'en') {
                await waitForTranslation(12000);
            }

        } catch (error) {

            console.error('[Translate] Error:', error);

        } finally {

            removeOverlay();
        }
    }

    if (document.body) {
        run();
    } else {
        document.addEventListener(
            'DOMContentLoaded',
            run,
            { once: true }
        );
    }

})();
