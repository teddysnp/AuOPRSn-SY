// ==UserScript==
// @name         AuOPRSn-SY-Follow
// @namespace    AuOPR
// @version      4.1.0
// @description  Following other people's review
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      https://ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.1.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @connect      work-wayfarer.tydtyd.workers.dev
// @connect      kvworker-warfarer-mission.tydtyd.workers.dev
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {

    let autoreview = null;
    let portalData = null;
    let rejcbxchnstr = ["照片模糊不清","臉部或身體","照片中出現車牌號碼","照片畫質低劣或並非屬實","標題命名不佳或並不準確","方向","不準確的位置","不存在的假位置","不雅的內容","涉嫌影響審查結果","令人反感","涉及攻擊性內容或言論","標題含有顏文字或表情符號"];
    let rejcbxengstr = ["PHOTO_BAD_BLURRY","PHOTO_FACE","PHOTO_PLATE","PHOTO_BAD","TEXT_BAD_TITLE","PHOTO_DIR","MISMATCH","ACCURACY_FAKE","ACCURACY_EXPLICIT","ACCURACY_PERSONAL","ACCURACY_OFFENSIVE","ACCURACY_ABUSE","EMOJI_TITLE"];
    let reviewPortalAuto ="false";
    let cloudReviewData = null;
    localStorage.setItem("reviewPortalAuto",reviewPortalAuto);

    let surl='https://dash.cloudflare.com/api/v4/accounts/6e2aa83d91b76aa15bf2d14bc16a3879/r2/buckets/warfarer/objects/';
    let durl="https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev";
    //let cookie = localStorage.cfcookie;  使用cloudflare的worker后，不再使用cookie
    let useremail = "";
    let tmpfollow={id:null,title:null,lat:null,lng:null,review:null,dateTime:null};
    let isUserClick = false ;
    let ilatdis = 0.002; let ilngdis = 0.002; //判断池中和任务po是否一致时，两者经纬度相差的度数
    let iIsNominationDays = 60000*60*24*5;//判断提交申请，检查经纬度，提交者邮箱，是否审核通过等等时，检查的日期范围
    let iIsTitleRightDays = 60000*60*24*3 ;//判断提交申请，智能匹配名称是否正确时，检查的日期范围
    let iautoman = null;
    let mywin = window;
    //let missionlist = [];
    let missionGDoc = []; //从google doc读取的任务列表
    let dURL = "https://script.google.com/macros/s/AKfycbwlUEhAm4l8kI617UcNDw2CU7xFR3GGPAMUECt6L5RV8cs4KELQsC6siB_7xwk8JTzpMg/exec";

    mywin.onload = function() {
        //console.log("onload","getMission");
        missionGDoc = JSON.parse(localStorage.missionGDoc);
        getLocalMissionList();
        getLocalMissionList();
    }

    const BASE_URL = "https://kvworker-warfarer-mission.tydtyd.workers.dev";
    const cfClass = {
        // 1. 按id查询单条数据
        getDataById:function(id, success, error) {
            GM_xmlhttpRequest({
                method: "GET",
                url: `${BASE_URL}/data/${id}`,
                headers: { "Content-Type": "application/json" },
                onload: (res) => {
                    if (res.status === 200) {
                        success(JSON.parse(res.responseText));
                    } else {
                        error(`查询失败：${JSON.parse(res.responseText).error}`);
                    }
                },
                onerror: (err) => error(`网络错误：${err.message}`)
            });
        },
        // 2. 按status批量查询
        getDatasByStatus:function(statusList, success, error) {
            const params = new URLSearchParams();
            statusList.forEach(s => params.append("status", s));
            GM_xmlhttpRequest({
                method: "GET",
                url: `${BASE_URL}/data?${params.toString()}`,
                headers: { "Content-Type": "application/json" },
                onload: (res) => {
                    if (res.status === 200) {
                        success(JSON.parse(res.responseText));
                    } else {
                        error(`查询失败：${JSON.parse(res.responseText).error}`);
                    }
                },
                onerror: (err) => error(`网络错误：${err.message}`)
            });
        },
        // 3. 新增数据（自动生成id）
        addData: function(data, success, error) {
            // 判断数据类型是否为FormData
            const isFormData = data instanceof FormData;
            let url = `${BASE_URL}/data`;
            // 动态决定请求方法：有id则用PUT，无id则用POST
            let method = "POST";

            // 检查是否有id
            const hasId = isFormData ? data.has('id') : (data && data.id !== undefined && data.id !== null && data.id!== "");

            if (hasId) {
                const id = isFormData ? data.get('id') : data.id;
                url = `${BASE_URL}/data/${id}`;
                method = "PUT"; // 有id时使用PUT方法（对应服务器的更新接口）
            }

            GM_xmlhttpRequest({
                method: method, // 使用动态确定的方法
                url: url,
                // FormData不需要设置Content-Type，普通对象用JSON
                headers: !isFormData ? { "Content-Type": "application/json" } : undefined,
                // FormData直接传递，普通对象序列化
                data: isFormData ? data : JSON.stringify(data),
                onload: (res) => {
                    try {
                        const responseData = JSON.parse(res.responseText);
                        if (res.status === 200) {
                            success(responseData);
                        } else {
                            error(`操作失败：${responseData.error || '未知错误'}`);
                        }
                    } catch (e) {
                        error(`解析响应失败：${e.message}`);
                    }
                },
                onerror: (err) => error(`网络错误：${err.message || '未知错误'}`)
            });
        },
        // 4. 更新数据（按id）
        updateData:function(id, updateFields, success, error) {
            GM_xmlhttpRequest({
                method: "PUT",
                url: `${BASE_URL}/data/${id}`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(updateFields), // 只需传要更新的字段
                onload: (res) => {
                    if (res.status === 200) {
                        success(JSON.parse(res.responseText));
                    } else {
                        error(`更新失败：${JSON.parse(res.responseText).error}`);
                    }
                },
                onerror: (err) => error(`网络错误：${err.message}`)
            });
        },
        // 5. 删除数据（按id）
        deleteData:function(id, success, error) {
            GM_xmlhttpRequest({
                method: "DELETE",
                url: `${BASE_URL}/data/${id}`,
                headers: { "Content-Type": "application/json" },
                onload: (res) => {
                    if (res.status === 200) {
                        success(JSON.parse(res.responseText).message);
                    } else {
                        error(`删除失败：${JSON.parse(res.responseText).error}`);
                    }
                },
                onerror: (err) => error(`网络错误：${err.message}`)
            });
        }
    }

    function getLocalMissionList(){
        let miss = localStorage.missionGDoc;
        if (miss) {
            missionGDoc = JSON.parse(miss);
            //let missstr = miss.replace(/\[/g,"{").replace(/\]/g,"}");//.replace("{{","[{").replace("}}","]");
            console.log("follow-missionGDoc",missionGDoc);
        }
    }
    function getLocalMissionListBak(){
        /*
        let miss = localStorage.currentmission;
        if (miss) {
            missionGDoc = JSON.parse(miss);
            //let missstr = miss.replace(/\[/g,"{").replace(/\]/g,"}");//.replace("{{","[{").replace("}}","]");
            console.log("follow-missionGDoc",missionGDoc);
        }*/
    }

    //更新任务数据至Google Doc , sdata为单条(或多条？)的JSON数据(如：{id:11w,title:aaa})
    function saveToGDoc(sdata){

        $.ajax({
            url: dURL, // 确保是最新部署的 GAS 链接
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
                    createNotify("更新任务错误", {
                        body: "更新任务文档失败！" +xhr.responseText,
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/warn.ico",
                        requireInteraction: false
                    });
            }
        });
    };
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
                            setUpLabel('uploadDataToR2','Green');
                            console.log(`数据上传成功: ${result.fullPath}`);
                        } else {
                            setUpLabel('uploadDataToR2','red');
                            console.log(`上传失败: ${result.error || result.details}`);
                        }
                    } catch (e) {
                        setUpLabel('uploadDataToR2','red');
                        console.log(`解析响应失败: ${e.message}`);
                    }
                },
                onerror: function(error) {
                    setUpLabel('uploadDataToR2','red');
                    console.log(`解析响应失败: ${error.message}`);
                }
            });
        } catch (e) {
            setUpLabel('uploadDataToR2','red');
            console.log(`解析响应失败: ${e.message}`);
        }
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
                    /*
                    console.log('收到响应:', {
                        status: response.status,
                        responseText: response.responseText.substring(0, 200) // 只显示前200字符
                    });*/
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success) {
                            //showLog(`成功读取文件: ${result.fileName.split('/').pop()}`,false);
                            setDownLabel(this,'green');
                            res(result);
                        } else {
                            console.log('返回结果',result.details);
                            //showLog(`读取失败: ${result.error}`, true);
                            err(result);
                        }
                    } catch (e) {
                        console.log('e',e);
                        //showLog(`解析文件内容失败: ${e.message}`, true);
                        err(e);
                    }
                },
                onerror: function(error) {
                    err(error);
                    setDownLabel('gold')
                    console.log('请求错误：',error);
                }
            });
        }).catch(e => {
            try {
                const err = e.details;
                if(err.indexOf('不存在') >= 0){
                    setDownLabel(this,'gold');
                }else {
                    setDownLabel(this,'red');
                }
            }
            catch(error){
                setDownLabel(this,'red');
                //showLog(`解析文件内容失败: ${e.message}`, true);
                console.log('Promise', e)
            }
        });
    }

    function setUpLabel(obj,color){
        console.log('setUpLabel',obj);console.log('setUpLabel',color);
        setTimeout(function(){
            let iup = document.getElementById("iduplabel");
            if(iup) iup.style=`font-weight:bold;color:${color}`;
        },2000);
    }

    function setDownLabel(obj,color){
        //console.log('setDownLabel',obj);console.log('setDownLabel',color);
        const idown = document.getElementById("idcountdownlabel");
        if(idown) idown.style=`font-weight:bold;color:${color}`;
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
                        //console.log("查看是否跟po，保存至本地",tmpfollow);
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
                            //console.log("saving local follow 1");
                            localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                        } else {
                            //console.log("saving local follow n");
                            localpd1.push(tmpfollow);
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
                        //console.log("调用上传接口",isUserClick);
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
    // 简化getUser，只负责获取和解析原始数据
    function getUserPromise() {
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
                if(!portalData) return;
                if (missionGDoc.length === 0) {missionGDoc = JSON.parse(localStorage.missionGDoc);}
                console.log("1️⃣开始新审核:",portalData.title);
                console.log("📋原始po数据:",portalData);
//                if(!portalData.id || portalData.id==null) return;
                setTimeout(function(){ loadReviewData(portalData); },1000);
//                let testid = "74908645df72e5da08ebd13be138275c";
//                loadReviewData(testid);
            } catch (e) {
                console.log('e.message',e.message);
            }
        });
    }

    //申请页面
    function injectManage() {

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
                //console.log("pData",pData);
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
                            //console.log("申请:",pData.submissions[i]);
                            //1分钟的时间戳值:60000 20分钟是1200000
                            //只有经纬度小于ilatdis,ilngdis的，才判断
                            if(Math.abs(item.lat-pData.submissions[i].lat)<=ilatdis & Math.abs(item.lng-pData.submissions[i].lng)<=ilngdis){
                                if( (item.title === pData.submissions[i].title) || ( ( item.title === pData.submissions[i].poiData.title) ) )
                                {
                                    if(item.title === "茫然" || pData.submissions[i].title === "茫然")
                                    {
                                        console.log("injectManage-item",item);
                                        console.log(`injectManage-pData.submissions[${i}]`,pData.submissions[i]);
                                        console.log("injectManage-NotPHOTO-item",item);console.log("injectManage-NotPHOTO-pData.submissions[i]",pData.submissions[i]);
                                        console.log(new Date(pData.submissions[i].day + " 00:00:00").getTime());
                                        console.log(new Date (item.submitteddate + " 00:00:00").getTime() );
                                        console.log(new Date (item.submitteddate + " 00:00:00").getTime() - iIsNominationDays );
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
                                                console.log("injectManage-NotPHOTO-","isave1:拒绝");
                                            }
                                            else if(pData.submissions[i].status === "ACCEPTED" & item.status !== "通过") {
                                                item.status = "通过";
                                                isave=1;
                                                console.log("injectManage-NotPHOTO-","isave1:通过");
                                            }
                                            //开审
                                            if(pData.submissions[i].status == "VOTING" & item.status != "审核") {
                                                item.status = "审核";
                                                isave=1;
                                                console.log("isave2：审核");
                                            }
                                        }
                                        //审核人写错
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
                            setTimeout(function(){
                                localStorage.setItem("missionGDoc",JSON.stringify(missionGDoc));
                                //saveToGDoc(item);
                                let updateField={status:item.status,title:item.title,lat:item.lat,lng:item.lng,submitter:item.submitter};
                                cfClass.updateData(
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

    //NEW:根据标题名有重合，给提示是否重复，并加20秒倒计时
    function isDuplicate(pData){
        if(pData.nearbyPortals.find(p=>{return p.title==pData.title})){
            setTimeout(function(){
                let iauto = document.getElementById("idautolabel");
                //console.log(iauto);
                let sc = document.getElementById("idcountdown");
                sc.textContent = sc.textContext + "+20";
                if (iauto)
                {
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
        //console.log("follow-photoReview",pdata);
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
        //console.log("follow-shouldBreak",shouldBreak);
        if(!shouldBreak){
            const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card');
            if (photo)
            {
                //console.log("follow-photo",photo[0]);
                if(photo[0].className.indexOf("photo-card--reject") === -1) photo[0].click();
                tmptext = "瞎选第一个";
                //以下，不一定哪个会被点击，很奇怪
                const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
                if(photoall.className.indexOf("photo-card--reject")==-1){
                    //以下，不一定哪个会被点击，很奇怪
                    photoall.parentNode.parentNode.click();
                    //photoall.click();
                }
            }
        }
        setTimeout(function(){
            let ilabel = document.getElementById("idscore");
            if(ilabel) ilabel.textContent = tmptext;
            //console.log("idscore",tmptext);
        },500);
    }

    //EDIT:未找到网络审核，按任务中选/瞎选
    function editReview(pdata){
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

    //判断云端是否有审核记录，执行跟审或任务审
    function loadReviewData(pdata){
        //console.log(id);
        //let sid="05a6bef32a01cc9e39c967677e18763f";
        //console.log("email",useremail);
        let tmptext = '';
        let id=pdata.id;
        tmpfollow.id = null; tmpfollow.title = null; tmpfollow.lat = null; tmpfollow.lng = null; tmpfollow.review = null;
        //console.log(durl+"/portal/portalreview/portal." +id +".json");
        //因为单用户可能有访问接口限制，故查找审核文件是否存在还用公用接口
        //let resp = readR2File("portal/portalreview/portal." +id +".json")
        let iresp = true; //使用pub接口
        let resp = U_XMLHttpRequest("GET",durl+"/portal/portalreview/portal." +id +".json")
        //console.log("loadReviewData",pdata);console.log("id",id);
        .then(res=>{
            //console.log("getjson",res);
            let ilabel = document.getElementById("iduserlabel");
            //getLocalMissionList();
            //console.log("follow-loadReviewData-res",res);
            //console.log('res',res);
            if(!res) {
                //修改首页下载显示
                //console.log("getjsonerr");
                cloudReviewData = null;
                setTimeout(function(){
                    if(ilabel) ilabel.textContent = "未找到网络审核记录";
                    setDownLabel(this,'gold');
                },1000);
                //未找到网络审核时，去判断是否有重复可能
                if(pdata.type === "EDIT") editReview(pdata);
                if(pdata.type === "PHOTO") photoReview(pdata);
                if(pdata.type === "NEW") isDuplicate(pdata);
                return null;
            }
            let restext = null;
            if(iresp) {
                restext = res;
            } else {
                restext = JSON.stringify(res.content);
            }
            //console.log('restext',restext);
            if(restext.indexOf("Error 404")>=0) {
                //修改首页下载显示
                //中黄：ffe600
                setDownLabel(this,'gold');
                console.log("未找到网络审核-"+pdata.id);
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
            if(restext.indexOf("<!DOCTYPE html>")>=0){
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
            if(restext.substring(0,1)=='"')
            {
                res1=restext.substring(1,restext.length-1);
                res1=res1.replace(/\\/g,"");
            } else res1=restext;

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
            setDownLabel(this,'green');
            cloudReviewData = creviewdata ;
            if(creviewdata==null) { return null; }
            console.log("cloudReviewData",cloudReviewData);
            let rdata = creviewdata;
            //rejectReasons 是个数组
            tmpfollow.id=id;tmpfollow.title=title;tmpfollow.lat=lat;tmpfollow.lng=lng;
            let iauto = document.getElementById("idautolabel");
            //skip：NEW,EDIT,PHOTO都有
            if(rdata.skip){
                let iskip = true;
                if (iauto)
                {
                    if (iauto.textContent === "手动") iskip = false;
                }
                if(pdata.canSkip && iskip){
                    console.log(`pdata.canSkip:${pdata.canSkip},iskip:${iskip}`);
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
                    return true;
                } else {
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
                const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card');
                const photoall = document.querySelector('app-review-photo app-accept-all-photos-card .photo-card .photo-card__main');
                if(rdata.rejectPhotos.length==0){
                    if(photoall.className.indexOf("photo-card--reject") === -1){
                        setTimeout(function(){
                            //console.log('photoall',photoall);
                                              //以下，不一定哪个会被点击，很奇怪
                            photoall.parentNode.parentNode.click();
                            photoall.click();
                        },500);
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
                let ilat = null;let ilng = null;
                for(const item of pdata.locationEdits) {
                    if(item.hash === rdata.selectedLocationHash){
                        ilat = item.lat; ilng = item.lng;
                    }
                }
                if(ilat !== null) {
                    let stmp = "";
                    if(ilat > pdata.lat ) stmp = "上";
                    if(ilat < pdata.lat ) stmp = "下";
                    if(ilat === pdata.lat && ilng === pdata.lng) stmp = "不变";
                    if(ilng > pdata.lng ) stmp += ";右";
                    if(ilng < pdata.lng ) stmp += ";左";
                    tmptext = "照抄网络审核："+stmp;
                }
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
                } else if (rdata.spam)
                {
                    let btncontainer = document.querySelector('.action-button-container');
                    if(btncontainer) {
                        let btn = document.querySelectorAll('.wf-button');
                        if(btn[0]){
                            btn[0].click();
                            //click "检举"
                            //选择检举的项目
                            //document.querySelectorAll('mat-checkbox.mat-checkbox')[3].childNodes[0].click();
                            setTimeout(function(){
                                let chxbtn = document.querySelectorAll('mat-checkbox.mat-checkbox')[3].childNodes[0].click();
                                if(chxbtn.length === 5 ) {
                                    for(let i=0;i<rdata.rejectReasons.length;i++)
                                    {
                                        if(rdata.rejectReasons[i] === "ABUSE")
                                        {
                                            chxbtn[0].childNodex[0].click();
                                        } else if(rdata.rejectReasons[i] === "FAKE")
                                        {
                                            chxbtn[1].childNodex[0].click();
                                        } else if(rdata.rejectReasons[i] === "PERSONAL")
                                        {
                                            chxbtn[2].childNodex[0].click();
                                        } else if(rdata.rejectReasons[i] === "EXPLICIT")
                                        {
                                            chxbtn[3].childNodex[0].click();
                                        } else if(rdata.rejectReasons[i] === "OFFENSIVE")
                                        {
                                            chxbtn[4].childNodex[0].click();
                                        }
                                    }
                                }
                            },500);
                        }
                    }
                } else if (rdata.rejectReasons){
                    tmptext = "照抄网络审核：否决";
                    tmpfollow.review="否决:"+rdata.rejectReasons;
                    console.log("审核记录拒",rdata.rejectReasons);
                    for(let i=0;i<rdata.rejectReasons.length;i++){
                        if(rdata.rejectReasons[i]=="PRIVATE" || rdata.rejectReasons[i]=="INAPPROPRIATE" || rdata.rejectReasons[i]=="SCHOOL" ||
                           rdata.rejectReasons[i]=="SENSITIVE" || rdata.rejectReasons[i]=="EMERGENCY" || rdata.rejectReasons[i]=="GENERIC")
                        {
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
                        }
                        else if (rdata.rejectReasons[0] == "UNSAFE")
                        {
                            //setTimeout(function(){
                            if(document.querySelector('#safe-card').querySelectorAll('button')[2])
                            { //
                                if(document.querySelector('#safe-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                    document.querySelector('#safe-card').querySelectorAll('button')[2].click();
                                }
                            }
                            //},1000);
                        }
                        else if (rdata.rejectReasons[0] == "TEMPORARY")
                        {
                            setTimeout(function(){
                                if(document.querySelector('#permanent-location-card').querySelectorAll('button')[2])
                                { //
                                    if(document.querySelector('#permanent-location-card').querySelectorAll('button')[2].className!="wf-button thumbs-button wf-button--icon is-selected") {
                                        document.querySelector('#permanent-location-card').querySelectorAll('button')[2].click();
                                    }
                                }
                            },500);
                        }
                        else
                        {
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


    //保存审核数据到本地，并判断是否需要上传
    async function savePostData(tmpfollow,data){
        let rd1=cloudReviewData;
        let rd2=JSON.parse(data);
        //云端非空：跟审
        //console.log("rd1",rd1);console.log("rd2",rd2);console.log("jsondata0",JSON.parse(data[0]));
        if(cloudReviewData !== null ) {
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
                    console.log("得到用户并保存跟审-"+useremail,tmpfollow);
                    if(localpd1.length === 0){
                        //console.log(useremail+"follow 1",JSON.stringify(tmpfollow));
                        localStorage.setItem(useremail+"follow","["+JSON.stringify(tmpfollow)+"]");
                    } else {
                        //console.log(useremail+"follow n",JSON.stringify(tmpfollow));
                        localpd1.push(tmpfollow);
                        localStorage.setItem(useremail+"follow",JSON.stringify(localpd1));
                    }
                } else {
                    console.log("跟审useremail",useremail);
                        if(localStorage.getItem(useremail+"follow")) localpd1 = JSON.parse(localStorage.getItem(useremail+"follow"));
                        console.log("保存跟审-"+useremail,tmpfollow);
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
        }
        else {
            //console.log("无云审核数据");
        }

        let iautolabel = document.querySelector("p[id='idautolabel']");
        console.log("云审核数据:",rd1);
        if(rd1) {
            rd1.acceptCategories=null;rd1.rejectCategories=null;
            if(!rd1.skip) rd1.skip=false;
        }
        console.log("本次审核数据:",rd2);
        if(rd2) {
            rd2.acceptCategories=null;rd2.rejectCategories=null;
            if(!rd2.skip) rd2.skip=false;
        }
        let rs1=JSON.stringify(rd1);let rs2=JSON.stringify(rd2);
        let rsstr = "";
        if(areObjectsEqual(rd1,rd2)) rsstr = "一致"; else rsstr = "不一致";
        //console.log("本地与云对比",rsstr);
        setTimeout(function(){
            if(isUserClick & rsstr === "不一致") {
                //console.log("调用上传接口",isUserClick);
                uploadPostData(portalData,JSON.parse(data),0,false);
            } else {
                console.log("不上传",rd2.id+":"+portalData.title);
                console.log("⏸审核结束:",rd2.id+":"+portalData.title);
            }
        },200);
        if(iautolabel){
        if (iautolabel.textContent == "手动" & rsstr === "不一致"){
            //console.log("data",JSON.parse(data));
            //uploadPostData(portalData,JSON.parse(data),0,false);
        }
        } else {
            console.log("与云对比时发生错误，无法读取iautolabel标签");
        }
    };

    //判断是否需要上传审核至云端，及保存至本地：用户+upload
    function uploadPostData(pdata,rdata,icloud,iskip){
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
            if(data.newLocation) {tmpupload.review = tmpupload.review+":挪"+data.newLocation; isave=1};
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
            isave=1;
        }
        //console.log("isave",isave);
        if(isave==1){
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
            console.log("不需上传,审核结束:",data.id);
            //let iup = document.getElementById("iduplabel");
            //if(iup) iup.style="font-weight:bold;color:#f6f5ec";
        }
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

    // 测试案例
    /*
    console.log(approximateMatch("万达", "万达")); // true（长度2，完全相同）
    console.log(approximateMatch("万达", "万"));   // false（长度不同）
    console.log(approximateMatch("苹果汁", "苹果水")); // true（长度3，相同字符2=3-1）
    console.log(approximateMatch("计算机", "计算几")); // true（长度3，相同字符2=3-1）
    console.log(approximateMatch("abcdef", "abcdeg")); // true（长度6，相同字符5=6-1）
    console.log(approximateMatch("abcdefg", "abcdefxy")); // true（长度7，差1，相同5=7-2）
    console.log(approximateMatch("万达木馬", "万达木马")); // true（长度4，相同3=4-1）
    */

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
