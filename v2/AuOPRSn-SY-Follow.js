// ==UserScript==
// @name         AuOPRSn-SY-Follow
// @namespace    AuOPR
// @version      1.1
// @description  Following other people's review
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nianticlabs.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {

    let autoreview = null;
    let portalData = null;
    let rejcbxchnstr = ["照片模糊不清","臉部或身體","照片中出現車牌號碼","照片畫質低劣或並非屬實","標題命名不佳或並不準確"];
    let rejcbxengstr = ["PHOTO_BAD_BLURRY","PHOTO_FACE","PHOTO_PLATE","PHOTO_BAD","TEXT_BAD_TITLE"];
    let reviewPortalAuto ="false";
    let cloudReviewData = null;
    localStorage.setItem("reviewPortalAuto",reviewPortalAuto);

    let surl='https://dash.cloudflare.com/api/v4/accounts/6e2aa83d91b76aa15bf2d14bc16a3879/r2/buckets/warfarer/objects/';
    let cookie = localStorage.cfcookie;
        //'__cfruid=46865bda985c201b0d0a60d96c5f7916c8e7dbb8-1728342662; _cfuvid=6_jtWG_6W1E9TO4Sn_hn0FQUrUZeDCp8iDNYF.AIkxg-1728342662697-0.0.1.1-604800000; cfz_facebook-pixel=%7B%22dzQR_fb-pixel%22%3A%7B%22v%22%3A%22fb.2.1728342681364.1277639958%22%2C%22e%22%3A1759878681364%7D%7D; vses2=f81f5b8ab7-1v2lokn5aq9ir4j0jvihp8run618qcv8; __cf_effload=1; __cf_logged_in=1; CF_VERIFIED_DEVICE_71e60f117b27982e2c970e6649d5915b671d26d75bccc65ed8476612e2e80a54=1728342681; edgesessions_enabled=rollout; __stripe_mid=06834240-0740-4aff-b079-086f06de45d0d4be2d; cfzs_amplitude=%7B%22TTin_session_id%22%3A%7B%22v%22%3A%221728346293973%22%7D%7D; CF_checkout={}; sparrow_id=%7B%22deviceId%22%3A%221bb7b122-1b04-4dff-80b9-3a45eed7ef4c%22%2C%22userId%22%3A%22f81f5b8ab79c336d1c9adb62ca268497%22%7D; _mkto_trk=id:713-XSC-918&token:_mch-cloudflare.com-1728463598293-75401; _gcl_au=1.1.1222970582.1728463599; _uetsid=feb46bc0861a11ef8d9d15409dd6be6e|f9dugy|2|fpv|0|1743; _uetvid=feb49220861a11ef825825b8c3be588f|1usahv7|1728463599211|1|1|bat.bing.com/p/insights/c/j; _ga=GA1.1.1126041185.1728463628; _ga_8BK794H3J9=GS1.1.1728463627.1.1.1728463656.0.0.0; cf_clearance=rX5Jj6HygINLTwhXSX4ULdWvHnWW3wyzdpQsugr7D0c-1728470621-1.2.1.1-rp6c598dDqMo1IstqwDxdJixmkKgje_stn62Ojat8Cm98yujyGocds7CZkAtVJZ5mdWpVPI1JOfObnHlcOHPx7cF0RdfAuo7RDKpxKiF.GbCDbnhYpXSx7Cfx_DDDKrO_imLNmozIDZSDUGCefuMgLuB6ULPs7t7VstxP8psUrmc_l7xeN9KanFxgylSiSDR1Gs27GcTE1yPemHXJP1s4TIinuT0NRCGpgjHR4_zOi2OfP2DGSue9wTiHomQ4ioDP6dxpfXjwRV_TzC690e3WFUG.ja1Q1vUJamLjgvbWXVdPQoWR6WhZF4zk3G9O7brs9rDkJFm8dnCuaqmbfbRIMMnBg3KYqM0dNhtfwuyyZYQ5Do1UH3Oh4DluVHNK5mx.ltH_NBfvTjz5vUxsLvFlg; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Oct+09+2024+18%3A45%3A30+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202403.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Oct+09+2024+19%3A20%3A14+GMT%2B0800+(%E4%B8%AD%E5%9B%BD%E6%A0%87%E5%87%86%E6%97%B6%E9%97%B4)&version=202407.2.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=0c3be3b1-9f8b-40e8-9b3e-00eebe7171dd&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false; cfz_amplitude=%7B%22TTin_event_id%22%3A%7B%22v%22%3A%2275%22%2C%22e%22%3A1760008819865%7D%7D; __cflb=0H28upHR6WxXGRqfrsxN5xU37UpscFWLmLMi8QLZmFT; __cf_bm=YkdrkgnOK0kREhIA5R.Sq3gtwb7DjzNJUyHNHXZ0kQQ-1728527794-1.0.1.1-a_2CO.iT3xWRCY2Ou3lmheAsHSFgZSq0UyW5JW1yBa9s2U8t0CHsyfqBIz81yeTCPb_5Mqp_1cLJowXqHEbMdA; cfzs_google-analytics_v4=%7B%22nzcr_pageviewCounter%22%3A%7B%22v%22%3A%22256%22%7D%2C%22nzcr_conversionCounter%22%3A%7B%22v%22%3A%2228%22%7D%7D; cfz_google-analytics_v4=%7B%22nzcr_engagementDuration%22%3A%7B%22v%22%3A%220%22%2C%22e%22%3A1760063800141%7D%2C%22nzcr_engagementStart%22%3A%7B%22v%22%3A%221728527800141%22%2C%22e%22%3A1760063800141%7D%2C%22nzcr_counter%22%3A%7B%22v%22%3A%22397%22%2C%22e%22%3A1760063800141%7D%2C%22nzcr_session_counter%22%3A%7B%22v%22%3A%2211%22%2C%22e%22%3A1760063800141%7D%2C%22nzcr_ga4%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1760063800141%7D%2C%22nzcr__z_ga_audiences%22%3A%7B%22v%22%3A%225f7c6a50-f56e-4b16-a7d4-1e88115904a3%22%2C%22e%22%3A1759878681364%7D%2C%22nzcr_let%22%3A%7B%22v%22%3A%221728527800141%22%2C%22e%22%3A1760063800141%7D%2C%22nzcr_ga4sid%22%3A%7B%22v%22%3A%2280142346%22%2C%22e%22%3A1728529600141%7D%7D; __stripe_sid=cafd9b2f-12dc-4783-b203-375732dbd57316f0d5';

    function gmrequest(pmethod,purl,pid,pdata){
        switch(pmethod){
            case "PUT":
//                return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method:     "PUT",
                    url:        purl+pid+".json",
                    data:       pdata,
                    anonymous:  true,
                    cookie:     cookie,
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
                    },
                    onload: function(res){
                        console.log(res)
                        if(res.status === 200){
                            console.log('审核记录上传成功:'+pid)
                        }else{
                            console.log('审核记录上传失败:'+pid)
                        }
                    },
                    onerror : function(err){
                        console.log('审核记录上传错误:'+pid)
                        console.log(err)
                    }
//                    onload: resolve,
//                    onerror: reject
                });
//                                                        });
            case "GET":
            default:
        }
    }

    function U_XMLHttpRequest(method, url) {
//        console.log(method);
//        console.log(url);
        return new Promise((res, err) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    console.log(xhr.status);
                    if (xhr.status === 200) {
                        res(xhr.responseText);
                    } else if(xhr.status === 404){
                        res(xhr.responseText);
                    } else {
                        err(xhr.statusText);
                    }
                }
            };
            xhr.onerror = function() {
                //err(xhr.statusText);
            };
            xhr.send();
        }).catch(e => {
//            console.log('Promise', e)
        });
    };

    //监听http请求，不同的页面实现不同功能
    (function (open) {
        XMLHttpRequest.prototype.open = function (method, url) {
//            console.log(method);
//            console.log(url);
            if(url.indexOf("pub-e7310217ff404668a05fcf978090e8ca.r2.dev")>=0){
//                this.addEventListener('load', getData, false);
            }
            if (url == '/api/v1/vault/review' && method == 'GET') {
                this.addEventListener('load', injectTimer, false);
            }
            if (url == '/api/v1/vault/review' && method == 'POST') {
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    try{
                        let iautolabel = document.querySelector("p[id='idautolabel']");
                        let tmpdata = JSON.parse(data[0]);
//                        console.log("olddata",data);
                        if (iautolabel.textContent == "手动"){
                            savePostData(JSON.parse(data),0);
                            //                        console.log("data",JSON.parse(data));
                        }
                        console.log("cloudReviewData",cloudReviewData);
                        if(cloudReviewData!=null) {
                            if(cloudReviewData.newLocation) {
                                let lll=cloudReviewData.newLocation;
                                let lat = parseFloat(lll.substring(0,lll.indexOf(",")-1));
                                let lng = parseFloat(lll.substring(lll.indexOf(",")+1));
                                lat = lat + Math.random()/1000000;
                                lng = lng + Math.random()/1000000;
                                let sss = lat.toString() +","+lng.toString();
                                tmpdata.newLocation = sss;
                                data[0] = JSON.stringify(tmpdata);
                                console.log("newdata",data);
                            }
                        }
                        console.log("tmpdata",tmpdata);
                        return send.apply(_this,data);
                    } catch(e) {
                        //console.log(e);
                    }
                    //                  saveReviewData(data);
                }
            }
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    const awaitElement = get => new Promise((resolve, reject) => {
        let triesLeft = 10;
        const queryLoop = () => {
            const ref = get();
            if (ref) resolve(ref);
            else if (!triesLeft) reject();
            else setTimeout(queryLoop, 100);
            triesLeft--;
        }
        queryLoop();
    }).catch(e => {
        console.log('Promise', e)});

    function injectTimer() {
        awaitElement(() => document.querySelector('wf-logo'))
            .then((ref) => {
            try {
                const response = this.response;
                const json = JSON.parse(response);
                if (!json) return;
                if (json.captcha || json==null) {
                    return;
                }
                portalData = json.result;
                console.log(portalData);
//                if(!portalData.id || portalData.id==null) return;
                loadReviewData(portalData.id);
//                let testid = "74908645df72e5da08ebd13be138275c";
//                loadReviewData(testid);
            } catch (e) {
                console.log(e);
            }
        });
    }

    function loadReviewData(id){
        //        console.log(id);
//        let sid="05a6bef32a01cc9e39c967677e18763f";
        let resp = U_XMLHttpRequest("GET","https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/" +id +".json")
        .then(err=>{
            console.log("未找到审核记录:"+id);
        },
              res=>{
            console.log("res",res);
            if(!res) { cloudReviewData = null;return;}
            let creviewdata = null;
            if(res.substring(0,1)=="[") {
                console.log("searching review record：",JSON.parse(JSON.parse(res)[0]));
                creviewdata = JSON.parse(JSON.parse(res)[0]);   //网络审核记录
            } else {
                console.log("searching review record：",JSON.parse(res));
                creviewdata = JSON.parse(res);   //网络审核记录
            }
            cloudReviewData = creviewdata ;
            //              let creviewdata = JSON.parse(localStorage.getItem(id));  //本地审核记录
            if(creviewdata==null) { return; }
            console.log("cloudReviewData",cloudReviewData);
            console.log("找到审核记录",creviewdata);
            let rdata = creviewdata;
            //              let rdata = eval("(" + creviewdata[creviewdata.length - 1] + ")");
            console.log(rdata);
            //rejectReasons 是个数组
            if(rdata.duplicate){
                let nbportal = portalData.nearbyPortals;
                console.log("审核记录：重复！");
                console.log(nbportal);
                //            let testdupid="513b37393fb04a8e95281c81513c6ecc.16";
                //                console.log(nbportal.find(p=>{return p.guid==rdata.duplicateOf}));
                if(nbportal.find(p=>{return p.guid==rdata.duplicateOf})){
                    //            console.log((nbportal.find(p=>{return p.guid==rdata.duplicateOf})).title);
                    let dbtitle = (nbportal.find(p=>{return p.guid==rdata.duplicateOf})).title;
                    console.log(dbtitle);
                    setTimeout(function(){
                        console.log(document.querySelector("[alt='"+dbtitle+"']"));
                        if (document.querySelector("[alt='"+dbtitle+"']")) {
                            document.querySelector("[alt='"+dbtitle+"']").click();

                        }
                        setTimeout(function(){
                            let dupbut = document.querySelector("div[role='dialog']").querySelector("button[wftype='primary'");
                            if(dupbut){
                                dupbut.click();
                            }
                            setTimeout(function(){
                                let supcommit = document.querySelector("mat-dialog-container").querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                //                if(supcommit) {supcommit.click();}
                                console.log("duplicated!");
                            },1000);
                        },1000);
                    },1000);
                }
            } else if(rdata.quality) {
                console.log("审核记录：五星");
                const appcard=["appropriate-card","safe-card","accurate-and-high-quality-card","permanent-location-card","socialize-card","exercise-card","explore-card"];
                setTimeout(function(){
                    for(let i=0;i<=appcard.length-1;i++){
                        if(document.querySelector('#'+appcard[i])) {
                            let appcard = document.querySelector('#'+appcard[i]);
                            if(appcard.querySelectorAll("button")){
                                let tmpbtn=appcard.querySelectorAll("button")[1];
                                if(tmpbtn.className.indexOf("is-selected")<0){
                                    tmpbtn.click();
                                }
                            }
                        }
                    }
                    /*                      if(document.querySelector('#appropriate-card')) {
                          let appcard = document.querySelector('#appropriate-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
                      if(document.querySelector('#safe-card')) {
                          let appcard = document.querySelector('#safe-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
                      if(document.querySelector('#accurate-and-high-quality-card')) {
                          let appcard = document.querySelector('#accurate-and-high-quality-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
                      if(document.querySelector('#permanent-location-card')) {
                          let appcard = document.querySelector('#permanent-location-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
                      if(document.querySelector('#socialize-card')) {
                          let appcard = document.querySelector('#socialize-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
                      if(document.querySelector('#exercise-card')) {
                          let appcard = document.querySelector('#exercise-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
                      if(document.querySelector('#explore-card')) {
                          let appcard = document.querySelector('#explore-card');
                          if(appcard.querySelectorAll("button")){
                              let tmpbtn=appcard.querySelectorAll("button")[1];
                              if(tmpbtn.className.indexOf("is-selected")<0){
                                  tmpbtn.click();
                              }
                          }
                      }
*/
                    /*                      if(document.querySelector('#safe-card').querySelectorAll("mat-icon")[1].parentNode.className=="wf-button thumbs-button wf-button--icon is-selected"){
                      } else {
                          if(document.querySelector('#safe-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                          { //
                              document.querySelector('#safe-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                          }
                          if(document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                          { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                              document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                          }
                      }*/
                    let idscore = document.querySelector("span[id='idscore']");
                    idscore.textContent = "YYYYYYY";
                },3000);
            } else if(rdata.rejectReasons){
                console.log("审核记录拒",rdata.rejectReasons);
                for(let i=0;i<rdata.rejectReasons.length;i++){
                    if(rdata.rejectReasons[i]=="PRIVATE" || rdata.rejectReasons[i]=="INAPPROPRIATE" || rdata.rejectReasons[i]=="SCHOOL" ||
                       rdata.rejectReasons[i]=="SENSITIVE" || rdata.rejectReasons[i]=="EMERGENCY" || rdata.rejectReasons[i]=="GENERIC"){
                        console.log("适当拒");
                        setTimeout(function(){
                            console.log(document.querySelector('#appropriate-card'));
                            if(document.querySelector('#appropriate-card').querySelectorAll('button')[2])
                            { //
                                if(document.querySelector('#appropriate-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                    document.querySelector('#appropriate-card').querySelectorAll('button')[2].click();
                                }
                                setTimeout(function(){
                                    let icbx = document.querySelector("input[value='"+rdata.rejectReasons[i]+"']");
                                    console.log("icbx",icbx);
                                    if(icbx) {
                                        //let ic = document.getElementById(document.querySelector("input[value='GENERIC']").getAttribute("id"));
                                        console.log(icbx);
                                        //setTimeout(function(){ic.checked = true;},500);
                                        icbx.parentNode.click();
                                    }
                                },2000);
                            }
                        },1000);
                    } else if (rdata.rejectReasons[0] == "SAFETY") {
                        setTimeout(function(){
                            if(document.querySelector('#safe-card').querySelectorAll('button')[2])
                            { //
                                if(document.querySelector('#safe-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                    document.querySelector('#safe-card').querySelectorAll('button')[2].click();
                                }
                            }
                        },1000);
                    } else if (rdata.rejectReasons[0] == "TEMPORARY") {
                        setTimeout(function(){
                            if(document.querySelector('#permanent-location-card').querySelectorAll('button')[2])
                            { //
                                if(document.querySelector('#permanent-location-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                    document.querySelector('#permanent-location-card').querySelectorAll('button')[2].click();
                                }
                            }
                        },1000);
                    }
                    else {
                        if(rejcbxengstr.indexOf(rdata.rejectReasons[i])>=0) {
                            let dcbxstr = rejcbxchnstr[rejcbxengstr.indexOf(rdata.rejectReasons[i])];
                            setTimeout(function(){
                                let accd = document.querySelector('#accurate-and-high-quality-card');
                                if(accd) {
                                    if(accd.querySelectorAll('button'))
                                    { //
                                        let tmpbtns = acc[2];
                                        if(tmpbtns.className!="wf-button thumbs-button wf-button--icon is-selected") {
                                            tmpbtns.click();
                                        }
                                    }
                                }},500);
                            setTimeout(function(){
                                setTimeout(function(){
                                    let spanarr = document.querySelectorAll("span[class='mat-checkbox-label']");
                                    //console.log(dcbxstr);
                                    spanarr.forEach(spanele => {
                                        if(spanele.textContent.indexOf(dcbxstr)>=0) {
                                            let rejcbx = spanele.parentNode.querySelector("input[type='checkbox']");
                                            //console.log(rejcbx);
                                            if(rejcbx) {
                                                rejcbx.parentNode.click();
                                                //rejcbx.parentNode.checked = true;
                                            }
                                        }
                                    });
                                },1000);
                            },1000);
                        }
                    }
                }
            }
        })
    }
    function savePostData(data,icloud){
        console.log("检查是否需要上传审核数据...");
//        console.log(data);
        if(data.type=="NEW"){
            let isave =0;
//            console.log("duplicate",data.duplicate);
//            console.log("rejectReasons",data.rejectReasons);
            if(data.duplicate || data.rejectReasons ){
//                console.log("duplicate or rejectReasons");
                isave=1;
            };
//            console.log("data.cultural",data.cultural);
            if(data.cultural){
                if(data.cultural==5 & data.exercise==5 & data.location==5 & data.quality==5 & data.safety==5 & data.socialize==5 & data.uniqueness==5){
//                    console.log("five stars!");
                    isave=1;
                }
            }
            if(data.newLocation) {isave=1};
            if(isave==1){
                try{
                    console.log("saving...");
                    if(icloud==0){
                        if(cookie) {
                            gmrequest("PUT",surl,data.id,JSON.stringify(data));
                        }
                    } else {
                        let creviewlist =[];
                        creviewlist= JSON.parse(localStorage.reviewList);
                        if(creviewlist==null) {creviewlist = []};
                        let tmp ='{\"id\":\"'+data.id+'\",\"date\":\"'+ formatDate(new Date(),"yyyy-MM-dd")+'\"}';
                        //                    console.log("tmp",tmp);
                        creviewlist.push(tmp);
                        localStorage.setItem("reviewList",JSON.stringify(creviewlist));
                        let creviewdata =[];
                        creviewdata = JSON.parse(localStorage.getItem(data.id));
                        if(creviewdata==null) {
                            creviewdata=[];
                        }
                        creviewdata.push(JSON.stringify(data));
                        localStorage.setItem(data.id,JSON.stringify(creviewdata));
                        console.log("saved");
                    }
                } catch(e){
                    console.log(e)
                }
            } else return;
        }
        if(data.type=="EDIT"){
        }
        if(data.type=="PHOTO"){
        }
    }
    //格式化日期函数
    function formatDate(date, fmt)
    {
        date = date == undefined ? new Date() : date;
        date = typeof date == 'number' ? new Date(date) : date;
        fmt = fmt || 'yyyy-MM-dd HH:mm:ss';
        var obj =
            {
                'y': date.getFullYear(), // 年份，注意必须用getFullYear
                'M': date.getMonth() + 1, // 月份，注意是从0-11
                'd': date.getDate(), // 日期
                'q': Math.floor((date.getMonth() + 3) / 3), // 季度
                'w': date.getDay(), // 星期，注意是0-6
                'H': date.getHours(), // 24小时制
                'h': date.getHours() % 12 == 0 ? 12 : date.getHours() % 12, // 12小时制
                'm': date.getMinutes(), // 分钟
                's': date.getSeconds(), // 秒
                'S': date.getMilliseconds() // 毫秒
            };
        var week = ['天', '一', '二', '三', '四', '五', '六'];
        for(var i in obj)
        {
            fmt = fmt.replace(new RegExp(i+'+', 'g'), function(m)
                              {
                var val = obj[i] + '';
                if(i == 'w') return (m.length > 2 ? '星期' : '周') + week[val];
                for(var j = 0, len = val.length; j < m.length - len; j++) val = '0' + val;
                return m.length == 1 ? val : val.substring(val.length - m.length);
            });
        }
        return fmt;
    }

})();
