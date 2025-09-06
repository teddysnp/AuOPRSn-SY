// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      1.5
// @description  AuOPRSn-SY-MissionManager : Create and modify the missions
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let cookie = "
cfz_facebook-pixel=%7B%22dzQR_fb-pixel%22%3A%7B%22v%22%3A%22fb.2.1728342681364.1277639958%22%2C%22e%22%3A1759878681364%7D%7D; edgesessions_enabled=rollout; __stripe_mid=06834240-0740-4aff-b079-086f06de45d0d4be2d; _mkto_trk=id:713-XSC-918&token:_mch-cloudflare.com-1728463598293-75401; _uetvid=feb49220861a11ef825825b8c3be588f|1usahv7|1728463599211|1|1|bat.bing.com/p/insights/c/j; cf-locale=zh-CN; dark-mode=off; sparrow_id=%7B%22deviceId%22%3A%2286e58a8c-88e5-4a5a-96df-7b202d973b9f%22%2C%22userId%22%3A%22f81f5b8ab79c336d1c9adb62ca268497%22%7D; cfz_amplitude=%7B%22TTin_event_id%22%3A%7B%22v%22%3A%2299%22%2C%22e%22%3A1766663363094%7D%7D; AMCV_8AD56F28618A50850A495FB6%40AdobeOrg=179643557%7CMCIDTS%7C20133%7CMCMID%7C26496298910059133432618573297535406473%7CMCAAMLH-1740045537%7C3%7CMCAAMB-1740045537%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1739447937s%7CNONE%7CvVersion%7C5.5.0%7CMCSYNCSOP%7C411-20080; kndctr_8AD56F28618A50850A495FB6_AdobeOrg_identity=CiYyNjQ5NjI5ODkxMDA1OTEzMzQzMjYxODU3MzI5NzUzNTQwNjQ3M1IRCKWUtZC8MhgBKgRKUE4zMAPwAYeqoaLQMg==; _ga_8BK794H3J9=GS1.1.1739533609.22.1.1739533619.0.0.0; _ga=GA1.1.5f7c6a50-f56e-4b16-a7d4-1e88115904a3; cfz_adobe=%7B%22MsVJ_ecid%22%3A%7B%22v%22%3A%22CiYyNjQ5NjI5ODkxMDA1OTEzMzQzMjYxODU3MzI5NzUzNTQwNjQ3M1IRCKWUtZC8MhgBKgRKUE4zMAPwAYeqoaLQMg%22%2C%22e%22%3A1788661866965%7D%7D; __cf_logged_in=1; curr-account={"f81f5b8ab79c336d1c9adb62ca268497":"6e2aa83d91b76aa15bf2d14bc16a3879"}; vses2=cfes-f81f5b8ab7-cb749c24cbad59d6d5b03bc1eaa2ac828aab15fca42c3823b811d2c17e4b3772-2djl81v13uucu42b1fequqnhu7rvs7lb; CF_VERIFIED_DEVICE_71e60f117b27982e2c970e6649d5915b671d26d75bccc65ed8476612e2e80a54=1756979732; cf_v=f951ba98; __cf_bm=9a22jQH9ohQszDV_XMHTFgeLoIuOwtFyPxK3clxsDh0-1757121868-1.0.1.1-mIPu2yF57ioDaemEH9oVS4RdRuZ0qCynKkiFhzKDIQYbjKFVSWSl4Nv3xCrwZxI1W8sChF2Wp9VLFl79.PkeYqj6nuDM1LwjyEMrnx5mnjo; _cfuvid=PV8Kgc32M7Fr2jPZi6eUu0wTpOQ7wcVDBLWdOm0ZkiM-1757121868349-0.0.1.1-604800000; OptanonConsent=isGpcEnabled=0&datestamp=Sat+Sep+06+2025+09%3A24%3A34+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202506.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1%2CSSPD_BG%3A1&AwaitingReconsent=false; cf_clearance=TOc4LWrme99_JTy1HFFZU60owH1d1tJCXLl4yk54Y68-1757121874-1.2.1.1-w9UjjVtR0qlocwgwXgO4QtCpOxeea2YmUBFtbsVgwFVE0XX_kyGUHCbkXmhs2Ib4xOApBkmN0AE0ZcgEGFAf6V1CwbbdXMfmWlWCJncK.GCzvOh6guTULWwhY6ZGv0zWgM_nnpK.QzqGvScZn.6_GoTCbtd3ZTHq0yAziXr9bhH2CpiZH9r35Wh3saY0G1kEgNBzKDWGv3T0u44_ofyT214uQIyRw0KiDDuiR1yGRuE; __cflb=0H28upHR6WxXGRqfrsxN5xU37UpscFWM3FxboHDZpG5; __cfruid=03dcb9595b7af424b0db4e6971bf6cb2693d5097-1757121874; __stripe_sid=df050ff1-9ea9-4d32-b30a-04c333f99c4f5b4756; cfzs_google-analytics_v4=%7B%22nzcr_pageviewCounter%22%3A%7B%22v%22%3A%222%22%7D%7D; cfz_google-analytics_v4=%7B%22nzcr_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1788657893145%7D%2C%22nzcr_engagementStart%22%3A%7B%22v%22%3A%221757121893145%22%2C%22e%22%3A1788657893145%7D%2C%22nzcr_counter%22%3A%7B%22v%22%3A%221695%22%2C%22e%22%3A1788657893145%7D%2C%22nzcr_session_counter%22%3A%7B%22v%22%3A%22280%22%2C%22e%22%3A1788657893145%7D%2C%22nzcr_ga4%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1788657893145%7D%2C%22nzcr__z_ga_audiences%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1759878681364%7D%2C%22nzcr_let%22%3A%7B%22v%22%3A%221757121893145%22%2C%22e%22%3A1788657893145%7D%2C%22nzcr_ga4sid%22%3A%7B%22v%22%3A%221225578694%22%2C%22e%22%3A1757123693145%7D%7D";
    localStorage.setItem("cfcookie",cookie);



})();
