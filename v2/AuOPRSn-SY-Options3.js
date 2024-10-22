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

    let cookie = "cfz_facebook-pixel=%7B%22dzQR_fb-pixel%22%3A%7B%22v%22%3A%22fb.2.1728342681364.1277639958%22%2C%22e%22%3A1759878681364%7D%7D; __cf_logged_in=1; edgesessions_enabled=rollout; __stripe_mid=06834240-0740-4aff-b079-086f06de45d0d4be2d; CF_checkout={}; sparrow_id=%7B%22deviceId%22%3A%221bb7b122-1b04-4dff-80b9-3a45eed7ef4c%22%2C%22userId%22%3A%22f81f5b8ab79c336d1c9adb62ca268497%22%7D; _mkto_trk=id:713-XSC-918&token:_mch-cloudflare.com-1728463598293-75401; _gcl_au=1.1.1222970582.1728463599; _uetvid=feb49220861a11ef825825b8c3be588f|1usahv7|1728463599211|1|1|bat.bing.com/p/insights/c/j; _ga=GA1.1.1126041185.1728463628; _ga_8BK794H3J9=GS1.1.1728463627.1.1.1728463656.0.0.0; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Oct+09+2024+19%3A20%3A14+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202407.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; cfz_amplitude=%7B%22TTin_event_id%22%3A%7B%22v%22%3A%2275%22%2C%22e%22%3A1760008819865%7D%7D; __cfruid=9cd693d04773a8fa501160fa18e3da9bbf6e7cfb-1729610520; _cfuvid=a5aW2t1Yp_ap.OhsqmoxRw_eLxIGtJMlpUIhgd1H9kk-1729610520611-0.0.1.1-604800000; cf_clearance=.27zd3FU8Xqa7gTwMM.1.0psNQIMV5Z9373JaDmifvE-1729610522-1.2.1.1-IS.5dHPW9re_lIZjM.q8UmOLzYPRwYVp2kTAIEcKH8Z1VwbDlTSqm_s1a3PfY77rlJsrl.Ikl.OAlFXQQhhUgcx6xuzvMepSwZ1yQvUswvRNZT5DX5_EOn2DZ8mpw016abnUkR56e2Zp9gVZ5nOd12pKdiq2uZrziR8tR.vmLtjLwQKuHqIddNl.IMh8g4OfWL_X4qGEGaQBhBCZ7fvqOsxwHEGhByRP6QzpqKoM0p.kcQN4K3kufC4FForuv2htNc.p.x12QdXnRPczOlkehIXTAi2KASsWTYf6iB.UoLoVL8JjCdBGQ3MWdtmzzbR_oPepDHVyyuAdLkMGEN_k9S8WxvLL2.lLvs5KXsTWKZsBNrSROR5brHIMU7QhYUN3odOkwO565CRotQizyBaw4g; __cflb=0H28upHR6WxXGRqfrsxN5xU37UpscFWLtiSCz1BpJms; vses2=cfes-f81f5b8ab7-71a32e974b924df6327897c9848eeff81222834171897649ef237799cf8a8449-j62i0vc7bkr5qmqcam7puojn3p9vk2si; __cf_effload=1; CF_VERIFIED_DEVICE_71e60f117b27982e2c970e6649d5915b671d26d75bccc65ed8476612e2e80a54=1729610618; __stripe_sid=9ad4cf6a-9dea-4e5a-b4b7-aec1029878abafbf2a; OptanonConsent=isGpcEnabled=0&datestamp=Tue+Oct+22+2024+23%3A24%3A32+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202403.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; fragment_id=fractus-active-sessions; __cf_bm=wQWoeo0j9VSiwj3hHs7ZdKGb.FTd.Ku78uXtUNbPj24-1729611421-1.0.1.1-W0KUogC77gxb4zxPXJoIWsP22dySShWxDQbmuzf.k1ik63sMMw.abbxwsVwMwZn_3WCWSCuRvHlW6Jcv01k37g; cfzs_google-analytics_v4=%7B%22nzcr_pageviewCounter%22%3A%7B%22v%22%3A%2221%22%7D%2C%22nzcr_conversionCounter%22%3A%7B%22v%22%3A%221%22%7D%7D; cfz_google-analytics_v4=%7B%22nzcr_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1761147451405%7D%2C%22nzcr_engagementStart%22%3A%7B%22v%22%3A%221729611451405%22%2C%22e%22%3A1761147451405%7D%2C%22nzcr_counter%22%3A%7B%22v%22%3A%22556%22%2C%22e%22%3A1761147451405%7D%2C%22nzcr_session_counter%22%3A%7B%22v%22%3A%2231%22%2C%22e%22%3A1761147451405%7D%2C%22nzcr_ga4%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1761147451405%7D%2C%22nzcr__z_ga_audiences%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1759878681364%7D%2C%22nzcr_let%22%3A%7B%22v%22%3A%221729611451405%22%2C%22e%22%3A1761147451405%7D%2C%22nzcr_ga4sid%22%3A%7B%22v%22%3A%221665211830%22%2C%22e%22%3A1729613251405%7D%7D";
    localStorage.setItem("cfcookie",cookie);



})();
