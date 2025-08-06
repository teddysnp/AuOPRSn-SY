// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      1.3
// @description  AuOPRSn-SY-MissionManager : Create and modify the missions
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let cookie = "cfz_facebook-pixel=%7B%22dzQR_fb-pixel%22%3A%7B%22v%22%3A%22fb.2.1728342681364.1277639958%22%2C%22e%22%3A1759878681364%7D%7D; edgesessions_enabled=rollout; __stripe_mid=06834240-0740-4aff-b079-086f06de45d0d4be2d; _mkto_trk=id:713-XSC-918&token:_mch-cloudflare.com-1728463598293-75401; _uetvid=feb49220861a11ef825825b8c3be588f|1usahv7|1728463599211|1|1|bat.bing.com/p/insights/c/j; cf-locale=zh-CN; dark-mode=off; sparrow_id=%7B%22deviceId%22%3A%2286e58a8c-88e5-4a5a-96df-7b202d973b9f%22%2C%22userId%22%3A%22f81f5b8ab79c336d1c9adb62ca268497%22%7D; cfz_amplitude=%7B%22TTin_event_id%22%3A%7B%22v%22%3A%2299%22%2C%22e%22%3A1766663363094%7D%7D; AMCV_8AD56F28618A50850A495FB6%40AdobeOrg=179643557%7CMCIDTS%7C20133%7CMCMID%7C26496298910059133432618573297535406473%7CMCAAMLH-1740045537%7C3%7CMCAAMB-1740045537%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1739447937s%7CNONE%7CvVersion%7C5.5.0%7CMCSYNCSOP%7C411-20080; kndctr_8AD56F28618A50850A495FB6_AdobeOrg_identity=CiYyNjQ5NjI5ODkxMDA1OTEzMzQzMjYxODU3MzI5NzUzNTQwNjQ3M1IRCKWUtZC8MhgBKgRKUE4zMAPwAYeqoaLQMg==; _ga_8BK794H3J9=GS1.1.1739533609.22.1.1739533619.0.0.0; cf_v=0fb64990; _ga=GA1.1.5f7c6a50-f56e-4b16-a7d4-1e88115904a3; cfz_adobe=%7B%22MsVJ_ecid%22%3A%7B%22v%22%3A%22CiYyNjQ5NjI5ODkxMDA1OTEzMzQzMjYxODU3MzI5NzUzNTQwNjQ3M1IRCKWUtZC8MhgBKgRKUE4zMAPwAYeqoaLQMg%22%2C%22e%22%3A1788661866965%7D%7D; __cflb=0H28upHR6WxXGRqfrsxN5xU37UpscFWLq2fTR7uMofK; cf_clearance=qLVVXxZbjy76oF1SYZCCKJt.p.XI6Lg1BScXMV1NwnQ-1754447583-1.2.1.1-VBiB5lnlTHfcobLrUdCvtt54Drs7ym9M2dbJLSm7m927poy.xAU8yU7LJ.2PnHCCH6ewF5.pHP3ENErhbq933Mb9oxieO4_gHzXpHPDDEU8BMM7N25KpV0A17Mi25w26XJlA2CjY_R4DycK3UUDJIsR8BAhUW.Ah81p3vgpwJnOlZySd8Q5kr2QL7JwKLjiH2zSKHEZRs516Rzb5fQ0XHeiQJNBzS5XX2YUpeWWocyk; __cfruid=a2be02d129ec31698ff95f194b5c5415996c382d-1754447584; vses2=cfes-f81f5b8ab7-afed20c349d42a3990d43ba07e34eff8f6d0ec697ddb92cffaa40ef5b2b3f4f2-4ani3qqdhogto678p96hkvjsvvnmhkug; __cf_effload=1; __cf_logged_in=1; CF_VERIFIED_DEVICE_71e60f117b27982e2c970e6649d5915b671d26d75bccc65ed8476612e2e80a54=1754447693; __cf_bm=AYfWKz8hZwvfHl5dVDbnXxM5nnwHpCuXcsSSEJWedLg-1754447733-1.0.1.1-ai2OKLKS8t3xS8EqpMLUn9PSMYA.WwzmbFl0jjaHSp5oydEGTBb0piMbJfpEffzwLxMac8DTPJgyUoTMUJuG_PUribCj1OcoBN5AHZxkllY; _cfuvid=hrvxwaknXGGIxweCIIAEMo_Bf0AUt77KrtYAqsJZjqA-1754447733999-0.0.1.1-604800000; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Aug+06+2025+10%3A35%3A52+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; cfzs_google-analytics_v4=%7B%22nzcr_pageviewCounter%22%3A%7B%22v%22%3A%222%22%7D%7D; cfz_google-analytics_v4=%7B%22nzcr_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1785983779932%7D%2C%22nzcr_engagementStart%22%3A%7B%22v%22%3A%221754447779932%22%2C%22e%22%3A1785983779932%7D%2C%22nzcr_counter%22%3A%7B%22v%22%3A%221625%22%2C%22e%22%3A1785983779932%7D%2C%22nzcr_session_counter%22%3A%7B%22v%22%3A%22260%22%2C%22e%22%3A1785983779932%7D%2C%22nzcr_ga4%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1785983779932%7D%2C%22nzcr__z_ga_audiences%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1759878681364%7D%2C%22nzcr_let%22%3A%7B%22v%22%3A%221754447779932%22%2C%22e%22%3A1785983779932%7D%2C%22nzcr_ga4sid%22%3A%7B%22v%22%3A%221593623493%22%2C%22e%22%3A1754449579932%7D%7D";
    localStorage.setItem("cfcookie",cookie);



})();
