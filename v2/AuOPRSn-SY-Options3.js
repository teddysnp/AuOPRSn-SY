// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      1.0
// @description  AuOPRSn-SY-MissionManager : Create and modify the missions
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let cookie = "cfz_facebook-pixel=%7B%22dzQR_fb-pixel%22%3A%7B%22v%22%3A%22fb.2.1728342681364.1277639958%22%2C%22e%22%3A1759878681364%7D%7D; edgesessions_enabled=rollout; __stripe_mid=06834240-0740-4aff-b079-086f06de45d0d4be2d; _mkto_trk=id:713-XSC-918&token:_mch-cloudflare.com-1728463598293-75401; _gcl_au=1.1.1222970582.1728463599; _uetvid=feb49220861a11ef825825b8c3be588f|1usahv7|1728463599211|1|1|bat.bing.com/p/insights/c/j; _ga=GA1.1.1126041185.1728463628; _ga_8BK794H3J9=GS1.1.1728463627.1.1.1728463656.0.0.0; cf-locale=zh-CN; OptanonConsent=isGpcEnabled=0&datestamp=Mon+Nov+04+2024+21%3A11%3A38+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202407.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; cfz_amplitude=%7B%22TTin_event_id%22%3A%7B%22v%22%3A%2295%22%2C%22e%22%3A1762261908649%7D%7D; dark-mode=off; __cf_bm=p6BgSZIzTouvvKMvcU0C_.f7cKU2HxxW.lI8Ox21x60-1733054629-1.0.1.1-fTQxveeWOvsfyt5jKRte78Sph0jFR571rIPUPTClY2ulru2JOSU_SsNp.Hxf3zMKQ3blNeOk5Fo76ln1p1qY1w; __cfruid=ccca035929f83a7b148f010d6510997ce070acdd-1733054629; _cfuvid=C25QYK0xBnTm1cKlz1GtoH.y.v4SlpT6V6L05ld9nGw-1733054629883-0.0.1.1-604800000; cf_clearance=RWnR9wVG4a_n0LobrgQH62wxtPwS3Kr_HYXKRmOHKU0-1733054632-1.2.1.1-Zxf49KTqivG32Zg28hFf53cBJaUltFFViAqNXAwqkuHz0rFuIvXxg1dRLQN.eEwQjuDoltjJBNcRbofLVHyC8KJqEVAFuBRMVjtuh6sWO7wGufvjVdvmADkUd0uE3IVnB3FPbRsv5Ndyv5QPpgIc4crn3g8PAm6hnhAeMNpbNDANTRQqp3wty4hzA3rBcOsrQFsz2UO_oHVb4g4Uo2X4t3ciDG4RSD3M5nYP3NfrOQcXhaakyI2TFBvU.coqTv6i5VIZKHDjXRIkSKnHkKv6zpHAoBiipaTZSUr60Y3oE3bLiAqXC.A_9gRp6QSw0gDG0bdQ6hjuHttMNe9fKivyuNYbY9EL0jIUkcx6uvEWsuDMbWpdZBUlBnlyPqvDcbDZdktVLHIVdVubjaE60JIG1Q; __cflb=0H28upHR6WxXGRqfrsxN5xU37UpscFWLvaAZD2F3mrm; vses2=cfes-f81f5b8ab7-c218f06cf2bb6e74e7f3be6ef28c0e26a7de1d457038fa1b3bbbfb2bca2d2580-fg0vfp3rrsuq4ig6it1ji21nbo4o23vf; __cf_effload=1; __cf_logged_in=1; CF_VERIFIED_DEVICE_71e60f117b27982e2c970e6649d5915b671d26d75bccc65ed8476612e2e80a54=1733054662; OptanonConsent=isGpcEnabled=0&datestamp=Sun+Dec+01+2024+20%3A04%3A23+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202403.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; sparrow_id=%7B%22deviceId%22%3A%2286e58a8c-88e5-4a5a-96df-7b202d973b9f%22%2C%22userId%22%3A%22f81f5b8ab79c336d1c9adb62ca268497%22%7D; __stripe_sid=0b0049cf-def7-4c1e-8970-23acce98d5f839a178; cfzs_google-analytics_v4=%7B%22nzcr_pageviewCounter%22%3A%7B%22v%22%3A%224%22%7D%7D; cfz_google-analytics_v4=%7B%22nzcr_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1764590694915%7D%2C%22nzcr_engagementStart%22%3A%7B%22v%22%3A%221733054694915%22%2C%22e%22%3A1764590694915%7D%2C%22nzcr_counter%22%3A%7B%22v%22%3A%221347%22%2C%22e%22%3A1764590694915%7D%2C%22nzcr_session_counter%22%3A%7B%22v%22%3A%22196%22%2C%22e%22%3A1764590694915%7D%2C%22nzcr_ga4%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1764590694915%7D%2C%22nzcr__z_ga_audiences%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1759878681364%7D%2C%22nzcr_let%22%3A%7B%22v%22%3A%221733054694915%22%2C%22e%22%3A1764590694915%7D%2C%22nzcr_ga4sid%22%3A%7B%22v%22%3A%222069845150%22%2C%22e%22%3A1733056494915%7D%7D";
    localStorage.setItem("cfcookie",cookie);



})();
