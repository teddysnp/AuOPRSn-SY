// ==UserScript==
// @name         AuOPRSn-SY-Follow
// @namespace    AuOPR
// @version      1.4.4
// @description  Following other people's review
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {

    let autoreview = null;
    let portalData = null;
    let rejcbxchnstr = ["照片模糊不清","臉部或身體","照片中出現車牌號碼","照片畫質低劣或並非屬實","標題命名不佳或並不準確","方向","不準確的位置"];
    let rejcbxengstr = ["PHOTO_BAD_BLURRY","PHOTO_FACE","PHOTO_PLATE","PHOTO_BAD","TEXT_BAD_TITLE","PHOTO_DIR","MISMATCH"];
    let reviewPortalAuto ="false";
    let cloudReviewData = null;
    localStorage.setItem("reviewPortalAuto",reviewPortalAuto);

    let surl='https://dash.cloudflare.com/api/v4/accounts/6e2aa83d91b76aa15bf2d14bc16a3879/r2/buckets/warfarer/objects/';
    let cookie = localStorage.cfcookie;
    let useremail = "";
    let tmpfollow={id:null,title:null,lat:null,lng:null,review:null};
    let isUserClick = false ;
    let iautoman = null;
    let mywin = window;

    listenLinkClick();
    //监听页面点击，获取是否人工点击
    function listenLinkClick(){
        document.body.addEventListener("click",function(event){
            //if(event.srcElement.innerText.indexOf("送出")>=0 || event.srcElement.innerText.indexOf("即可结束")>=0) console.log("listenLinkClick",event);
            //console.log("isTrusted",event.isTrusted);
            isUserClick = event.isTrusted;
            if(event.isTrusted) {
                //console.log(event);
                let iauto = document.getElementById("idautolabel");
                //console.log(iauto.textContent);
                if(event.srcElement.innerText == "thumb_down" || event.srcElement.innerText == "標記為重複") {
                    if (iauto.textContent == "自动") {
                        iautoman = "自动";
                        let ibtn = document.getElementById("btnauto");
                        if (ibtn) {
                            ibtn.click();
                        }
                    }
                }
                if(event.srcElement.innerText == "取消" || event.srcElement.innerText == "關閉") {
                    if (iauto.textContent == "手动" ) {
                        if(iautoman == "自动") {
                            let ibtn = document.getElementById("btnauto");
                            if (ibtn) {
                                ibtn.click();
                            }
                        } else {
                            iautoman = null;
                        }
                    }
                }
            }
        });
    }

    //上传json审核至cloudflare
    function gmrequest(pmethod,purl,pid,pdata){
        cookie = localStorage.cfcookie;
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
                        //console.log("postjson",res)
                        if(res.status === 200){
                            //修改首页上传显示  绿：1d953f
                            let iup = document.getElementById("iduplabel");
                            if(iup) iup.style="font-weight:bold;color:#1d953f";
                            console.log('审核记录上传成功:'+pid)
                        }else{
                            let iup = document.getElementById("iduplabel");
                            if(iup) iup.style="font-weight:bold;color:red";
                            console.log('审核记录上传失败:'+pid)
                        }
                    },
                    onerror : function(err){
                        //修改首页上传显示
                        let iup = document.getElementById("iduplabel");
                        if(iup) iup.style="font-weight:bold;color:red";
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
                    //console.log(xhr.status);
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
            if (url == '/api/v1/vault/properties' && method == 'GET') {
                this.addEventListener('load', getUser, false);
            }
            if (url == '/api/v1/vault/review' && method == 'GET') {
                this.addEventListener('load', injectLoadData, false);
            }
            if (url == '/api/v1/vault/review' && method == 'POST') {
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    try{
                        let tmpdata = JSON.parse(data[0]);
//                        console.log("olddata",data);
                        //console.log("cloudReviewData",cloudReviewData);
                        //NEW+挪po,直接用网络审核结果覆盖data
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
                                console.log("挪至新位置：",JSON.parse(data[0]).newLocation);
                            }
                        }

                        //跟po，保存记录至本地：用户名+follow
                        console.log("查看是否跟po，保存至本地",tmpfollow);
                        if(tmpfollow.id!=null){
                            let localpd1 = [];
                            if(localStorage.getItem(useremail+"follow")) localpd1 = JSON.parse(localStorage.getItem(useremail+"follow"));
                            if(localpd1.length==0){
                                console.log("saving local follow 1");
                                localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                            } else {
                                console.log("saving local follow n");
                                localpd1.push(tmpfollow);
                                //console.log(localpd1);
                                localStorage.setItem(useremail+"follow",JSON.stringify(localpd1));
                            }
                        }

                        let iautolabel = document.querySelector("p[id='idautolabel']");
                        let rd1=cloudReviewData;if(rd1) {rd1.acceptCategories=null;rd1.rejectCategories=null;}
                        let rd2=JSON.parse(data);if(rd2) {rd2.acceptCategories=null;rd2.rejectCategories=null;}
                        let rs1=JSON.stringify(rd1);let rs2=JSON.stringify(rd2);
                        //console.log("cloudReviewData",rs1);
                        //console.log("reviewData",rs2);
                        console.log("是否和网络一致",rs1==rs2);
                        setTimeout(function(){
                            if(isUserClick & rs1!=rs2) {
                                console.log("上传",isUserClick);
                                savePostData(portalData,JSON.parse(data),0,false);
                            } else {
                                console.log("不上传",isUserClick);
                            }
                        },1000);
                        if (iautolabel.textContent == "手动" & rs1!=rs2){
                            //console.log("data",JSON.parse(data));
                            //savePostData(portalData,JSON.parse(data),0,false);
                        }
                        //console.log("tmpdata",tmpdata);
                        return send.apply(_this,data);
                    } catch(e) {
                        //console.log(e);
                    }
                    //saveReviewData(data);
                }
            }
            if (url == '/api/v1/vault/review/skip' && method == 'POST'){
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    console.log("查看是否跟po，保存至本地",tmpfollow);
                    if(tmpfollow.id!=null){
                        let localpd1 = [];
                        if(localStorage.getItem(useremail+"follow")) localpd1 = JSON.parse(localStorage.getItem(useremail+"follow"));
                        if(localpd1.length==0){
                            console.log("saving local follow 1");
                            localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                        } else {
                            console.log("saving local follow n");
                            localpd1.push(tmpfollow);
                            //console.log(localpd1);
                            localStorage.setItem(useremail+"follow",JSON.stringify(localpd1));
                        }
                    }

                    let iautolabel = document.querySelector("p[id='idautolabel']");
                    if (iautolabel.textContent == "手动"){
                        //console.log("data",JSON.parse(data));
                        let ic =0;
                        if(cloudReviewData){
                            if (cloudReviewData.skip) ic=1; else ic=0;
                        } else {
                            ic=0;
                        }
                        savePostData(portalData,JSON.parse(data),ic,true);
                    }

                    console.log("skip",data);
                    console.log("skip",portalData);
                    return send.apply(_this,data);
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

    function getUser(){
        const resp = U_XMLHttpRequest("GET","https://wayfarer.nianticlabs.com/api/v1/vault/properties")
        resp.then
        (res=>{
            if(res){
                let restext = JSON.parse(res);
                if(restext.result.socialProfile.email)
                {
                    useremail = restext.result.socialProfile.email;
                }
                return restext.result.socialProfile.email;
            }
        });
    }

    function injectLoadData() {
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
                loadReviewData(portalData);
//                let testid = "74908645df72e5da08ebd13be138275c";
//                loadReviewData(testid);
            } catch (e) {
                console.log(e);
            }
        });
    }

    //根据标题名有重合，给提示是否重复，并加60秒倒计时
    function isDuplicate(pData){
        if(pData.nearbyPortals.find(p=>{return p.title==pData.title})){
            setTimeout(function(){
                let iauto = document.getElementById("idautolabel");
                console.log(iauto);
                let sc = document.getElementById("idcountdown");
                sc.textContent = sc.textContext + "+60";
                if (iauto)
                {
                    if (iauto.textContent == "自动"){
                        let ibtn = document.getElementById("btnauto");
                        console.log(ibtn);
                        if (ibtn) {
                            //可能重复po后，改手动(不再改手动)
                            //ibtn.click();
                        }
                    }
                }
                console.log("重复po");
                console.log("duplicate dialog",document.querySelector("app-confirm-duplicate-modal"));
                createNotify("可能有重复po", {
                    body: pData.nearbyPortals.find(p=>{return p.title==pData.title}).title,
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: false
                });
                //这两个判断应该重复了，需测试确认，也许下面这个不可靠，因为地图不加载
                if (document.querySelector("[alt='"+pData.title+"']")) {
                    document.querySelector("[alt='"+pData.title+"']").click();
                }
            },500);
            //}
        }
    }

    function loadReviewData(pdata){
        //        console.log(id);
//        let sid="05a6bef32a01cc9e39c967677e18763f";
        //console.log("email",useremail);
        let tmptext = '';
        let id=pdata.id;
        tmpfollow.id = null; tmpfollow.title = null; tmpfollow.lat = null; tmpfollow.lng = null; tmpfollow.review = null;
        if(pdata.type=="PHOTO" || pdata.type=="EDIT"){
            return null;
        }
        let resp = U_XMLHttpRequest("GET","https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/" +id +".json")
        .then(res=>{
            //console.log("getjson",res);
            if(!res) {
                //修改首页下载显示
                console.log("getjsonerr");
                cloudReviewData = null;
                setTimeout(function(){
                    let ilabel = document.getElementById("iduserlabel");
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                    let idown = document.getElementById("idcountdownlabel");
                    if(idown) idown.style="font-weight:bold;color:red";
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                isDuplicate(pdata);
                return null;
            }
            if(res.indexOf("Error 404")>=0) {
                //修改首页下载显示
                let idown = document.getElementById("idcountdownlabel");
                //中黄：ffe600
                if(idown) idown.style="font-weight:bold;color:#ffe600";
                console.log("未找到json");
                cloudReviewData = null;
                setTimeout(function(){
                    let ilabel = document.getElementById("iduserlabel");
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                isDuplicate(pdata);
                return null;
            }
            if(res.indexOf("<!DOCTYPE html>")>=0){
                cloudReviewData = null;
                setTimeout(function(){
                    let ilabel = document.getElementById("iduserlabel");
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                isDuplicate(pdata);
                return null;
            }
            let creviewdata = null;
            let title=pdata.title;let lat=pdata.lat;let lng=pdata.lng;
            if(res.substring(0,1)=="[") {
//                console.log("searching review record：",JSON.parse(JSON.parse(res)[0]));
                creviewdata = JSON.parse(JSON.parse(res)[0]);   //网络审核记录
            } else {
//                console.log("searching review record：",JSON.parse(res));
                creviewdata = JSON.parse(res);   //网络审核记录
            }
            let idown = document.getElementById("idcountdownlabel");
            if(idown) idown.style="font-weight:bold;color:#1d953f";
            cloudReviewData = creviewdata ;
            //              let creviewdata = JSON.parse(localStorage.getItem(id));  //本地审核记录
            if(creviewdata==null) { return null; }
            console.log("cloudReviewData",cloudReviewData);
//            console.log("找到审核记录",creviewdata);
            let rdata = creviewdata;
            //              let rdata = eval("(" + creviewdata[creviewdata.length - 1] + ")");
            console.log("rdata",rdata);
            //rejectReasons 是个数组
            tmpfollow.id=id;tmpfollow.title=title;tmpfollow.lat=lat;tmpfollow.lng=lng;
            if(rdata.skip){
                if(pdata.canSkip){
                    tmptext = "照抄网络审核：略过";
                    tmpfollow.review="skip";
                    let perr = document.querySelector('button[title=""]');
                    if(perr) {
                        if(perr.textContent=" 略過 "){
                            console.log("略过","略过按钮被点击");
                            setTimeout(function(){
                                perr.click();
                            },5000);
                        }
                    }
                } else {
                    console.log("错误","此号不能再略过");
                    createNotify("错误po", {
                        body: "网络审核是略过，但此号已经不能再略过，需人工干预！"+pdata.title,
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                        requireInteraction: true
                    });
                }
            } else if(rdata.duplicate){
                tmptext = "照抄网络审核：重复";
                tmpfollow.review="重复："+creviewdata.duplicateOf;
                let nbportal = pdata.nearbyPortals;
                console.log("审核记录：重复！");
                //console.log(nbportal);
                //let testdupid="513b37393fb04a8e95281c81513c6ecc.16";
                //console.log(nbportal.find(p=>{return p.guid==rdata.duplicateOf}));
                if(nbportal.find(p=>{return p.guid==rdata.duplicateOf})){
                    //console.log((nbportal.find(p=>{return p.guid==rdata.duplicateOf})).title);
                    let dbtitle = (nbportal.find(p=>{return p.guid==rdata.duplicateOf})).title;
                    //console.log(dbtitle);
                    setTimeout(function(){
                        //console.log(document.querySelector("[alt='"+dbtitle+"']"));
                        if (document.querySelector("[alt='"+dbtitle+"']")) {
                            document.querySelector("[alt='"+dbtitle+"']").click();

                        }
                        setTimeout(function(){
                            let dupbut = document.querySelector("div[role='dialog']").querySelector("button[wftype='primary'");
                            if(dupbut){
                                dupbut.click();
                            }
                        },500);
                    },500);
                }
            } else if(rdata.quality) {
                console.log(rdata);
                if(rdata.cultural==5 & rdata.exercise==5 & rdata.location==5 & rdata.quality==5 & rdata.safety==5 & rdata.socialize==5 & rdata.uniqueness==5){
                    if(rdata.newLocation) {
                        tmptext = "照抄网络审核：五星+挪po";
                        tmpfollow.review = "五星+挪:" + rdata.newLocation;
                    } else {
                        tmptext = "照抄网络审核：五星";
                        tmpfollow.review="五星";
                    }
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
                        let idscore = document.querySelector("span[id='idscore']");
                        idscore.textContent = "YYYYYYY";
                    },3000);
                } else {
                    tmptext = "照抄网络审核：非重复";
                    tmpfollow.review="正常非重复";
                }
            } else if(rdata.rejectReasons){
                tmptext = "照抄网络审核：否决";
                tmpfollow.review="否决:"+rdata.rejectReasons;
                console.log("审核记录拒",rdata.rejectReasons);
                for(let i=0;i<rdata.rejectReasons.length;i++){
                    if(rdata.rejectReasons[i]=="PRIVATE" || rdata.rejectReasons[i]=="INAPPROPRIATE" || rdata.rejectReasons[i]=="SCHOOL" ||
                       rdata.rejectReasons[i]=="SENSITIVE" || rdata.rejectReasons[i]=="EMERGENCY" || rdata.rejectReasons[i]=="GENERIC"){
                        console.log("适当拒");
                        setTimeout(function(){
                            //console.log(document.querySelector('#appropriate-card'));
                            if(document.querySelector('#appropriate-card').querySelectorAll('button')[2])
                            { //
                                if(document.querySelector('#appropriate-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                    document.querySelector('#appropriate-card').querySelectorAll('button')[2].click();
                                }
                                setTimeout(function(){
                                    let icbx = document.querySelector("input[value='"+rdata.rejectReasons[i]+"']");
                                    //console.log("icbx",icbx);
                                    if(icbx) {
                                        //let ic = document.getElementById(document.querySelector("input[value='GENERIC']").getAttribute("id"));
                                        //console.log(icbx);
                                        //setTimeout(function(){ic.checked = true;},500);
                                        icbx.parentNode.click();
                                    }
                                },2000);
                            }
                        },1000);
                    } else if (rdata.rejectReasons[0] == "SAFETY") {
                        //setTimeout(function(){
                            if(document.querySelector('#safe-card').querySelectorAll('button')[2])
                            { //
                                if(document.querySelector('#safe-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                    document.querySelector('#safe-card').querySelectorAll('button')[2].click();
                                }
                            }
                        //},1000);
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
                            console.log("准确拒",rdata.rejectReasons);
                            let dcbxstr = rejcbxchnstr[rejcbxengstr.indexOf(rdata.rejectReasons[i])];
                            //setTimeout(function(){
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
                                }
                            //},500);
                            //setTimeout(function(){
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
                            //},1000);
                        }
                    }
                }
            }
            setTimeout(function(){
                let ilabel = document.getElementById("iduserlabel");
                if(ilabel) ilabel.textContent = tmptext;
//                console.log("iduserlabel",ilabel);
            },1000);
            console.log("return true");
            return true;
        },
              err=>{
            console.log("未找到审核记录:"+id);
            return null;
        }
             )
        return null;
    }

    //判断是否需要上传审核至云端，及保存至本地：用户+upload
    function savePostData(pdata,rdata,icloud,iskip){
        let data = rdata ;
        console.log("检查是否需要上传审核数据...");
        //console.log(data);
        //console.log(iskip);
        let localpd = [];
        if(localStorage.getItem(useremail+"upload")) localpd = JSON.parse(localStorage.getItem(useremail+"upload"));
        let tmpupload={id:null,title:null,lat:null,lng:null,review:null};
        tmpupload.id=data.id;

        if(data.id=pdata.id){
            tmpupload.title=pdata.title;tmpupload.lat=pdata.lat;tmpupload.lng=pdata.lng;
        }
        let isave =0;
        data.skip = false ;
        if(iskip & icloud==0){
            tmpupload.review="skip";
            isave=1;
            data.skip = true;
        } else if(data.type=="NEW"){
//            console.log("duplicate",data.duplicate);
//            console.log("rejectReasons",data.rejectReasons);
            if(data.duplicate || data.rejectReasons ){
//                console.log("duplicate or rejectReasons");
                if(data.duplicate) tmpupload.review="重复:"+data.duplicateOf; else tmpupload.review="否决:" + data.rejectReasons;
                isave=1;
            } else if(data.cultural){
                if(data.cultural==5 & data.exercise==5 & data.location==5 & data.quality==5 & data.safety==5 & data.socialize==5 & data.uniqueness==5){
//                    console.log("five stars!");
                    tmpupload.review = "五星";
                    isave=1;
                } else {
                    if(pdata.nearbyPortals.find(p=>{return p.title==pdata.title})){
                        isave=1;
                    }
                }
            }
            if(data.newLocation) {tmpupload.review = tmpupload.review+":挪"+data.newLocation; isave=1};
        } else if(data.type=="EDIT"){
        } else if(data.type=="PHOTO"){
        }
        console.log("isave",isave);
        if(isave==1){
            try{
                console.log("saving...");
                if(icloud==0 || icloud==2){
                    if(cookie) {
                        //保存至本地
                        if(localpd.length==0){
                            localStorage.setItem(useremail+"upload","["+JSON.stringify(tmpupload)+"]");
                        } else {
                            localpd.push(tmpupload);
                            localStorage.setItem(useremail+"upload",JSON.stringify(localpd));
                        }
                        //上传至云端
                        gmrequest("PUT",surl,data.id,JSON.stringify(data));
                    }
                } else {
                    //保存审核记录至本地：以下未调试
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
                console.log(e);
            }
        } else {
            //let iup = document.getElementById("iduplabel");
            //if(iup) iup.style="font-weight:bold;color:#f6f5ec";
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

    //用户消息
    function createNotify(title, options) {
        var PERMISSON_GRANTED = "granted";
        var PERMISSON_DENIED = "denied";
        var PERMISSON_DEFAULT = "default";

        // 如果用户已经允许，直接显示消息，如果不允许则提示用户授权
        if (Notification.permission === PERMISSON_GRANTED) {
            notify(title, options);
        } else {
            Notification.requestPermission(function (res) {
                if (res === PERMISSON_GRANTED) {
                    notify(title, options);
                }
            });
        }

        //显示消息
        function notify($title, $options) {
            var notification = new Notification($title, $options);
            notification.onshow = function (event) {
            };
            notification.onclose = function (event) {
            };
            notification.onclick = function (event) {
                notification.close();
                mywin.focus();
            };
        }
    }

})();
