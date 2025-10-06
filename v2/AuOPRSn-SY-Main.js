// ==UserScript==
// @name         AuOPRSn-SY-Main
// @namespace    AuOPR
// @version      6.0.6
// @description  try to take over the world!
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @connect      work-wayfarer.tydtyd.workers.dev
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nianticlabs.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==
(function() {
    //变量区
    let mywin = window;
    //如果任务中没有，可以修改此处应急，遇到下列名称的po时，会当成池中po进行审核
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
    let missiondisplay = "true";
    let missionGDoc = []; //从google doc读取的任务列表
    let missionlist=[]; //0-title;1-lat,lng;2-status:voting;3-types:新增/编辑/图片;4-:true/false本用户是否审核;5-submitterdate:yyyy-mm-dd;6-status=accept:ok
                        //7-lat;8-lng;9-submitter:email;10-:portal ID;11-moveoptions+moveplace:1-10 11-20;12-:开审日期 yyyy-mm-dd
    let privatePortal = ["占位po"];
    let editGYMPhoto = ["重型皮带轮"];//不再使用，将同commitScorePhoto一并删除
    //早期有错误无法审核的po
    let errPortal = ["b7a1c45e923048e0be225bbc264f9161","08196910e908e2613194624f7c04a46e"];

    let tryNumber = 10;
    let expireTime = null;
    let reviewTime = 20;  //审po时间为20分钟，用于倒计时
    let autoReview = null;
    let reviewPortalAuto = "true";
    let editGYMAuto = "true";//不再使用，删除时需与commitScoreEdit及监听XMLHttpRequest里一并删除
    let postPeriod=[25,30];  //自动提交前倒计时，将在此时间内随机生成一个，单位：秒
    let postTimeoutLimit = 60;//剩余时间小于postTimeoutLimit时将强制提交，单位：秒
    //let submitCountDown = null;
    let userID = null;
    let userEmail = null;//用户邮箱，在加载时从网络读取，用于识别当前用户，并做为审po关键标识用于审核、更新和保存
    let performance = null;//用户评价，展示用
    let submitButtonClicked = false;
    let scoreAlready = false;
    let saveportalcnt1 = 500;  //本地保存池中审po数量，超过此数量将不保存，先进先出原则
    let saveportalcnt2 = 500;  //本地保存池外审po数量，超过此数量将不保存，先进先出原则
    let followPortalDisplay = 30;    //首页显示的跟审数量
    let uploadPortalDisplay = 30;    //首页显示的上传数量
    let privatePortalDisplay1 = 50;  //首页列表中显示池中已审po数量
    let privatePortalDisplay2 = 50;  //首页列表中显示非池已审po数量
    let recentPo = 10;//首页显示最近审过的池中po数量
    let portalData = null;//当前审核的portal数据
    //VIP区，此区内的portal将无条件五星，格式为：中心点纬度,中心点经度,纬度半径(1/10000),纬度半径(1/10000)
    let private=[[41.7485825,123.4324825,230,380],[41.803847,123.357713,910,920],[42.2828685,125.738134,3408,5517],[41.755547,123.288777,940,1140],[41.81979911, 123.25708028,910,920],[41.810820,123.376373,547,1036]];
    let timer = null;
    let ttm = null;

    let bNextAuto = true;//下一个是否自动，由用户设置
    if(localStorage.bnextauto) {
        bNextAuto = localStorage.bnextauto;
    }
    let needCaptcha = false;
    if(localStorage.captchasetting){
        needCaptcha = localStorage.captchasetting;
    }
    //在cloudflare中上传的链接
    let surl='https://dash.cloudflare.com/api/v4/accounts/6e2aa83d91b76aa15bf2d14bc16a3879/r2/buckets/warfarer/objects/';
    let durl="https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev";
    //let cookie = localStorage.cfcookie;//上传权限  使用cloudflare的worker后，不再使用cookie
    let userEmailList1 = [];//审核员列表，用于显示
    let userEmailList2 = [];//审核员列表，用于显示
    //上传任务po的Google Apps Scripts链接
    let dURL = "https://script.google.com/macros/s/AKfycbwlUEhAm4l8kI617UcNDw2CU7xFR3GGPAMUECt6L5RV8cs4KELQsC6siB_7xwk8JTzpMg/exec";

    const loginNotice = null;

    //首次运行显示警告
    let iWarning=0;
    if(localStorage.Warning) {
        iWarning = localStorage.Warning;
    }
    if (iWarning == 0) {
        createNotify("欢迎", {
            body: "请自行承担后果(包括被N社踢出)!",
            icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
            requireInteraction: false
        });
        localStorage.setItem("Warning",1);
    }

    console.log("mywin",mywin.location);
    mywin.onload = async function() {
        //createStatusPanel();
        //console.log("onload","getMission");
        // 先获取用户信息并等待完成
        const restext = await getUser();

        // 处理用户信息
        userEmail = restext.result.socialProfile.email;
        performance = restext.result.performance;

        if (userEmail) {
            localStorage.setItem("currentUser", userEmail);
            document.title = userEmail;
        }

        console.log("最终获取到的用户邮箱：", userEmail);
        missionGDoc = JSON.parse(localStorage.missionGDoc);
        //console.log(mywin.location.href);
        //如果是在展示页，那么获取用户的动作在XMLHttpRequest-showReviewedHome中完成
        if(mywin.location.href != "https://wayfarer.nianticlabs.com/new/showcase")
        {
            await getMissionFromGoogleDoc();
        }
    }

    // 配置 - CloudFlare
    const CONFIG = {
        WORKER_URL: 'https://work-wayfarer.tydtyd.workers.dev',
        SECRET_KEY: 'warfarer-review', // 与Worker中相同的密钥
        DEFAULT_FOLDER: 'defaultpath/' // 本地指定的存储路径，可随时修改
    };
    // 上传数据到R2   uploadDataToR2(folderPath:路径 , fileName:文件名 , data:json数据)
    function uploadDataToR2(folderPath,fileName,data) {
        try {
            console.log(`正在上传数据:${folderPath}`);
            GM_xmlhttpRequest({
                method: 'POST',
                url: CONFIG.WORKER_URL,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Secret-Key': CONFIG.SECRET_KEY
                },
                data: JSON.stringify({
                    folderPath: folderPath,
                    fileName: fileName,
                    data: data
                }),
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success) {
                            console.log(`数据上传成功: ${result.fullPath}`);
                        } else {
                            console.log(`上传失败: ${result.error || result.details}`);
                        }
                    } catch (e) {
                        console.log(`解析响应失败: ${e.message}`);
                    }
                },
                onerror: function(error) {
                    console.log(`解析响应失败: ${error.message}`);
                }
            });
        } catch (e) {
            console.log(`解析响应失败: ${e.message}`);
        }
    }
    // 列出R2中的文件
    function listR2Files(folderPath) {
        const listContainer = document.getElementById('fileList');

        if (!folderPath) {
            showStatus('请输入文件夹路径', true);
            return;
        }

        //listContainer.innerHTML = '<div style="text-align: center; color: #64748b;">加载中...</div>';
        //showStatus('正在加载文件列表...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: `${CONFIG.WORKER_URL}/list?prefix=${encodeURIComponent(folderPath)}`,
            headers: {
                'X-Secret-Key': CONFIG.SECRET_KEY
            },
            onload: function(response) {
                try {
                    const result = JSON.parse(response.responseText);
                    if (result.success) {
                        if (result.fileCount === 0) {
                            listContainer.innerHTML = '<div style="color: #64748b;">该路径下没有文件</div>';
                            showLog('加载完成，未找到文件',false);
                            return;
                        }

                        // 生成文件列表
                        let html = '<table style="width: 100%; border-collapse: collapse;">';
                        result.files.forEach(file => {
                            const fileName = file.name.split('/').pop();
                            html += `
                                <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer;"
                                    onmouseover="this.style.backgroundColor='#f8fafc'"
                                    onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding: 8px 0;">
                                        <span data-file="${file.name}" class="file-link">${fileName}</span>
                                    </td>
                                    <td style="text-align: right; font-size: 12px; color: #64748b;">
                                        ${formatSize(file.size)}
                                    </td>
                                    <td style="text-align: right; font-size: 12px; color: #64748b; padding-left: 10px;">
                                        ${new Date(file.lastModified).toLocaleString()}
                                    </td>
                                </tr>
                            `;
                        });
                        html += '</table>';
                        listContainer.innerHTML = html;

                        // 绑定文件点击事件
                        document.querySelectorAll('.file-link').forEach(link => {
                            link.addEventListener('click', (e) => {
                                const fileName = e.target.getAttribute('data-file');
                                readR2File(fileName);
                            });
                        });

                        showLog(`成功加载 ${result.fileCount} 个文件` , false);
                    } else {
                        listContainer.innerHTML = `<div style="color: #dc2626;">错误: ${result.error}</div>`;
                        console.log('result',result);
                        showLog(`加载失败: ${result.error}`, true);
                    }
                } catch (e) {
                    listContainer.innerHTML = `<div style="color: #dc2626;">解析错误: ${e.message}</div>`;
                    console.log('e',e);
                    showLog(`解析响应失败: ${e.message}`, true);
                }
            },
            onerror: function(error) {
                listContainer.innerHTML = `<div style="color: #dc2626;">请求失败: ${error.message}</div>`;
                console.log('error',error);
                showLog(`连接失败: ${error.message}`, true);
            }
        });
    }
    // 读取指定的JSON文件
    function readR2File(fileName) {
        return new Promise((res, err) => {
            console.log(`正在读取文件: ${fileName.split('/').pop()}`);

            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.WORKER_URL}/read?file=${encodeURIComponent(fileName)}`,
                headers: {
                    'X-Secret-Key': CONFIG.SECRET_KEY
                },
                // 新增：打印发送的请求信息
                onsend: function() {
                    console.log('发送请求:', {
                        url: this.url,
                        headers: this.headers
                    });
                },
                onload: function(response) {
                    console.log('收到响应:', {
                        status: response.status,
                        responseText: response.responseText.substring(0, 200) // 只显示前200字符
                    });
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success) {
                            showLog(`成功读取文件: ${result.fileName.split('/').pop()}`,false);
                            res(result);
                        } else {
                            console.log('result',result);
                            showLog(`读取失败: ${result.error}`, true);
                            err(result);
                        }
                    } catch (e) {
                        console.log('e',e);
                        showLog(`解析文件内容失败: ${e.message}`, true);
                        err(e);
                    }
                },
                onerror: function(error) {
                    console.log('error',error);
                    showLog(`连接失败: ${error.message}`, true);
                }
            });
        }).catch(e => {
            showLog(`解析文件内容失败: ${e.message}`, true);
            console.log('Promise', e)});
    }

    //更新任务数据至Google DOC , sdata为单条(或多条？)的JSON数据(如：{id:11w,title:aaa})
    function saveToGDoc(sdata){
        $.ajax({
            url: dURL,
            type: "POST",
            // 核心：将对象转为 URL 编码字符串（适配 x-www-form-urlencoded 格式）
            data: $.param(sdata),
            // 核心：指定正确的 Content-Type（GAS 能自动解析该格式）
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            // 不需要禁用 processData（默认 true，$.param 已处理数据，无需额外处理）
            processData: true,
            success: function (data, status) {
                console.log("请求成功，响应数据：", data);
                // 此处可添加业务逻辑（如提示成功）
            },
            error: function (xhr, status, error) {
                console.error("请求失败：", status, "错误信息：", xhr.responseText);
                createNotify("错误", {
                    body: "更新任务失败！错误：" + xhr.responseText,
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
                    requireInteraction: false
                });
            }
        });
    };
    //从Google Doc读取任务数据，读取的数据是通过status=mission过滤的(在GAS中过滤doGet，提交或审核)，取到数据后，再确保一次进行过滤status为提交或审核
    function getMissionFromGoogleDoc() {
        // 返回 Promise 对象，包裹异步请求逻辑
        return new Promise((resolve, reject) => {
            const url = dURL + '?status=mission';
            if (!url) {
                reject(new Error("请求地址为空")); // 地址无效时触发失败
                return;
            }

            $.ajax({
                url, type: 'GET', dataType: 'text',
                success: function (data, status, header) {
                    try {
                        let markercollection = JSON.parse(data);
                        // 筛选状态为'提交'或'审核'的元素
                        let filteredMarkers = markercollection.filter(item => item.status === '提交' || item.status === '审核' );
                        console.log('Main-getGDoc', filteredMarkers);
                        missionGDoc = filteredMarkers;
                        localStorage.setItem("missionGDoc", JSON.stringify(missionGDoc));

                        // 初始化 ownerstatus 字段
                        missionGDoc.forEach(item => {
                            item.ownerstatus = "";
                        });
                        //console.log("missionGDoc", missionGDoc);

                        // 测试数据修改（保留原逻辑）
                        let testdata = filteredMarkers.filter(item => item.id === "6bf81533-aefa-471b-8eb4-54b3525e129b" );
                        if (testdata.length === 1) {
                            testdata[0].status = "通过";
                            // testSaveToDoc(testdata[0]); // 如需执行，可在这里调用
                        }

                        // 数据处理完成，触发 Promise 成功，返回处理后的数据
                        resolve(missionGDoc);

                    } catch (e) {
                        console.log(e);
                        alert("读取任务列表错误，请刷新页面，否则将无法按计划审核！");
                        reject(e); // 解析/处理失败时触发 Promise 失败
                    }
                },
                error: function (x, y, z) {
                    const errorMsg = `请求失败: ${x.status} - ${y}`;
                    console.log('Err:', errorMsg, x, z);
                    alert("读取任务列表错误，请刷新页面，否则将无法按计划审核！");
                    reject(new Error(errorMsg)); // AJAX 请求失败时触发 Promise 失败
                }
            });
        });
    }

    //测试保存数据至GAC,data为JSON数据格式
    function testSaveToDoc(data){
        saveToGDoc(data);
    }

    // 修复XMLHttpRequest封装，仅在请求完成（readyState=4）时处理响应
    function U_XMLHttpRequest(method, url) {
        return new Promise((res, err) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader("If-Modified-Since", "0");
            xhr.onreadystatechange = function() {
                // 仅在请求完全完成时处理（readyState=4）
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        res(xhr.responseText); // 成功：返回响应文本
                    } else {
                        const errorMsg = `${method}:${url} 失败（状态码：${xhr.status}）`;
                        console.log(errorMsg);
                        err(new Error(errorMsg)); // 失败：返回错误对象
                    }
                }
            };
            xhr.onerror = function() {
                const errorMsg = `${method}:${url} 网络错误`;
                console.log(errorMsg);
                err(new Error(errorMsg));
            };
            xhr.send();
        }).catch(e => {
            console.log(`${method}:${url} 捕获错误：${e.message}`);
            throw e; // 重新抛出错误，让调用方处理
        });
    }

    //监听http请求，不同的页面实现不同功能
    (function (open) {
        XMLHttpRequest.prototype.open = function (method, url) {
            //console.log(url);
            //console.log(method);
            //提示需重新登录
            if(url === "/api/v1/vault/loginconfig")
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
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
                        requireInteraction: false
                    });
                    messageNotice.alertShow();
                }
            }
            //审核，调用injectTimer
            if (url === '/api/v1/vault/review' && method == 'GET') {
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
            //提交审核，保存数据至本地(使用saveReviewtoLocal)，并重置timer
            if (url === '/api/v1/vault/review' && method == 'POST') {
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    //console.log(data);
                    //clearInterval(timer);
                    mywin.clearInterval(timer);
                    timer = null;
                    //console.log(portalData);
                    saveReviewtoLocal(portalData,data);
                    //submitCountDown = null;
                    return send.apply(_this,data);
                    //saveReviewData(data);
                }
            }
            //https://wayfarer.nianticlabs.com/api/v1/vault/review/skip  //7e221f605682750b87a54d393063b9c5
            //略过时，重置timer
            if (url === '/api/v1/vault/review/skip' && method == 'POST'){
                let send = this.send;
                let _this = this;
                this.send = function (...data) {
                    //console.log("skip",data);
                    mywin.clearInterval(timer);
                    timer = null;
                    //console.log("skip",portalData);
                    return send.apply(_this,data);
                }
            }
            //初始的时候，保存当前用户的email
            if (url === '/api/v1/vault/profile' && method == 'GET') {
                if(!userEmail) {
                    userEmail = getUser();
                }
                this.addEventListener('load', getUserList, false);
            }
            //首页，显示审po列表
            if (url === '/api/v1/vault/home' && method == 'GET') {
                //console.log(loginNotice);
                this.addEventListener('load', showReviewedHome, false);
            }
            open.apply(this, arguments);
        };
    })(XMLHttpRequest.prototype.open);

    //循环10次，用于等待某项加载完成
    const awaitElement = get => new Promise((resolve, reject) => {
        let triesLeft = 10;
        const queryLoop = () => {
            const ref = get();
            if (ref) resolve(ref);
            else if (!triesLeft) reject();
            else setTimeout(queryLoop, 250);
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
                //console.log(json);
                if(bNextAuto){
                    autoReview = "true";
                    localStorage.setItem("autoReview", autoReview );
                } else
                    autoReview = localStorage.autoReview;
                portalData = json.result;
                //console.log("injectTimer:needCaptcha",needCaptcha);
                if (json.captcha) {
                    if(needCaptcha === "true"){
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
                if(json === null) {
                    console.log("injectTimer:json为空",json);
                    return;
                }
                if(portalData === null) {
                    console.log("injectTimer:portalData为空",portalData);
                    return;
                }
                console.log('portalData',portalData);
                uploadReviewMark(portalData);  //上传数据至用户打卡
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
                let dd = document.getElementById("title-description-card").parentNode;
                let dd1 = dd.nextSibling;
                let dd2 = dd1.nextSibling;
                dd.parentNode.insertBefore(dd1,dd);
                dd.parentNode.insertBefore(dd2,dd);
                let lbtitle = document.querySelector('.review-new.ng-star-inserted').childNodes[0].childNodes[0];
                if(lbtitle) lbtitle.textContent = portalData1.title;
            }
            document.querySelector("h2[class='wf-page-header__title ng-star-inserted']").replaceWith("");
            let liddvall = document.getElementById("iddvall");
            let ltimerlabel2 = document.getElementById("idltimerlabel");
            let countdown = document.getElementById("idcountdown");
            //console.log("countdown",countdown);
            if(countdown === null){  //标签不存在则创建
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

                if(portalData1.type === "NEW") {updateAddress(divaddr);}
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
                        //console.log("ttm",autoReview);
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
                        //console.log(scoreAlready);
                        if (!scoreAlready){
                            setTimeout(function(){
                                showReviewedReview();
                            },1000);
                            let score = commitScore(portalData1,loc);
                            divscore.textContent = "打分："+score;
                            scoreAlready = true;
                        }
                        //console.log(countdown);
                        //console.log(submitCountDown);
                        let tmpautoReview = localStorage.autoReview; let ilimit = reviewTime * 60 +60 ;
                        if(tmpautoReview) {
                            if(tmpautoReview == "true") {
                                ilimit = postTimeoutLimit;
                            }
                        }
                        if(Math.ceil((expiry - new Date().getTime()) / 1000) < ilimit +10 & Math.ceil((expiry - new Date().getTime()) / 1000) >= ilimit +9) {
                            createNotify("注意", {
                                body: "将到截止时间，10秒后强制提交!",
                                icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
                                requireInteraction: false
                            });
                        }
                        //console.log(Math.ceil((expiry - new Date().getTime())) < ilimit);
                        //console.log("autoReview",autoReview);
                        if(( autoReview === "true") || ( autoReview === "false" & ( (Math.ceil((expiry - new Date().getTime()) / 1000)) < ilimit)) ){
                            //console.log(( (Math.ceil((expiry - new Date().getTime()) / 1000)) < ilimit) );
                            //console.log(Math.ceil((expiry - new Date().getTime()) / 1000));
                            //console.log(ilimit);
                            //console.log(false || false);
                            if(submitCountDown <= 0){  //倒计时0，提交
                                //如果秒数负数太多，且提交按钮不可用，则reload
                                if(submitCountDown <= -60){
                                }
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
                                        //console.log("rej1",rej1);
                                        if(rej1) {//wf-button wf-split-button__main wf-button--primary
                                            let rejbutton = rej1.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                            if (rejbutton) {
                                                console.log("timer submit","适当性拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //安全拒
                                        let rej2 = document.querySelector("app-safe-rejection-flow-modal");
                                        //console.log("rej2",rej2);
                                        if(rej2) {
                                            let rejbutton = rej2.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                            if (rejbutton) {
                                                console.log("timer submit","安全拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //准确拒
                                        let rej3 = document.querySelector("app-accuracy-rejection-flow-modal");
                                        if(rej3) {
                                            let rejbutton = rej3.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                            if (rejbutton) {
                                                console.log("timer","准确拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //永久拒
                                        let rej4 = document.querySelector("app-location-permanent-rejection-flow-modal");
                                        if(rej4) {
                                            let rejbutton = rej4.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                            if (rejbutton) {
                                                console.log("timer","永久拒！");
                                                isub = true;
                                                rejbutton.click();
                                            }
                                        }
                                        //重复
                                        setTimeout(function(){
                                            if(!isub){
                                                let supcommit = document.querySelector("app-confirm-duplicate-modal");
                                                let supcommitbtn = null;
                                                if(supcommit){
                                                    //console.log(supcommit);
                                                    supcommitbtn = supcommit.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
                                                    if(supcommitbtn) {
                                                        console.log("timer submit","duplicate clicked!");
                                                        isub = true;
                                                        supcommitbtn.click();
                                                    }
                                                }
                                            }},200);
                                        setTimeout(function(){
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
                                            }},200);
                                    }
                                }
                            }
                            if(autoReview === "true") {
                                submitCountDown--;
                                //console.log("switch",autoReview);
                                dvautolabel.textContent = '自动';
                            }
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
                //console.log(arrjson);
                //      console.log(userprofile);
                //console.log(needCaptcha);
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
                                    suser+="<input type='checkbox' class='cbxusername' checked id='cbx"+i+"' value='"+userlist[i]+"'>"+userlist[i]+"</input><span>　　<span>";
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
                    //console.log("bNextAuto",bNextAuto);
                    if(bNextAuto){
                        bnext = "<p>-----------------------------------------</p><div><span>下一个自动：</span><input type='checkbox' class='cbxnextauto' id='idnextauto' checked onclick='saveNextAutoSetting()'>下一个审核是否自动</input></div>";
                    } else {
                        bnext = "<p>-----------------------------------------</p><div><span>下一个自动：</span><input type='checkbox' class='cbxnextauto' id='idnextauto' onclick='saveNextAutoSetting()'>下一个审核是否自动</input></div>";
                    }
                    let cbxcaptcha=localStorage.captchasetting;
                    //console.log(cbxcaptcha);
                    let cap ="";
                    if(cbxcaptcha=="true") {
                        cap = "<p>-----------------------------------------</p><div><span>验证设置：</span><input type='checkbox' class='cbxcaptcha' id='idcaptcha' checked onclick='saveCaptchaSetting()'>机器验证一直显示</input></div>";
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
        //console.log("switch auto",autoReview);
    }

    // 简化getUser，只负责获取和解析原始数据
    function getUser() {
        return U_XMLHttpRequest("GET", "https://wayfarer.nianticlabs.com/api/v1/vault/properties")
            .then(res => {
            //console.log("getUser 响应内容：", res);
            if (!res) {
                throw new Error("响应内容为空");
            }

            const restext = JSON.parse(res);
            console.log("getUser 解析结果：", restext);

            // 仅验证响应结构，不处理数据
            if (!restext.result?.socialProfile) {
                throw new Error("响应结构不包含socialProfile");
            }

            // 返回完整解析结果，让外部处理
            return restext;
        })
            .catch(e => {
            console.log("getUser 处理失败：", e.message);
            throw e;
        });
    }


    //上传用户审po打卡至cloudflare，第一次审到还要更新任务为已审/并加个id
    function uploadReviewMark(portaldata){
        try{
            console.log("uploadReviewMark:portaldata",portaldata);
            console.log("uploadReviewMark:missionGDoc",missionGDoc);
            if(!missionGDoc){ return;}
            let pname = null; let preview=null;
            missionGDoc.forEach(item => {
                if (item.title === portaldata.title) {
                    if(Math.abs(item.lat-portaldata.lat)<=0.001 & Math.abs(item.lng-portaldata.lng)<=0.01) {
                        pname = portaldata.title;preview=item.status;
                    }
                    if(pname === null) {return;}

                    if(portaldata.id){
                        console.log("任务po，保存用户审核打卡...");
                        //let resp1 = U_XMLHttpRequest("GET","https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/portal/portaluseremail/portal."+portaldata.id+".useremail.json")
                        let resp1 = readR2File("portal/portaluseremail/portal."+portaldata.id+".useremail.json")
                        .then(res=>{
                            //如果任务未开审，则更新任务为开审并加id
                            //console.log("preview",preview);
                            item.status = "审核";
                            item.portalID = portaldata.id;item.responsedate = formatDate(new Date(),"yyyy-MM-dd");
                            saveToGDoc(item);

                            console.log("读取用户打卡");
                            //console.log("res",res);
                            if(!res) {
                                setTimeout(function(){
                                    console.log("读取用户打卡","未找到用户打卡记录");
                                    //保存任务id :
                                    let susermark='[{"useremail":"' + userEmail +'",'
                                    + '"datetime":"'+formatDate(new Date(),"yyyy-MM-dd HH:mm:ss")+'",'
                                    +'"performance":"' + performance +'"'
                                    + "}]";
                                    //uploadFile("PUT","portal/portaluseremail/portal."+portaldata.id+".useremail.json",susermark);
                                    uploadDataToR2("portal/portaluseremail/","portal."+portaldata.id+".useremail.json",JSON.parse(susermark));
                                },1000);
                                return;
                            } else {
                                const dupload = res.content;
                                console.log("res",res);
                                //const dupload = JSON.parse(res.content);
                                for(let i=0;i<dupload.length;i++){
                                    if(dupload[i].useremail == userEmail) {
                                        console.log("存过打卡了");
                                        return;
                                    }
                                }
                                //console.log(dupload);
                                let dupdata = dupload ;
                                //dupdata.push(dupload);
                                let susermark={useremail:userEmail,datetime:formatDate(new Date(),"yyyy-MM-dd HH:mm:ss"),performance:performance};
                                dupdata.push(susermark);
                                //console.log(dupdata);
                                //console.log(JSON.stringify(dupdata));
                                //uploadFile("PUT","portal/portaluseremail/portal."+portaldata.id+".useremail.json",JSON.stringify(dupdata));
                                uploadDataToR2("portal/portaluseremail/","portal."+portaldata.id+".useremail.json",dupdata);
                            }
                        },err=>{
                            console.log(err);
                        });
                    }
                    return ; //找到一个，就不进行下一个循环
                }
            });
        } catch(e) {
            console.log(e);
        }
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
        console.log("Main-saveReviewtoLocal:",pdata);
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
            if (privatePortal.indexOf(pageData.title)>=0 || missionGDoc.some(item => item.title === pageData.title) ||
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
    //新po打分
    function commitScoreNew(portalData1,loc)
    {
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
        if(portalData1.type === "NEW"){
            return commitScoreNew(portalData1,loc);
        }
    }

    //池中、本地、外地判断 返回1：池中；2：本地；3：外地；0：无
    function getLocation(portal){
        let ibaserate=null;
        //池中池外地址判断
        if (privatePortal.indexOf(portal.title)>0 || gpausePortal.indexOf(portal.title)>=0){
            return "池中"; //池中
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
        //池中池外经纬度判断
        for (let i=0;i<private.length;i++){
            if(portal.lat>private[i][0]-private[i][2]/100000 & portal.lat<private[i][0]+private[i][2]/100000 & portal.lng>private[i][1]-private[i][3]/100000 & portal.lng<private[i][1]+private[i][3]/100000)
            {return "池中";
            }
        }
        //任务列表判断
        //console.log(`判断池中`,portal);
        missionGDoc.forEach(item => {
            //console.log(`判断池中$item`,item);
            if((item.title === portal.title || item.id === portal.id) & (Math.abs(portal.lat-item.lat)<=0.001) & (Math.abs(portal.lng-item.lng)<=0.001)){
                console.log("位置判断missionGDoc：池中");
                ibaserate = "池中";
            }
        })
        /*
        for (let i=0;i<missionlist.length;i++){
            if(missionlist[i][0]===portal.title & (Math.abs(portal.lat-missionlist[i][7])<=0.001) & (Math.abs(portal.lng-missionlist[i][8])<=0.001)){
                console.log("位置判断：池中");
                return "池中";
            }
        }*/
        return ibaserate;
    }

    //在审核页review显示审过的po
    function showReviewedReview()
    {
        if(missionGDoc.length === 0)
        {
            missionGDoc = JSON.parse(localStorage.missionGDoc);
        }
        try{
            const retitle = document.getElementById("latestpo");
            //console.log("retitle",retitle);
            if( !retitle){

                let prpo = JSON.parse(localStorage.getItem('Reviewed1'));
                //console.log('prpo',prpo);
                if (prpo!=null){
                    let strarr ="";
                    let stmparr=[];
                    for(let i=prpo.length-1;i>=0;i--){
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
                            if(stmparr.user==userEmail){
                                missionGDoc.forEach(item => {
                                    if(item.title === stmparr.title &
                                       (new Date(item.responsedate).getTime() <= new Date(stmparr.dt.slice(0,10)).getTime() + 5*24*60*60*1000 )){
                                        item.ownerstatus = true ;
                                    }
                                })
                            }
                        } catch(err) {
                            console.log(err);
                        }
                    }
                }
                prpo = JSON.parse(localStorage.getItem('Reviewed2'));
                //console.log('prpo',prpo);
                if (prpo!=null){
                    let strarr ="";
                    let stmparr=[];
                    for(let i=prpo.length-1;i>=0;i--){
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
                            if(stmparr.user==userEmail){
                                missionGDoc.forEach(item => {
                                    if(item.title === stmparr.title &
                                       (new Date(item.responsedate).getTime() <= new Date(stmparr.dt.slice(0,10)).getTime() + 5*24*60*60*1000 )){
                                        item.ownerstatus = true ;
                                    }
                                })
                            }
                        } catch(err) {
                            console.log(err);
                        }
                    }
                }

                //console.log(stmp);
                //生成 ：三种任务po归类 ：待完成2|已完成1|未进池3|已终止4
                //<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+missionlist1[k][0]+".png' target='_blank'>"+missionlist1[k][0]+"</a>
                let tmmiss1="";let tmmiss2="";let tmmiss3="";let tmmiss4="";
                missionGDoc.forEach(item => {
                    //待完成
                    console.log(item.title+':ownerstatus',item.ownerstatus);
                    if (item.status === "提交" ||item.status === "审核" ){
                        if(item.ownerstatus){
                            tmmiss1+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+item.title+".png' target='_blank'>"+item.title+"</a>]";
                        } else {
                            if(item.status === "审核"){
                                tmmiss2+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+item.title+".png' target='_blank'>"+item.title+"</a>]";
                            } else {
                                tmmiss3+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+item.title+".png' target='_blank'>"+item.title+"</a>]";
                            }
                        }
                    }
                    else {
                        if(item.submitter != userEmail)
                            tmmiss2+="[<a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+item.title+".png' target='_blank'>"+item.title+"</a>]";
                        //tmmiss2+="["+tmpmissionlist[j][0]+"]";
                    }
                })
                let appreview = document.querySelector("app-review");
              if(appreview){
                  const dva1=document.createElement("div");
                  dva1.className="userclass missionpo";
                  dva1.id="missionpo";
                  dva1.textContent="";
                  const dva2=document.createElement("div");
                  dva2.className="userclass latestpo";
                  dva2.id="latestpo";
                  dva2.textContent="";
                  appreview.insertBefore(dva2,appreview.firstChild);
                  appreview.insertBefore(dva1,appreview.firstChild);
                  if(missiondisplay == "true"){
                      $(".userclass.missionpo").replaceWith(
                          "<font size=3><div class='userclass missionpo' id='missionpo'>" +
                          "【待完成】" + tmmiss2 +
                          "<p>【未进池】" + tmmiss3 +
                          "<p>【已完成】" + tmmiss1
                          +"</div></font>");
                  }
              }
            } ;
        } catch (e) {
            console.log("reviewShowErr",e);
        }
    }

    //首页home显示用户审过的po
    async function showReviewedHome() {
        try {
            if(userEmail === null) {
                // 先获取用户信息并等待完成
                const restext = await getUser();
                // 处理用户信息
                userEmail = restext.result.socialProfile.email;
                performance = restext.result.performance;

                if (userEmail != null) {
                    localStorage.setItem("currentUser", userEmail);
                    document.title = userEmail;
                } else return;
                console.log("最终获取到的用户邮箱：", userEmail);
            }
            // 更新页面DOM
            $(".wf-page-header__title.ng-star-inserted").replaceWith(
                `<div class='placestr'><font size=5>${userEmail}</font></div>`
            );

            $(".showcase-gallery").replaceWith(`
            <div><font size=5>-任务-</font></div>
            <div id='missionPortal1'></div>
            <div id='missionuser'></div>
            <div id='idlbfollow'></div>
            <br>
            <div><font size=5>跟审记录</font></div>
            <div id='idfollow'></div>
            <div id='idlbupload'></div>
            <br>
            <div><font size=5>上传记录</font></div>
            <div id='idupload'></div>
            <br>
            <div><font size=5>池中已审</font></div>
            <div id='privatePortal1'></div>
            <br>
            <div><font size=5>池外已审</font></div>
            <div id='privatePortal2'></div>
        `);

            // 等待获取任务数据（现在处于async函数中，可安全使用await）
            await getMissionFromGoogleDoc();

            //console.log("missionGDoc.length1", missionGDoc.length);

            // 处理任务数据
            if (missionGDoc.length > 0) {
                //console.log("业务逻辑执行：", missionGDoc);
                showReviewedHome1();
            } else {
                console.log("无符合条件的任务数据");
                // 可添加无数据提示
            }

        } catch (error) {
            // 集中捕获所有可能的错误
            console.log("执行失败：", error);
            // 刷新窗口（根据实际需求决定是否保留）
            // mywin.location.reload();
        }
    }

    function showReviewedHome1()
    {
            try{
                //在首页显示池内已审po的表格
                var prpo = [];
                if(!userEmail)
                {
                    //      userEmail=getUser();  //会引起promise错误
                }

                let sftitle="<table style='width:100%'><thead><tr><th style='width:30%'>ID</th><th style='width:15%'>名称</th><th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:30%'>跟审情况</th></thead>";
                let sfdetail = "";
                let slocalfollow = [];
                if(localStorage.getItem(userEmail+"follow")) slocalfollow = JSON.parse(localStorage.getItem(userEmail+"follow"));
                //console.log(slocalfollow);
                if(slocalfollow.length>0){
                    sfdetail+="<tbody>";
                    //console.log(slocalfollow[0]);
                    let icnt = 0;if (slocalfollow.length>followPortalDisplay) icnt = slocalfollow.length - followPortalDisplay;
                    for (let i=slocalfollow.length - 1;i>=icnt;i--){
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
                    let icnt = 0;if (slocalupload.length>uploadPortalDisplay) icnt = slocalupload.length - uploadPortalDisplay;
                    for (let i=slocalupload.length - 1;i>=icnt;i--){
                        sudetail+="<tr><td>"+slocalupload[i].id+"</td><td>"+slocalupload[i].title+"</td><td>"+slocalupload[i].lat+"</td><td>"+slocalupload[i].lng+"</td><td>"+slocalupload[i].review+"</td></tr>";
                    }
                    sudetail+="</tbody></table>";
                }
                $("#idupload").replaceWith(sutitle+sudetail);

                //0:title;1:位置;2:开审;3:type;4:显示已审;5:日期;6:审结;7:lat;8:lng;9:userEmail;10:id;11:挪的方向
                let smis="<table style='width:100%'><thead><tr>"
                +"<th style='width:15%'>名称</th><th style='width:5%'>通过</th><th style='width:15%'>位置</th>"
                +"<th style='width:10%'>类型</th><th style='width:5%'>开审</th><th style='width:5%'>已审</th>"
                +"<th style='width:20%'>时间</th><th style='width:8%'>纬度</th><th style='width:8%'>经度</th>"
                +"<th style='width:14%'>挪po</th>"
                +"</tr></thead>";
                let smistmp="";let sstmp="";let ssok="";
                //console.log("start",missionlist);
                //let missionlist1 = JSON.parse(JSON.stringify(missionlist));
                let usernamelist=localStorage[userEmail+"user"];
                if (!usernamelist) usernamelist="";
                smistmp=smis+"<tbody>";
                //console.log(missionlist);

                prpo = JSON.parse(localStorage.getItem('Reviewed1'));
                //console.log(prpo);
                let stmp = "<table style='width:100%'><thead><tr>"
                +"<th style='width:20%'>用户</th><th style='width:15%'>名称</th><th style='width:10%'>类型</th>"
                +"<th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:15%'>打分</th>"
                +"<th style='width:40%'>时间</th></tr></thead>";
                if (prpo!=null){
                    let strarr ="";
                    let stmparr=[];
                    stmp+="<tbody>";
                    for(let i=prpo.length-1;i>=0;i--){
                        //console.log(prpo[i]);
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
                            //console.log(JSON.parse(prpo[i]));
                            //console.log(stmparr);
                            //console.log(stmparr.title,stmparr.dt);
                            if (prpo.length-1 - i <= privatePortalDisplay1 ) {
                                stmp+="<tr><td>"+stmparr.user+"</td><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
                            }
                            //console.log(usernamelist);console.log(stmparr.user);
                            if(usernamelist.indexOf(stmparr.user)>=0 || stmparr.user==userEmail){
                                missionGDoc.forEach(item => {
                                    if(item.title === stmparr.title & item.title === "大黄蜂"){
                                        //console.log(item.responsedate);
                                        //console.log(stmparr.dt);
                                        //console.log(new Date(item.responsedate).getTime());
                                        //console.log(new Date(stmparr.dt.slice(0,10)).getTime() - 5*24*60*60*1000 );
                                    }
                                    if(item.title === stmparr.title &
                                       (new Date(item.responsedate).getTime() <= new Date(stmparr.dt.slice(0,10)).getTime() + 5*24*60*60*1000 )){
                                        item.ownerstatus = true ;
                                    }
                                })
                            }
                        } catch(err) {
                            console.log(err);
                        }
                    }
                    stmp+="</tbody></table>";
                    //console.log("privatePortal1",$("#privatePortal1"));
                    $("#privatePortal1").replaceWith(stmp);
                    //console.log("stmp",stmp);
                    //console.log("privatePortal1",$("#privatePortal1"));
                }
                //       }

                let prpo2 = JSON.parse(localStorage.getItem('Reviewed2'));
                //console.log(prpo2);
                //console.log(prpo2[0]);
                stmp = "<table style='width:100%'><thead><tr>"
                    +"<th style='width:20%'>用户</th><th style='width:15%'>名称</th><th style='width:10%'>类型</th>"
                    +"<th style='width:10%'>纬度</th><th style='width:10%'>经度</th><th style='width:15%'>打分</th>"
                    +"<th style='width:40%'>时间</th></tr></thead>";
                if (prpo2!=null){
                    let strarr ="";
                    let stmparr=[];
                    stmp+="<tbody>";
                    //console.log(prpo2.length);
                    for(let i=prpo2.length-1;i>=0;i--){
                        strarr = prpo2[i];
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
                            //console.log(strarr);
                            stmparr = eval("(" + strarr + ")");
                            if(stmparr.score.length==7){
                                stmparr.score = stmparr.score.replace(/5/g,"Y");
                                stmparr.score = stmparr.score.replace(/3/g,"D");
                                stmparr.score = stmparr.score.replace(/1/g,"N");
                            }
                            //console.log(JSON.parse(prpo2[i]));
                            if (prpo2.length-1 - i <= privatePortalDisplay2 ) {
                                stmp+="<tr><td>"+stmparr.user+"</td><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
                            }
                            if(stmparr.title === "石中女"){
                                console.log(stmparr.user);console.log(userEmail);
                            }
                            if(usernamelist.indexOf(stmparr.user)>=0 || stmparr.user==userEmail){
                                missionGDoc.forEach(item => {
                                    if(stmparr.title === "石中女"){
                                        console.log(item.title);
                                    }
                                    if(item.title === stmparr.title &
                                       (new Date(item.responsedate).getTime() <= new Date(stmparr.dt.slice(0,10)).getTime() + 5*24*60*60*1000 )){
                                        if(stmparr.title === "石中女"){
                                            console.log(item.title);
                                        }
                                        item.ownerstatus = true;
                                    }
                                })
                            }
                        } catch (err) {
                            console.log(err);
                        }
                    }
                    stmp+="</tbody></table>";
                    $("#privatePortal2").replaceWith(stmp);
                    //console.log(prpo[0].title);
                }
                //console.log("missionlist1",missionlist1);
                //需要做的，将missionGDoc替换missionlist1进行显示，已审等需要设置临时变量，在生成smistmp时替换掉
                //再检查上面对missionlist1的操作，是否无用，可以删除
                /*
            for(let k=0;k<missionlist1.length;k++){
                //0:title;1:位置;2:开审;3:type;4:显示已审;5:日期;6:审结;7:lat;8:lng;9:userEmail;10:id;11:挪计划
                if(missionlist1[k][9].indexOf(userEmail)>=0){ missionlist1[k][4] = "O";}//自己
                if (missionlist1[k][2] === "true") {missionlist1[k][2]="✓"} else {missionlist1[k][2]="✗";};//开审
                if(missionlist1[k][6] === "ok"){missionlist1[k][6]="✓"} else {missionlist1[k][6]="";};//审结
                let iplan=parseInt(missionlist[k][11]); let splan="";
                if(iplan>=1 && iplan<10) splan="左第"+missionlist[k][11]+"个";
                if(iplan>=11 && iplan<20) splan="上第"+(missionlist[k][11]-10)+"个";
                if(iplan==10) splan="最右那个";
                if(iplan==20) splan="最下那个";
                smistmp+="<tr><td><a href='https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+missionlist1[k][0]+".png' target='_blank'>"+missionlist1[k][0]+"</a></td>"
                    +"<td>"+missionlist1[k][6]+"</td>"
                    +'<td><a href="javascript:void(0);" us="us2" owner="'+missionlist1[k][4]+'" powner="'+missionlist1[k][9]+'" tagName="'+missionlist1[k][10]+'" onclick="switchUserReviewDiv()";>'+missionlist1[k][1]+"</a></td>"
                    +'<td><a href="javascript:void(0);" us="us1" owner="'+missionlist1[k][4]+'" powner="'+missionlist1[k][9]+'" tagName="'+missionlist1[k][10]+'" onclick="switchUserReviewDiv()";>'+missionlist1[k][3]+"</a></td>"
                    +"<td>"+missionlist1[k][2]+"</td><td>"+missionlist1[k][4]+"</td>"+
                    "<td><a href='"+durl+"/portal/portaluseremail/portal."+missionlist1[k][10]+".useremail.json'  target='_blank'>"+missionlist1[k][5]+"</a></td>"
                    +"<td>"+missionlist1[k][7]+"</td>"+"<td>"+missionlist1[k][8]+"</td>"+"<td>"+splan+"</td>"
                    +"</tr>";
            }
            */
                missionGDoc.forEach(item => {
                    smistmp+="<tr><td>"+item.title+"</a></td>"
                        +"<td>"+(item.status === "通过" ? "✓" : "" )+"</td>"
                        +'<td><a href="javascript:void(0);" us="us2" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter + '" tagName="' + item.portalID + '" onclick="switchUserReviewDiv()";>'+item.lat+','+item.lng+"</a></td>"
                        +'<td><a href="javascript:void(0);" us="us1" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter + '" tagName="' + item.portalID + '" onclick="switchUserReviewDiv()";>'+item.types+"</a></td>"
                        +"<td>"+ (item.status === "审核" || item.status === "通过" ? "✓" : "" ) +"</td><td>"+ (item.ownerstatus === true ? '✓' : '') +"</td>"+
                        "<td><a href='"+durl+"/portal/portaluseremail/portal."+item.portalID+".useremail.json'  target='_blank'>"+item.timestamp.slice(0,19)+"</a></td>"
                        +"<td>"+item.lat+"</td>"+"<td>"+item.lng+"</td>"+"<td>"+(item.moveoptions === "右" ? "最右" :( item.moveoptions === "下" ? "最下" : (item.moveoptions+item.moveplace)))+"</td>"
                        +"</tr>";
                });
                //console.log('homepage',missionGDoc);
                let sultmp = "<div id='idUserEmail' style='display:none'><div><table><thead><tr><th>标题1</th><th>标题2</th><tr></thead><tbody><tr><td>数据1</td><td>数据2</td></tr></tbody></table></div></div>";
                //console.log("missionPortal1",$("#missionPortal1"));
                smistmp+="</tbody></table>";
                //console.log(`smistmp`,smistmp);
                // 使用const声明变量，避免意外修改
                const parser = new DOMParser();
                // 确保smistmp是有效的字符串，避免解析错误
                if (typeof smistmp === 'string' && smistmp.trim() !== '') {
                    try {
                        // 解析HTML字符串
                        const doc = parser.parseFromString(smistmp, "text/html");
                        // 获取目标元素
                        const missionPortal = document.querySelector("#missionPortal1");
                        //console.log(`missionPortal`,missionPortal);

                        if (missionPortal) {
                            // 插入解析后的内容
                            missionPortal.innerHTML = doc.body.innerHTML;
                            //console.log("HTML内容已成功插入到missionPortal1");
                        } else {
                            console.error("未找到id为missionPortal1的元素");
                        }
                    } catch (error) {
                        console.error("解析HTML时发生错误:", error);
                    }
                } else {
                    console.warn("smistmp不是有效的HTML字符串，无法解析");
                }
                //console.log(smisssss.body.innerHTML);
                //console.log("smistmp",smistmp);
               replaceElement("#missionuser", sultmp);
                //$("#missionuser").replaceWith(sultmp);
                //console.log(smisssss);
            } catch(e){console.log(e);}
        }

    // 通用元素替换函数replaceElement
    // selector: 目标元素的选择器（如 "#missionuser", ".content" 等）
    // replacement: 用于替换的内容（HTML字符串或DOM元素）
    // 使用示例
    {
    // 替换 #missionuser 元素
    // replaceElement("#missionuser", '<div class="new-mission">新的任务内容</div>');

    // 替换 .old-content 元素
    // replaceElement(".old-content", '<p>这是新内容</p>');

    // 也可以替换为DOM元素
    // const newDiv = $('<div>动态创建的元素</div>');
    // replaceElement("#container", newDiv);
    }
    function replaceElement(selector, replacement) {
        // 缓存目标元素
        const $target = $(selector);

        // 检查目标元素是否存在
        if ($target.length === 0) {
            console.error(`未找到符合选择器 "${selector}" 的元素，无法替换`);
            return false;
        }

        // 检查替换内容是否有效
        if (replacement === undefined || replacement === null) {
            console.warn(`替换内容为${replacement}，将清空元素`);
            $target.empty();
            return true;
        }

        try {
            // 执行替换操作
            $target.replaceWith(replacement);
            //console.log(`符合选择器 "${selector}" 的元素已成功替换`);
            return true;
        } catch (error) {
            console.error(`替换符合选择器 "${selector}" 的元素时发生错误:`, error);
            return false;
        }
    }

    function findUserEmail(userreview,UEmailList){
        try{
            //console.log(userreview);
            if(UEmailList.indexOf(",")>=0){
                let sss=UEmailList+",";
                while(sss.indexOf(",")>=0){
                    let sss1 = sss.substring(0,sss.indexOf(","));
                    if(userreview.indexOf(sss1)>=0) {
                        if(UEmailList=="pkpkqq02@outlook.com,pkpkqq02@gmail.com") {console.log("sss1",sss1);console.log("sss",sss);}
                        return 1;
                    }
                    sss=sss.substring(sss.indexOf(",")+1,sss.length-1);
                    if(UEmailList=="pkpkqq02@outlook.com,pkpkqq02@gmail.com") {console.log("sss12",sss1);console.log("sss2",sss);}
                }
                if(userreview.indexOf(sss)>=0) {
                    if(UEmailList=="pkpkqq02@outlook.com,pkpkqq02@gmail.com") {console.log("sss3",sss);}
                    return 1;
                }
                return -1;
            } else {
                return userreview.indexOf(UEmailList);
            }
        }
        catch(e){
            console.log(e);
            return -1;
        }
    }

    switchUserReviewDiv = function() {
        //console.log("switchUserReviewDiv",id);
        try{
            let id = event.srcElement.attributes['tagname'].textContent;
            let us = event.srcElement.attributes['us'].textContent;
            let owner = event.srcElement.attributes['owner'].textContent;
            let powner = event.srcElement.attributes['powner'].textContent;
            let userEmailList = [];
            let idUserEmail = document.getElementById("idUserEmail");
            let stmp="";
            let sss = event.srcElement;
            //console.log(idUserEmail.textContent);
            if(sss.textContent.indexOf("↓")>0){
                sss.textContent = sss.textContent.replace(/↓/g,"");
                stmp+="<div id='idUserEmail' style='display: none;'></div>";
                $("#idUserEmail").replaceWith(stmp);
            } else {
                let eus1 = document.querySelectorAll('[us="us1"');
                eus1.forEach(item=>{
                    if(item.textContent.indexOf("↓")>0) item.textContent = item.textContent.replace("↓","");
                });
                let eus2 = document.querySelectorAll('[us="us2"');
                eus2.forEach(item=>{
                    if(item.textContent.indexOf("↓")>0) item.textContent = item.textContent.replace("↓","");
                });
                sss.textContent = sss.textContent + "↓";
                idUserEmail.style.display = "block";
                if(us=="us1") {
                    userEmailList = JSON.parse(JSON.stringify(userEmailList1));
                } else if(us=="us2") {
                    userEmailList = JSON.parse(JSON.stringify(userEmailList2));
                }
                //let resp = U_XMLHttpRequest("GET","https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/portal/portaluseremail/portal."+id+".useremail.json")
                let resp = readR2File("portal/portaluseremail/portal."+id+".useremail.json")
                .then(res=>{
                    let userreview = [];
                    if(!res) {
                        setTimeout(function(){
                            console.log("switchUserReviewDiv:未找到审核文件",res);
                        },1000);
                        //return;
                    } else {
                        //userreview = res;
                        userreview = JSON.stringify(res.content);
                    }
                    //console.log('res',res);
                    //console.log(idUserEmail.style.display);
                    stmp+="<div id='idUserEmail' style='display:block;'><div style='display: flex;'>";
                    //console.log("userEmailList",userEmailList);
                    //console.log("userreview",userreview);
                    if(userreview.length>0) console.log('userreviewjson',JSON.parse(userreview));
                    for(let i=0;i<userEmailList.length;i++){
                        let sname=null;let semail=null;let slink=null; let po = "";
                        sname=userEmailList[i].substring(0,userEmailList[i].indexOf(';'));
                        semail=userEmailList[i].substring(userEmailList[i].indexOf(';')+1,userEmailList[i].indexOf(';',userEmailList[i].indexOf(';')+1));
                        slink=userEmailList[i].substring(userEmailList[i].lastIndexOf(';')+1);
                        if(sname == "pkpkqq02") {
                            //console.log(sname);console.log(semail);console.log(slink);console.log(userEmail);console.log(powner);
                            //console.log(userreview);console.log(semail);
                        }
                        if(powner){
                            if(semail.indexOf(powner)>=0){
                                po = "<span style='color:red'>O:</span>";
                            }
                        } else {
                            po = "<span></span>";
                        }
                        //审核过的用户
                        if(findUserEmail(userreview,semail)>0){
                            //console.log('userreview',userreview);
                            //console.log('semail yes',semail);
                            //if(sname === "pkpkqq02" || sname === "O:pkpkqq02") { console.log("find OK");}
                        //if(userreview.indexOf(userEmailList[i])>=0) {
                            //console.log('userEmail',userEmail);
                            //console.log('userEmailList[i]',userEmailList[i]);
                            //console.log('userEmailList[i].indexOf(userEmail)>=0',userEmailList[i].indexOf(userEmail)>=0);
                            if(userEmailList[i].indexOf(userEmail)>=0){
                                stmp+="<div class='sqselfok'>" + po + sname + "</div>";
                            } else {
                                stmp+="<div class='sqok'>" + po +sname+"</div>";
                            }
                        } else { //未审到的用户
                            //if(sname == "pkpkqq02") { console.log("find NO");}
                            //console.log('semail no',semail);
                            if(semail.indexOf(userEmail)>=0){
                                if(owner=="true"){
                                    stmp+="<div class='sqselfowner'>" + po + sname+"</div>";
                                } else {
                                    stmp+="<div class='sqselfno'>" + po + sname+"</div>";
                                }
                            } else {
                                //console.log('semail',semail);
                                stmp+="<div class='sqno'>" + po + sname+"</div>";
                            }
                        }

                        if((i+1)%5==0) {
                            stmp+="</div><p><div style='padding-top:1em;display: flex;'>";
                        }
                    }
                    stmp+="</div></div>";
                    //console.log("stmp",stmp);
                    $("#idUserEmail").replaceWith(stmp);
                },err=>{
                    console.log("err, not found", err);
                });
            }
            setTimeout(function(){
                //console.log("stmp",stmp);
                //$("#idUserEmail").replaceWith(stmp);
            },500);
            //console.log(id);

        } catch(e) {
            console.log("switchUserReviewDiv",e);
        }
    };

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

    initUserEmailList();
    function initUserEmailList(){
        userEmailList1=["snpsl;snp66666@gmail.com;open chrome 1","zhangnan;kobebrynan007@gmail.com;","dongtong;xiaohouzi0503@gmail.com;","bigmiaowa;pokemonmiaowa@gmail.com;","tydtyd;tydtyd@gmail.com;",
                        "kingsnan;zhangnan107107@gmail.com;","18kpt;sunkpty@gmail.com;","zhangnan007;zhangnan_007@outlook.com;","znan008Uni163-11.35;unicode@163.com;","tongliang;tongliang12345@outlook.com,xiuaoao@gmail.com;open chrome 23",
                       "pkpkqq01;pkpkqq01@gmail.com;","pkpkqq02;pkpkqq02@outlook.com,pkpkqq02@gmail.com;","poketydf01;tydingress@outlook.com,poketydf01@gmail.com;","poketydf02;poketydf02@gmail.com;","poketydf03;poketydf03@gmail.com;",
                       "poketyd;poketyd@outlook.com;","pokecntv01;pokecntv01@outlook.com;","pokecntv22;pokecntv22@outlook.com;","pokepokem001;whathowyou@gmail.com;","pokepokem01;pokepokem01@outlook.com;",
                       "pokecntv08;pokecntv08@outlook.com;","pokecntv09;pokecntv09@outlook.com;","pokecntv10;pokecntv10@outlook.com;",";;",";;"
                       ];
        userEmailList2=["小尔;w4b4uh134@gmail.com;","木木;1806424832mjn@gmail.com;","FishDragonKing;269999205@qq.com;","15998804246dyh;15998804246dyh@gmail.com;","hch463734529;hch463734529@gmail.com;",
                        "masterxiaoli666;masterxiaoli666@gmail.com;","shizx1twk;shizx1twk@gmail.com;","470274941;470274941@qq.com;","wczmw;wczmw@sina.com;",";;"
                       ];

    }

    // -------------------------- 核心：创建左下角状态面板 --------------------------
    function createStatusPanel() {
        // 状态面板容器
        const panel = document.createElement('div');
        panel.id = 'cf-upload-status-panel';
        // 样式：固定在左下角，半透明背景，不遮挡操作
        panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      max-width: 400px;
      max-height: 150px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      font-size: 12px;
      font-family: Arial, sans-serif;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      overflow-y: auto;
      z-index: 99999; /* 确保在最上层，不被其他元素遮挡 */
      opacity: 0.9;
    `;

        // 面板标题（可选，用于区分状态类型）
        const title = document.createElement('div');
        title.style.cssText = `
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255,255,255,0.3);
      font-weight: bold;
      color: #4CAF50;
    `;
        title.textContent = 'R2上传状态';
        panel.appendChild(title);

        // 状态内容容器（用于动态添加日志）
        const content = document.createElement('div');
        content.id = 'cf-status-content';
        content.style.lineHeight = '1.4';
        panel.appendChild(content);

        // 添加到页面
        document.body.appendChild(panel);

        // 返回内容容器，方便后续添加日志
        return content;
    }

    // -------------------------- 工具：向面板添加日志 --------------------------
    // 先创建面板，获取内容容器
    //const statusContent = createStatusPanel();

    // 自定义日志函数：替代console.log，将内容显示在面板
    function showLog(message, isError = false) {
        // 创建单条日志元素
        const logItem = document.createElement('div');
        // 错误信息标红，普通信息白色
        logItem.style.color = isError ? '#ff4444' : '#ffffff';
        // 添加时间戳（可选，便于追溯）
        const time = new Date().toLocaleTimeString();
        logItem.textContent = `[${time}] ${message}`;

        // 添加到面板（最新日志在最下面）
        //statusContent.appendChild(logItem);

        // 滚动到底部，确保能看到最新日志
        //statusContent.scrollTop = statusContent.scrollHeight;

        // 可选：保留最近20条日志，避免面板过长
        //if (statusContent.children.length > 20) {
        //statusContent.removeChild(statusContent.firstChild);
        //}
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
          .container {
              display: flex;
              justify-content: space-around;
              align-items: center;
              height: 100vh;
          }
          .sqno {
              margin-left: 2em;
              padding-top: 1em;
              width: 250px;
              height: 50px;
              font-size:18px;
              background-color: #cccccc;
          }
          .sqok {
              margin-left: 2em;
              padding-top: 1em;
              width: 250px;
              height: 50px;
              font-size:18px;
              color: #ffe600;
              background-color: #007947;
          }
          .sqselfowner {
              margin-left: 2em;
              padding-top: 1em;
              width: 250px;
              height: 50px;
              borderStyle:solid;
              borderWidth:2px;
              bordercolor:#f58220;
              font-size:18px;
              color:#fcf16e;
              background-color: #7bbfea;
          }
          .sqselfno {
              margin-left: 2em;
              padding-top: 1em;
              width: 250px;
              height: 50px;
              borderStyle:solid;
              borderWidth:2px;
              bordercolor:#f58220;
              font-size:18px;
              color:#f58220;
              background-color: #cccccc;
          }
          .sqselfok {
              margin-left: 2em;
              padding-top: 1em;
              width: 250px;
              height: 50px;
              borderStyle:solid;
              borderWidth:2px;
              bordercolor:#f58220;
              font-size:18px;
              color: #faa755;
              background-color: #007947;
          }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        document.querySelector('head').appendChild(style);
    })()

})();
