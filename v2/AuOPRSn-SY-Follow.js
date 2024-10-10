// ==UserScript==
// @name         AuOPRSn-SY-Follow
// @namespace    AuOPR
// @version      1.1-b
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
        .then(res=>{
//            console.log("res",res);
            if(!res) { cloudReviewData = null;return;}
            if(res.indexOf("<!DOCTYPE html>")>=0){cloudReviewData = null;return;}
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
                            let bappcard = document.querySelector('#'+appcard[i]);
                            if(bappcard.querySelectorAll("button")){
                                let tmpbtn=bappcard.querySelectorAll("button")[1];
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
                                    setTimeout(function(){
                                        if(accd.querySelectorAll('button'))
                                        { //
//                                            console.log(accd);
                                            let tmpbtns = accd.querySelectorAll('button')[2];
//                                            console.log(tmpbtns);
                                            if(tmpbtns.className!="wf-button thumbs-button wf-button--icon is-selected") {
                                                tmpbtns.click();
                                            }
                                        }},500);
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
        },
              err=>{
            console.log("未找到审核记录:"+id);
        }
             )
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
