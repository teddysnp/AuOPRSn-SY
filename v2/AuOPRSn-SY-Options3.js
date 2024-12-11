// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      1.1
// @description  AuOPRSn-SY-MissionManager : Create and modify the missions
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let cookie = "cfz_facebook-pixel=%7B%22dzQR_fb-pixel%22%3A%7B%22v%22%3A%22fb.2.1728342681364.1277639958%22%2C%22e%22%3A1759878681364%7D%7D; edgesessions_enabled=rollout; __stripe_mid=06834240-0740-4aff-b079-086f06de45d0d4be2d; _mkto_trk=id:713-XSC-918&token:_mch-cloudflare.com-1728463598293-75401; _gcl_au=1.1.1222970582.1728463599; _uetvid=feb49220861a11ef825825b8c3be588f|1usahv7|1728463599211|1|1|bat.bing.com/p/insights/c/j; _ga=GA1.1.1126041185.1728463628; _ga_8BK794H3J9=GS1.1.1728463627.1.1.1728463656.0.0.0; cf-locale=zh-CN; OptanonConsent=isGpcEnabled=0&datestamp=Mon+Nov+04+2024+21%3A11%3A38+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202407.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; cfz_amplitude=%7B%22TTin_event_id%22%3A%7B%22v%22%3A%2295%22%2C%22e%22%3A1762261908649%7D%7D; dark-mode=off; __cf_effload=1; __cf_logged_in=1; sparrow_id=%7B%22deviceId%22%3A%2286e58a8c-88e5-4a5a-96df-7b202d973b9f%22%2C%22userId%22%3A%22f81f5b8ab79c336d1c9adb62ca268497%22%7D; _cfuvid=OfTIQVQIGAHBlsllv_5jswW64tOqgF0NDPkTfsG1OLE-1733613087479-0.0.1.1-604800000; __cf_bm=lPakF6RBgKPVspw4K7928iDO0uAJpiJjrYt3RmGoB8I-1733959484-1.0.1.1-775kywDxZzdnjZhAQb0IVFh5z.MV3fCb2NTMXKu5YdJwCd.s1k_XYuxHFJX6AY8BIur4NKqYAFASQZTjEgWLUQ; __cfruid=755a978d716ea9cfa2fee2fdc206738826c22b48-1733959484; cf_clearance=OVoDys8o_Qjrwy4Z9OuckOd390dATmL_5llcqdWaQZ0-1733959485-1.2.1.1-L7OfDYdkLO81S6.QVWRMGwnNGdyYHPOC8UTydXP3nR58BVtGM5X3pTcLl4CW.QUYjmHmyk6eypjnLsQvxrb.fb.aYVw2ciAakYgn.77XV2kJwRXhOvyPJjAAa9ttHOeHUAAX6.uQHqTkaOUCsOhs8sldl0LPtL2h2HVtImuDxZzuN81xq2SZL9MMZ0ciyoiNrkHecHOSS20h1RiBoJ4lCKjrzUb_rJLgjT2K4OyBPbmIi5cDs2jEoVOAeooeKL2f58nFhX1mDWBWLEJeRCZE_koVPkHi.JqLTud89CGAIO7BJtG6bvVDQ4ip_JfFTm66MaL3zRaFZoyB_5AOxPrNPyCvfisaXxvrdqAI.qg_RHjovgleM6sgeWQ8e_JbAEWRIVC6xL8Te9S39unmtJ37YQ; __cflb=0H28upHR6WxXGRqfrsxN5xU37UpscFWLz29ZpDfxMrd; vses2=cfes-f81f5b8ab7-64d441824acb0752d04a4b5404f8f94873fd88ef95d8d31ad16cfc300d3488b4-uukeuilthtulg8ud0s4cr1n21d8ie391; CF_VERIFIED_DEVICE_71e60f117b27982e2c970e6649d5915b671d26d75bccc65ed8476612e2e80a54=1733959522; OptanonConsent=isGpcEnabled=0&datestamp=Thu+Dec+12+2024+07%3A25%3A24+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202411.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; __stripe_sid=fb064ce1-1a2c-42a7-a1cc-496152fdce73553f6a; cfzs_google-analytics_v4=%7B%22nzcr_pageviewCounter%22%3A%7B%22v%22%3A%2217%22%7D%2C%22nzcr_conversionCounter%22%3A%7B%22v%22%3A%226%22%7D%7D; cfz_google-analytics_v4=%7B%22nzcr_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1765495548439%7D%2C%22nzcr_engagementStart%22%3A%7B%22v%22%3A%221733959548439%22%2C%22e%22%3A1765495548439%7D%2C%22nzcr_counter%22%3A%7B%22v%22%3A%221371%22%2C%22e%22%3A1765495548439%7D%2C%22nzcr_session_counter%22%3A%7B%22v%22%3A%22201%22%2C%22e%22%3A1765495548439%7D%2C%22nzcr_ga4%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1765495548439%7D%2C%22nzcr__z_ga_audiences%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1759878681364%7D%2C%22nzcr_let%22%3A%7B%22v%22%3A%221733959548439%22%2C%22e%22%3A1765495548439%7D%2C%22nzcr_ga4sid%22%3A%7B%22v%22%3A%2250103640%22%2C%22e%22%3A1733961348439%7D%7D";
    localStorage.setItem("cfcookie",cookie);



})();
