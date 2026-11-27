// ==UserScript==
// @name         AuOPRSn-SY-Follow
// @namespace    AuOPR
// @version      5.0.15.1
// @description  Following other people's review
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @match        https://wayfarer.scopely.com/*
// @require      https://ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.1.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @connect      wayfarer.teddysnp.ccwu.cc
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {

    //log switch
    const DIS_REVIEWMARK_LOG = false;
    const DISMAINLOG = true;
    const DISLOG1 = "";
    const DISLOG2 = "提交审核follow";
    const DISLOG3 = "上传审核follow";

    //工作：1.跟审时，忽略的未显示跟审，2.忽略时，如果在池中，给出提示
    let autoreview = null;
    let portalData = null;
    let cloudReviewData = null;
    let useremail = "";
    let missionGDoc = []; //从google doc读取的任务列表
    let missionGDocAll = [];

    const rejectReasons = [
        { zh: "照片模糊不清", en: "PHOTO_BAD_BLURRY" },
        { zh: "臉部或身體", en: "PHOTO_FACE" },
        { zh: "照片中出現車牌號碼", en: "PHOTO_PLATE" },
        { zh: "照片畫質低劣或並非屬實", en: "PHOTO_BAD" },
        { zh: "標題命名不佳或並不準確", en: "TEXT_BAD_TITLE" },
        { zh: "方向", en: "PHOTO_DIR" },
        { zh: "不準確的位置", en: "MISMATCH" },
        { zh: "不存在的假位置", en: "ACCURACY_FAKE" },
        { zh: "不雅的內容", en: "ACCURACY_EXPLICIT" },
        { zh: "涉嫌影響審查結果", en: "ACCURACY_PERSONAL" },
        { zh: "令人反感", en: "ACCURACY_OFFENSIVE" },
        { zh: "涉及攻擊性內容或言論", en: "ACCURACY_ABUSE" },
        { zh: "標題含有顏文字或表情符號", en: "EMOJI_TITLE" }
    ];
    //let rejcbxchnstr = ["照片模糊不清","臉部或身體","照片中出現車牌號碼","照片畫質低劣或並非屬實","標題命名不佳或並不準確","方向","不準確的位置","不存在的假位置","不雅的內容","涉嫌影響審查結果","令人反感","涉及攻擊性內容或言論","標題含有顏文字或表情符號"];
    //let rejcbxengstr = ["PHOTO_BAD_BLURRY","PHOTO_FACE","PHOTO_PLATE","PHOTO_BAD","TEXT_BAD_TITLE","PHOTO_DIR","MISMATCH","ACCURACY_FAKE","ACCURACY_EXPLICIT","ACCURACY_PERSONAL","ACCURACY_OFFENSIVE","ACCURACY_ABUSE","EMOJI_TITLE"];
    //quality:准确 safety:安全 location:永久 uniqueness:独特 socialize:社交 exercise:运动 cultural:探索

    //let cookie = localStorage.cfcookie;  使用cloudflare的worker后，不再使用cookie
    let ilatdis = 0.002; let ilngdis = 0.002; //判断池中和任务po是否一致时，两者经纬度相差的度数
    let iIsNominationDays = 60000*60*24*5;//判断提交申请，检查经纬度，提交者邮箱，是否审核通过等等时，检查的日期范围
    let iIsTitleRightDays = 60000*60*24*3 ;//判断提交申请，智能匹配名称是否正确时，检查的日期范围

    let durl="https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev";

    let iautoman = null;
    let reviewPortalAuto ="false";
    let isUserClick = false ;
    let isConfirmed = false;

    let mywin = window;

    const SETTINGS_KEY = "auoprsn_settings";
    const userSettings = {
        SECRET_KEY: null
    };
    loadSettings();
    function loadSettingsToJson(target, source) {
        for (const key in source) {
            const srcVal = source[key];
            const tgtVal = target[key];

            if (
                typeof srcVal === "object" &&
                srcVal !== null &&
                !Array.isArray(srcVal)
            ) {
                if (typeof tgtVal !== "object" || tgtVal === null) {
                    target[key] = {};
                }
                mergeDeep(target[key], srcVal);
            } else {
                target[key] = srcVal;
            }
        }
    }
    function loadSettings() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                loadSettingsToJson(userSettings, JSON.parse(saved));
                console.log('userSettings',userSettings);
            }
        } catch (e) {
            console.error(`${SETTINGS_KEY} - Failed to load settings:`, e);
        }
    }

    mywin.onload = function() {
        //console.log("onload:missionGDoc",missionGDoc);
        //missionGDoc = JSON.parse(localStorage.missionGDoc);
        //getLocalMissionList();
    }
    localStorage.setItem("reviewPortalAuto",reviewPortalAuto);
    listenLinkClick();

    function listenLinkClick() {
        // ==========================================
        // 逻辑一：处理 踩/举报/取消 状态切换 (普通的冒泡监听)
        // ==========================================
        document.body.addEventListener("click", function (event) {
            //console.log( "click", event.target, "isTrusted=", event.isTrusted );
            isUserClick = event.isTrusted;
            //console.log( "isUserClick更新为", isUserClick );

            if (!event.isTrusted) return;


            // 兼容处理：获取最近的按钮元素，防止点到按钮内的文字/图标导致失效
            const btnElement = event.target.closest("button, .wf-button");
            const buttonText = btnElement ? btnElement.innerText.trim() : (event.target.innerText ? event.target.innerText.trim() : "");

            const iauto = document.getElementById("idautolabel");
            const ibtn = document.getElementById("btnauto");
            if (!iauto || !ibtn) return;

            const currentStatus = iauto.textContent.trim();

            // 当用户点击 踩/重复/举报 时
            if (["thumb_down", "標記為重複", "檢舉", "举报"].includes(buttonText)) {
                if (currentStatus === "自动") {
                    window.iautoman = "自动";
                    ibtn.click();
                }
            }

            // 当用户点击 取消/关闭 时
            if (["取消", "關閉", "关闭"].includes(buttonText)) {
                if (currentStatus === "手动") {
                    if (window.iautoman === "自动") {
                        ibtn.click();
                    } else {
                        window.iautoman = null;
                    }
                }
            }
        }, false); // 正常的冒泡阶段执行

        // ==========================================
        // 逻辑二：精准拦截“略过”按钮 (捕获阶段监听 + 缺省取消的弹窗)
        // ==========================================
        document.body.addEventListener("click", function (event) {
            // 如果是脚本代码触发的放行点击，直接跳过拦截
            if (isConfirmed) return;
            if (!event.isTrusted) return;

            const targetButton = event.target.closest(".wf-button");
            if (!targetButton) return;
            const buttonText = targetButton.innerText ? targetButton.innerText.trim() : "";

            const iauto = document.getElementById("idautolabel");
            const ibtn = document.getElementById("btnauto");
            if (!iauto || !ibtn) return;
            const currentStatus = iauto.textContent.trim();

            if (buttonText === "略過") {
                console.log("用户点击了略过按钮");

                // 1. 【核心前置判断】先判断是否为任务 PO
                const isMissionPortal = isPortalInMission();
                console.log("是否为任务po:", isMissionPortal);

                if (isMissionPortal) {
                    // ==========================================
                    // 场景 A：是任务 PO -> 启动拦截与暂停逻辑
                    // ==========================================

                    // 只有是任务时，我们才需要把自动化暂停（切到手动）
                    if (currentStatus === "自动") {
                        window.iautoman = "自动";
                        ibtn.click();
                    }

                    // 只有是任务时，我们才去拦截网页原生的 Angular 响应
                    event.stopImmediatePropagation();
                    event.preventDefault();

                    console.log("portalData", portalData);
                    console.log("missionGDoc", missionGDoc);

                    showCustomConfirm("这是池中任务po！！！确定要略过吗？", function(userConfirmed) {
                        if (userConfirmed) {
                            isConfirmed = true;
                            targetButton.click(); // 用户确认，放行并触发真正的点击
                            setTimeout(() => { isConfirmed = false; }, 50);
                        } else {
                            // 用户取消，且刚才切过手动，则帮忙切回自动
                            if (currentStatus === "自动") { // 这里的判断基于最开始抓到的原始状态
                                if (window.iautoman === "自动") {
                                    ibtn.click();
                                } else {
                                    window.iautoman = null;
                                }
                            }
                            console.log("用户取消了略过操作");
                        }
                    });

                } else {
                    // ==========================================
                    // 场景 B：非任务 PO -> 顺其自然，直接放行
                    // ==========================================
                    // 这里不需要写 event.preventDefault()，也不需要写 targetButton.click()。
                    // 因为我们没有拦截事件，浏览器会自然顺着点击流触发网页原本的 Angular 点击响应！
                    console.log("非任务Po，不作任何拦截，直接执行网页原生略过。");
                }
            }

        }, true); // 关键：捕获阶段拦截
    }
    //无地方调用，可删除
    function listenLinkClick1(){
        document.body.addEventListener("click",function(event){
            //if(event.srcElement.innerText.indexOf("送出")>=0 || event.srcElement.innerText.indexOf("即可结束")>=0) console.log("listenLinkClick",event);
            //console.log("isTrusted",event.isTrusted);
            console.log( "click", event.target, "isTrusted=", event.isTrusted );

            isUserClick = event.isTrusted;

            console.log( "isUserClick更新为", isUserClick );

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
                if(event.srcElement.innerText == "檢舉") {
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

    async function getLocalMissionList(){
        const cfClass = await missionGDocFromSDK.ready();
        console.log('follow',missionGDoc);
        return;
        let miss = localStorage.missionGDoc;
        if (miss) {
            missionGDoc = JSON.parse(miss);
            //let missstr = miss.replace(/\[/g,"{").replace(/\]/g,"}");//.replace("{{","[{").replace("}}","]");
            if (DISMAINLOG) console.log("follow-missionGDoc",missionGDoc);
        }
    }

    //*********************  日志操作 *********************//
    const Logger = {
        groups: {},

        // 分组、名称、数值
        log(group, name, value) {
            if (!this.groups[group]) {
                this.groups[group] = [];
            }

            // 保存对象快照
            let snapshot = value;

            if (value !== null && typeof value === "object") {
                try {
                    snapshot = structuredClone(value);
                } catch (e) {
                    snapshot = value;
                }
            }

            this.groups[group].push({
                name,
                value: snapshot
            });
        },

        // 打印指定分组，支持多个分组
        print(...groups) {
            const names = groups.length
            ? groups.flat()
            : Object.keys(this.groups);

            for (const group of names) {
                const logs = this.groups[group];

                if (!logs) continue;

                console.groupCollapsed(group);

                for (const item of logs) {
                    console.log(item.name, item.value);
                }

                console.groupEnd();
            }
        },

        // 清除指定分组或全部
        clear(group) {
            if (group) {
                delete this.groups[group];
            } else {
                this.groups = {};
            }
        }
    };

    //*********************  CloudFlare SDK操作 *********************//
    const missionGDocFromSDK = {
        get data() {
            const SDK = unsafeWindow.AuOPRSnCloudFlareSDK;
            return unsafeWindow.AuOPRSnCloudFlareSDK?.missionGDoc ?? [];
        },
        async cfClass() {
            const SDK = await waitForSDK();
            return SDK.cfClass;
        },
        async ready() {
            const SDK = await waitForSDK();
            await SDK.ready;
            return SDK.missionGDoc;
        },

        async refresh() {
            const SDK = await waitForSDK();
            await SDK.ready;
            return SDK.refreshMission();
        },

        async readR2File(fileName) {
            const SDK = await waitForSDK();
            return SDK.readR2File(fileName);
        },

        async uploadDataToR2(...args) {
            const SDK = await waitForSDK();
            return SDK.uploadDataToR2(...args);
        }
    };
    function waitForSDK(timeout = 15000, interval = 100) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const check = () => {
                const SDK = unsafeWindow.AuOPRSnCloudFlareSDK;

                if (SDK) {
                    resolve(SDK);
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    reject(new Error('等待 CloudFlare SDK 加载超时'));
                    return;
                }

                setTimeout(check, interval);
            };

            check();
        });
    }
    // 等待 SDK 和首次数据初始化完成

    const missionGDocReady = (async () => {
        missionGDocAll = await missionGDocFromSDK.ready();
        let filteredMarkers = missionGDocAll.filter(item => item.status === '提交' || item.status === '审核' );
        missionGDoc = filteredMarkers;
        console.log('follow',missionGDoc);
        return missionGDocAll;
    })();

    //*********************  CloudFlare操作 *********************//
    // 配置 - CloudFlare
/*    const CONFIG = {
        BASE_URL: 'https://wayfarer.teddysnp.ccwu.cc',
        SECRET_KEY: 'warfarer-review', // 与Worker中相同的密钥
        DEFAULT_FOLDER: 'defaultpath/' // 本地指定的存储路径，可随时修改
    };
    const cfClass = {
        // 1. 按id查询单条数据
        getDataById: function(id, success, error) {
            $.ajax({
                method: "GET",
                url: `${CONFIG.BASE_URL}/data/${id}`,
                headers: { "Content-Type": "application/json" ,"X-API-Key": userSettings.SECRET_KEY},
                success: (response) => {
                    success(response);
                },
                error: (xhr) => {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        error(`查询失败：${errorData.error}`);
                    } catch (e) {
                        error(`网络错误：${xhr.statusText}`);
                    }
                }
            });
        },

        // 2. 按status批量查询
        getDatasByStatus: function(statusList, success, error) {
            const params = new URLSearchParams();
            statusList.forEach(s => params.append("status", s));
            $.ajax({
                method: "GET",
                url: `${CONFIG.BASE_URL}/mission/data?${params.toString()}`,
                headers: { "Content-Type": "application/json" ,"X-API-Key": userSettings.SECRET_KEY},
                success: (response) => {
                    success(response);
                },
                error: (xhr) => {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        console.warn(`查询失败：${errorData.error}`,errorData);
                        error(`查询失败：${errorData.error}`);
                    } catch (e) {
                        console.warn(`网络错误：${xhr.statusText}`,e);
                        error(`网络错误：${xhr.statusText}`);
                    }
                }
            });
        },

        // 3. 新增数据（自动生成id）
        addData: function(data, success, error) {
            // 判断数据类型是否为FormData
            const isFormData = data instanceof FormData;
            let url = `${CONFIG.BASE_URL}/data`;
            // 动态决定请求方法：有id则用PUT，无id则用POST
            let method = "POST";

            // 检查是否有id
            const hasId = isFormData ? data.has('id') : (data && data.id !== undefined && data.id !== null && data.id !== "");

            if (hasId) {
                const id = isFormData ? data.get('id') : data.id;
                url = `${CONFIG.BASE_URL}/data/${id}`;
                method = "PUT"; // 有id时使用PUT方法（对应服务器的更新接口）
            }

            $.ajax({
                method: method,
                url: url,
                headers: {
                    "X-API-Key": userSettings.SECRET_KEY   // 加这一行
                },
                // FormData不需要设置Content-Type，jQuery会自动处理
                contentType: !isFormData ? "application/json" : false,
                // 对于FormData需要设置processData为false，防止jQuery转换数据
                processData: !isFormData,
                data: isFormData ? data : JSON.stringify(data),
                success: (response) => {
                    success(response);
                },
                error: (xhr) => {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        error(`操作失败：${errorData.error || '未知错误'}`);
                    } catch (e) {
                        error(`解析响应失败：${e.message}`);
                    }
                }
            });
        },

        // 4. 更新数据（按id）
        updateData: function(id, updateFields, success, error) {
            $.ajax({
                method: "PUT",
                url: `${CONFIG.BASE_URL}/data/${id}`,
                headers: { "Content-Type": "application/json" ,"X-API-Key": userSettings.SECRET_KEY},
                data: JSON.stringify(updateFields), // 只需传要更新的字段
                success: (response) => {
                    success(response);
                },
                error: (xhr) => {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        error(`更新失败：${errorData.error}`);
                    } catch (e) {
                        error(`网络错误：${xhr.statusText}`);
                    }
                }
            });
        },

        // 5. 删除数据（按id）
        deleteData: function(id, success, error) {
            $.ajax({
                method: "DELETE",
                url: `${CONFIG.BASE_URL}/data/${id}`,
                headers: { "Content-Type": "application/json" ,"X-API-Key": userSettings.SECRET_KEY},
                success: (response) => {
                    success(response.message);
                },
                error: (xhr) => {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        error(`删除失败：${errorData.error}`);
                    } catch (e) {
                        error(`网络错误：${xhr.statusText}`);
                    }
                }
            });
        }
    };

    // 上传数据到R2   uploadDataToR2(folderPath:路径 , fileName:文件名 , data:json数据)
    //WORKER_URL为通用型，参数有文件、数据
    //本脚本更新审核数据
    //"portal/portalreview/","portal."+data.id+".json"
    function uploadDataToR2(folderPath,fileName,data) {
        console.log(`${folderPath},${fileName}`,data)
        try {
            console.log(`正在上传数据:${folderPath}`);
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CONFIG.BASE_URL}/json/`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Secret-Key': userSettings.SECRET_KEY
                },
                data: JSON.stringify({
                    folderPath: folderPath,
                    fileName: fileName,
                    data: data
                }),
                onload: function(response) {
                    console.log('response',response);
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
    // 读取指定的JSON文件
    function readR2File(fileName) {
        return new Promise((res, err) => {

            console.log(`正在读取文件: ${fileName.split('/').pop()}`);

            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.BASE_URL}/json/read?file=${encodeURIComponent(fileName)}`,
                headers: {
                    'X-Secret-Key': userSettings.SECRET_KEY
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
                            console.log(`成功读取文件: ${result.fileName.split('/').pop()}`);
                            res(result);
                        } else {
                            console.log('result',result);
                            err(result);
                        }
                    } catch (e) {
                        console.log('e',e);
                        err(e);
                    }
                },
                onerror: function(error) {
                    console.log('error',error);
                }
            });
        }).catch(e => {
            console.log('Promise', e)});
    } */

    //*********************  Http监听 *********************//
    const DISFetchLog = false ;
    const fetchModifyRules = {
        'POST': [
            {
                match: url => ( url.includes('/api/v1/vault/review') && !url.includes('/api/v1/vault/review/skip')),

                handler: (payload, data) => {
                    if(DISFetchLog) console.log('followReview POST:');
                    if(DISFetchLog) console.log('followReview POST:', data);

                    try {
                        let titlescore = document.querySelector('#review-page-title');
                        if(titlescore){
                            titlescore.textContent = "审查";
                        }
                        let tmppayload = structuredClone(payload);

                        Logger.log(DISLOG2, "原版审核数据", payload);

                        // NEW + 挪 PO，直接用网络审核结果覆盖 data
                        if (cloudReviewData !== null && cloudReviewData.newLocation) {
                            let lll = cloudReviewData.newLocation;
                            let parts = lll.split(',');

                            let lat = parseFloat(parts[0]);
                            let lng = parseFloat(parts[1]);

                            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                                throw new Error('newLocation坐标格式错误：' + lll);
                            }

                            lat = lat + Math.random() / 1000000;
                            lng = lng + Math.random() / 1000000;

                            let sss = lat.toString() + "," + lng.toString();

                            tmppayload.newLocation = sss;

                            console.log("newdata", tmppayload);
                            console.log("挪至新位置：", tmppayload.newLocation);
                        }

                        // 保存提交前的数据
                        savePostData(tmppayload);

                        Logger.log(DISLOG2, "提交的审核数据", tmppayload);
                        Logger.print(DISLOG2);
                        //let titlescore = document.querySelector('#review-page-title');
                        //if (titlescore) titlescore.textContent = "";

                        // 返回修改后的 payload
                        return tmppayload;

                    } catch (e) {
                        console.warn('review post err:', e);

                        // 出错时返回原始数据
                        return payload;
                    }
                }
            }, // review POST

            {
                match: url => url.includes('/api/v1/vault/review/skip'),

                handler: (payload, data) => {
                    let titlescore = document.querySelector('#review-page-title');
                    if(titlescore){
                        titlescore.textContent = "审查";
                    }

                    savePostData(payload);

                    Logger.log(DISLOG2, 'Skip POST:', payload);
                    Logger.print(DISLOG2);

                    return payload;
                } ,

                responseHandler: (data) => {
                    if(DISFetchLog) console.log('Skip POST response:', data);

                    let responseData = null;

                    try {
                        responseData = JSON.parse(data.response);
                    } catch (e) {
                        console.warn('响应 JSON 解析失败:', e);
                    }

                    if (responseData) {
                        //let titlescore = document.querySelector('#review-page-title');
                        //if (titlescore) titlescore.textContent = "";
                        if(DISFetchLog) console.log('服务器 result:', responseData.result);
                        if(DISFetchLog) console.log('服务器 code:', responseData.code);
                    }
                }
            } // skip POST
        ],

        'GET': [
            {
                match: url => url.includes('/api/v1/vault/review'),

                // GET 响应阶段只接收一个 data 参数
                handler: (data) => {
                    if (DISFetchLog) {
                        if(DISFetchLog) console.log('follow捕捉到：/api/v1/vault/review:GET');
                        //console.log('flollow data:', data.response);
                    }
                    injectLoadData(data.response);
                }
            }, // review GET
            {
                match: url => url.includes('/api/v1/vault/manage'),

                // GET 响应阶段只接收一个 data 参数
                handler: (data) => {
                    if (DISFetchLog) {
                        if(DISFetchLog) console.log('follow捕捉到：/api/v1/vault/manage:GET');
                        //console.log('flollow data:', data.response);
                    }
                    injectManage(data.response);
                }
            } // review GET
        ]
    };

    window.addEventListener('message', function (event) {

        //console.log('listener-message:event', event);

        const data = event.data;

        if (!data || typeof data !== 'object') return;

        // 只处理自己定义的消息
        if (
            data.type !== 'TM_FETCH_INTERCEPT' &&
            data.type !== 'TM_FETCH_RESPONSE'
        ) {
            return;
        }

        //console.log('listener-message:data', data);

        if (data?.type === 'TM_FETCH_INTERCEPT') {

            const handlers = fetchModifyRules[data.method] || [];

            const route = handlers.find(item => item.match(data.url));

            let modifiedPayload = data.payload;

            try {

                if (route) {

                    const clonedPayload = structuredClone(data.payload);

                    const result = route.handler(clonedPayload, data);

                    modifiedPayload = result !== undefined
                        ? result
                    : clonedPayload;

                }

            } catch (e) {

                console.warn('Fetch handler error:', e);

            }

            window.postMessage({

                type: 'TM_FETCH_MODIFIED',

                requestId: data.requestId,

                payload: modifiedPayload

            }, '*');

            return;
        }


        // =================================
        // GET / POST：响应返回后
        // =================================

        if (data.type === 'TM_FETCH_RESPONSE') {

            const handlers = fetchModifyRules[data.method] || [];

            for (const item of handlers) {
                if (item.match(data.url)) {
                    try {
                        // 只处理响应，不再调用 POST 请求 handler
                        if(DISFetchLog) console.log('[FETCH RESPONSE]', data);

                        // GET：继续执行原来的 GET handler
                        if (data.method === 'GET') {
                            item.handler(data);
                        }
                        // 如果有独立的响应 handler，才调用
                        if (item.responseHandler) {
                            item.responseHandler(data);
                        }

                    } catch (e) {
                        console.warn('Fetch response handler error:', e);
                    }
                }
            }

            return;
        }

    });

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
            if (DISFetchLog) {
                if(url.includes('review') || url.includes('skip') ) {
                    console.log('follow:XMLHTTP:url,method:',url,method);
                }
            }
//            console.log(method);
//            console.log(url);
            if(url.indexOf("pub-e7310217ff404668a05fcf978090e8ca.r2.dev")>=0){
//                this.addEventListener('load', getData, false);
            }
            if (url == '/api/v1/vault/properties' && method == 'GET') {
                this.addEventListener('load', getUserPromise, false);
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
                        //console.log("原版审核数据",data);
                        if (DISFetchLog) console.log("原版审核数据",JSON.parse(data[0]));
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
                        savePostData(data);
                        //console.log("提交的审核数据",data);
                        if (DISFetchLog) console.log("提交的审核数据",JSON.parse(data[0]));
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

                    //let iautolabel = document.querySelector("p[id='idautolabel']");
                    //if (iautolabel.textContent == "手动"){
                        //console.log("data",JSON.parse(data));
                        let ic =0;
                        if(cloudReviewData){
                            if (cloudReviewData.skip) ic=1; else ic=0;
                        } else {
                            ic=0;
                        }
                        //console.log("调用上传接口",isUserClick);
                        uploadPostData(portalData,JSON.parse(data),ic,true);
                    //}

                    //console.log("skip",data);
                    //console.log("skip",portalData);
                    return send.apply(_this,data);
                }
            }

            if (url == '/api/v1/vault/manage'){
                if (DISFetchLog) console.log('XMLHttp:manager');
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

    //*********************  通用函数 *********************//
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

    /** 创建一个符合需求的自定义确认弹窗：完美解决原生 confirm 无法让“取消”按钮作为默认焦点的问题 */
    function showCustomConfirm(message, callback) {
        // 1. 如果已经有弹窗了，直接置顶并聚焦，不重复创建
        const existModal = document.getElementById("custom-confirm-modal");
        if (existModal) {
            const cancelBtn = document.getElementById("modal-cancel-btn");
            if (cancelBtn) cancelBtn.focus();
            return;
        }

        // 2. 创建弹窗 HTML 结构
        const modal = document.createElement("div");
        modal.id = "custom-confirm-modal";
        modal.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); /* 稍微加深遮罩颜色，提示用户当前处于模态 */
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999; /* 极其绝对的置顶 */
        font-family: sans-serif;
    `;

        modal.innerHTML = `
        <div style="background: white; padding: 20px 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; min-width: 280px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; font-weight: 500;">${message}</p>
            <div style="display: flex; justify-content: space-around;">
                <button id="modal-confirm-btn" style="padding: 8px 20px; border: 1px solid #ccc; background: #fff; cursor: pointer; border-radius: 4px; font-size: 14px;">确认</button>
                <button id="modal-cancel-btn" style="padding: 8px 20px; border: none; background: #007bff; color: white; cursor: pointer; border-radius: 4px; font-size: 14px; font-weight: bold;">取消</button>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        const confirmBtn = document.getElementById("modal-confirm-btn");
        const cancelBtn = document.getElementById("modal-cancel-btn");

        // 强制把焦点锁定在“取消”按钮上
        cancelBtn.focus();

        // 关闭弹窗的内联函数
        const closeModal = (result) => {
            modal.remove();
            callback(result); // 确保一定会执行你的回调，去恢复自动化状态
        };

        // 事件绑定
        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            closeModal(true);
        };

        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            closeModal(false);
        };

        // 【修改核心】：点击弹窗背景（外部区域）时，不消失，而是让取消按钮重新获得焦点！
        // 这样用户乱点页面其他地方，弹窗也不会隐形，必须点两个按钮之一
        modal.onclick = (e) => {
            if (e.target === modal) {
                cancelBtn.focus(); // 重新抓回焦点，防止焦点流失
                // 如果你希望“点外部=点取消”，就把下面这行注释取消掉：
                closeModal(false);
            }
        };
    }

    //比较两个对象是否相同(json的顺序可以不同)
    function areObjectsEqual(obj1, obj2) {
        // 如果是同一引用，直接返回true
        if (obj1 === obj2) return true;

        // 检查是否都是对象且不为null
        if (typeof obj1 !== 'object' || obj1 === null ||
            typeof obj2 !== 'object' || obj2 === null) {
            return false;
        }

        // 获取两个对象的属性键数组
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        // 如果属性数量不同，返回false
        if (keys1.length !== keys2.length) return false;

        // 逐个比较属性
        for (const key of keys1) {
            // 检查obj2是否有相同的属性
            if (!keys2.includes(key)) return false;

            // 递归比较属性值
            if (!areObjectsEqual(obj1[key], obj2[key])) return false;
        }

        return true;
    }

    //格式化日期函数
    function formatDate(date, fmt){
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

    //智能匹配：长度差在一个字符以内;1-2个字符时完全匹配;3-6个字符时允许错1个;7个以上时允许错2个
    function approximateMatch(strData1, strData2) {
        // 检查输入有效性
        if (!strData1 || !strData2) return false;

        const len1 = strData1.length;
        const len2 = strData2.length;

        // 统计字符出现次数
        const countChars = (str) => {
            const counts = {};
            for (const char of str) {
                counts[char] = (counts[char] || 0) + 1;
            }
            return counts;
        };

        const counts1 = countChars(strData1);
        const counts2 = countChars(strData2);

        // 计算共同字符总数
        let commonChars = 0;
        for (const char in counts1) {
            if (counts2[char]) {
                commonChars += Math.min(counts1[char], counts2[char]);
            }
        }

        // 情况1：第一个字符串长度在2及以下
        if (len1 <= 2) {
            // 要求长度相同且完全匹配
            return len1 === len2 && commonChars === len1;
        }
        // 情况2：第一个字符串长度在3-6之间
        else if (len1 >= 3 && len1 <= 6) {
            // 第二个字符串长度需在3-7之间，且相同字符数为len1-1
            return len2 >= 3 && len2 <= 7 && commonChars === len1 - 1;
        }
        // 情况3：第一个字符串长度在7以上
        else {
            // 第二个字符串与第一个长度差1，且相同字符数为len1-2
            return Math.abs(len1 - len2) === 1 && commonChars === len1 - 2;
        }
    }

    //计算两个经纬度之间的距离（单位：米）
    function getDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // 地球半径，单位：米
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // 返回距离（米）
    }

    //判断 portalData 是否在 missionGDoc 数组中存在
    /*
     * @param {Object} portalData - 包含当前Portal信息的JSON对象
     * @param {Array} missionGDoc - 包含任务列表的数组
     * @returns {Boolean} 是否匹配成功
    */
    function isPortalInMission() {
        // 安全检查
        if (!portalData || !Array.isArray(missionGDoc)) return false;

        // 预先建立 type 和 types 的映射关系，方便做不区分中英文的匹配
        const typeMapping = {
            'NEW': '新增',
            'EDIT': '编辑',
            'PHOTO': '图片'
        };

        // 遍历任务数组进行比对
        return missionGDoc.some(mission => {
            // --- 原则 1：ID 匹配 ---
            // 兼容处理：防呆检查，确保两个字段都有值再对比
            if (portalData.id && mission.portalID && portalData.id === mission.portalID) {
                console.log(`[匹配成功] 触发原则1：ID一致 (${portalData.id})`);
                return true;
            }

            // --- 原则 2：复合条件匹配 (ID不匹配时触发) ---
            // 2.1 检查 title 相同 (去除首尾空格)
            const isTitleMatch = portalData.title && mission.title &&
                  portalData.title.trim() === mission.title.trim();

            // 2.2 检查业务类型匹配 (NEW->新增, EDIT->编辑, PHOTO->图片)
            const pType = portalData.type;
            const mType = mission.types;
            const isTypeMatch = (pType === mType) || (typeMapping[pType] === mType);

            // 2.3 检查地理位置是否在 50 米以内
            let isDistanceMatch = false;
            if (portalData.lat && portalData.lng && mission.lat && mission.lng) {
                const distance = getDistance(portalData.lat, portalData.lng, mission.lat, mission.lng);
                if (distance <= 50) {
                    isDistanceMatch = true;
                }
            }

            // 三个子条件同时满足，则认为原则 2 匹配成功
            if (isTitleMatch && isTypeMatch && isDistanceMatch) {
                console.log(`[匹配成功] 触发原则2：标题相同(${portalData.title})、类型匹配、且距离在50米内`);
                return true;
            }

            // 当前这条 mission 不匹配，继续循环下一条
            return false;
        });
    }
    // 判断 missionGDoc 是否存在当前任务 (只判断了标题，暂无使用之处)
    function hasMissionTask() {

        if (!Array.isArray(missionGDoc) || !portalData || !portalData.title) { return false; }

        return missionGDoc.some(
            item => item.title === portalData.title
        );

    }


    ////不再使用////
    {
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
    //EDIT位置编辑用的函数 不再使用
    function findArrayTwo(arr,title){
        for(let i=0;i<arr.length;i++){
            //            console.log("arr["+i+"]",arr[i]);
            if(arr[i].indexOf(title)>=0){
                return i;
            }
        }
        return -1;
    }
    // 自定义日志函数：替代console.log，将内容显示在面板 不是太好用，没使用，但函数接口在，不要删
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
    }
    ////不再使用////


    //*********************  User操作 *********************//
    // 简化getUser，只负责获取和解析原始数据
    function getUserPromise() {
        return U_XMLHttpRequest("GET", "https://wayfarer.scopely.com/api/v1/vault/properties")
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
    //不再使用
    async function getUser() {

        // 全局邮箱已经存在，直接返回
        if (useremail) {
            return useremail;
        }

        try {

            const res = await U_XMLHttpRequest(
                "GET",
                "https://wayfarer.scopely.com/api/v1/vault/properties"
            );

            if (!res) {
                return null;
            }

            const restext = JSON.parse(res);

            const email = restext?.result?.socialProfile?.email;

            if (email) {
                useremail = email;
                return email;
            }

            return null;

        } catch (e) {

            console.error("获取用户邮箱失败:", e);

            return null;

        }

    }


    //*********************  Inject操作 *********************//
    function injectLoadData(response) {
        const DISLog = true;
        awaitElement(() => (document.querySelector('[data-testid="review-new-flow"]') || document.querySelector('[data-testid="review-edit-flow"]') || document.querySelector('[data-testid="review-photo-flow"]')))
            .then((ref) => {
            try {
                if(DISLog) console.log('response',response);
                const json = JSON.parse(response);
                if(DISLog) console.log('json',json);
                if (!json) return;
                if (json.captcha || json==null) {
                    return;
                }
                portalData = json.result;
                if(DISLog) console.log('portalData',portalData);
                if(!portalData) return;
                //if (missionGDoc.length === 0) {missionGDoc = JSON.parse(localStorage.missionGDoc);}
//                if(!portalData.id || portalData.id==null) return;
                setTimeout(function(){ loadReviewData(portalData); },200);
//                let testid = "74908645df72e5da08ebd13be138275c";
//                loadReviewData(testid);
            } catch (e) {
                console.log('e.message',e.message);
            }
        });
    }

    //申请页面
    function injectManage(response) {
        const DISLOG = true;

        awaitElement(() => document.querySelector('app-submissions'))
            .then((ref) => {
            try {
                const json = JSON.parse(response);
                if (!json) return;
                if (json.captcha || json==null) {
                    return;
                }
                let pData = json.result;
                if(DISLOG) console.log("pData",pData);
                let missionGDocstr = localStorage.missionGDoc;
                if(missionGDocstr) {missionGDoc = JSON.parse(missionGDocstr);} else {return;}

                missionGDoc.forEach(item => {
                });

                //console.log("missionGDoc",missionGDoc);
                if(pData.submissions){
                    missionGDoc.forEach(item => {
                        //console.log('item',item);
                        let isave=0;
                        let iphoto=0;let iphoto1=0;
                        if(item.types === "图片"){
                            //console.log("injectManage-item",item);
                        }
                        for(let i=0;i<pData.submissions.length;i++){
                            if(DISLOG) {
                                if(pData.submissions[i].status !== "ACCEPTED") {
                                    console.log("申请:",pData.submissions[i].poiData.imageUrl);
                                }
                            }
                            //1分钟的时间戳值:60000 20分钟是1200000
                            //只有经纬度小于ilatdis,ilngdis的，才判断
                            if(Math.abs(item.lat-pData.submissions[i].lat)<=ilatdis & Math.abs(item.lng-pData.submissions[i].lng)<=ilngdis){
                                if(DISLOG) console.log("Manager:有位置接近的");
                                //当前用户与任务中申请者一致，并且nominatedID为空，或者有nominatedID与pData.submissions[i].id相同，并且名称一致
                                if(((!item?.nominateID && useremail === item.submitter)|| item.nominateID === pData.submissions[i].id)
                                     && (item.title === pData.submissions[i].title || item.title === pData.submissions[i].poiData?.title))
                                //if( (item.title === pData.submissions[i].title) || ( ( item.title === pData.submissions[i].poiData.title) ) )
                                {
                                    if(!item?.nominateID) {
                                        item.nominateID = pData.submissions[i].id;
                                        isave=1;
                                        console.log("isave5:更新提交id,nominateID");
                                    }
                                    if(DISLOG) console.log("Manager:找到任务中的po");
                                    if(item.title === "茫然" || pData.submissions[i].title === "茫然")
                                    {
                                        if(DISLOG) console.log("injectManage-item",item);
                                        if(DISLOG) console.log(`injectManage-pData.submissions[${i}]`,pData.submissions[i]);
                                        if(DISLOG) console.log("injectManage-NotPHOTO-item",item);console.log("injectManage-NotPHOTO-pData.submissions[i]",pData.submissions[i]);
                                        if(DISLOG) console.log(new Date(pData.submissions[i].day + " 00:00:00").getTime());
                                        if(DISLOG) console.log(new Date (item.submitteddate + " 00:00:00").getTime() );
                                        if(DISLOG) console.log(new Date (item.submitteddate + " 00:00:00").getTime() - iIsNominationDays );
                                    }
                                    //console.log("pData.submissions[i].day",new Date(pData.submissions[i].day + " 00:00:00").getTime());
                                    //console.log("item.submitteddate",new Date (item.submitteddate + " 00:00:00").getTime());
                                    //1分钟的时间戳值:60000 查任务时间前3天的(防误输入)
                                    if(new Date(pData.submissions[i].day + " 00:00:00").getTime() >= ( new Date (item.submitteddate + " 00:00:00").getTime() - iIsNominationDays ) )
                                    {
                                        //console.log("injectManage-NotPHOTO-","日期在："+iIsNominationDays+"之间");
                                        //pData.submissions.status === "NIANTIC_REVIEW" 系统审 !!!!!!!!!!!!!!!!!!!!!!!!!
                                        let itmp = pData.submissions[i].status; //有时候不执行，似乎被优化掉了，加个防优化
                                        if(pData.submissions[i].type === "PHOTO"){
                                            if((pData.submissions[i].status === "ACCEPTED" || pData.submissions[i].status === "REJECTED"))
                                            {
                                                iphoto+=0;
                                                console.log("iphoto+0");
                                            }
                                            //开审 : 否则也算开审，否则任务里可能不再显示，将来无法再更新成通过
                                            if(pData.submissions[i].status === "VOTING") {
                                                console.log("iphoto+1");
                                                iphoto+=1;
                                            }
                                            if(pData.submissions[i].status === "NIANTIC_REVIEW") {
                                                console.log("iphoto1+1");
                                                iphoto1+=1;
                                            }
                                        }
                                        //更新审核标识为：通过/拒绝/审核
                                        if (pData.submissions[i].type === "NOMINATION" || pData.submissions[i].type === "EDIT_DESCRIPTION" || pData.submissions[i].type === "EDIT_LOCATION")
                                        {
                                            if( (pData.submissions[i].status === "REJECTED") & item.status !== "拒绝") {
                                                item.status = "拒绝";
                                                isave=1;
                                                if(DISLOG) console.log("injectManage-NotPHOTO-","isave1:拒绝");
                                            }
                                            else if(pData.submissions[i].status === "ACCEPTED" & item.status !== "通过") {
                                                item.status = "通过";
                                                isave=1;
                                                if(DISLOG) console.log("injectManage-NotPHOTO-","isave1:通过");
                                            }
                                            //开审
                                            if(pData.submissions[i].status == "VOTING" & item.status != "审核") {
                                                item.status = "审核";
                                                isave=1;
                                                console.log("isave2：审核");
                                            }
                                        }
                                        //审核人写错 :
                                        if((pData.submissions[i].status === "VOTING" || pData.submissions[i].status === "NOMINATED" ||
                                            pData.submissions[i].type === "NOMINATION" || pData.submissions[i].type === "EDIT_LOCATION") & item.submitter != useremail)
                                        {
                                            item.submitter = useremail ;
                                            isave=1;
                                            console.log("isave3：更新邮箱");
                                        }
                                        //更新经纬度
                                        if((pData.submissions[i].status === "VOTING" || pData.submissions[i].status === "NOMINATED" ||
                                            pData.submissions[i].type === "NOMINATION" || pData.submissions[i].type === "EDIT_LOCATION") &
                                           (pData.submissions[i].lat != item.lat || pData.submissions[i].lng != item.lng )){
                                            console.log("ptitle",pData.submissions[i].title);
                                            console.log("mtitle",JSON.stringify(item.title));
                                            console.log("plat",JSON.stringify(pData.submissions[i].lat));
                                            console.log("mlat",JSON.stringify(item.lat));
                                            console.log("plng",JSON.stringify(pData.submissions[i].lng));
                                            console.log("mlng",JSON.stringify(item.lng));
                                            //item.lat = pData.submissions[i].lat;item.lng = pData.submissions[i].lng;
                                            isave=1;
                                            //新版，不再更新经纬度
                                            console.log("isave1：更新经纬度");
                                        }
                                    }
                                } else {
                                    //名字如果写错，将进行智能匹配，智能匹配仅判断如下条件：审核/提交/官审；日期在10天内；邮箱一致
                                    let iTitle1 = approximateMatch(item.title,pData.submissions[i].title);
                                    let iTitle2 = approximateMatch(item.title,pData.submissions[i].poiData.title);
                                    /*if(item.title === "万达木馬"){
                                        console.log(item.title+","+pData.submissions[i].title,iTitle1);
                                        console.log(item.title+","+pData.submissions[i].poiData.title,iTitle2);
                                    }*/
                                    if(iTitle1 || iTitle2){
                                        if(new Date(pData.submissions[i].day + " 00:00:00").getTime() >= ( new Date (item.submitteddate + " 00:00:00").getTime() - iIsTitleRightDays ) ){
                                            if((pData.submissions[i].status === "VOTING" || pData.submissions[i].status === "NOMINATION" || pData.submissions.status === "NIANTIC_REVIEW")
                                               & item.submitter === useremail) {
                                               console.log(pData.submissions[i].title || pData.submissions[i].poiData?.title || item.title);
                                            item.title = pData.submissions[i].title || pData.submissions[i].poiData?.title ;
                                            isave = 1;
                                            console.log("名字写错");
                                        }
                                    }
                                    }
                                }
                            }
                        }
                        //console.log(`injectManage-iphoto:${iphoto}`);
                        if(item.types === "图片"){
                            // 使用switch处理item.status的多状态判断
                            switch (item.status) {
                                case "提交":
                                    // 处理"提交"状态的逻辑
                                    console.log(`任务《${item.title}》处于提交状态`);
                                    if(iphoto === 0){//修改过，需测试是否影响其它
                                        item.status = "通过";
                                        isave=1;
                                        console.log("isave1：多图片更新为通过");
                                    } else {
                                        item.status = "审核";
                                        isave=1;
                                        console.log("isave1：多图片更新为审核");
                                    }
                                    break;
                                case "审核":
                                    // 处理"审核"状态的逻辑
                                    console.log(`任务《${item.title}》正在审核中`);
                                    if(iphoto === 0){
                                        if(iphoto1 > 0) {//只有官方审核，改为提交
                                            item.status = "提交";
                                            isave=1;
                                            console.log("isave5：多图片仅官方审核为提交");
                                        } else {
                                            item.status = "通过";
                                            isave=1;
                                            console.log("isave1：多图片更新为通过");
                                        }
                                    } else {
                                    }
                                    break;
                                case "通过":
                                    // 处理"通过"状态的逻辑
                                    if(iphoto === 0){
                                    } else {
                                    }
                                    console.log(`任务《${item.title}》已通过审核`);
                                    break;
                                default:
                                    // 处理所有未明确声明的状态（默认分支）
                                    console.warn(`发现未知状态：${item.status}，任务标题：${item.title}`);
                                    break;
                            }
                        }
                        //console.log(item.title +':isave',isave);
                        //更新云中任务
                        if(isave === 1){
                            console.log("更新任务至GDoc",item.title);
                            setTimeout(async function(){
                                localStorage.setItem("missionGDoc",JSON.stringify(missionGDoc));
                                let updateField={status:item.status,title:item.title,lat:item.lat,lng:item.lng,submitter:item.submitter,nominateID:item.nominateID};
                                //cfClass.updateData(
                                const res = await missionGDocFromSDK.updateData(
                                    item.id, updateField,
                                    (res) => {
                                        console.log("更新任务成功"+item.id+","+item.title,res);
                                    },
                                    (err) => {
                                        console.log("更新任务错误"+item.id+","+item.title,err);
                                    });
                            },500);
                        }
                    })
                }
            } catch (e) {
                console.log(e);
            }
        });
    }

    //*********************  map 操作   *********************//

    //*********************  review操作 *********************//
    //PHOTO:未找到网络审核，按任务中选/瞎选一个
    function photoReview(pdata){
        if(DIS_REVIEWMARK_LOG) console.log("follow-photoReview",pdata);
        if(pdata.type!="PHOTO") return;
        let tmptext = "";
        let shouldBreak = false ;
        missionGDoc.forEach(item => {
            //任务里有，全选：photo只能做到全选
            //console.log("photoReview-item",item);console.log("photoReview-pdata",pdata);
            if (shouldBreak) return;
            if(item.id === pdata.id){
                const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
                if(photoall.className.indexOf("photo-card--reject")==-1){
                    //以下，不一定哪个会被点击，很奇怪
                    photoall.parentNode.parentNode.click();
                    photoall.click();
                }
                tmptext = "任务po:全选";
                shouldBreak = true;
            }
            else if(item.title === pdata.title){
                const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
                if(photoall.className.indexOf("photo-card--reject")==-1){
                    //以下，不一定哪个会被点击，很奇怪
                    photoall.parentNode.parentNode.click();
                    photoall.click();
                }
                tmptext = "任务po:全选";
                shouldBreak = true;
            }
        })
        if(DIS_REVIEWMARK_LOG) console.log("follow-shouldBreak",shouldBreak);
        if(!shouldBreak){
            const photo = document.querySelector('[data-testid="review-photo-flow"]').querySelector("article").parentNode.querySelectorAll('button[aria-pressed]');
            if (photo)
            {
                if(DIS_REVIEWMARK_LOG) console.log("follow-photo",photo[0]);
                if(photo[0].getAttribute('aria-pressed') === 'false') photo[0].click();
                tmptext = "瞎选第一个";
            }
        }
        setTimeout(function(){
            let titlescore = document.querySelector('#review-page-title');
            if (titlescore) titlescore.textContent = tmptext;
            //let ilabel = document.getElementById("idscore");
            //if(ilabel) ilabel.textContent = tmptext;
            //console.log("idscore",tmptext);
        },500);
    }
    //EDIT:未找到网络审核，按任务中选/瞎选
    async function editReview(pdata){
        if(pdata.type!="EDIT") return;
        let iplan = null;let tmptext = "";
        //任务里有：其它瞎选，经纬度按任务挪
        missionGDoc.forEach( item => {
            if(item.portalID === pdata.id ||
               (item.title === pdata.title && Math.abs(item.lat-pdata.lat)<=ilatdis & Math.abs(item.lng-pdata.lng)<=ilngdis) ) {
                if(item.moveoptions === "右") iplan =10;
                if(item.moveoptions === "下") iplan =20;
                if(item.moveoptions === "左") iplan =(parseInt(item.moveplace || 1, 10));
                if(item.moveoptions === "上") iplan =(parseInt(item.moveplace || 1, 10)) + 10;
            }
        })
        if(iplan){
            if(iplan>=0)
            {
                console.log("iplam1",iplan);
                //console.log(resortdata.length);
                if(iplan<10){
                    tmptext = "左第"+iplan+"个";
                } else if(iplan==10){
                    tmptext = "最右边";
                } else if(iplan<20){
                    tmptext = "上第"+(iplan-10)+"个";
                } else if(iplan==20){
                    tmptext = "最下";
                }
                let hash = getLocationHash(pdata,iplan);
                selectEditLocation(pdata,hash,tmptext);
            }
            selectEditLocation(pdata,null,null);
            tmptext = "瞎选第一个";
        }
        else {
            selectEditLocation(pdata,null,null);
            tmptext = "瞎选第一个";
        }
        if(DIS_REVIEWMARK_LOG) console.log('开始选位置',tmptext);
        let titlescore = document.querySelector('#review-page-title');
        if (titlescore) titlescore.textContent = tmptext;
        return ;
        //////////////////旧版，可删除
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
                        console.log("iplan & iplan>=0",iplan & iplan>=0);
                        if(iplan){
                        if(iplan>=0)
                        {
                            console.log("iplam1",iplan);
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
                            console.log("movepos",movepos);
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
                        }
                        }
                        else
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

    //NEW:根据标题名有重合，给提示是否重复，并加20秒倒计时
    function isDuplicate(pData) {
        const duplicate = pData.nearbyPortals?.find(
            p => p.title === pData.title
        );

        if (!duplicate) return;

        setTimeout(() => {
            const iauto = document.getElementById("id-myheader-autolabel");
            const sc = document.getElementById("id-myheader-timercdowndata");

            if (sc) { sc.textContent += "+20"; }

            if (iauto?.textContent === "自动") {
                const ibtn = document.getElementById("btnauto");
                // 如果需要切换手动模式，可以在这里执行 ibtn?.click();
            }

            console.log("重复po");
            console.log("duplicate dialog", document.querySelector(".wf-duplicate-iw-content") );

            createNotify("可能有重复po", {
                body: duplicate.title,
                icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
                requireInteraction: false
            });
            let titlescore = document.querySelector('#review-page-title');
            if (titlescore) titlescore.textContent = titlescore.textContent + " : 可能有重复po";

            // 查找审核缩略图按钮
            const btn = document.querySelector(
                `#check-duplicates-card button[aria-label="${CSS.escape(duplicate.title)}"]`
            );

            // 找到对应缩略图后点击
            if (btn) {
                btn.click();
                console.log("已自动点击重复候选：", duplicate.title);
            } else {
                console.log("未找到对应的重复候选缩略图：", duplicate.title);
            }

        }, 500);
    }
    function isDuplicate1(pData){
        if(pData.nearbyPortals.find(p => {return p.title === pData.title})){
            setTimeout(function(){
                let iauto = document.getElementById("id-myheader-autolabel");
                //console.log(iauto);
                let sc = document.getElementById("id-myheader-timercdowndata");
                sc.textContent = sc.textContext + "+20";
                if (iauto) {
                    if (iauto.textContent == "自动"){
                        let ibtn = document.getElementById("btnauto");
                        //console.log(ibtn);
                        if (ibtn) {
                            //可能重复po后，改手动(不再改手动)
                            //ibtn.click();
                        }
                    }
                }
                console.log("重复po");
                console.log("duplicate dialog",document.querySelector("app-confirm-duplicate-modal"));
                createNotify("可能有重复po", {
                    body: pData.nearbyPortals.find( p=> {return p.title === pData.title}).title,
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
                    requireInteraction: false
                });
                let btns = document.querySelectorAll('#check-duplicates-card button:has(> img.object-cover.size-full)');
                if(btns.length > 0){
                    //点击标题相同的那个按钮
                }
            },500);
            //}
        }
    }


    //判断云端是否有审核记录，执行跟审或任务审
    async function loadReviewData(pdata){
        console.log("loadReviewData");
        //let sid="05a6bef32a01cc9e39c967677e18763f";
        //console.log("email",useremail);
        let tmptext = '';
        let id=pdata.id;
        let tmpfollow = {id:null,title:null,lat:null,lng:null,review:null,dateTime:null};
        console.log(durl+"/portal/portalreview/portal." +id +".json");
        //因为单用户可能有访问接口限制，故查找审核文件是否存在还用公用接口，改SDK后，试用readR2File
        //let resp = readR2File("portal/portalreview/portal." +id +".json")
        let resp = U_XMLHttpRequest("GET",durl+"/portal/portalreview/portal." +id +".json")
        //await missionGDocFromSDK.readR2File("portal/portalreview/portal." +id +".json")
        .then(res => {
            console.log("res", res);
            if(!res || typeof(res) === "string") {
                cloudReviewData = null;
                setTimeout(function(){
                    let titlescore = document.querySelector('#review-page-title');
                    if (titlescore) titlescore.textContent += "：未找到网络审核记录";
                    setDownLabel(this,'gold');
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                if(pdata.type === "EDIT") editReview(pdata);
                if(pdata.type === "PHOTO") photoReview(pdata);
                if(pdata.type === "NEW") isDuplicate(pdata);
                return null;
            }
            console.log('res',res);
            console.log('restype',typeof(res));

            let creviewdata = null;
            let title=pdata.title;let lat=pdata.lat;let lng=pdata.lng;
            creviewdata = res.content;
            setDownLabel(this,'green');
            cloudReviewData = creviewdata ;
            if(creviewdata === null) { return null; }
            console.log("cloudReviewData",cloudReviewData);
            let rdata = creviewdata;
            //skip：NEW,EDIT,PHOTO都有
            if(rdata.skip){
                if(pdata.canSkip){
                    setTimeout(function(){
                        let titlescore = document.querySelector('#review-page-title');
                        if (titlescore) titlescore.textContent = "照抄网络审核：略过";
                        console.log("titlescore skip",titlescore.textContent);
                    },200);
                    tmpfollow.review = "skip";
                    let perr = document.querySelectorAll('[data-testid="header-review-actions"] > button');
                    perr.forEach( item => {
                        if(item.textContent.indexOf("略過") === 0 ){
                            setTimeout(function(){
                                let iauto = document.getElementById("id-myheader-autolabel");
                                let iskip = true;
                                //console.log("follow:iauto",iauto);
                                if (iauto)
                                {
                                    if (iauto.textContent === "手动") iskip = false;
                                }
                                //console.log("follow:iskip",iskip);
                                if(iskip)
                                {
                                    console.log("略过","略过按钮被点击");
                                    item.click();
                                }
                                else
                                {
                                    console.log("略过","手动：略过按钮未点击");
                                }
                            },5000);
                        }
                    });
                    return true;
                } else {
                    let titlescore = document.querySelector('#review-page-title');
                    if (titlescore) titlescore.textContent = "照抄网络审核：略过。 ！！！但此号略过太多，已不能再略过！！！";
                    console.log("错误","此号不能再略过");
                    createNotify("错误po", {
                        body: "网络审核是略过，但此号已经不能再略过，需人工干预！"+pdata.title,
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                        requireInteraction: true
                    });
                }
                return null;
            }
            //pdata.type=="PHOTO"
            if(pdata.type=="PHOTO"){
                tmptext = "照抄网络审核：";
                const photo = document.querySelector('[data-testid="review-photo-flow"]').querySelector("article").parentNode.querySelectorAll('button[aria-pressed]');
                const photoall = document.querySelector('[data-testid="review-photo-flow"]')
                    .querySelector("article").parentNode.querySelector('button[aria-pressed]:not([aria-label])');
                if(rdata.rejectPhotos.length==0){
                    if(photoall && photoall.getAttribute('aria-pressed') === 'true'){
                        setTimeout(function(){
                            //console.log('photoall',photoall);
                            photoall.click();
                        },500);
                        tmptext = "照抄网络审核：全选";
                    }
                } else{
                    setTimeout(function(){
                        for(let i=0;i<pdata.newPhotos.length;i++){
                            if(photo[i] && photo[i].getAttribute('aria-pressed') === 'true'){
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
                let ilat = null;let ilng = null;
                for(const item of pdata.locationEdits) {
                    if(item.hash === rdata.selectedLocationHash){
                        ilat = item.lat; ilng = item.lng;
                        let stmp = "";
                        if(ilat > pdata.lat ) stmp = "上";
                        if(ilat < pdata.lat ) stmp = "下";
                        if(ilat === pdata.lat && ilng === pdata.lng) stmp = "不变";
                        if(ilng > pdata.lng ) stmp += ";右";
                        if(ilng < pdata.lng ) stmp += ";左";
                        tmptext = "照抄网络审核："+stmp;
                        selectEditLocation(pdata,item.hash,tmptext);
                        break;
                    }
                }
                if(ilat === null) {
                    selectEditLocation(pdata,null,"瞎选一个");
                };
                    /*setTimeout(function(){
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
                            //上面显示跟审挪po的情况
                            const foundItem = missionGDoc.find(item => item.portalID === rdata.id);
                            //console.log('findItem:missionGDoc',missionGDoc);
                            //console.log('foundItem',foundItem);
                            let idscore = document.querySelector("span[id='idscore']");
                            idscore.textContent = foundItem ? foundItem.moveoptions + foundItem.moveplace : "" ;
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
                },500);*/
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
                                let dupbut = document.querySelector(".wf-duplicate-iw-content > .bg-wf-action-primary");
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

                        const buttons = [
                            ...document.querySelectorAll('div#appropriate-card, div#safe-card, div#accurate-and-high-quality-card, div#permanent-location-card, div#socialize-card, div#exercise-card, div#explore-card')
                        ].map(div => div.querySelector('button[aria-pressed]'))
                        .filter(Boolean);
                        console.log(buttons);
                        buttons.forEach(btnitem => {
                            if (btnitem?.getAttribute("aria-pressed") === "false") {
                                btnitem.click();
                            }
                        });
/*
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
                        },3000); */
                    }
                    else {
                        tmptext = "照抄网络审核：非重复";
                        tmpfollow.review="正常非重复";
                    }
                } else if (rdata.rejectReasons){
                    tmptext = "照抄网络审核：否决";
                    tmpfollow.review="否决:"+rdata.rejectReasons;
                    console.log("审核记录拒",rdata.rejectReasons);
                    for(let i=0;i<rdata.rejectReasons.length;i++){
                        //检举
                        if(["ABUSE", "FAKE", "PERSONAL","EXPLICIT","OFFENSIVE"].includes(rdata.rejectReasons[i])){
                            let btncontainer = document.querySelector('.action-button-container');
                            if(btncontainer) {
                                let btn = document.querySelectorAll('.wf-button');
                                if(btn[0]){
                                    btn[0].click();
                                    //click "检举"
                                    //选择检举的项目
                                    //document.querySelectorAll('mat-checkbox.mat-checkbox')[3].childNodes[0].click();
                                    setTimeout(function(){
                                        let chxbtn = document.querySelectorAll('mat-checkbox.mat-checkbox');
                                        for(let i=0;i<rdata.rejectReasons.length;i++)
                                        {
                                            if(rdata.rejectReasons[i] === "ABUSE")
                                            {
                                                if(chxbtn[0]) chxbtn[0].childNodes[0].click();
                                            } else if(rdata.rejectReasons[i] === "FAKE")
                                            {
                                                if(chxbtn[1]) chxbtn[1].childNodes[0].click();
                                            } else if(rdata.rejectReasons[i] === "PERSONAL")
                                            {
                                                if(chxbtn[2]) chxbtn[2].childNodes[0].click();
                                            } else if(rdata.rejectReasons[i] === "EXPLICIT")
                                            {
                                                if(chxbtn[3]) chxbtn[3].childNodes[0].click();
                                            } else if(rdata.rejectReasons[i] === "OFFENSIVE")
                                            {
                                                if(chxbtn[4]) chxbtn[4].childNodes[0].click();
                                            }
                                        }
                                    },500);
                                }
                            }
                        }
                        if(["PRIVATE", "INAPPROPRIATE", "SCHOOL","SENSITIVE","EMERGENCY","GENERIC"].includes(rdata.rejectReasons[i]))
                        {
                            const reasonMap = {
                                "PRIVATE": 0,
                                "INAPPROPRIATE": 1,
                                "SCHOOL": 2,
                                "SENSITIVE": 3,
                                "EMERGENCY": 4,
                                "GENERIC": 5
                            };

                            const reasonIndex = reasonMap[rdata.rejectReasons[i]];

                            if (reasonIndex !== undefined) {
                                console.log("适当拒", rdata.rejectReasons[i]);

                                setTimeout(function () {
                                    const btnapp = document.querySelector(
                                        '#appropriate-card button[aria-label="否"][aria-pressed="false"]'
                                    );

                                    if (btnapp) {
                                        btnapp.click();

                                        setTimeout(function () {
                                            const icbx = document.querySelectorAll(
                                                'input[name="appropriate-rejection-reason"]'
                                            );

                                            if (icbx[reasonIndex]) {
                                                icbx[reasonIndex].click();
                                            }
                                        }, 500);
                                    }
                                }, 500);
                            }
/*
                            console.log("适当拒");
                            setTimeout(function(){
                                //console.log(document.querySelector('#appropriate-card'));
                                const btnapp = document.querySelector("#appropriate-card")?.querySelector('button[aria-label="否"][aria-pressed="false"]');
                                if(btnapp)
                                { //
                                    if (btnapp) {
                                        btnapp.click();
                                    }
                                    setTimeout(function(){
                                        let icbx = document.querySelectorAll("input[name='appropriate-rejection-reason']");
                                        //console.log("icbx",icbx);
                                        if(icbx && icbx[i]) {
                                            //let ic = document.getElementById(document.querySelector("input[value='GENERIC']").getAttribute("id"));
                                            //console.log(icbx);
                                            //setTimeout(function(){ic.checked = true;},500);
                                            icbx[i].click();
                                        }
                                    },500);
                                }
                            },500); */
                        }
                        else if (rdata.rejectReasons[i] === "UNSAFE")
                        {
                            //document.querySelector("div[aria-labelledby='_r_q_']"); 弹出后的，在提交处用这个
                            //setTimeout(function(){
                            const btnsafe = document.querySelector("#safe-card")?.querySelector('button[aria-label="否"][aria-pressed="false"]');
                            if(btnsafe)
                            { //
                               btnsafe.click();
                            }
                            //},1000);
                        }
                        else if (rdata.rejectReasons[i] === "TEMPORARY")
                        {
                            const btntemp = document.querySelector("#permanent-location-card")?.querySelector('button[aria-label="否"][aria-pressed="false"]');
                            if(btntemp) {
                                btntemp.click();
                            }
                        }
                        else
                        { //document.querySelector("#accurate-and-high-quality-card")?.querySelector('button[aria-label="否"][aria-pressed="false"]');
                            if (rejectReasons.some(x => x.en === rdata.rejectReasons[i])) {
                                console.log("准确拒", rdata.rejectReasons);
                                let dcbxstr = rejectReasons.find(x => x.en === rdata.rejectReasons[i])?.zh;

                                let btnaccd = document
                                .querySelector("#accurate-and-high-quality-card")
                                ?.querySelector('button[aria-label="否"][aria-pressed="false"]');

                                if (btnaccd) {
                                    btnaccd.click();
                                }

                                // 等待 DOM 更新
                                async function findAndClick() {

                                    await new Promise(resolve => setTimeout(resolve, 150));

                                    // =================================
                                    // 1. 处理四个互斥的 section
                                    // =================================
                                    let seccol = document.querySelectorAll("div[aria-labelledby='_r_b_'] section");
                                    let sectionMatched = false;

                                    for (let sec of seccol) {

                                        // 展开当前 section
                                        let btnexp = sec.querySelector("button[aria-expanded='false']");

                                        if (btnexp) {
                                            btnexp.click();
                                        }

                                        // 等待展开及 DOM 更新
                                        await new Promise(resolve => setTimeout(resolve, 150));

                                        // 查找当前 section 下的所有 input
                                        let inputcol = sec.querySelectorAll("input.accent-review-selection");
                                        // 当前 section 内所有匹配项都点击
                                        inputcol.forEach(inputitem => {
                                            let labelText = inputitem.nextElementSibling?.textContent || "";
                                            if (labelText.includes(dcbxstr)) {
                                                inputitem.click();
                                                console.log("section 匹配成功:", labelText);
                                            }
                                        });
                                    }


                                    // =================================
                                    // 2. 处理一直展开的 label
                                    // =================================
                                    let labelcol = document.querySelectorAll("div[aria-labelledby='_r_b_'] > label");
                                    labelcol.forEach(label => {
                                        let inputcol = label.querySelectorAll("input.accent-review-selection");
                                        inputcol.forEach(inputitem => {
                                            let labelText = inputitem.nextElementSibling?.textContent || "";
                                            if (labelText.includes(dcbxstr)) {
                                                inputitem.click();
                                                console.log("label 匹配成功:", labelText);
                                            }
                                        });
                                    });


                                    // =================================
                                    // 3. 处理一直展开的 div
                                    // =================================
                                    let divcol = document.querySelectorAll("div[aria-labelledby='_r_b_'] > div");
                                    divcol.forEach(div => {
                                        let inputcol = div.querySelectorAll("input.accent-review-selection");
                                        inputcol.forEach(inputitem => {
                                            let ariaLabel =
                                                inputitem.getAttribute("aria-label") || "";
                                            if (ariaLabel.includes(dcbxstr)) {
                                                inputitem.click();
                                                console.log("div 匹配成功:", ariaLabel);
                                            }
                                        });
                                    });
                                }

                                findAndClick();

                            }
                            /*if(rejcbxengstr.indexOf(rdata.rejectReasons[i]) >= 0) {
                                console.log("准确拒",rdata.rejectReasons);
                                let dcbxstr = rejcbxchnstr[rejcbxengstr.indexOf(rdata.rejectReasons[i])];
                                let btnaccd = document.querySelector("#accurate-and-high-quality-card")?.querySelector('button[aria-label="否"][aria-pressed="false"]');
                                if(btnaccd) {
                                    btnaccd.click();
                                }
                                let seccol = document.querySelectorAll("div[aria-labelledby='_r_b_'] section");
                                seccol.forEach(sec => {
                                    let btnexp = sec.querySelector("button[aria-expanded='false']");
                                    if(btnexp) btnexp.click();
                                    setTimeout(function(){
                                        let inputcol = sec.querySelectorAll("input.accent-review-selection");
                                        inputcol.forEach(inputitem => {
                                            if(inputitem.nextElementSibling()?.textContent.indexOf(dcbxstr) >=0 ) {
                                                inputitem.click();
                                            };
                                        });
                                    },100);

                                });

                            } */
                        }
                    }
                }
            }//pdata=="NEW"
            //改显示标签
            setTimeout(function(){
                let score1 = tmptext.replace(/[YND]/g, char => ({
                    Y: "是",
                    N: "否",
                    D: "懵"
                })[char]);

                let titlescore = document.querySelector('#review-page-title');
                if (titlescore) titlescore.textContent = score1;
                //let ilabel = document.getElementById("iduserlabel");
                //if(ilabel) ilabel.textContent = tmptext;
                console.log("iduserlabel",score1);
            },500);
            //console.log("return true");
            return true;
        },
              err=>{
            console.log("未找到审核记录:"+id);
            return null;
        }
             )
        return null;
    }

    //*********************   *********************//
    function setUpLabel(obj,color){
        Logger.log(DISLOG3, 'setUpLabel', obj);Logger.log(DISLOG3, 'setUpLabel', color);
        setTimeout(function(){
            let iup = document.getElementById("id-myheader-updownlabel1");
            if(iup) iup.style=`font-weight:bold;color:${color}`;
        },2000);
    }
    function setDownLabel(obj,color){
        Logger.log(DISLOG3, 'setDownLabel', obj);Logger.log(DISLOG3, 'setDownLabel', color);
        const idown = document.getElementById("id-myheader-updownlabel2");
        if(idown) idown.style=`font-weight:bold;color:${color}`;
    }

    function getLocationHash(pdata, iplan) {
        const locations = pdata?.locationEdits;

        if (!Array.isArray(locations) || locations.length === 0) {
            return null;
        }

        // 只保留有效经纬度数据
        const validLocations = locations.filter(item =>
                                                item.hash &&
                                                Number.isFinite(Number(item.lat)) &&
                                                Number.isFinite(Number(item.lng))
                                               );

        if (validLocations.length === 0) return null;

        let sorted;

        if (iplan >= 1 && iplan <= 10) {
            // 西 → 东：经度从小到大
            sorted = [...validLocations].sort(
                (a, b) => Number(a.lng) - Number(b.lng)
            );

            if (iplan === 10) {
                return sorted[sorted.length - 1].hash;
            }

            return sorted[iplan - 1]?.hash ?? null;
        }

        if (iplan >= 11 && iplan <= 20) {
            // 北 → 南：纬度从大到小
            sorted = [...validLocations].sort(
                (a, b) => Number(b.lat) - Number(a.lat)
            );

            if (iplan === 20) {
                return sorted[sorted.length - 1].hash;
            }

            return sorted[iplan - 11]?.hash ?? null;
        }

        return null;
    }
    function selectEditLocation(edit, hash = null, tmptext = null) {
        // 查找包含目标 Marker 的地图 Fiber
        function findMapFiber() {
            for (const element of document.querySelectorAll("*")) {
                const fiberKey = Object.keys(element).find(key =>
                                                           key.startsWith("__reactFiber$")
                                                          );

                if (!fiberKey) continue;

                let fiber = element[fiberKey];

                while (fiber) {
                    const props = fiber.memoizedProps;

                    if (
                        props &&
                        Array.isArray(props.markers) &&
                        typeof props.onMarkerClick === "function" &&
                        props.markers.some(marker => marker.id === targetHash)
                    ) {
                        return fiber;
                    }

                    fiber = fiber.return;
                }
            }

            return null;
        }

        if(DIS_REVIEWMARK_LOG) console.log('selectEditLocation start');
        if (
            !edit ||
            !Array.isArray(edit.locationEdits) ||
            edit.locationEdits.length === 0
        ) {
            console.warn("无效的 EDIT 数据或 locationEdits 为空");
            return false;
        }

        // 确定目标 hash：优先使用传入值，否则使用第一个 locationEdit
        const targetHash = hash ?? edit.locationEdits[0].hash;
        if(DIS_REVIEWMARK_LOG) console.log('hash,targetHash',hash,targetHash);

        // 查找指定位置
        const location = edit.locationEdits.find(item =>
                                                 item.hash === targetHash
                                                );
        if(DIS_REVIEWMARK_LOG) console.log('EDITlocation',location);

        if (!location) {
            console.warn("找不到指定的 locationEdit:", targetHash);
            return false;
        }

        const fiber = findMapFiber();

        if (!fiber) {
            console.warn(
                "没有找到包含目标 Marker 的地图 Fiber:",
                targetHash
            );
            return false;
        }

        const props = fiber.memoizedProps;

        // 调用网站自己的 Marker 点击处理函数
        props.onMarkerClick({
            id: targetHash
        });

        // 更新标题
        const titlescore = document.querySelector("#review-page-title");
        if (titlescore) {
            titlescore.textContent = tmptext ?? "";
        }

        console.log("已选择位置：", {
            editId: edit.id,
            title: edit.title,
            hash: targetHash,
            lat: location.lat,
            lng: location.lng
        });

        return true;
    }


    // =========================================================
    // 审核记录操作：上传 本地保存
    // =========================================================
    //保存审核数据 => 本地， 判断是否需要上传
    async function savePostData(data) {

        const DISLOG = false;
        // =====================================================
        // 1. 获取并标准化本次 payload
        // =====================================================

        const currentData = structuredClone(data);
        //const currentData = normalizePayload(data);

        const currentId = currentData.id;

        if (currentId == null) {
            if(DISLOG) console.warn("payload 缺少 id，不上传");
            return;
        }

        const cloudData = cloudReviewData;

        const hasCloudData =
              cloudData !== null &&
              cloudData !== undefined;

        const isSkip = isSkipPayload(currentData);
        // =====================================================
        // 2. 判断是否需要上传
        // =====================================================

        const isDifferent = hasCloudData
        ? !areReviewDataEqual(cloudData, currentData)
        : true;

        const isForcedUpload = isPortalInMission();
        //const isForcedUpload = hasMissionTask();
        let shouldUpload = false;

        if (!hasCloudData) {
            // 云端没有数据： 只有用户主动点击才上传
            shouldUpload = isUserClick;
        } else if (isUserClick) {
            //quality:准确 safety:安全 location:永久 uniqueness:独特 socialize:社交 exercise:运动 cultural:探索
            const isFiveStar =
                  data.quality === 5 &&
                  data.safety === 5 &&
                  data.location === 5 &&
                  data.uniqueness === 5 &&
                  data.socialize === 5 &&
                  data.exercise === 5 &&
                  data.cultural === 5;
            // 用户主动点击： 本次与云端不同才上传
            shouldUpload = isDifferent && isFiveStar;
        } else {
            // 非用户主动点击： 本次与云端不同才上传
            shouldUpload = isDifferent;
        }
        // 保留原有 missionGDoc 强制上传规则
        if (isForcedUpload) {
            shouldUpload = true;
        }

        Logger.log(DISLOG2, "云端数据:", cloudData);
        Logger.log(DISLOG2, "本次 payload:", currentData);
        Logger.log(DISLOG2, "云端是否存在:", hasCloudData);
        Logger.log(DISLOG2, "用户主动点击:", isUserClick);
        Logger.log(DISLOG2, "本次是否 skip:", isSkip);
        Logger.log(DISLOG2, "本次与云端是否一致:", !isDifferent);
        Logger.log(DISLOG2, "是否强制上传:", isForcedUpload);
        Logger.log(DISLOG2, "最终是否上传:", shouldUpload);

        // =====================================================
        // 3. 云端存在时，保存本地跟审记录
        // =====================================================

        if (hasCloudData) {
            try {
                const followData = createFollowData( currentData, cloudData);
                if (followData) {
                    await saveFollowData(followData);
                }

            } catch (error) {
                console.error("保存跟审记录失败:", error);
            }

        }

        // =====================================================
        // 4. 判断是否上传
        // =====================================================

        if (!shouldUpload) {
            Logger.log(DISLOG2, "不上传:", currentId, portalData?.title );
            Logger.log(DISLOG2, "⏸审核结束:", currentId, portalData?.title );
            return;
        }

        // =====================================================
        // 5. 调用上传接口
        // =====================================================

        Logger.log(DISLOG2, "调用上传接口:", currentId, portalData?.title );

        try {
            const uploadData = prepareUploadData(data);

            if (!uploadData) {

                if(DISLOG) console.warn("上传数据格式错误，取消上传");
                return;

            }

            Logger.log(DISLOG2, "最终上传数据:", uploadData);

            await uploadPostData(uploadData);

        } catch (error) {
            console.error("上传审核数据失败:", error);
        }

    }
    //保存跟审记录 => 本地
    async function saveFollowData(followData) {
        if(useremail === null || useremail === "" ){
            const restext = await getUserPromise();
            // 处理用户信息
            useremail = restext.result.socialProfile.email;
            if (!useremail) {
                console.warn("无法获取用户邮箱，跳过跟审记录保存");
                return;
            }
        }

        const storageKey = useremail + "follow";
        let followList = [];
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData)) {
                    followList = parsedData;
                }
            }

        } catch (error) {
            console.error("读取本地跟审记录失败:", error);
        }

        // 根据 id 去重
        const existingIndex = followList.findIndex(
            item => item.id === followData.id
        );

        if (existingIndex >= 0) {
            // 已存在：更新当前记录
            followList[existingIndex] = followData;
        } else {
            // 不存在：新增
            followList.push(followData);
        }

        localStorage.setItem(
            storageKey,
            JSON.stringify(followList)
        );

        console.log("保存跟审记录:", followData);

    }

    //保存上传记录 => 本地
    async function saveUploadHistory(tmpupload) {

        if (!useremail) {
            const userInfo = await getUserPromise();
            const useremail = userInfo?.result?.socialProfile?.email;
            if (!useremail) {
                console.warn("无法获取用户邮箱，取消本地保存上传记录:", tmpupload.id || '无id');
                return;
            }
        }

        const storageKey = useremail + "upload";

        let localpd = [];

        try {

            const savedData = localStorage.getItem(storageKey);

            if (savedData) {

                const parsedData = JSON.parse(savedData);

                if (Array.isArray(parsedData)) {

                    localpd = parsedData;

                }

            }

        } catch (error) {

            console.error("读取本地 upload 记录失败:", error);

        }

        // -----------------------------------------------------
        // 根据 id 更新或新增
        // -----------------------------------------------------

        const index = localpd.findIndex(
            item => item.id === tmpupload.id
        );

        if (index >= 0) {

            localpd[index] = tmpupload;

        } else {

            localpd.push(tmpupload);

        }

        localStorage.setItem(
            storageKey,
            JSON.stringify(localpd)
        );

        Logger.log(DISLOG3, "保存本地上传记录:", tmpupload);

    }

    // 上传接口
    async function uploadPostData(data) {

        const DISLOG = false;
        // =====================================================
        // 1. 标准化上传数据
        // =====================================================

        const uploadData = normalizePayload(data);

        if (!uploadData || uploadData.id == null) {
            console.warn("上传数据无效:", data);
            return;

        }

        const id = uploadData.id;

        // 当前原始审核数据
        const pdata = portalData;

        if (!pdata || pdata.id !== id) {

            console.warn(
                "原始审核数据与上传数据不匹配:",
                id,
                pdata?.id
            );

            return;

        }

        // =====================================================
        // 2. 获取用户邮箱
        // =====================================================
        if (!useremail) {
            const userInfo = await getUserPromise();
            const useremail = userInfo?.result?.socialProfile?.email;
            if (!useremail) {
                console.warn("无法获取用户邮箱，取消上传:", id);
                return;
            }
        }

        // =====================================================
        // 3. 创建本地审核记录
        // =====================================================

        const tmpupload = {
            id: id,
            title: pdata.title,
            lat: pdata.lat,
            lng: pdata.lng,
            review: null,
            dateTime: new Date()
        };

        // =====================================================
        // 4. 判断 skip
        // =====================================================

        const isSkip = isSkipPayload(uploadData);

        if (isSkip) {
            tmpupload.review = "skip";
            uploadData.skip = true;
        } else {
            if(DISLOG) console.log('isskip',isSkip);
            // 普通审核必须删除 skip
            //delete uploadData.skip;

            // =================================================
            // 5. 根据审核类型生成用户审核记录
            // =================================================

            switch (portalData.type) {

                case "NEW":
                    createNewReview(data, pdata, tmpupload);
                    break;
                case "EDIT":
                    tmpupload.review = createEditReview(data, pdata);
                    break;
                case "PHOTO":
                    tmpupload.review = JSON.stringify({
                        acceptPhotos: data.acceptPhotos,
                        rejectPhotos: data.rejectPhotos
                    });
                    break;
                default:
                    console.warn("未知审核类型:", portalData.type, id);
                    return;
            }
            if( data.skip) {
                tmpupload.review = 'skip';
            }

        }

        // =====================================================
        // 6. 添加用户审核信息
        // =====================================================

        uploadData.UserReview = tmpupload.review;
        uploadData.UserEmail = useremail;
        uploadData.reviewFlag = "更新";

        // =====================================================
        // 7. 保存本地 upload 记录
        // =====================================================

        try {
            await saveUploadHistory(tmpupload);
        } catch (error) {
            console.error("保存本地审核记录失败:", error);
        }

        // =====================================================
        // 8. 上传至 R2
        // =====================================================

        try {

            Logger.log(DISLOG3, "上传审核数据:", uploadData);

            const res = await missionGDocFromSDK.uploadDataToR2(
                "portal/portalreview/",
                "portal." + id + ".json",
                uploadData,
                DISLOG3
            );

            Logger.log(DISLOG3, "审核上传结束:", id);
            Logger.print(DISLOG3);

        } catch (error) {

            console.error(
                "R2 上传失败:",
                id,
                error
            );

        }

    }

    //////=====  =====//////
    // 创建本地跟审记录
    function createFollowData(currentData, cloudData) {

        if (!portalData) {
            return null;
        }

        const followData = {
            id: currentData.id,
            title: portalData.title,
            lat: portalData.lat,
            lng: portalData.lng,
            review: null,
            dateTime: new Date()
        };
        const pdata = portalData ;
        switch (portalData.type) {
            case "NEW":
                createNewReview(currentData, pdata, followData);
                break;
            case "EDIT":
                followData.review = createEditReview(currentData, pdata, cloudData);
                break;
            case "PHOTO":
                followData.review = JSON.stringify({
                    acceptPhotos: currentData.acceptPhotos,
                    rejectPhotos: currentData.rejectPhotos
                });
                break;
            default:
                console.warn("未知审核类型:", portalData.type, portalData.id);
                return;
        }
        if (currentData.skip || isSkipPayload(currentData)) {
            followData.review = 'skip' ;
        }
        return followData;

    }
    // 格式化上传数据：也没做啥工作，就是确保json一下 | skip的时候只保留id,skip
    function prepareUploadData(data) {

        const payload = normalizePayload(data);

        if (!payload) {
            return null;
        }

        // skip 请求：只有 id
        if (isSkipPayload(payload)) {

            return {
                id: payload.id,
                skip: true
            };

        }

        // 普通审核数据：
        // 无论原始数据是否存在 skip，都删除该字段
        delete payload.skip;

        return payload;

    }

    // NEW：生成审核记录
    function createNewReview(data, pdata, tmpupload) {

        // -----------------------------------------------------
        // 重复 / 否决
        // -----------------------------------------------------

        if (data.duplicate) {

            tmpupload.review = "重复:" + data.duplicateOf;

        }
        if(data.rejectReasons) {

            tmpupload.review = "否决:" + JSON.stringify(data.rejectReasons);

        }

        // -----------------------------------------------------
        // 五星 / 附近任务
        // -----------------------------------------------------

        else if (data.cultural) {

            const isFiveStar =
                  data.cultural === 5 &&
                  data.exercise === 5 &&
                  data.location === 5 &&
                  data.quality === 5 &&
                  data.safety === 5 &&
                  data.socialize === 5 &&
                  data.uniqueness === 5;

            if (isFiveStar) {

                tmpupload.review = "五星";

            } else {

                const nearbyPortals = pdata.nearbyPortals || [];

                if (
                    nearbyPortals.some(
                        item => item.title === pdata.title
                    )
                ) {

                    // 保留原来的附近任务判断
                    tmpupload.review = "";

                }

            }

        }

        // -----------------------------------------------------
        // 新位置
        // -----------------------------------------------------

        if (data.newLocation) {

            tmpupload.review =
                (tmpupload.review || "") +
                ":挪" +
                data.newLocation;

        }

        // -----------------------------------------------------
        // 普通评分
        // -----------------------------------------------------

        else {

            const scoreToChar = score => {

                if (score === 5) return "Y";

                if (score === 3) return "D";

                if (score === 1) return "N";

                return "";

            };

            tmpupload.review =
                scoreToChar(data.quality) +
                scoreToChar(data.safety) +
                scoreToChar(data.location) +
                scoreToChar(data.uniqueness) +
                scoreToChar(data.socialize) +
                scoreToChar(data.exercise) +
                scoreToChar(data.cultural);

            if (tmpupload.review === "YYYYYYY") {

                tmpupload.review = "五星";

            }

        }

    }

    // EDIT：生成位置变化记录
    function createEditReview(data, pdata, cloudData = null) {

        if (!data || !pdata) {
            return null;
        }

        const locationEdits = pdata.locationEdits || [];

        const currentHash = data.selectedLocationHash;

        if (currentHash == null) {
            return null;
        }

        // -----------------------------------------------------
        // 查找本次实际位置
        // -----------------------------------------------------

        const currentLocation = locationEdits.find(
            item => item.hash === currentHash
        );

        if (!currentLocation) {
            return null;
        }

        const baseLat = pdata.lat;
        const baseLng = pdata.lng;

        const currentLat = currentLocation.lat;
        const currentLng = currentLocation.lng;

        // -----------------------------------------------------
        // 生成本次实际位置描述
        // -----------------------------------------------------

        const actualReview = createLocationDescription(
            baseLat,
            baseLng,
            currentLat,
            currentLng
        );

        // -----------------------------------------------------
        // 没有云端数据：用于上传
        // -----------------------------------------------------

        if (cloudData == null) {

            return actualReview;

        }

        // -----------------------------------------------------
        // 有云端数据：用于跟审
        // -----------------------------------------------------

        const cloudHash = cloudData.selectedLocationHash;

        // 云端和本次选择相同
        if (cloudHash === currentHash) {

            return actualReview + "|与云一致";

        }

        // -----------------------------------------------------
        // 查找云端位置
        // -----------------------------------------------------

        const cloudLocation = locationEdits.find(
            item => item.hash === cloudHash
        );

        if (!cloudLocation) {

            return actualReview + "|云端位置不存在";

        }

        const cloudReview = createLocationDescription(
            baseLat,
            baseLng,
            cloudLocation.lat,
            cloudLocation.lng
        );

        // -----------------------------------------------------
        // 云端位置 + 实际位置
        // -----------------------------------------------------

        return cloudReview + "|实际:" + actualReview;

    }

    // 标准化 payload
    function normalizePayload(data) {

        if (data == null) {
            return null;
        }

        let payload = data;

        // 兼容 JSON 字符串
        if (typeof payload === "string") {

            try {

                payload = JSON.parse(payload);

            } catch (error) {

                console.error("payload JSON 解析失败:", error);

                return null;

            }

        }

        // 兼容旧代码中 data[0] 为 JSON 字符串的情况
        if (Array.isArray(payload)) {

            if (payload.length === 0) {
                return null;
            }

            payload = payload[0];

            if (typeof payload === "string") {

                try {

                    payload = JSON.parse(payload);

                } catch (error) {

                    console.error("payload[0] JSON 解析失败:", error);

                    return null;

                }

            }

        }

        if (
            typeof payload !== "object" ||
            payload === null ||
            Array.isArray(payload)
        ) {

            return null;

        }

        return structuredClone(payload);

    }

    // 新的 skip payload 只有 id
    function isSkipPayload(data) {

        return (
            data &&
            data.id != null &&
            Object.keys(data).length === 1 &&
            Object.hasOwn(data, "id")
        );

    }
    function areReviewDataEqual(cloudData, currentData) {

        if (!cloudData || !currentData) {
            return false;
        }

        const cloud = normalizePayload(cloudData);
        const current = normalizePayload(currentData);

        if (!cloud || !current) {
            return false;
        }

        if (cloud.id !== current.id) {
            return false;
        }

        const currentIsSkip = isSkipPayload(current);

        // 本次是 skip
        if (currentIsSkip) {

            // 云端已经是 skip，视为一致
            return cloud.skip === true;

        }

        // 本次是普通审核，但云端是 skip
        // 必须判定为不一致，触发上传并清除云端 skip
        if (cloud.skip === true) {
            return false;
        }

        // 普通审核数据比较
        const normalizedCloud = normalizeReviewData(cloud);
        const normalizedCurrent = normalizeReviewData(current);

        //两个对象：数量、key、数值一样则返回true
        return areObjectsEqual(
            normalizedCloud,
            normalizedCurrent
        );

    }

    // 审核数据标准化
    function normalizeReviewData(data) {

        const result = structuredClone(data);

        // 这些字段不参与比较
        result.acceptCategories = null;
        result.rejectCategories = null;

        // skip 缺失时统一为 false
        if (result.skip == null) {
            result.skip = false;
        }

        return result;

    }

    // 统一生成位置变化描述
    function createLocationDescription(baseLat, baseLng, targetLat, targetLng) {

        if (
            baseLat == null ||
            baseLng == null ||
            targetLat == null ||
            targetLng == null
        ) {

            return "";

        }

        let review = "";

        // -----------------------------------------------------
        // 纬度
        // -----------------------------------------------------

        if (targetLat > baseLat) {

            review = "上:" + baseLat + "=>" + targetLat;

        } else if (targetLat < baseLat) {

            review = "下:" + baseLat + "=>" + targetLat;

        } else {

            review = "上下不变:" + baseLat;

        }

        // -----------------------------------------------------
        // 经度
        // -----------------------------------------------------

        if (targetLng > baseLng) {

            review += ";右:" + baseLng + "=>" + targetLng;

        } else if (targetLng < baseLng) {

            review += ";左:" + baseLng + "=>" + targetLng;

        } else {

            review += ";左右不变:" + baseLng;

        }

        return review;

    }

    //备份版本，不再使用
    async function savePostData1(data){

        const DISLOG = false;
        //console.log("传入的审核数据",data);
        //云端非空：跟审
        //console.log("rd1",rd1);console.log("rd2",rd2);console.log("jsondata0",JSON.parse(data[0]));
        if(cloudReviewData === null) {
            if(isUserClick) uploadPostData(portalData,data,0,false);
            return;
        }

        let rd1=cloudReviewData;
        let rd2=structuredClone(data);

        let tmpfollow = {id:null,title:null,lat:null,lng:null,review:null,dateTime:null};

        try{
            //console.log("savePostData-portalData",portalData);
            //console.log("savePostData-tmpfollow",tmpfollow);
            //console.log("savePostData-data",data);
            tmpfollow.id = rd2.id;tmpfollow.title=portalData.title;tmpfollow.lat=portalData.lat;tmpfollow.lng=portalData.lng;
            //console.log("rd2.EDIT,selectedLocationHash",rd2.type === "EDIT" & rd2.selectedLocationHash !== null);
            if(rd2.type === "EDIT" & rd2.selectedLocationHash !== null){
                let ilat = null;let ilng = null; let idlat = null;let idlng = null; let stmp ="";
                for(const item of portalData.locationEdits) {
                    if(item.hash === rd1.selectedLocationHash){
                        ilat = item.lat; ilng = item.lng;
                    }
                    if(item.hash === rd2.selectedLocationHash){
                        idlat = item.lat; idlng = item.lng;
                    }
                }
                //console.log("ilat",ilat);
                //console.log("idlat",idlat);
                if(idlat !== null) {
                    if(ilat > portalData.lat ) stmp = "上:"+ilat;
                    if(ilat < portalData.lat ) stmp = "下:"+ilat;
                    if(ilat === portalData.lat ) stmp = "不变:"+ilat;
                    if(ilng > portalData.lng ) stmp += ";右:"+ilng;
                    if(ilng < portalData.lng ) stmp += ";左:"+ilng;
                    if(ilng === portalData.lng ) stmp += ";不变:"+ilng;
                    if(rd1.selectedLocationHash === rd2.selectedLocationHash){
                        tmpfollow.review = stmp + "|与云一致";
                    } else {
                        stmp += "|实际:";
                        if(idlat > portalData.lat ) stmp += "上:"+idlat;
                        if(idlat < portalData.lat ) stmp += "下:"+idlat;
                        if(idlat === portalData.lat ) stmp += "不变:"+idlat;
                        if(idlng > portalData.lng ) stmp += ";右:"+idlng;
                        if(idlng < portalData.lng ) stmp += ";左:"+idlng;
                        if(idlng === portalData.lng ) stmp += ";不变:"+idlng;
                        tmpfollow.review = stmp;
                    }
                    //console.log("savePostData-tmpfollow",tmpfollow);
                }
            }

            let localpd1 = [];
            tmpfollow.dateTime = new Date();
            if(useremail === null || useremail === "" ){
                const restext = await getUserPromise();
                // 处理用户信息
                useremail = restext.result.socialProfile.email;
                if(localStorage.getItem(useremail+"follow")) localpd1 = JSON.parse(localStorage.getItem(useremail+"follow"));
                if(DISLOG) console.log("得到用户并保存跟审-"+useremail,tmpfollow);
                if(localpd1.length === 0){
                    //console.log(useremail+"follow 1",JSON.stringify(tmpfollow));
                    localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                } else {
                    //console.log(useremail+"follow n",JSON.stringify(tmpfollow));
                    localpd1.push(tmpfollow);
                    localStorage.setItem(useremail+"follow",JSON.stringify(localpd1));
                }
            } else {
                if(DISLOG) console.log("跟审useremail",useremail);
                if(localStorage.getItem(useremail+"follow")) localpd1 = JSON.parse(localStorage.getItem(useremail+"follow"));
                if(DISLOG) console.log("保存跟审-"+useremail,tmpfollow);
                if(localpd1.length === 0){
                    //console.log(useremail+"follow 1",JSON.stringify(tmpfollow));
                    localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                } else {
                    //console.log(useremail+"follow n",JSON.stringify(tmpfollow));
                    localpd1.push(tmpfollow);
                    localStorage.setItem(useremail+"follow",JSON.stringify(localpd1));
                }
            }
        } catch(e){
            console.log("错误",e);
        }


        let iautolabel = document.querySelector("p[id='idautolabel']");
        if(DISLOG) console.log("云审核数据:",rd1);
        if(rd1) {
            rd1.acceptCategories=null;rd1.rejectCategories=null;
            if(!rd1.skip) rd1.skip=false;
        }
        if(DISLOG) console.log("本次审核数据:",rd2);
        if(rd2) {
            rd2.acceptCategories=null;rd2.rejectCategories=null;
            if(!rd2.skip) rd2.skip=false;
        }
        let rs1=JSON.stringify(rd1);let rs2=JSON.stringify(rd2);
        let rsstr = "";
        if(areObjectsEqual(rd1,rd2)) rsstr = "一致"; else rsstr = "不一致";
        if(DISLOG) console.log("本地与云对比 : rsstr",rsstr);
        if(DISLOG) console.log("调用上传接口",isUserClick);
        setTimeout(function(){

            if(tmpfollow.id != null){
                let localpd1 = [];
                if(localStorage.getItem(useremail+"follow")) localpd1 = JSON.parse(localStorage.getItem(useremail+"follow"));
                if(localpd1.length === 0){
                    //console.log("saving local follow 1");
                    localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                } else {
                    //console.log("saving local follow n");
                    localpd1.push(tmpfollow);
                    localStorage.setItem(useremail+"follow",JSON.stringify(localpd1));
                }
            }

            if(isUserClick && rsstr === "不一致") {
                uploadPostData(portalData,data,0,false);
            } else {
                const item = missionGDoc.find(item => item.title === portalData.title);
                if(item){
                    console.log("被迫上传",rd2.id+":"+portalData.title);
                    uploadPostData(portalData,data,0,false);
                }
                if(DISLOG) console.log("不上传",rd2.id+":"+portalData.title);
                console.log("⏸审核结束:",rd2.id+":"+portalData.title);
            }
        },200);
        /*
        if(iautolabel){
        if (iautolabel.textContent == "手动" & rsstr === "不一致"){
            //console.log("data",JSON.parse(data));
            //uploadPostData(portalData,data,0,false);
        }
        } else {
            console.log("与云对比时发生错误，无法读取iautolabel标签");
        } */
    };

    // 以下四个函数不再使用
    //判断是否需要上传审核至云端，及保存至本地：用户+upload
    function uploadPostDataolder(pdata,rdata,icloud,iskip){
        let data = rdata ;
        //console.log("检查是否需要上传审核数据...");
        //console.log(data);
        //console.log(iskip);
        let localpd = [];
        if(localStorage.getItem(useremail+"upload")) localpd = JSON.parse(localStorage.getItem(useremail+"upload"));
        let tmpupload={id:null,title:null,lat:null,lng:null,review:null,dateTime:null};
        tmpupload.id=data.id; tmpupload.dateTime = new Date();

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
            if(data.newLocation) {tmpupload.review = tmpupload.review+":挪"+data.newLocation; isave=1}
            else {
                function scoreToChar(score) {
                    if (score === 5) return "Y";
                    if (score === 3) return "D";
                    if (score === 1) return "N";
                    return "";
                }
                tmpupload.review =
                    scoreToChar(rdata.quality) +
                    scoreToChar(rdata.safety) +
                    scoreToChar(rdata.location) +
                    scoreToChar(rdata.uniqueness) +
                    scoreToChar(rdata.socialize) +
                    scoreToChar(rdata.exercise) +
                    scoreToChar(rdata.cultural);
                if(tmpupload.review === "YYYYYYY") tmpupload.review = "五星" ;
            }
        } else if(data.type=="EDIT"){
            //pdata.locationEdits[i].hash = data.selectedhash => pdata.locationEdits[i].value
            let ilat = null;let ilng = null;
            for(const item of pdata.locationEdits) {
                if(item.hash === data.selectedLocationHash){
                    ilat = item.lat; ilng = item.lng;
                }
            }
            if(ilat !== null) {
                let stmp = "";
                if(ilat > pdata.lat ) stmp = "上:"+pdata.lat+'=>'+ilat;
                if(ilat < pdata.lat ) stmp = "下:"+pdata.lat+'=>'+ilat;
                if(ilat === pdata.lat ) stmp = "上下不变:"+pdata.lat;
                if(ilng > pdata.lng ) stmp += ";右:"+pdata.lng+'=>'+ilng;
                if(ilng < pdata.lng ) stmp += ";左:"+pdata.lng+'=>'+ilng;
                if(ilng === pdata.lng ) stmp += ";左右不变:"+pdata.lng;
                tmpupload.review=stmp;
            }
            isave=1;
        } else if(data.type=="PHOTO"){
            tmpupload.review = "PHOTO" ;
            isave=1;
        }
        //console.log("isave",isave);
        //用于保存用户审核结果
        if(isave==1){
            data.UserReview = tmpupload.review ;
            data.UserEmail = useremail;
            data.reviewFlag = "更新";
            try{
                //console.log("上传审核结果...");
                if(icloud==0 || icloud==2){
                    //保存至本地
                    if(localpd.length==0){
                        localStorage.setItem(useremail+"upload","["+JSON.stringify(tmpupload)+"]");
                    } else {
                        localpd.push(tmpupload);
                        localStorage.setItem(useremail+"upload",JSON.stringify(localpd));
                    }
                    //上传至云端
                    console.log("上传...",data.id);
                    //gmrequest("PUT",surl,"portal/portalreview/portal."+data.id,JSON.stringify(data));
                    uploadDataToR2("portal/portalreview/","portal."+data.id+".json",data);
                    console.log("审核结束:",data.id);
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
            console.log('不上传tmpupload：',tmpupload);
            //data.reviewFlag = "跟审";
            console.log("用户审核记录上传...",data.id);
            //gmrequest("PUT",surl,"portal/portalreview/portal."+data.id,JSON.stringify(data));
            //uploadDataToR2("portal/portalreview/","portal."+data.id+".json",data);
            console.log("审核结束:",data.id);
            //let iup = document.getElementById("iduplabel");
            //if(iup) iup.style="font-weight:bold;color:#f6f5ec";
        }
    }
    //*********************  挪po排序操作 *********************//
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


})();
