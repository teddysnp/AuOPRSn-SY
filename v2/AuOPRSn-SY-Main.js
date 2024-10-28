// ==UserScript==
// @name         AuOPRSn-SY-Main
// @namespace    AuOPR
// @version      4.5.2
// @description  try to take over the world!
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nianticlabs.com
// @grant        none
// ==/UserScript==
(function() {
    //变量区
    let mywin = window;
    let gpausePortal=["白白的鹅111","腾飞111","无锡记忆——河边洗衣三少妇11。","Curved monument11"];
    let gpausePortalString=["重复了-白白的大鹅","重复了-马踏飞燕","重复了-洗刷刷","重复了"];
    let mission ={  //名称,位置,开始,类型,已审,时间
        name: "",
        location: "",
        action: "",
        type: "",
        done: "",
        dt: ""
    };
    let missiondisplay = "false";
    let missionlist=[];
    /*[["敲鼓人","北一路万达","true","新增","","2024-10-10",""],
                     ["荷花象鼓","北一路万达","true","新增","","2024-10-10",""],["新时代共享职工之家","北一路万达","true","新增","","2024-10-10","ok"],
                     ["猫雷","北一路万达","true","新增","","2024-10-10",""],["两只能","北一路万达","false","新增","","2024-10-10",""],
                     ["乒乒乓乓","北一路万达","false","新增","","2024-10-10",""],["饭后消食中心","北一路万达","true","编辑","","2024-10-10",""],
                     ["柯尼麒麟","北一路万达","true","新增","","2024-10-10",""],["园区平面图","北一路万达","true","编辑","","2024-10-10","ok"],
                     ["超级大桶","北一路万达","true","编辑","","2024-10-10",""],["丽美如意象","北一路万达","false","编辑","","2024-10-10",""]
                    ];*/

    //1:名称、2:是否需要暂停干预、3:挪po方案
//    let editGYMPosition = [["丛林里的梅花鹿","false","10"],["职工文体广场","false","2"],["仨轮子","false","12"],
//                          ["粉嘟对象","false","11"],["黑鼻对象","false","11"]];
    let privatePortal = ["占位po"];
    let editGYMPhoto = ["重型皮带轮"];
    //沈阳大学南一门  吉大法学建院史
    let errPortal = ["b7a1c45e923048e0be225bbc264f9161","08196910e908e2613194624f7c04a46e"];

    let tryNumber = 10;
    let expireTime = null;
    let reviewTime = 20;  //审po时间为20分钟
    let autoReview = null;
    let reviewPortalAuto = "true";
    let editGYMAuto = "true";
    let postPeriod=[25,35];
    //let submitCountDown = null;
    let userID = null;
    let userEmail = null;
    let submitButtonClicked = false;
    let scoreAlready = false;
    let saveportalcnt1 = 500;
    let saveportalcnt2 = 200;
    let privatePortalDisplay1 = 50;  //首页列表中显示池中已审po数量
    let privatePortalDisplay2 = 50;  //首页列表中显示非池已审po数量
    let recentPo = 10;
    let portalData = null;
    let private=[[41.7485825,123.4324825,230,380],[41.803847,123.357713,910,920],[42.2828685,125.738134,3408,5517],[41.755547,123.288777,940,1140],[41.81979911, 123.25708028,910,920],[41.810820,123.376373,547,1036]];
    let timer = null;
    let ttm = null;
    let skey="";

    let bNextAuto = true;
    if(localStorage.bnextauto) {
        bNextAuto = localStorage.bnextauto;
    }
    let needCaptcha = false;
    if(localStorage.captchasetting){
        needCaptcha = localStorage.captchasetting;
    }
    let surl='https://dash.cloudflare.com/api/v4/accounts/6e2aa83d91b76aa15bf2d14bc16a3879/r2/buckets/warfarer/objects/';
    let cookie = localStorage.cfcookie;

    const loginNotice = null;

    //首次运行显示警告
    let iWarning=0;
    if(localStorage.Warning) {
        iWarning = localStorage.Warning;
    }
    if (iWarning == 0) {
        createNotify("欢迎", {
            body: "请自行承担后果(包括被N社踢出)!",
            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
            requireInteraction: false
        });
        localStorage.setItem("Warning",1);
    }

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

    mywin.onload = function() {
        let resp = U_XMLHttpRequest("GET","https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/missionlist.json")
        .then(res=>{
            console.log("读取网络任务");
            //console.log("res",res);
            if(!res) {
                setTimeout(function(){
                    console.log("onload","未找到任务列表");
                },1000);
                return;
            }
            let miss = JSON.parse(res)[0];
            if(miss){
                let title="https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/"+miss.title+".json";
                console.log(miss.title);
                let resp1 = U_XMLHttpRequest("GET",title)
                .then(res=>{
                    //console.log("res",res);
                    if(!res) {
                        setTimeout(function(){
                            console.log("onload","未找到任务列表");
                        },1000);
                        return;
                    }
                    localStorage.setItem("currentmissiontitle",miss.title);
                    localStorage.setItem("currentmission",res);
                    missionlist =  eval("(" + res + ")");
                });
            }
        });
    }

    function U_XMLHttpRequest(method, url) {
        return new Promise((res, err) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader("If-Modified-Since" ,"0");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        res(xhr.responseText);
                    } else {
                        err(xhr.statusText);
                    }
                }
            };
            xhr.onerror = function() {
                err(xhr.statusText);
            };
            xhr.send();
        }).catch(e => {
            console.log('Promise', e)});
    }

    //监听http请求，不同的页面实现不同功能
    (function (open) {
        XMLHttpRequest.prototype.open = function (method, url) {
//            console.log(url);
//            console.log(method);
            if(url=="/api/v1/vault/loginconfig")
            {
                console.log(url);
                //不好使
                /*
                console.log("loginNotice1",loginNotice);
                if(!loginNotice)
                {
                    console.log("loginNotice2",loginNotice);
                    loginNotice = userNotice("登录", {
                        body: "需要登录",
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                        requireInteraction: true});
                }
                console.log("loginNotice3",loginNotice);*/
                if(!messageNotice.alertwindow){
                    createNotify("登录", {
                        body: "需要登录",
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                        requireInteraction: false
                    });
                    messageNotice.alertShow();
                }
            }
            if (url == '/api/v1/vault/review' && method == 'GET') {
                scoreAlready = false ;
                let seditGYM = localStorage.editGYMAuto;
                if(seditGYM) {editGYMAuto=seditGYM};
                let sreviewPortalAuto = localStorage.reviewPortalAuto;
                if(sreviewPortalAuto) {reviewPortalAuto=localStorage.reviewPortalAuto};
                //mywin.clearInterval(ttm);
                //ttm = null;
                //mywin.clearInterval(timer);
                //timer=null;
                this.addEventListener('load', injectTimer, false);
            }
            if (url == '/api/v1/vault/review' && method == 'POST') {
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    //console.log(data);
                    //clearInterval(timer);
                    mywin.clearInterval(timer);
                    timer = null;
                    //console.log(portalData);
                    if(bNextAuto){
                        autoReview = "true";
                        localStorage.setItem("autoReview", autoReview );
                    }
                    saveReviewtoLocal(portalData,data);
                    //submitCountDown = null;
                    return send.apply(_this,data);
                    //saveReviewData(data);
                }
            }
            //https://wayfarer.nianticlabs.com/api/v1/vault/review/skip  //7e221f605682750b87a54d393063b9c5
            if (url == '/api/v1/vault/review/skip' && method == 'POST'){
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    console.log("skip",data);
                    mywin.clearInterval(timer);
                    timer = null;
                    if(bNextAuto){
                        autoReview = "true";
                        localStorage.setItem("autoReview", autoReview );
                    }
                    console.log("skip",portalData);
                    return send.apply(_this,data);
                }
            }
            if (url == '/api/v1/vault/profile' && method == 'GET') {
                if(!userEmail) {
                    userEmail = getUser();
                }
                this.addEventListener('load', getUserList, false);
            }
            if (url == '/api/v1/vault/home' && method == 'GET') {
                console.log(loginNotice);
                this.addEventListener('load', showReviewedHome, false);
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

    //构造计时器(在wf-logo已经加载下)，并调用初始化计时器initTimer
    /////////json.result中有portal数据，包括nearby portals，可判断重复，有问题直接发消息，并暂停自动提交
    ///////////根据经纬度、portalname判断池中、本地、外地 ， 需要暂停的po，发消息，并暂停自动提交
    function injectTimer() {
        submitButtonClicked = false;
        tryNumber = 10;
        awaitElement(() => document.querySelector('wf-logo'))
            .then((ref) => {
            try {
                const response = this.response;
                const json = JSON.parse(response);
                if (!json) return;
                autoReview = localStorage.autoReview;
                portalData = json.result;
                //console.log(json);
                //console.log("injectTimer:needCaptcha",needCaptcha);
                if (json.captcha) {
                    if(needCaptcha=="true"){
                        createNotify("需要验证", {
                            body: "需要验证！",
                            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                            requireInteraction: true
                        });
                    } else {
                        createNotify("需要验证", {
                            body: "需要验证！",
                            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                            requireInteraction: false
                        });
                    }
                    return;
                }
                if(json==null) {
                    return;
                }
                expireTime = portalData.expires;
                initTimer(ref.parentNode.parentNode, portalData.expires ,portalData);
            } catch (e) {
                console.log(e);
            }
        });
    }

    //初始化计时器(检测到review/edit/photo的card下) 在顶部增加时间标签 ，当前用户标签，并调用updateTime设置走秒，增加提交倒计时 注入按钮：自动/手动切换
    function initTimer(container, expiry , portalData1) {
        awaitElement(() => (
            document.getElementById('appropriate-card') ||
            document.querySelector('app-review-edit') ||
            document.querySelector('app-review-photo')
        )).then(ref => {
            //在顶部增加计时标签
            if(portalData1.type=="NEW") {
                document.getElementById("title-description-card").setAttribute("class","card");
            }
            document.querySelector("h2[class='wf-page-header__title ng-star-inserted']").replaceWith("");
            let liddvall = document.getElementById("iddvall");
            let ltimerlabel2 = document.getElementById("idltimerlabel");
            let countdown = document.getElementById("idcountdown");
            //console.log("countdown",countdown);
            if(countdown == null){  //标签不存在则创建
                let loc = "";
                loc =getLocation(portalData1);
                //共注入五部份 divall为总 dvauto dv divuser divcountdown divaddrscore
                const divall=document.createElement("div");
                divall.id="iddvall";
                divall.style="width:80%;font-size:16px;";
                divall.className="clusertop";
                const spblank=document.createElement("span");
                spblank.textContent="　　";

                //dvauto = dvautobtn + dvautolabel
                const dvauto = document.createElement("div");
                dvauto.style="width:10%;font-size:16px";
                dvauto.className="clusertop1";
                const dvautobtn = document.createElement("button");
                dvautobtn.id="btnauto";
                dvautobtn.className="txtcenter";
                dvautobtn.type="button";
                dvautobtn.textContent = "切换";
                dvautobtn.style="background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:30px;border-radius:10px;";
                dvautobtn.setAttribute("onClick", "startstopAuto()");
                const dvautolabel = document.createElement('p');
                dvautolabel.id = "idautolabel";
                dvautolabel.textContent = '自动';
                dvautolabel.className="txtcenter";
                dvauto.appendChild(dvautobtn);
                dvauto.appendChild(dvautolabel);

                //dv = div1 = ltimerlabel1 + ltimerlabel2
                const dv=document.createElement("div");
                dv.style="width:10%;font-size:16px;";
                dv.className="clusertop1";
                const div1=document.createElement("div");
                div1.className = 'txtcenter';
                const ltimerlabel1 = document.createElement('p');
                ltimerlabel1.id = "idltimerlabel";
                ltimerlabel1.textContent = '计时: ';
                ltimerlabel2 = document.createElement('p');
                ltimerlabel2.id = "idtimerdata";
                ltimerlabel2.classList.add("clptimerdata");
                //ltimerlabel2.textContent = '开始: ';

                div1.appendChild(ltimerlabel1);
                div1.appendChild(ltimerlabel2);
                dv.appendChild(div1);

                //divcountdown = countdownlabel + countdown
                //增加提交倒计时
                let divcountdown=document.createElement("div");
                divcountdown.style="width:10%;font-size:14px";
                divcountdown.className="txtcenter";
                //增加提交倒计时label
                let dvupdown = document.createElement("div");
                dvupdown.style="width:10%;font-size:20px";
                dvupdown.className="txtcenter";
                let countuplabel = document.createElement('span');
                countuplabel.className = 'cluplabel';
                countuplabel.style="color:#d9d6c3;";
                countuplabel.id = "iduplabel";
                countuplabel.textContent = '↑';
                //增加提交倒计时label
                let countdownlabel = document.createElement('span');
                countdownlabel.className = 'clcountdownlabel';
                countdownlabel.id = "idcountdownlabel";
                countdownlabel.style="color:#d9d6c3;";
                countdownlabel.textContent = '↓';
                dvupdown.appendChild(countuplabel);
                dvupdown.appendChild(countdownlabel);
                divcountdown.appendChild(dvupdown);
                //增加提交倒计时标签
                let dvcdown = document.createElement("div");
                dvcdown.style="width:100%;font-size:16px;display:flex;justify-content:flex-center;";
                dvcdown.className="txtcenter";
                let dvcdown1 = document.createElement("div");
                dvcdown1.style="width:5%";
                dvcdown1.className="txtcenter";
                let dvcdown2 = document.createElement("div");
                dvcdown2.style="width:33%";
                dvcdown2.className="txtcenter";
                let dvcdown3 = document.createElement("div");
                dvcdown3.style="width:33%";
                dvcdown3.className="txtcenter";
                countdown = document.createElement('span');
                countdown.className = 'txtcenter';
                countdown.id = "idcountdown";
                dvcdown2.appendChild(countdown);
                dvcdown.appendChild(dvcdown1);
                dvcdown.appendChild(dvcdown2);
                dvcdown.appendChild(dvcdown3);
                //countdown.textContent = '';
                //countdown.style.display = 'justify-content: center;';
                divcountdown.appendChild(dvcdown);
                //console.log(countdown);

                //divuser = userlabel+uname
                const divuser=document.createElement("div");
                divuser.style="width:25%;font-size:14px";
                divuser.className="clusertop1";
                //增加当前用户label
                const userlabel = document.createElement('p');
                userlabel.className = 'cluserlabel';
                userlabel.id = "iduserlabel";
                userlabel.textContent = '当前用户: ';
                divuser.appendChild(userlabel);
                //增加当前用户标签
                const uname = document.createElement('p');
                uname.className = 'clusername';
                uname.id = "idusername";
                uname.textContent = '';
                uname.textContent = userEmail;
                divuser.appendChild(uname);

                //divaddscore = divaddr + divlocscore( divloc +divblank)
                //增加地址、池中本地外地、打分标签
                const divaddscore = document.createElement('div');
                divaddscore.style="width:100%;font-size:14px";
                divaddscore.className="clusertop1";
                //增加地址
                const divaddr = document.createElement('p');
                divaddr.className = 'claddr';
                divaddr.id = "idaddr";
                divaddr.textContent = '';
                //增加池中本地外地、打分
                const divlocscore = document.createElement('div');
                divlocscore.className="clusertop1";
                //增加池中本地外地
                const divloc = document.createElement('span');
                divloc.className = 'clusertop1';
                divloc.id = "idloc";
                divloc.style="justify-content: flex-start;";
                divloc.textContent = '';
                //增加空白
                const divblank = document.createElement('span');
                divblank.className = 'clusertop1';
                divblank.textContent = '.  ||  .';
                //增加打分
                const divscore = document.createElement('span');
                divscore.className = 'clusertop1';
                divscore.id="idscore";
                divscore.textContent="";

                divlocscore.appendChild(divloc);
                divlocscore.appendChild(divblank);
                divlocscore.appendChild(divscore);
                divaddscore.appendChild(divlocscore);
                divaddscore.appendChild(divaddr);

                divall.appendChild(dvauto);
                divall.appendChild(dv);
                divall.appendChild(divcountdown);
                divall.appendChild(divuser);
                divall.appendChild(spblank);
                divall.appendChild(divaddscore);

                if(portalData1.type=="NEW") {updateAddress(divaddr);}
                switch(loc){
                    case "池中":
                        divloc.style="justify-content: flex-start;color:red";break;
                    case "本地":
                        divloc.style="justify-content: flex-start;color:blue";break;
                    case "外地":
                        divloc.style="justify-content: flex-start;color:black";break;
                    default :
                        divloc.style="justify-content: flex-start;";
                }

                divloc.textContent = "定位："+loc +".||.经纬："+portalData1.lat+","+portalData1.lng;
                //兼容Wayfarer Review Timer
                let pnode = document.querySelector("div[class='wayfarerrtmr']");
                //console.log(pnode);
                if(pnode) {
                    //console.log(pnode.parentNode);
                    pnode.parentNode.after(divall);
                } else {
                    //console.log(container);
                    container.after(divall);
                }
                if(getPortalStatus(portalData1,loc)) autoReview = "false";  //需暂停的，
                //showReviewedReview();
                let submitCountDown = null;
                if(Math.ceil((new Date().getTime() - expiry + reviewTime*60000) / 1000)>postPeriod[1]){
                    submitCountDown = 10;
                } else {
                    submitCountDown = (postPeriod[0] + ((postPeriod[1] - postPeriod[0]) * Math.random() ) );
                }
                //      getSubmitButtonClick();
                //      mywin.location.reload("#iddvall");
                //      setTimeout(function(){$("#iddvall").load(location.href+" #iddvall");},0);
                //console.log(timer);
                //更新计时器
//                timer = null;
                countdown.textContent = Math.ceil(submitCountDown);

                //if(ttm==null) {
                //console.log("ttm:",ttm);
                    ttm = mywin.setInterval(() => {
                        if(autoReview=="true"){
                            dvautolabel.textContent = '自动';
                        } else {
                            dvautolabel.textContent = '手动';
                        }
                    },1000);
               //}
                if(timer==null) { timer = mywin.setInterval(() => {
                    if(countdown.textContent.indexOf("+")>0){
                        const ss=countdown.textContent;
                        const iright=parseInt(ss.substring(ss.indexOf("+")+1,ss.length));
                        submitCountDown += iright;
                    }
                    countdown.textContent = Math.ceil(submitCountDown);
                    //不重新取一下，切换页面后不更新，非常神奇
                    let sss = document.getElementById("idcountdown");
                    if(sss) {
                        sss.textContent = Math.ceil(submitCountDown);
                    }
                    let ltd = document.getElementById("idtimerdata");
                    if(ltd) updateTime(ltd, expiry);
                    //updateTime(ltimerlabel2, expiry);
                    //console.log(submitCountDown);
                    let ss1=document.getElementById('appropriate-card');
                    if (document.getElementById('appropriate-card') || document.querySelector('app-review-edit') || document.querySelector('app-review-photo'))
                    {
                        //          console.log(scoreAlready);
                        if (!scoreAlready){
                            setTimeout(function(){
                                showReviewedReview();
                            },1000);
                            let score = commitScore(portalData1,loc);
                            divscore.textContent = "打分："+score;
                            scoreAlready = true;
                        }
                        //          console.log(countdown);
                        //          console.log(submitCountDown);
                        if(autoReview=="true"){
                            if(submitCountDown<=0){  //倒计时0，提交
                                if(portalData){
                                    setTimeout(function(){
                                        clearInterval(ttm);
                                        mywin.clearInterval(ttm);
                                        ttm=null;
                                    },10);
                                    //错误po 忽略
                                    if(errPortal.indexOf(portalData.id)>=0){
                                        let perr = document.querySelector('button[title=""]');
                                        if(perr) {
//                                            if(perr.textContent=" 略過 "){
                                            console.log("timer","cancel");
                                            createNotify("错误po", {
                                                body: "忽略："+portalData.title,
                                                icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                                                requireInteraction: false
                                            });
                                            perr.click();
//                                            }
                                        }
                                    } else {
                                        let isub = false;
                                        //适当拒
                                        let rej1 = document.querySelector("app-appropriate-rejection-flow-modal");
                                        if(rej1) {
                                            let rejbutton = rej1.querySelector('button[wftype="primary"]');
                                            if (rejbutton) {
                                                console.log("timer","适当性拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //安全拒
                                        let rej2 = document.querySelector("app-safe-rejection-flow-modal");
                                        if(rej2) {
                                            let rejbutton = rej2.querySelector('button[wftype="primary"]');
                                            if (rejbutton) {
                                                console.log("timer","安全拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //准确拒
                                        let rej3 = document.querySelector("app-accuracy-rejection-flow-modal");
                                        if(rej3) {
                                            let rejbutton = rej3.querySelector('button[wftype="primary"]');
                                            if (rejbutton) {
                                                console.log("timer","准确拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //永久拒
                                        let rej4 = document.querySelector("app-location-permanent-rejection-flow-modal");
                                        if(rej4) {
                                            let rejbutton = rej4.querySelector('button[wftype="primary"]');
                                            if (rejbutton) {
                                                console.log("timer","永久拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //重复
                                        if(!isub){
                                            let supcommit = document.querySelector("app-confirm-duplicate-modal");
                                            let supcommitbtn = null;
                                            if(supcommit){
                                                console.log(supcommit);
                                                supcommitbtn = supcommit.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                                if(supcommitbtn) {
                                                    console.log("timer","duplicate clicked!");
                                                    isub = true;
                                                    supcommitbtn.click();
                                                }
                                            }
                                        }
                                        if(!isub){
                                            let p1 = document.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                            if (p1){
                                                if(!submitButtonClicked){
                                                    //console.log(submitButtonClicked);
                                                    submitButtonClicked = true;
                                                    console.log("timer","submit!");
                                                    submitCountDown=null;
                                                    p1.click();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            submitCountDown--;
                            dvautolabel.textContent = '自动';
                        } else
                        {
                            dvautolabel.textContent = '手动';
                        }
                    }
                }, 1000);} else {
                    //updateTime(ltimerlabel2, expiry);
                }
            } else {
            }
        });
    }

    //更新计时器
    function updateTime(counter, expiry) {
        //1分钟的时间戳值:60000 20分钟是1200000
        let diff = Math.ceil((expiry - new Date().getTime()) / 1000);
        let timegoing = Math.ceil((new Date().getTime() - expiry + reviewTime*60000) / 1000);
        //    console.log(timegoing);
        if (diff < 0) {
            counter.textContent = "Expired";
            return;
        }
        let minutes = Math.floor(timegoing / 60);
        let seconds = Math.abs(timegoing % 60);
        if (minutes < 10) minutes = `0${minutes}`;
        if (seconds < 10) seconds = `0${seconds}`;
        counter.textContent = `${minutes}:${seconds}`;
    }

    function updateAddress(divaddr){
        setTimeout(function(){
                let addr = document.querySelector(".wf-review-card__body .flex.flex-col.ng-star-inserted");
                if(addr ){
                    if( addr.childNodes[1].innerText.indexOf("載入中")==-1){
                        let address=addr.childNodes[1].innerText.split(":")[1];
                        address=address.replace(" 邮政编码","");
                        divaddr.textContent = "地址:"+address;
                        return;
                    }
                    setTimeout(function(){
                        let addr = document.querySelector(".wf-review-card__body .flex.flex-col.ng-star-inserted");
                        if(addr ){
                            if( addr.childNodes[1].innerText.indexOf("載入中")==-1){
                                let address=addr.childNodes[1].innerText.split(":")[1];
                                address=address.replace(" 邮政编码","");
                                divaddr.textContent = "地址:"+address;
                                console.log("第二次取地址");
                                return;
                            }
                            setTimeout(function(){
                                let addr = document.querySelector(".wf-review-card__body .flex.flex-col.ng-star-inserted");
                                if(addr ){
                                    if( addr.childNodes[1].innerText.indexOf("載入中")==-1){
                                        let address=addr.childNodes[1].innerText.split(":")[1];
                                        address=address.replace(" 邮政编码","");
                                        divaddr.textContent = "地址:"+address;
                                        console.log("第三次取地址");
                                        return;
                                    }
                                }
                            },1000);
                        }
                    },1000);
                }
        },500);
    }
    function updateAddress1(divaddr){
        setTimeout(function(){
            let itry = 3;
            const queryloop = () => {
                let addr = document.querySelector(".wf-review-card__body .flex.flex-col.ng-star-inserted");
                if(addr ){
                    if( addr.childNodes[1].innerText.indexOf("載入中")==-1){
                        let address=addr.childNodes[1].innerText.split(":")[1];
                        address=address.replace(" 邮政编码","");
                        divaddr.textContent = "地址:"+address;
                    };
                    itry--;
                    if(itry<=1){
                        return;
                    }
                }
            };
            queryloop();
        },500);
    }

    saveUserNameList = function (){
        let cbsuser = document.querySelectorAll("input[class='cbxusername']");
        let usernamelist="";
        if(cbsuser) {
            for(let i=0;i<cbsuser.length;i++){
                if(cbsuser[i].checked){
                    usernamelist+=cbsuser[i].value+",";
                }
            }
            usernamelist=usernamelist.substr(0,usernamelist.length-1);
            localStorage.setItem(userEmail+"user",usernamelist);
        }
    }
    function getUserList(){
        awaitElement(() => document.querySelector("div[class='wf-page-header']"))
            .then((ref) => {
            try {
                const response = this.response;
                const json = JSON.parse(response);
                if (!json) return;
                let userprofile = json.result;
                let arrjson = [];
                arrjson.push(JSON.stringify(json));
                console.log(arrjson);
                //      console.log(userprofile);
                console.log(needCaptcha);
                if (json.captcha) {
                    if(needCaptcha=="true"){
                        createNotify("需要验证", {
                            body: "需要验证！",
                            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                            requireInteraction: true
                        });
                    } else {
                        createNotify("需要验证", {
                            body: "需要验证！",
                            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                            requireInteraction: false
                        });
                    }
                    return;
                }
                if(document.querySelector("div[class='wf-page-header']")) {
                    let userlist = [];
                    if(localStorage.userList) {userlist = JSON.parse(localStorage.userList)};
                    let suser="";
                    if(userlist){
                        let localuserlist=localStorage[userEmail+"user"];
                        if(!localuserlist) localuserlist="";
                        suser+="<div><span>当前用户："+userEmail+"</span>　　<button type='button' style='background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:30px;border-radius:10px;'"+
                            "onclick=saveUserNameList()>保存</button><div><p>";
                        for(let i=0;i<userlist.length - 1;i++){
                            if(userlist[i].indexOf("@") == -1) {
                                if(localuserlist.indexOf(userlist[i])>=0){
                                    suser+="<input type='checkbox' class='cbxusername' checked='checked' id='cbx"+i+"' value='"+userlist[i]+"'>"+userlist[i]+"</input><span>　　<span>";
                                } else {
                                    suser+="<input type='checkbox' class='cbxusername' id='cbx"+i+"' value='"+userlist[i]+"'>"+userlist[i]+"</input><span>　　<span>";
                                }
                            }
                            if((i+1)%5==0){
                                suser+="<p>";
                            }
                        }
                        suser="<div id='dvuserlist'>"+suser+"</div>";
                    }
                    let bnext = "";
                    console.log("bNextAuto",bNextAuto);
                    if(bNextAuto){
                        bnext = "<p>-----------------------------------------</p><div><span>下一个自动：</span><input type='checkbox' class='cbxnextauto' id='idnextauto' checked=true onclick='saveNextAutoSetting()'>下一个审核是否自动</input></div>";
                    } else {
                        bnext = "<p>-----------------------------------------</p><div><span>下一个自动：</span><input type='checkbox' class='cbxnextauto' id='idnextauto' onclick='saveNextAutoSetting()'>下一个审核是否自动</input></div>";
                    }
                    let cbxcaptcha=localStorage.captchasetting;
                    console.log(cbxcaptcha);
                    let cap ="";
                    if(cbxcaptcha=="true") {
                        cap = "<p>-----------------------------------------</p><div><span>验证设置：</span><input type='checkbox' class='cbxcaptcha' id='idcaptcha' checked=true onclick='saveCaptchaSetting()'>机器验证一直显示</input></div>";
                    } else {
                        cap = "<p>-----------------------------------------</p><div><span>验证设置：</span><input type='checkbox' class='cbxcaptcha' id='idcaptcha' onclick='saveCaptchaSetting()'>机器验证一直显示</input></div>";
                    }
                    //let scookie="<p><div><button id='btncookie' style='background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:30px;border-radius:10px;' onclick='saveCookie()'>保存</button><input id='txtCookie' type='text' style='width:90%'></input></div></p>";
                    //$("wf-page-header").after(scookie);
                    $("wf-page-header").after(cap);
                    $("wf-page-header").after(bnext);
                    $("wf-page-header").after(suser);
                }
            } catch (e) {
                console.log(e);
            }
        });
    }

    saveCookie = function () {
        let scookie = document.querySelector("input[id='txtCookie']");
        console.log('scookie',scookie);
        let txtcookie=scookie.value;
        console.log('txtcookie',txtcookie);
        localStorage.setItem("cfcookie",txtcookie);
    }

    saveNextAutoSetting = function(){
        let cbx = document.querySelector("input[id='idnextauto']");
        //      console.log(cbx.checked);
        bNextAuto = cbx.checked;
        localStorage.setItem("bnextauto",cbx.checked);
    }
    saveCaptchaSetting = function() {
        let cbx = document.querySelector("input[id='idcaptcha']");
        //      console.log(cbx.checked);
        localStorage.setItem("captchasetting",cbx.checked);
    }

    startstopAuto = function() {
        if(autoReview == "true")
        {
            autoReview ="false";
        } else
        {
            autoReview ="true";
        }
        localStorage.setItem("autoReview", autoReview );
        //console.log(autoReview);
    }

    getUser();
    function getUser(){
        const resp = U_XMLHttpRequest("GET","https://wayfarer.nianticlabs.com/api/v1/vault/properties")
        resp.then
        (res=>{
            if(res){
                let restext = JSON.parse(res);
                //        console.log(restext.result.socialProfile);
                userEmail = restext.result.socialProfile.email;
                //        console.log(userEmail);
                if(restext.result.socialProfile.email)
                {
                    localStorage.setItem("currentUser",restext.result.socialProfile.email);
                    document.title = localStorage["currentUser"];
                }
                return restext.result.socialProfile.email;
            }
        });
    }

    //保存审po记录到本地：review1,review2
    function saveReviewtoLocal(pageData,data) {
        let localreview = [];
        let tmpstorage = null ;
        let sdt = formatDate(new Date(),"yyyy-MM-dd HH:mm:ss");
        let i;
        let sloc=getLocation(portalData);
        let ssc=document.querySelector("span[id='idscore']");
        let sscore="";
        let pdata = JSON.parse(data);
        console.log(pdata);
        if(pdata){
            if(pdata.type=="NEW"){
                if(pdata.duplicate) {
                    sscore = "重复："+pdata.duplicateOf;
                } else if (pdata.rejectReasons) {
                    sscore = "拒：" +pdata.rejectReasons;
                } else {
                    sscore = ":" + pdata.quality + pdata.safety + pdata.location + pdata.uniqueness + pdata.socialize + pdata.exercise + pdata.cultural;
                    sscore = sscore.substring(1,sscore.length);
                }
            } else {
                if(ssc) sscore=ssc.textContent;
            }
        }
        try{
            //    console.log(pageData);
            //    let sc=document.querySelector("");
            //保存池中po至 Reviewed1
            if (privatePortal.indexOf(pageData.title)>=0 || missionlist.indexOf(pageData.title)>0 ||
                gpausePortal.indexOf(pageData.title)>0 || sloc=="池中" ) {
                localreview = JSON.parse(localStorage.getItem('Reviewed1'));
                //      console.log(localreview);
                if(localreview === null) {localreview = [];};
                //                       console.log(localreview);
                tmpstorage='{\"user\":\"'+localStorage.currentUser+'\",\"title\":\"'+pageData.title+'\",\"type\":\"'+pageData.type+'\",\"lat\":'+pageData.lat+',\"lng\":'+pageData.lng+
                    ',\"score\":\"'+sscore
                    +'\",\"dt\":\"'+sdt+'\"}';
                localreview.push(tmpstorage);
                //      console.log(localreview);
                localStorage.setItem('Reviewed1', JSON.stringify(localreview.slice(0-saveportalcnt1)));
            } else
                //保存池外po至 Reviewed2
            {
                //             console.log("Updating local review storage Reviewed2..");
                localreview = JSON.parse(localStorage.getItem('Reviewed2'));
                //                       console.log(pageData);
                if(localreview === null) {localreview = [];};
                //           console.log(localreview);
                tmpstorage='{\"user\":\"'+localStorage.currentUser+'\",\"title\":\"'+pageData.title+'\",\"type\":\"'+pageData.type+'\",\"lat\":'+pageData.lat+',\"lng\":'+pageData.lng+
                    ',\"score\":\"'+ sscore
                    +'\",\"dt\":\"'+sdt+'\"}';
                localreview.push(tmpstorage);
                //      console.log(localreview.slice(0-saveportalcnt2));
                localStorage.setItem('Reviewed2', JSON.stringify(localreview.slice(0-saveportalcnt2)));
            }
        } catch (e) {
            console.log(e);
        }
    }
    //监听提交按钮，调用saveReviewtoLocal保存审po记录到本地
    function getSubmitButtonClick(){
        let p1 = document.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
        console.log(p1);
        if (p1) {
            p1.addEventListener("click", function () {
                console.log(portalData);
                if(portalData){
                    saveReviewtoLocal(portalData);
                }
            })
        }
    }

    //注入标签：任务列表、最近审的po、池中/本地/外地、中文地址
    //图片打分
    function commitScorePhoto(portalData1,loc){
        const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card');
        const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
        //            console.log(photo);
        //本地道馆编辑图片，全选 app-accept-all-photos-card
        if(editGYMPhoto.indexOf(portalData1.title)>=0){
            if(photoall){
                photoall.click();
            }
            return "全选";
        } else if (photo)
        {
            photo[0].click();
            return "瞎选第一个";
        }
    }
    //编辑po打分
    function commitScoreEdit(portalData1,loc){
        //标题：点集合中的第一个选项
        let icnt2 = 0;
        let optp2 = document.querySelector('app-select-title-edit mat-radio-button');
        if (optp2) {
            optp2.scrollIntoView(true);
            let opt2 = optp2.querySelector("label[class='mat-radio-label']");
            console.log(opt2);
            while(!opt2) {
                setTimeout(function(){
                    opt2 = optp2.querySelector("label[class='mat-radio-label']");
                    //        console.log(opt2);
                },1000);
                icnt2++;
                if (icnt2>10) { break;}
            }
            console.log(opt2);
            if (opt2) {
                opt2.click();
                console.log("options click!");
            }
        }

        //描述：点集合中的第一个选项
        let icnt3 = 0;
        let optp3 = document.querySelector('app-select-description-edit mat-radio-button');
        if (optp3) {
            optp3.scrollIntoView(true);
            let opt3 = optp3.querySelector("label[class='mat-radio-label']");
            console.log(opt3);
            while(!opt3) {
                setTimeout(function(){
                    opt3 = optp3.querySelector("label[class='mat-radio-label']");
                    //        console.log(opt3);
                },1000);
                icnt3++;
                if (icnt3>10) { break;}
            }
            console.log(opt3);
            if (opt3) {
                opt3.click();
                console.log("options click!");
            }
        }

        //本地，如果是自动，则切换为手动
        let ret = null;
        if (autoReview=='true' ) {
            if (loc=="池中"){
                if(editGYMAuto == "true") autoReview="false";
                console.log("autoReview set false");
                ret = "池中挪po";
            } else {
                ret = "瞎选一个";
            }
        } else
        {
            ret = "瞎选一个";
        }

        //点地图中的第一个点
        let icnt1 = 0;
        let optp = document.querySelector('agm-map');
        if (optp) {
//            console.log("optp",optp);
            optp.scrollIntoView(true);
          //防止不点击，1秒后执行
            setTimeout(function(){
              //防止不点击，先滚动到categorization
              let ccard = document.querySelector("wf-review-card[id='categorization-card']");
              if(ccard){
                ccard.scrollIntoView(true);
              }
              let opt1 = optp.querySelector('div[role="button"]');
//              console.log("opt1",opt1);
              //这个应该没有用
              if(!opt1 ) {
                opt1 = optp.querySelector('div[role="button"]');
              }
              if (opt1) {
                  console.log("editGYMAuto",editGYMAuto);
                  if(editGYMAuto == "true") {
                      opt1.click();
                  }
                console.log("map click!");
              }
            },1000);
        }

      //滚回顶部
      setTimeout(function(){
        var conpan = document.querySelector('mat-sidenav-content[class="mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100"]');
        if(conpan)
        {
          conpan.scrollTo({top:0,left:0,behavior:'smooth'});
        }
      },1000);
      return ret;
    }
    //新po打分
    function commitScoreNew(portalData1,loc)
    {
        let creviewdata = JSON.parse(localStorage.getItem(portalData1.id));
        /*if(creviewdata!=null){
            let rdata = eval("(" + creviewdata[creviewdata.length - 1] + ")");
            if(rdata.rejectReasons || rdata.duplicate ){
                createNotify("找到审核记录："+portalData1.title, {
                    body: rdata.duplicate ? "重复po" : rdata.rejectReasons[0],
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: false
                });
            }
        } else {*/
    //    if(portalData1.indexOf())
        let iscore = "";
        const optpmap = document.querySelector("nia-map");
        if (optpmap) {
            optpmap.scrollIntoView(true);
        }
        const ratingElementParts = document.getElementsByClassName("wf-review-card");
        var iram1,iram2,iram3;
        if (loc=="池中"){iram1=0;iram2=0;}
        if (loc=="本地"){iram2=Math.floor(Math.random()*100);iram1=0;}     //本地，随机数1-100 90% 5/6/7必选一个，选中10%no/90%dont know
        //外地 随机1-100 90% 5/6/7必选一个，选中10%no/90%dont know; 30%选中第二个，选中10%no/90%dont know
        if (loc=="外地"){iram3=Math.floor(Math.random()*100);iram2=Math.floor(Math.random()*100);iram1=Math.floor(Math.random()*100);}
        //console.log("loc : "+loc+" iram1 : "+iram1 + " iram2 : "+iram2 + " iram3 : "+iram3);
        //适当1
        if (iram1>0 & iram1<4){
            if(document.querySelector('#appropriate-card')) {
                let appcard = document.querySelector('#appropriate-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#appropriate-card')) {
                let appcard = document.querySelector('#appropriate-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        } //适当
        //安全2
        if(iram1>3 & iram1<7){
            if(document.querySelector('#safe-card')) {
                let appcard = document.querySelector('#safe-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#safe-card')) {
                let appcard = document.querySelector('#safe-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        }//安全
        //准确3
        if(iram1>6 & iram1<10){
            if(document.querySelector('#accurate-and-high-quality-card')) {
                let appcard = document.querySelector('#accurate-and-high-quality-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#accurate-and-high-quality-card')) {
                let appcard = document.querySelector('#accurate-and-high-quality-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        }//准确
        //永久4
        if(iram1>9 & iram1<13){
            if(document.querySelector('#permanent-location-card')) {
                let appcard = document.querySelector('#permanent-location-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#permanent-location-card')) {
                let appcard = document.querySelector('#permanent-location-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        }//永久
        //社交5  5-no    1-3 34-37  5-不知道  4-33 38-67
        if((iram2>0 & iram2<7) || (iram3>0 & iram3<3)){
            if(document.querySelector('#socialize-card')) {
                let appcard = document.querySelector('#socialize-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[2];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="N";
        } else if ((iram2>18 & iram2<43) || (iram3>3 & iram3<14))
        {
            if(document.querySelector('#socialize-card')) {
                let appcard = document.querySelector('#socialize-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#socialize-card')) {
                let appcard = document.querySelector('#socialize-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        }//社交
        //运动6 6-no  34-36 68-70  6-不知道 37-67 71-99
        if( (iram2>6 & iram2<13)  || (iram3>33 & iram3<36)) {
            if(document.querySelector('#exercise-card')) {
                let appcard = document.querySelector('#exercise-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[2];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="N";
        } else if ( (iram2>45 & iram2<69) || (iram3>36 & iram3<48))
        {
            if(document.querySelector('#exercise-card')) {
                let appcard = document.querySelector('#exercise-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#exercise-card')) {
                let appcard = document.querySelector('#exercise-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        }
        //探索7 7-no  68-70 1-3    7-不知道 71-99 4-33
        if( (iram2>12 & iram2<19)  || (iram3>67 & iram3<70) ) {
            if(document.querySelector('#explore-card')) {
                let appcard = document.querySelector('#explore-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[2];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="N";
        } else if ( (iram2>72 & iram2<97) || (iram3>70 & iram3<82) )
        {
            if(document.querySelector('#explore-card')) {
                let appcard = document.querySelector('#explore-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[3];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="D";
        } else
        {
            if(document.querySelector('#explore-card')) {
                let appcard = document.querySelector('#explore-card');
                if(appcard.querySelectorAll("button")){
                    let tmpbtn=appcard.querySelectorAll("button")[1];
                    if(tmpbtn.className.indexOf("is-selected")<0){
                        tmpbtn.click();
                    }
                }
            }
            iscore+="Y";
        }
        //            } catch(err) { console.log(err);};

        //分类,全部选否
        const opts = document.querySelectorAll('mat-button-toggle');
        for (let i = 0; i < opts.length; i++) {
            //                console.log(opts[i]);
            if (!opts[i].classList.contains('mat-button-toggle-checked')) {
                opts[i].querySelector('button').click();
                //                break;
            }
        }
        //滚回顶部
        var conpan = document.querySelector('mat-sidenav-content[class="mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100"]');
        if(conpan)
        {
            conpan.scrollTo({top:0,left:0,behavior:'smooth'});
        }
        return iscore;
    }
    //打分，调用图片、编辑、新po
    function commitScore(portalData1,loc)
    {
        if(portalData1.type=="NEW"){
            return commitScoreNew(portalData1,loc);
        }
        if(portalData1.type=="EDIT"){
            return commitScoreEdit(portalData1,loc);
        }
        if(portalData1.type=="PHOTO"){
            return commitScorePhoto(portalData1,loc);
        }
    }

    //判断是否需暂停
    function getPortalStatus(portal,loc){
        let creviewdata = JSON.parse(localStorage.getItem(portal.id));
        if(creviewdata!=null){
            let rdata = eval("(" + creviewdata[creviewdata.length - 1] + ")");
            if(rdata.rejectReasons || rdata.duplicate ){
                createNotify("找到审核记录："+portal.title, {
                    body: rdata.duplicate ?? rdata.rejectReasons,
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: false
                });
            } else {
                return false;
            }
        } else {
            if (gpausePortal.indexOf(portal.title)>=0)
            {
                createNotify(portal.title, {
                    body: gpausePortalString[gpausePortal.indexOf(portal.title)],
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: true
                });
            } else
            {
                if( (portal.type=="EDIT") & (loc=="池中") )
                {
                    if(editGYMAuto == "true") {
                        createNotify(portal.title, {
                            body: "池中挪po，请注意",
                            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                            requireInteraction: true
                        });
                        return true;
                    } else {
                        createNotify(portal.title, {
                            body: "池中挪po，自动选中",
                            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                            requireInteraction: false
                        });
                        return false;
                    }
                } else
                {
                    return false;
                }
            }
            return true;
        }
    }
    //池中、本地、外地判断 返回1：池中；2：本地；3：外地；0：无
    function getLocation(portal){
        let ibaserate=null;
        //池中池外地址判断
        if (privatePortal.indexOf(portal.title)>0 || gpausePortal.indexOf(portal.title)>=0){
            ibaserate="池中"; //池中
        } else if(portal.type=="NEW")
        {
            if( portal.streetAddress.indexOf("Shen Yang")>0 || portal.streetAddress.indexOf("Liao Ning")>0
               || portal.streetAddress.indexOf("Ji Lin")>0 || portal.streetAddress.indexOf("Shenyang")>0
               || portal.streetAddress.indexOf("通化市")>0 || portal.streetAddress.indexOf("吉林省")>0
               || portal.streetAddress.indexOf("Tonghua")>0 || portal.streetAddress.indexOf("Tong Hua")>0
               || portal.streetAddress.indexOf("Liaoning")>0 || portal.streetAddress.indexOf("辽宁省")>0
              ){
                ibaserate="本地"; //本地
            }
            else
            {
                ibaserate="外地"; //外地
            }
        } else {
            //console.log(portal);
        }
        var i;
        //池中池外经纬度判断
        for (i=0;i<private.length;i++){
            if(portal.lat>private[i][0]-private[i][2]/100000 & portal.lat<private[i][0]+private[i][2]/100000 & portal.lng>private[i][1]-private[i][3]/100000 & portal.lng<private[i][1]+private[i][3]/100000)
            {ibaserate="池中";
            }
        }
        return ibaserate;
    }

    //在审核页review显示审过的po
    function showReviewedReview()
    {
        try{
            const retitle = document.getElementById("latestpo");
            //    console.log("retitle",retitle);
            if( !retitle){
                let tmpmissionlist = missionlist;
                let prpo1 = JSON.parse(localStorage.getItem('Reviewed1'));
                //console.log(prpo1);
                //console.log(prpo[0]);
                let stmp =" ";
                //console.log(prpo.length);
                let icnt=0;
                let userlist=localStorage[userEmail+"user"];
                if(!userlist) userlist="";
                if (prpo1!=null){
                    //生成 ：最近审的5个po / 任务po
                    for(let i=prpo1.length-1;i>=0;i--){
                        let strarr = prpo1[i];
                        try {
                            while(strarr.indexOf("undefined")>0){
                                strarr = strarr.replace("undefined","0");
                            }
                            while(strarr.indexOf('""')>0){
                                strarr = strarr.replace('""','"');
                            }
                            while(strarr.indexOf('":","')>0){
                                strarr = strarr.replace('":","','":"","');
                            }
                            //console.log(strarr);
                            let stmparr = eval("(" + strarr + ")");
                            if((userlist.indexOf(stmparr.user)>=0 || stmparr.user==userEmail)){
                                //最近审的5个po
                                if(icnt<recentPo){
                                    stmp += stmparr.title+"/";
                                    //if (icnt>=5) break;
                                }
                                icnt++;
                                //任务  //0名称,1位置,2开始,3类型,4已审,5时间
                                //console.log(tmpmissionlist);
                                for(let k=0;k<tmpmissionlist.length;k++){
                                    if(stmparr.title==tmpmissionlist[k][0]){
                                        if(tmpmissionlist[k][3]!="true"){ //第一条匹配的
                                            if(new Date(stmparr.dt) >= new Date(tmpmissionlist[k][5]+" 00:00:00")){ //进审po池子后审到的
                                                tmpmissionlist[k][3]="true";tmpmissionlist[k][4]="true"; //标记已经找到;审过了
                                            }
                                        }
                                    }
                                }
                            }
                        } catch(e) {
                            console.log(e);
                        }
                    }
                }
                //console.log(stmp);
                //生成 ：三种任务po归类 ：待完成2|已完成|未进池|已终止4
                //<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+missionlist1[k][0]+".png' target='_blank'>"+missionlist1[k][0]+"</a>
                let tmmiss1="";let tmmiss2="";let tmmiss3="";let tmmiss4="";
                for (let j=0;j<tmpmissionlist.length;j++){
                   if(tmpmissionlist[j][6]=="ok"){
                        tmmiss4+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+tmpmissionlist[j][0]+".png' target='_blank'>"+tmpmissionlist[j][0]+"</a>]";
                    } else if(tmpmissionlist[j][4]=="✓" || tmpmissionlist[j][4]=="true"){
                        tmmiss1+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+tmpmissionlist[j][0]+".png' target='_blank'>"+tmpmissionlist[j][0]+"</a>]";
                        //                    tmmiss1+="["+tmpmissionlist[j][0]+"]";
                   } else if (tmpmissionlist[j][2]=="false"){
                        tmmiss3+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+tmpmissionlist[j][0]+".png' target='_blank'>"+tmpmissionlist[j][0]+"</a>]";
                    } else {
                        tmmiss2+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+tmpmissionlist[j][0]+".png' target='_blank'>"+tmpmissionlist[j][0]+"</a>]";
                        //                    tmmiss2+="["+tmpmissionlist[j][0]+"]";
                    }
                }
                //任务完成，给出消息，决定是否暂停                      待开发
              if(tmmiss2==""){ //Mission over
              }
              let appreview = document.querySelector("app-review");
              if(appreview){
                const dva=document.createElement("div");
                dva.className="userclass missionpo";
                dva.id="missionpo";
                dva.textContent="";
                appreview.insertBefore(dva,appreview.firstChild);
                  if(missiondisplay == "true"){
                      $(".userclass.missionpo").replaceWith(
                          "<font size=3><div class='userclass missionpo' id='missionpo'>【待完成】"+tmmiss2+"<p>【已完成】"+tmmiss1+"<p>【未进池】"+tmmiss3+"<p>【已终止】"+tmmiss4+"</div></font>"+
                          "<font size=3><div class='userclasss latestpo' id='latestpo'>【已审po】"+stmp+"</div></font><div class='wf-page-header__title ng-star-inserted' ></div><p>");
                  } else {
                      $(".userclass.missionpo").replaceWith(
                          "<font size=3><div class='userclass missionpo' id='missionpo'></div></font>"+
                          "<font size=3><div class='userclasss latestpo' id='latestpo'>【已审po】"+stmp+"</div></font><div class='wf-page-header__title ng-star-inserted' ></div><p>");
                  }
              }
            } ;
        } catch (e) {
            console.log("reviewShowErr",e);
        }
    }

    //首页home显示用户审过的po
    function showReviewedHome()
    {
        try{
            var strarr ="";
            var stmparr=[];
            //在首页显示池内已审po的表格
            var prpo = [];
            if(!userEmail)
            {
                //      userEmail=getUser();  //会引起promise错误
            }
            let cbxmiss = localStorage["cbxmission"];
            $(".wf-page-header__title.ng-star-inserted").replaceWith("<div class='placestr'><font size=5>"+userEmail+"</font></div>"
                                                                     //+"<div><font size=5>skey:"+
                                                                     //"<input type='text' id='sskey' name='sskey' required minlength='35' maxlength='35' size='45' value="+skey+"></input>"+
                                                                     //"<button class='wf-button' onclick=saveKey()>保存</button></font></div>"+
                                                                     //"<a href='https://lbs.qq.com/dev/console/application/mine' target='_blank'>申请key</a>"
                                                                    );
            $(".showcase-gallery").replaceWith(
                 "<div><font size=5>任务  ||  </font><input type='checkbox' id='cbxmission' onclick=saveMission()>任务完成自动暂停(开发中)</input></div><div id='missionPortal1'></div>"
                 +"<div id='idlbfollow'></div><br><div><font size=5>跟审记录</font></div><div id='idfollow'></div>"
                 +"<div id='idlbupload'></div><br><div><font size=5>上传记录</font></div><div id='idupload'></div><br>"
                 +"<div><font size=5>池中已审</font></div><div id='privatePortal1'></div>"
                 +"<br><div><font size=5>池外已审</font></div><div id='privatePortal2'></div>"
            );

            let sftitle="<table style='width:100%'><thead><tr><th style='width:30%'>ID</th><th style='width:15%'>名称</th><th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:30%'>跟审情况</th></thead>";
            let sfdetail = "";
            let slocalfollow = [];
            if(localStorage.getItem(userEmail+"follow")) slocalfollow = JSON.parse(localStorage.getItem(userEmail+"follow"));
            //console.log(slocalfollow);
            if(slocalfollow.length>0){
                sfdetail+="<tbody>";
                //console.log(slocalfollow[0]);
                for (let i=slocalfollow.length - 1;i>=0;i--){
                    sfdetail+="<tr><td>"+slocalfollow[i].id+"</td><td>"+slocalfollow[i].title+"</td><td>"+slocalfollow[i].lat+"</td><td>"+slocalfollow[i].lng+"</td><td>"+slocalfollow[i].review+"</td></tr>";
                }
                sfdetail+="</tbody></table>";
            }
            $("#idfollow").replaceWith(sftitle+sfdetail);

            let sutitle="<table style='width:100%'><thead><tr><th style='width:30%'>ID</th><th style='width:15%'>名称</th><th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:30%'>审核情况</th></thead>";
            let sudetail = "";
            let slocalupload = [];
            if(localStorage.getItem(userEmail+"upload")) slocalupload = JSON.parse(localStorage.getItem(userEmail+"upload"));
            //console.log(slocalupload);
            if(slocalupload.length>0){
                sudetail+="<tbody>";
                for (let i=slocalupload.length - 1;i>=0;i--){
                    sudetail+="<tr><td>"+slocalupload[i].id+"</td><td>"+slocalupload[i].title+"</td><td>"+slocalupload[i].lat+"</td><td>"+slocalupload[i].lng+"</td><td>"+slocalupload[i].review+"</td></tr>";
                }
                sudetail+="</tbody></table>";
            }
            $("#idupload").replaceWith(sutitle+sudetail);

            if(cbxmiss){
                if(cbxmiss=="true"){
                    let obj = document.getElementById("cbxmission");
                    obj.checked = true;
                }
            }
            let smis="<table style='width:100%'><thead><tr><th style='width:20%'>名称</th><th style='width:10%'>通过</th><th style='width:20%'>位置</th><th style='width:10%'>类型</th><th style='width:10%'>开审</th><th style='width:10%'>已审</th><th style='width:25%'>时间</th></tr></thead>";
            let smistmp="";let sstmp="";let ssok="";
            let missionlist1 = missionlist;
            let usernamelist=localStorage[userEmail+"user"];
            if (!usernamelist) usernamelist="";
            smistmp=smis+"<tbody>";
            //           console.log(missionlist);

            prpo = JSON.parse(localStorage.getItem('Reviewed1'));
            //           console.log(prpo);
            var stmp = "<table style='width:100%'><thead><tr><th style='width:20%'>用户</th><th style='width:15%'>名称</th><th style='width:10%'>类型</th><th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:15%'>打分</th><th style='width:40%'>时间</th></tr></thead>";
            if (prpo!=null){
                stmp+="<tbody>";
                for(var i=prpo.length-1;i>=0;i--){
                    //               console.log(prpo[i]);
                    strarr = prpo[i];
                    try {
                        while(strarr.indexOf("undefined")>0){
                            strarr = strarr.replace("undefined","0");
                        }
                        while(strarr.indexOf('""')>0){
                            strarr = strarr.replace('""','"');
                        }
                        while(strarr.indexOf('":","')>0){
                            strarr = strarr.replace('":","','":"","');
                        }
                        stmparr = eval("(" + strarr + ")");
                        if(stmparr.score.length==7){
                            stmparr.score = stmparr.score.replace(/5/g,"Y");
                            stmparr.score = stmparr.score.replace(/3/g,"D");
                            stmparr.score = stmparr.score.replace(/1/g,"N");
                        }
                        //                 console.log(JSON.parse(prpo[i]));
                        //                console.log(stmparr);
                        //          console.log(stmparr.title,stmparr.dt);
                      if (prpo.length-1 - i <= privatePortalDisplay1 ) {
                        stmp+="<tr><td>"+stmparr.user+"</td><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
                      }
                        //          console.log(usernamelist);console.log(stmparr.user);
                        if(usernamelist.indexOf(stmparr.user)>=0 || stmparr.user==userEmail){
                            for(let k=0;k<missionlist1.length;k++){
                                if (missionlist1[k][0]==stmparr.title){  //名称,通过，位置,开始,类型,已审,时间
                                    if(new Date(stmparr.dt)){
                                        if(new Date(missionlist1[k][5]) <= new Date(stmparr.dt)){
                                            //                         console.log("missionlist1[k][0]:"+missionlist1[k][0]+" stmparr.title:"+stmparr.title);
                                            missionlist1[k][1] =stmparr.lat+","+stmparr.lng;
                                            missionlist1[k][3] = stmparr.type;
                                            missionlist1[k][4] = "✓";
                                            missionlist1[k][5] = stmparr.dt;
                                        }} else {
                                            missionlist1[k][4] = "✗";
                                            missionlist1[k][5] = "";
                                        }
                                }
                            }
                        }
                    } catch(err) {
                        console.log(err);
                    }
                }
                for(let k=0;k<missionlist1.length;k++){
                    if (missionlist1[k][2]=="true") {sstmp="✓"} else {sstmp="✗";};
                    if(missionlist1[k][6]=="ok"){ssok="✓"} else {ssok="";};
                    smistmp+="<tr><td><a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+missionlist1[k][0]+".png' target='_blank'>"+missionlist1[k][0]+"</a></td><td>"+ssok+"</td><td>"+missionlist1[k][1]+"</td><td>"+missionlist1[k][3]+"</td><td>"+sstmp+"</td><td>"+missionlist1[k][4]+"</td><td>"+missionlist1[k][5]+"</td></tr>";
                }
                smistmp+="</tbody></table>";
                stmp+="</tbody></table>";
                //    console.log("privatePortal1",$("#privatePortal1"));
                $("#missionPortal1").replaceWith(smistmp);
                $("#privatePortal1").replaceWith(stmp);
                //      console.log("stmp",stmp);
                //    console.log("privatePortal1",$("#privatePortal1"));
            }
            //       }
        } catch(e){skey="";console.log(e);}

        prpo = JSON.parse(localStorage.getItem('Reviewed2'));
        //       console.log(prpo);
        //       console.log(prpo[0]);
        stmp = "<table style='width:100%'><thead><tr><th style='width:20%'>用户</th><th style='width:15%'>名称</th><th style='width:10%'>类型</th><th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:15%'>打分</th><th style='width:40%'>时间</th></tr></thead>";
        if (prpo!=null){
            stmp+="<tbody>";
            //           console.log(prpo.length);
            for(i=prpo.length-1;i>=0;i--){
                strarr = prpo[i];
                try{
                    while(strarr.indexOf("undefined")>0){
                        strarr = strarr.replace("undefined","0");
                    }
                    while(strarr.indexOf('""')>0){
                        strarr = strarr.replace('""','"');
                    }
                    while(strarr.indexOf('":","')>0){
                        strarr = strarr.replace('":","','":"","');
                    }
                    //        console.log(strarr);
                    stmparr = eval("(" + strarr + ")");
                    if(stmparr.score.length==7){
                        stmparr.score = stmparr.score.replace(/5/g,"Y");
                        stmparr.score = stmparr.score.replace(/3/g,"D");
                        stmparr.score = stmparr.score.replace(/1/g,"N");
                    }
                    //console.log(JSON.parse(prpo[i]));
                    stmp+="<tr><td>"+stmparr.user+"</td><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
                    if (prpo.length-1 - i > privatePortalDisplay2 ) {
                        break;
                    }
                } catch (err) {
                    console.log(err);
                }
            }
            stmp+="</tbody></table>";
            $("#privatePortal2").replaceWith(stmp);
            //       console.log(prpo[0].title);
        }
    }

    //css
    (function() {
        const css = `
          .clusertop {
              margin-left: 2em;
              padding-top: 0.3em;
              text-align: left;
              display: flex;
              justify-content: flex-start;
              float: left;
          }
          .txtcenter {
            margin-left: 0em;
            text-align : center;
          }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        document.querySelector('head').appendChild(style);
    })()

    // 滚动到页面顶部
    function scrollToTop() {
        window.scrollBy({
            top: 0,
            behavior: 'smooth'
        });
    };
    // 滚动到页面底部
    function scrollToBottom() {
        window.scrollBy({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    };

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

    function userNotice($title, $options) {
        console.log($title);
        console.log($options);
        let notification = new Notification($title, $options);
        console.log(notification);
        notification.onshow = function (event) {
        };
        notification.onclose = function (event) {
        };
        notification.onclick = function (event) {
            notification.close();
            mywin.focus();
        };
        console.log(notification);
        return notification;
    }

    //标题闪烁，并记录是否已经有消息
    class MessageNotice {
        timer = undefined;
        title = document.title;
        timelist = [];
        count = 0;
        alertwindow=undefined;

        alertShow(){
            this.alertwindow="Displayed";
            this.show();
        }
        show() {
            if(!this.timer){
                this.timer = setInterval(() => {
                    if (this.count % 2 ==0 ) {
                        document.title="【提示】" + this.title;
                    } else {
                        document.title="【.......】" + this.title;
                    }
                    this.count++;
                },400)
                this.timelist.push(this.timer);
            }
        }

        stop() {
            this.alertwindow=undefined;
            if ( this.timer) {
                /*       this.timelist.forEach((item,index)=>{
        clearInterval(this.timer);
      }) */
                //       this.timer = undefined;
                this.count = 0;
                this.timelist = [];
                document.title = this.title;
            }
        }
    }
    const messageNotice = new MessageNotice();

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
