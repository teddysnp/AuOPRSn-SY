// ==UserScript==
// @name         AuOPRSn-SY-Follow
// @namespace    AuOPR
// @version      1.5.8
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
    let missionlist = [];

    getLocalMissionList();

    function getLocalMissionList(){
        let miss = localStorage.currentmission;
        if (miss) {
            missionlist = eval("(" + miss + ")");
            //let missstr = miss.replace(/\[/g,"{").replace(/\]/g,"}");//.replace("{{","[{").replace("}}","]");
            console.log("follow-mission",missionlist);
        }
    }

    listenLinkClick();
    //监听页面点击，获取是否人工点击
    function listenLinkClick(){
        document.body.addEventListener("click",function(event){
            //if(event.srcElement.innerText.indexOf("送出")>=0 || event.srcElement.innerText.indexOf("即可结束")>=0) console.log("listenLinkClick",event);
            //console.log("isTrusted",event.isTrusted);
            isUserClick = event.isTrusted;
            if(event.isTrusted) {
                //console.log(event.srcElement);
                let iauto = document.getElementById("idautolabel");
                //if(iauto) console.log(iauto.textContent);
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
                        let restext = null;
                        try {
                            restext = JSON.parse(res.responseText);
                        } catch(e) {
                            console.log(e);
                        }
                        if(res.status === 200){
                            if (restext.success) {
                                console.log("postjson",restext);
                                //success:false情况
                                //修改首页上传显示  绿：1d953f
                                let iup = document.getElementById("iduplabel");
                                if(iup) iup.style="font-weight:bold;color:#1d953f";
                                console.log(purl+pid+".json");
                                console.log('审核记录上传成功:'+pid)
                            } else {
                                console.log("postjson",restext);
                                let iup = document.getElementById("iduplabel");
                                if(iup) iup.style="font-weight:bold;color:red";
                                console.log('审核记录上传失败:'+pid)
                            }
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
            //Cache-Control: no-cache
            xhr.open(method, url, true);
            xhr.setRequestHeader("Cache-Control","no-cache");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    //console.log(xhr.status);
                    if (xhr.status === 200) {
                        res(xhr.responseText);
                    } else if(xhr.status === 404){
                        res(xhr.responseText);
                    } else if(xhr.status==401){
                        let msg = JSON.parse(xhr.responseText);
                        //console.log(login);
                        if(msg){
                            setTimeout(function(){
                                let login = document.querySelector("app-login");
                                if(msg.message=="Unauthorized" & !login) {
                                    mywin.location.reload();
                                }
                            },5000);
                        }
                    } else {
                        console.log("err:",xhr.status);
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
                        //console.log("olddata",data);
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
                        savePostData(tmpfollow,data);

                        //console.log("tmpdata",tmpdata);
                        return send.apply(_this,data);
                    } catch(e) {
                        console.log(e);
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

                    //let iautolabel = document.querySelector("p[id='idautolabel']");
                    //if (iautolabel.textContent == "手动"){
                        //console.log("data",JSON.parse(data));
                        let ic =0;
                        if(cloudReviewData){
                            if (cloudReviewData.skip) ic=1; else ic=0;
                        } else {
                            ic=0;
                        }
                        console.log("调用上传接口",isUserClick);
                        uploadPostData(portalData,JSON.parse(data),ic,true);
                    //}

                    console.log("skip",data);
                    console.log("skip",portalData);
                    return send.apply(_this,data);
                }
            }

            if (url == '/api/v1/vault/manage'){
                this.addEventListener('load', injectManage, false);
            }
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    //用于截获send请于，如果错误在U_XMLHttpRequest能被截获(应该不一样，U_XMLHttpRequest只能得到自己发的请求)，那么这个可能用处不大
    (function (send) {
        XMLHttpRequest.prototype.send = function (method, url) {
            // 记录xhr
            var xhrmsg = {
                'url': this.reqUrl,
                'type': this.reqMethod,
                // 此处可以取得 ajax 的请求参数
                'data': arguments[0] || {}
            }
            this.addEventListener('readystatechange', function () {
                if(this.status>400 & this.status!=404 & this.status!=401) {
                    console.log("send status",this.status);
                    console.log("send response",this.response);
                }
                if (this.readyState === 4) {
                    // 此处可以取得一些响应信息
                    // 响应信息
                    xhrmsg.res = this.response;
                    xhrmsg.status = this.status;
                    this.status >= 200 && this.status < 400 ?
                        xhrmsg.level = 'success' : xhrmsg.level = 'error';
                    //xhrArray.push(xhrmsg);
                }
            });
            send.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.send);

    //保存审核数据到本地，并判断是否需要上传
    function savePostData(tmpfollow,data){
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
        let rd1=cloudReviewData;
        console.log("云审核数据:",rd1);
        if(rd1) {
            rd1.acceptCategories=null;rd1.rejectCategories=null;
            if(!rd1.skip) rd1.skip=false;
        }
        let rd2=JSON.parse(data);
        console.log("本次审核数据:",rd2);
        if(rd2) {
            rd2.acceptCategories=null;rd2.rejectCategories=null;
            if(!rd2.skip) rd2.skip=false;
        }
        let rs1=JSON.stringify(rd1);let rs2=JSON.stringify(rd2);
        console.log("是否和网络一致",rs1==rs2);
        setTimeout(function(){
            if(isUserClick & rs1!=rs2) {
                console.log("调用上传接口",isUserClick);
                uploadPostData(portalData,JSON.parse(data),0,false);
            } else {
                console.log("不上传",isUserClick);
                console.log("审核结束:",rd2.id);
            }
        },200);
        if (iautolabel.textContent == "手动" & rs1!=rs2){
            //console.log("data",JSON.parse(data));
            //uploadPostData(portalData,JSON.parse(data),0,false);
        }
    };

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
                console.log("开始新审核:",portalData.title);
                console.log("原始po数据:",portalData);
//                if(!portalData.id || portalData.id==null) return;
                setTimeout(function(){ loadReviewData(portalData); },1000);
//                let testid = "74908645df72e5da08ebd13be138275c";
//                loadReviewData(testid);
            } catch (e) {
                console.log(e);
            }
        });
    }

    //申请页面
    function injectManage() {
        let miss1 = localStorage.currentmissiontitle;
        //console.log(miss);
        if(miss1){
            let miss = JSON.parse(miss1);
            let title="https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/mission/mission."+miss.title+".json";
            console.log(title);
            let resp1 = U_XMLHttpRequest("GET",title)
            .then(res=>{
                //console.log("res",res);
                if(!res) {
                    return;
                }
                localStorage.setItem("currentmission",res);
                missionlist =  eval("(" + res + ")");
                //console.log(JSON.stringify(missionlist));
                awaitElement(() => document.querySelector('app-submissions'))
                    .then((ref) => {
                    try {
                        const response = this.response;
                        const json = JSON.parse(response);
                        if (!json) return;
                        if (json.captcha || json==null) {
                            return;
                        }
                        let pData = json.result;
                        if(pData.submissions){
                            let isave=0;
                            for(let i=0;i<pData.submissions.length;i++){
                                //console.log("申请:",pData.submissions[i]);
                                //1分钟的时间戳值:60000 20分钟是1200000
                                for(let j=0;j<missionlist.length;j++){
                                    if( (missionlist[j][0]==pData.submissions[i].title) ||
                                       (pData.submissions[i].type=="EDIT_LOCATION" &
                                        ( missionlist[j][0]==pData.submissions[i].poiData.title) ) )
                                    {
                                        //1分钟的时间戳值:60000 查任务时间前3天的(防误输入)
                                        if(new Date(pData.submissions[i].day + " 00:00:00").getTime() >= ( new Date (missionlist[j][5] + " 00:00:00").getTime() - 60000*60*24*3 ) )
                                        {
                                            //console.log("任务：",missionlist[j]);
                                            //console.log("申请:",pData.submissions[i]);
                                            //"NOMINATION" "ACCEPTED" "REJECTED"
                                            //通过或拒绝
                                            //console.log("accept",JSON.stringify(missionlist));
                                            //console.log("accept",JSON.stringify(missionlist[j][6]));
                                            //console.log("status",pData.submissions[i].status);
                                            if((pData.submissions[i].status == "ACCEPTED" || pData.submissions[i].status == "REJECTED") & missionlist[j][6]!="ok") {
                                                missionlist[j][6]="ok";
                                                //console.log("accept?",JSON.stringify(missionlist[j][6]));
                                                //console.log("accept?",JSON.stringify(missionlist));
                                                isave=1;
                                                console.log("isave1");
                                            }
                                            //开审
                                            if(pData.submissions[i].status == "VOTING" & missionlist[j][2]!="true") {
                                                missionlist[j][2]="true";
                                                isave=1;
                                                console.log("isave2");
                                            }
                                            //审核人写错
                                            if((pData.submissions[i].status == "VOTING" || pData.submissions[i].status == "NOMINATION") & missionlist[j][9]!=useremail) {
                                                missionlist[j][9] = useremail ;
                                                isave=1;
                                                console.log("isave3");
                                            }
                                            //更新经纬度、id
                                            if((pData.submissions[i].status == "VOTING" || pData.submissions[i].status == "NOMINATION") & (pData.submissions[i].lat != missionlist[j][7] || pData.submissions[i].lng != missionlist[j][8] )){
                                                console.log("ptitle",pData.submissions[i].title);
                                                console.log("mtitle",JSON.stringify(missionlist[j][0]));
                                                console.log("plat",JSON.stringify(pData.submissions[i].lat));
                                                console.log("mlat",JSON.stringify(missionlist[j][7]));
                                                console.log("plng",JSON.stringify(pData.submissions[i].lng));
                                                console.log("mlng",JSON.stringify(missionlist[j][8]));
                                                missionlist[j][7] = pData.submissions[i].lat;missionlist[j][8] = pData.submissions[i].lng;
                                                isave=1;
                                                console.log("isave4");
                                            }
                                            //console.log(missionlist);
                                        }
                                    }
                                }
                            }
                            //console.log(isave);
                            //更新云中任务
                            if(isave==1){
                                if(!missionlist){ return;}
                                let miss=localStorage.currentmissiontitle;
                                let ititle=null;
                                if(miss) ititle=JSON.parse(miss).title;
                                if(ititle) {
                                    //console.log(missionlist);
                                    setTimeout(function(){
                                        localStorage.setItem("currentmission",JSON.stringify(missionlist));
                                        //console.log(JSON.stringify(missionlist));
                                        gmrequest("PUT",surl,"mission/mission."+ititle+"",JSON.stringify(missionlist));
                                    },500);
                                }
                            }
                        }
                    } catch (e) {
                        console.log(e);
                    }
                });
            });
        }
    }

    //NEW:根据标题名有重合，给提示是否重复，并加20秒倒计时
    function isDuplicate(pData){
        if(pData.nearbyPortals.find(p=>{return p.title==pData.title})){
            setTimeout(function(){
                let iauto = document.getElementById("idautolabel");
                console.log(iauto);
                let sc = document.getElementById("idcountdown");
                sc.textContent = sc.textContext + "+20";
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
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
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

    //PHOTO:未找到网络审核，按任务中选/瞎选一个
    function photoReview(pdata){
        if(pdata.type!="PHOTO") return;
        let iall = true;let tmptext = "";
        for(let i=0;i<missionlist.length;i++){
            //任务里有，全选：photo只能做到全选
            if(missionlist[i][0]==pdata.title){
                const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
                if(photoall.className.indexOf("photo-card--reject")==-1){
                    photoall.click();
                }
                tmptext = "任务po:全选";
                iall = false;
            }
        }
        if(iall){
            const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card');
            if (photo)
            {
                if(photo[0].className.indexOf("photo-card--reject")==-1) photo[0].click();
                tmptext = "瞎选第一个";
            }
        }
        setTimeout(function(){
            let ilabel = document.getElementById("idscore");
            if(ilabel) ilabel.textContent = tmptext;
            console.log("idscore",tmptext);
        },500);
    }

    //EDIT:未找到网络审核，按任务中选/瞎选
    function editReview(pdata){
        if(pdata.type!="EDIT") return;
        let iplan = null;let tmptext = "";
        for(let i=0;i<missionlist.length;i++){
            //任务里有：其它瞎选，经纬度按任务挪
            if(missionlist[i][0]==pdata.title){
                if(missionlist[i][11]) iplan = missionlist[i][11];
            }
        }

        //标题：点第一个
        let icnt2 = 0;
        let optp2 = document.querySelector('app-select-title-edit mat-radio-button');
        if (optp2) {
            optp2.scrollIntoView(true);
            //console.log(opt2);
            awaitElement(() => optp2.querySelector("label[class='mat-radio-label']"))
                .then((ref) => {
                let opt2 = optp2.querySelector("label[class='mat-radio-label']");
                opt2.click();
                tmptext = "瞎选第一个";
                console.log("title click!");
            })
        }

        //描述：点第一个
        let icnt3 = 0;
        let optp3 = document.querySelector('app-select-description-edit mat-radio-button');
        if (optp3) {
            optp3.scrollIntoView(true);
            awaitElement(() => optp3.querySelector("label[class='mat-radio-label']"))
                .then((ref) => {
                let opt3 = optp3.querySelector("label[class='mat-radio-label']");
                opt3.click();
                tmptext = "瞎选第一个";
                console.log("description click!");
            })
        }

        //点地图中的第一个点
        let icnt1 = 0;
        let optp = document.querySelector('agm-map');
        if (optp) {
            //optp.scrollIntoView(true);
            optp.scrollTo({top:0,left:0,behavior:'smooth'});
            //setTimeout(scrollToBottom, 100);
            let ccard = document.querySelector("wf-review-card[id='categorization-card']");
            if(ccard){
                ccard.scrollIntoView(true);
            }
            setTimeout(function(){
                //地图不出来，所以先滚动到下面categorization处
                awaitElement(() => document.querySelector("wf-checkbox mat-checkbox input"))
                    .then((ref) => {
                    let cbxpt = document.querySelector("wf-checkbox mat-checkbox input");
                    let btnpt = document.querySelectorAll('agm-map div[role="button"]');
                    if (cbxpt) {
                        console.log("iplan",iplan);
                        if(iplan & iplan>=0)
                        {
                            let ptbutton = document.querySelectorAll('agm-map div[role="button"]');
                            let ptstruct = getbtnStruct(ptbutton);
                            //console.log(editGYMPosition[ititle]);
                            //console.log(editGYMPosition[ititle][2]);
                            //let iplan = editGYMPosition[ititle][2];
                            //按计划对要挪的坐标点进行排序
                            let resortdata = getclickedbtn(ptstruct,iplan);
                            let movepos = parseInt(iplan);
                            if( movepos >10) movepos = movepos-10;
                            console.log("GYMData",ptstruct);
                            console.log("resortGYM",resortdata);
                            //console.log(movepos);
                            //console.log(resortdata.length);
                            if(movepos<=resortdata.length || movepos == 10){
                                let resdata=null;
                                if(movepos==10) {resdata=resortdata[resortdata.length - 1];} else {resdata=resortdata[movepos-1];}
                                console.log("resdata",resdata);
                                ptbutton.forEach((ptbtn)=>{
                                    //left: 65px; top: -135px;
                                    if(ptbtn.getAttribute('style').indexOf("left: "+resdata.left +"px; top: "+resdata.top)>=0){
                                        console.log("选中",ptbtn);
                                        let idscore = document.querySelector("span[id='idscore']");
                                        if(idscore) {
                                            setTimeout(function(){
                                                if(iplan<10){
                                                    idscore.textContent = "左第"+iplan+"个";
                                                } else if(iplan==10){
                                                    idscore.textContent = "最右边";
                                                } else if(iplan<20){
                                                    idscore.textContent = "上第"+(iplan-10)+"个";
                                                } else if(iplan==20){
                                                    idscore.textContent = "最下";
                                                }
                                            },1000);
                                        }
                                        ptbtn.click();
                                        return;
                                    }
                                })
                            }
                        } else
                        {
                            if(btnpt.length>0){
                                btnpt[0].click();
                                tmptext = "瞎选第一个";
                            }
                        }
                    }
                    console.log("map click!");
                })
            },1000);
        }

        //滚回顶部
        setTimeout(function(){
            var conpan = document.querySelector('mat-sidenav-content[class="mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100"]');
            if(conpan)
            {
                conpan.scrollTo({top:0,left:0,behavior:'smooth'});
            }
            let ilabel = document.getElementById("idscore");
            if(ilabel) ilabel.textContent = tmptext;
            console.log("idscore",tmptext);
        },1500);
    }

    function scrollToBottom (){
        console.log('scrollToBottom');
        (function smoothscroll() {
            const currentScroll = document.documentElement.scrollTop || document.body.scrollTop; // 已经被卷掉的高度
            const clientHeight = document.documentElement.clientHeight; // 浏览器高度
            const scrollHeight = document.documentElement.scrollHeight; // 总高度
            if (scrollHeight - 10 > currentScroll + clientHeight) {
                window.requestAnimationFrame(smoothscroll);
                window.scrollTo(0, currentScroll + (scrollHeight - currentScroll - clientHeight) / 2);
            }
        })();
    };
    //EDIT位置编辑用的函数
    function findArrayTwo(arr,title){
        for(let i=0;i<arr.length;i++){
            //            console.log("arr["+i+"]",arr[i]);
            if(arr[i].indexOf(title)>=0){
                return i;
            }
        }
        return -1;
    }
    //返回排好序的挪po点集合
    function getclickedbtn(ptstruct,iplan){
        let ilen=ptstruct.length;
        if (ilen<=0) return null;
        if (ilen==1) return ptstruct[0].aria-describedby;
        return resort(ptstruct,iplan);
    }
    //按挪的计划，对挪po点集合进行排序
    function resort(ptstruct,iplan){
        //    console.log(ptstruct[0].left);
        if(iplan<=10){
            for(let i=0;i<ptstruct.length;i++){
                for(let j=0;j<ptstruct.length - 1;j++){
                    let tmp = ptstruct[j];
                    if(parseInt(ptstruct[j].left) > parseInt(ptstruct[j+1].left)){
                        tmp = ptstruct[j];
                        ptstruct[j]=ptstruct[j+1];
                        ptstruct[j+1]=tmp;
                    }
                }
            }
        }
        if(iplan>10){
            for(let i=0;i<ptstruct.length;i++){
                for(let j=0;j<ptstruct.length - 1;j++){
                    let tmp = ptstruct[j];
                    if(parseInt(ptstruct[j].top) > parseInt(ptstruct[j+1].top)){
                        tmp = ptstruct[j];
                        ptstruct[j]=ptstruct[j+1];
                        ptstruct[j+1]=tmp;
                    }
                }
            }
        }
        return ptstruct;
    }
    //得到挪po的点坐标集合，屏幕坐标
    function getbtnStruct(ptbutton){
        let ptall = [];
        ptbutton.forEach((ptbtn) => {
            let ptbtaria = ptbtn.getAttribute("aria-describedby");
            let ptbtnatt = ptbtn.getAttribute('style');
            while(ptbtnatt.indexOf(" ")>0) {
                ptbtnatt = ptbtnatt.replace(" ","");
            }
            ptbtnatt = ptbtnatt.replaceAll(":",'":"');
            ptbtnatt = ptbtnatt.replaceAll(";",'","');
            ptbtnatt = ptbtnatt.replaceAll("px","");
            ptbtnatt = '{"aria-describedby":"'+ptbtaria+'","'+ptbtnatt.substr(0,ptbtnatt.length-2)+"}";
            //                    ptbtnatt='{"'+ptbtnatt.substr(0,ptbtnatt.length-2)+"}";
            //      console.log(ptbtnatt);
            ptbtnatt=JSON.parse(ptbtnatt);
            //      console.log(ptbtnatt);
            ptall.push(ptbtnatt);
        })
        //    console.log(ptall);
        return ptall;
    }

    //判断云端是否有审核记录，执行跟审或任务审
    function loadReviewData(pdata){
        //console.log(id);
        //let sid="05a6bef32a01cc9e39c967677e18763f";
        //console.log("email",useremail);
        let tmptext = '';
        let id=pdata.id;
        tmpfollow.id = null; tmpfollow.title = null; tmpfollow.lat = null; tmpfollow.lng = null; tmpfollow.review = null;
        //console.log("https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/portal/portalreview/portal." +id +".json");
        let resp = U_XMLHttpRequest("GET","https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/portal/portalreview/portal." +id +".json")
        .then(res=>{
            //console.log("getjson",res);
            let idown = document.getElementById("idcountdownlabel");
            let ilabel = document.getElementById("iduserlabel");
            //getLocalMissionList();
            if(!res) {
                //修改首页下载显示
                console.log("getjsonerr");
                cloudReviewData = null;
                setTimeout(function(){
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                    if(idown) idown.style="font-weight:bold;color:red";
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                if(pdata.type=="EDIT") editReview(pdata);
                if(pdata.type=="PHOTO") photoReview(pdata);
                if(pdata.type=="NEW") isDuplicate(pdata);
                return null;
            }
            if(res.indexOf("Error 404")>=0) {
                //修改首页下载显示
                //中黄：ffe600
                if(idown) idown.style="font-weight:bold;color:#ffe600";
                console.log("未找到json");
                cloudReviewData = null;
                setTimeout(function(){
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                if(pdata.type=="EDIT") editReview(pdata);
                if(pdata.type=="PHOTO") photoReview(pdata);
                if(pdata.type=="NEW") isDuplicate(pdata);
                return null;
            }
            if(res.indexOf("<!DOCTYPE html>")>=0){
                cloudReviewData = null;
                setTimeout(function(){
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                if(pdata.type=="EDIT") editReview(pdata);
                if(pdata.type=="PHOTO") photoReview(pdata);
                if(pdata.type=="NEW") isDuplicate(pdata);
                return null;
            }
            //20241106，将原审核记录通过脚本移动到portal/portalreview下，导致20141105以前的文件中多了：
            //  开头"(应该没有)  结尾:"(应该没有)  中间\"(应该无\)
            //20241106以后生成的审核记录应该无此问题
            let res1 = null;
            if(res.substring(0,1)=='"')
            {
                res1=res.substring(1,res.length-1);
                res1=res1.replace(/\\/g,"");
            } else res1=res;

            //console.log("res1",JSON.parse(res1));
            let creviewdata = null;
            let title=pdata.title;let lat=pdata.lat;let lng=pdata.lng;
            if(res1.substring(0,1)=="[") {
                //console.log("searching review record：",JSON.parse(JSON.parse(res1)[0]));
                creviewdata = JSON.parse(JSON.parse(res1)[0]);   //网络审核记录
            } else {
                //console.log("searching review record：",JSON.parse(res));
                creviewdata = JSON.parse(res1);   //网络审核记录
            }
            if(idown) idown.style="font-weight:bold;color:#1d953f";
            cloudReviewData = creviewdata ;
            if(creviewdata==null) { return null; }
            console.log("cloudReviewData",cloudReviewData);
            let rdata = creviewdata;
            //rejectReasons 是个数组
            tmpfollow.id=id;tmpfollow.title=title;tmpfollow.lat=lat;tmpfollow.lng=lng;
            //skip：NEW,EDIT,PHOTO都有
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
            }
            //pdata.type=="PHOTO"
            if(pdata.type=="PHOTO"){
                tmptext = "照抄网络审核：";
                const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card');
                const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
                if(rdata.rejectPhotos.length==0){
                    if(photoall.className.indexOf("photo-card--reject")==-1){
                        setTimeout(function(){ photoall.click(); },500);
                        tmptext = "照抄网络审核：全选";
                    }
                } else{
                    setTimeout(function(){
                        for(let i=0;i<pdata.newPhotos.length;i++){
                            if(photo[i].className.indexOf("photo-card--reject")>=0){
                                photo[i].click();
                            }
                            for(let j=0;j<rdata.rejectPhotos.length;j++){
                                if (rdata.rejectPhotos[j] == pdata.newPhotos[i].hash) {
                                    photo[i].click();
                                    tmptext+=(i+1)+"/";
                                }
                            }
                        }
                    },500);
                }
            }//pdata.type=="PHOTO"
            //pdata.type=="EDIT"
            if(pdata.type=="EDIT"){
                tmptext = "照抄网络审核：";
                //rdata selectedLocationHash selectedTitleHash selectedDescriptionHash
                //pdata titleEdits[] descriptionEdits[] locationEdits[]
                //titleUnable : 以上皆非
                setTimeout(function(){
                    let btntitle = document.querySelector('app-select-title-edit');
                    if(btntitle) {
                        let labdesc = btntitle.querySelectorAll("label[class='mat-radio-label']");
                        if(rdata.titleUnable){
                            tmptext += "名称否";
                            labdesc[labdesc.length-1].click();
                        } else if(rdata.selectedTitleHash){
                            for (let i=0;i<pdata.titleEdits.length;i++){
                                if(rdata.selectedTitleHash == pdata.titleEdits[i].hash) {
                                    labdesc[i].click();
                                }
                            }
                        }
                    }
                    //descriptionUnable : 以上皆非
                    let btndesc = document.querySelector('app-select-description-edit');
                    if(btndesc) {
                        let labdesc = btndesc.querySelectorAll("label[class='mat-radio-label']");
                        if(rdata.descriptionUnable){
                            tmptext += ",描述否";
                            labdesc[labdesc.length-1].click();
                        } else if(rdata.selectedDescriptionHash){
                            for (let i=0;i<pdata.descriptionEdits.length;i++){
                                if(rdata.selectedDescriptionHash == pdata.descriptionEdits[i].hash) {
                                    labdesc[i].click();
                                }
                            }
                        }
                    }
                    //locationUnable : 找不到实际位置
                    let agmmap = document.querySelector('agm-map');
                    if (agmmap) {
                        agmmap.scrollIntoView(true);
                        if(rdata.locationUnable){
                            tmptext += ",位置否";
                            document.querySelector("wf-checkbox mat-checkbox input").click();
                        } else if(rdata.selectedLocationHash){
                            setTimeout(function(){
                                let ccard = document.querySelector("wf-review-card[id='categorization-card']");
                                if(ccard){
                                    ccard.scrollIntoView(true);
                                }
                                let btnloc = agmmap.querySelectorAll('div[role="button"]');
                                if (btnloc) {
                                    for (let i=0;i<pdata.locationEdits.length;i++){
                                        if(rdata.selectedLocationHash == pdata.locationEdits[i].hash) {
                                            btnloc[i].click();
                                        }
                                    }
                                }
                            },500);
                        }
                        //滚回顶部
                        setTimeout(function(){
                            var conpan = document.querySelector('mat-sidenav-content');
                            if(conpan)
                            {
                                conpan.scrollTo({top:0,left:0,behavior:'smooth'});
                            }
                        },500);
                    }
                },500);
            }//pdata.type=="EDIT"
            if(pdata.type=="NEW"){
                if(rdata.duplicate){
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
                    //console.log(rdata);
                    if(rdata.cultural==5 & rdata.exercise==5 & rdata.location==5 & rdata.quality==5 & rdata.safety==5 & rdata.socialize==5 & rdata.uniqueness==5)
                    {
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
                    }
                    else {
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
                                    },500);
                                }
                            },500);
                        } else if (rdata.rejectReasons[0] == "UNSAFE") {
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
                            },500);
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
                                },500);
                                //},1000);
                            }
                        }
                    }
                }
            }//pdata=="NEW"
            //改显示标签
            setTimeout(function(){
                let ilabel = document.getElementById("iduserlabel");
                if(ilabel) ilabel.textContent = tmptext;
                console.log("iduserlabel",tmptext);
            },500);
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
    function uploadPostData(pdata,rdata,icloud,iskip){
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
            isave=1;
        } else if(data.type=="PHOTO"){
            isave=1;
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
                        console.log("上传...",data.id);
                        gmrequest("PUT",surl,"portal/portalreview/portal."+data.id,JSON.stringify(data));
                        console.log("审核结束:",data.id);
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
            console.log("不需上传,审核结束:",data.id);
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
