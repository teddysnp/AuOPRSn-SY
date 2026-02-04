// ==UserScript==
// @name         AuOPRSn-SY-Options1
// @namespace    AuOPR
// @version      1.7
// @description  适应20260129,wayfarer新版：功能为显示任务和已经审po
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      https://ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.1.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @connect      work-wayfarer.tydtyd.workers.dev
// @connect      kvworker-warfarer-mission.tydtyd.workers.dev
// @grant        GM_xmlhttpRequest
// @run-at       document-body  // 确保DOM基础节点加载后执行
// ==/UserScript==

(function() {

    // 全局锁：防止重复执行
    let isInited = false;
    // 弹窗容器标记：避免重复创建
    let popupContainer = null;
    let userEmail = null;
    let performance = null;
    let missionGDoc = [];
    let userEmailList1 = [];//审核员列表，用于显示
    let userEmailList2 = [];//审核员列表，用于显示
    let privatePortalDisplay1 = 50;  //首页列表中显示池中已审po数量
    let privatePortalDisplay2 = 50;  //首页列表中显示非池已审po数量
    // 配置 - CloudFlare
    //在cloudflare中上传的链接
    let surl='https://dash.cloudflare.com/api/v4/accounts/6e2aa83d91b76aa15bf2d14bc16a3879/r2/buckets/warfarer/objects/';
    let durl="https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev";
    const CONFIG = {
        WORKER_URL: 'https://work-wayfarer.tydtyd.workers.dev',
        SECRET_KEY: 'warfarer-review', // 与Worker中相同的密钥
        DEFAULT_FOLDER: 'defaultpath/' // 本地指定的存储路径，可随时修改
    };
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
    }

    // 节点等待轮询函数（保留原版逻辑）
    const awaitElement = get => new Promise((resolve, reject) => {
        let triesLeft = 15; // 增加轮询次数（适配路由跳转延迟）
        const queryLoop = () => {
            const ref = get();
            if (ref) resolve(ref);
            else if (!triesLeft) reject(new Error('节点查询超时'));
            else setTimeout(queryLoop, 250);
            triesLeft--;
        }
        queryLoop();
    }).catch(e => {
        console.log('awaitElement 错误：', e.message);
        return null;
    });

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

    function getMissionFromCloudFlare() {
        // 返回 Promise 对象，包裹异步请求逻辑
        return new Promise((resolve, reject) => {
            // 调用getDatasByStatus方法
            const statusList = ["提交", "审核"]; // 状态列表数组（与方法定义匹配）
            cfClass.getDatasByStatus(
                statusList, // 第一个参数：状态数组（与方法定义一致）
                (res) => { // 成功回调：使用res参数（不是success变量）
                    try {
                        // 直接使用res，因为res已经是解析后的JSON对象
                        let markercollection = res;
                        // 筛选状态为'提交'或'审核'的元素
                        let filteredMarkers = markercollection.filter(item => item.status === '提交' || item.status === '审核' );
                        console.log('Main-getCloudFlare', filteredMarkers);
                        missionGDoc = filteredMarkers;
                        localStorage.setItem("missionGDoc", JSON.stringify(missionGDoc));

                        // 初始化 ownerstatus 字段
                        missionGDoc.forEach(item => {
                            item.ownerstatus = "";
                        });
                        //console.log("missionGDoc", missionGDoc);
                        // 数据处理完成，触发 Promise 成功，返回处理后的数据
                        resolve(missionGDoc);
                    } catch (e) {
                        console.log('读取任务错误', e);
                        return;
                    }
                },
                (err) => { // 错误回调：使用err参数
                    console.log("读取错误", err); // 这里应该用err而不是error变量
                }
            );
        });
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

    // 通用函数：生成评审数据表格
    function generateReviewTable(storageKey, displayLimit) {
        // 1. 安全读取并解析本地存储数据
        let reviewData = [];
        try {
            const storedData = localStorage.getItem(storageKey);
            if (storedData) {
                reviewData = JSON.parse(storedData);
                if (!Array.isArray(reviewData)) {
                    console.warn(`${storageKey} 数据格式错误，已重置为空数组`);
                    reviewData = [];
                }
            }
        } catch (error) {
            console.error(`解析${storageKey}数据失败：`, error);
            reviewData = [];
        }

        // 2. 构建表格HTML
        let tableHtml = `
          <table style='width:100%'>
            <thead>
                <tr>
                    <th style='width:18%'>用户</th>
                    <th style='width:12%'>名称</th>
                    <th style='width:6%'>类型</th>
                    <th style='width:8%'>纬度</th>
                    <th style='width:8%'>经度</th>
                    <th style='width:12%'>打分</th>
                    <th style='width:16%'>时间</th>
                    <th style='width:20%'>ID</th>
                </tr>
            </thead>
            <tbody>
        `;

        let itemCount = 0;

        // 创建数组的反转副本，不影响原数组
        reviewData = [...reviewData].reverse();
        // 3. 遍历数据生成表格行
        for (const item of reviewData) {

            // 处理分数格式化
            let formattedScore = item.score;
            if (typeof item.score === 'string' && item.score.length === 7) {
                formattedScore = item.score
                    .replace(/5/g, "Y")
                    .replace(/3/g, "D")
                    .replace(/1/g, "N");
            }

            // 安全获取字段值
            const user = item.user || '';
            const title = item.title || '';
            const type = item.type || '';
            const lat = item.lat || '';
            const lng = item.lng || '';
            const dateTime = item.dt || item.datetime || '';
            const id = item.id || '';

            if (itemCount < displayLimit) {
                // 添加表格行
                tableHtml += `
            <tr>
                <td>${user}</td>
                <td><a href='${durl}/portal/portalreview/portal.${id}.json'  target='_blank'>${title}</td>
                <td>${type}</td>
                <td><a href='${durl}/portal/portaldata/portal.${id}.json'  target='_blank'>${lat}</td>
                <td>${lng}</td>
                <td>${formattedScore}</td>
                <td>${dateTime}</td>
                <td><a href='${durl}/portal/portaluseremail/portal.${id}.useremail.json'  target='_blank'>${id}</td>
            </tr>
            `;
            }
            itemCount++;

            // 4. 更新任务状态
            let usernamelist=localStorage[userEmail+"user"];
            if (!usernamelist) usernamelist="";
          if (usernamelist?.indexOf(user) >= 0 || user === userEmail) {

                //通过id判断当前用户是否审过-20251007改
                const matchingMission = missionGDoc.find(mission => mission.portalID === id);
            /*
            if(id === "a968d406ff815b373ffd05a297ec681c")
            {
            console.log(`matchingMission:${id}`,matchingMission);
              console.log('find:',item);
              console.log(missionGDoc.find(mission => mission.portalID === id));
              console.log(missionGDoc);
            } */
                if (matchingMission) {
                    //console.log("matchingMission-ownerstatus",matchingMission.ownerstatus);
                    matchingMission.ownerstatus = true;
                }
                //通过名称匹配来判断当前用户是否审过
                /*
                const matchingMission = missionGDoc.find(mission => mission.title === title);
                if (matchingMission) {
                    try {
                        const responseDate = new Date(matchingMission.responsedate);
                        const reviewDate = new Date(dateTime.slice(0, 10));

                        if (!isNaN(responseDate.getTime()) && !isNaN(reviewDate.getTime())) {
                            const fiveDaysLater = new Date(reviewDate);
                            fiveDaysLater.setDate(reviewDate.getDate() + 5);

                            if (responseDate <= fiveDaysLater) {
                                matchingMission.ownerstatus = true;
                            }
                        } else {
                            console.warn(`无效日期 - ${storageKey}：${matchingMission.responsedate} vs ${dateTime}`);
                        }
                    } catch (dateError) {
                        console.error(`${storageKey}日期处理错误：`, dateError);
                    }
                }
                */

            }
        }

        // 完成表格HTML
        tableHtml += `
            </tbody>
        </table>
    `;

        //console.log(storageKey,tableHtml);
        return tableHtml;
    }

    //首页home显示用户审过的po
    async function getMissionHTML(iowner) {
      // 等待获取任务数据（现在处于async函数中，可安全使用await）
      //console.log("getmissionhome");
      await getMissionFromCloudFlare();
      if(userEmail === null) {
        // 先获取用户信息并等待完成
        const restext = await getUser();
        // 处理用户信息
        userEmail = restext.result.socialProfile.email;
        performance = restext.result.performance;

        if (userEmail != null) {
          localStorage.setItem("currentUser", userEmail);
        } else return;
        console.log("最终获取到的用户邮箱：", userEmail);
      }
      // 处理池中评审列表（reviewLista → #privatePortal1）
      const tableHtmlA = await generateReviewTable('reviewLista', privatePortalDisplay1);
      ////replaceElement("#privatePortal1", tableHtmlA);
      // 处理池外评审列表（reviewListb → #privatePortal2）
      const tableHtmlB = await generateReviewTable('reviewListb', privatePortalDisplay2);
      ////replaceElement("#privatePortal2", tableHtmlB);

      try {
          // 更新页面DOM
          let sHtml = `<div class='placestr'><font size=5>${userEmail}</font></div>` ;
          // 处理任务数据
          try{

            //以下，生成任务列表显示：smis：表头；smistmp：最终表格；sultmp：用户邮箱排列块
            //放在最后，因为需要generateReviewTable里读取本地来判断是否审过=>更新missionGDoc中的ownerstatus
            //下一步，是否加入读取网络文件来判断是否审过？
            {
              //smistmp(字符串)/missionPortal(DOM元素)  ; sultmp(字符串，用户邮箱)/missionuser(显示用户邮箱排列块)
              //0:title;1:位置;2:开审;3:type;4:显示已审;5:日期;6:审结;7:lat;8:lng;9:userEmail;10:id;11:挪的方向
              let smis="<table style='width:100%'><thead><tr>"
              +"<th style='width:15%'>名称</th><th style='width:5%'>通过</th><th style='width:15%'>位置</th>"
              +"<th style='width:10%'>类型</th><th style='width:5%'>开审</th><th style='width:5%'>已审</th>"
              +"<th style='width:20%'>时间</th><th style='width:8%'>纬度</th><th style='width:8%'>经度</th>"
              +"<th style='width:14%'>挪po</th>"
              +"</tr></thead>";
              let smistmp="";let sstmp="";let ssok="";
              smistmp=smis+"<tbody>";
              missionGDoc.forEach(item => {
                smistmp+="<tr><td><a href='"+item.imageUrl+"' target='_blank'>"+item.title+"</a></td>"
                  +"<td>"+(item.status === "通过" ? "✓" : "" )+"</td>"
                  +'<td><a href="javascript:void(0);" us="us2" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter + '" tagName="' + item.portalID + `" onclick="switchUserReviewDiv(${iowner})";>`+item.lat+','+item.lng+"</a></td>"
                  +'<td><a href="javascript:void(0);" us="us1" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter + '" tagName="' + item.portalID + `" onclick="switchUserReviewDiv(${iowner})";>`+item.types+"</a></td>"
                  +"<td>"+ (item.status === "审核" || item.status === "通过" ? "✓" : "" ) +"</td><td>"+ (item.ownerstatus === true ? '✓' : '') +"</td>"+
                  "<td><a href='"+durl+"/portal/portaluseremail/portal."+item.portalID+".useremail.json'  target='_blank'>"+item.submitteddate+"</a></td>"
                  +"<td><a href='https://www.google.com/maps/search/?api=1&query="+item.lat+','+item.lng+"&zoom=16' target='_blank'>"+item.lat+"</a></td><td>"+item.lng+"</td><td>"+(item.moveoptions === "右" ? "最右" :( item.moveoptions === "下" ? "最下" : (item.moveoptions+item.moveplace)))+"</td>"
                  +"</tr>";
              });
              //console.log('homepage',missionGDoc);
              let sultmp = `<div id='idUserEmail${iowner}' style='display:none'><div><table><thead><tr><th>标题1</th><th>标题2</th><tr></thead><tbody><tr><td>数据1</td><td>数据2</td></tr></tbody></table></div></div>`;
              //console.log("missionPortal1",$("#missionPortal1"));
              smistmp+="</tbody></table>";
              //console.log(`smistmp`,smistmp);
              // 使用const声明变量，避免意外修改
              sHtml += `<div>${smistmp}</div><div>${sultmp}</div>` ;
            }
            return sHtml;

          } catch(e){console.log(e); return "";}
        } catch (error) {
          // 集中捕获所有可能的错误
          console.log("执行失败：", error);
          return "";
          // 刷新窗口（根据实际需求决定是否保留）
          // mywin.location.reload();
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

    switchUserReviewDiv = function(iowner) {
        console.log("switchUserReviewDiv",iowner);
        try{
            let id = event.srcElement.attributes['tagname'].textContent;
            let us = event.srcElement.attributes['us'].textContent;
            let owner = event.srcElement.attributes['owner'].textContent;
            let powner = event.srcElement.attributes['powner'].textContent;
            let userEmailList = [];
            let idUserEmail = document.getElementById(`idUserEmail${iowner}`);
            let stmp="";
            let sss = event.srcElement;
            console.log(idUserEmail);
            if(sss.textContent.indexOf("↓")>0){
                sss.textContent = sss.textContent.replace(/↓/g,"");
                stmp+=`<div id='idUserEmail${iowner}' style='display: none;'></div>`;
                $(`#idUserEmail${iowner}`).replaceWith(stmp);
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
                    let userReviewJson = [];
                    if(!res) {
                        setTimeout(function(){
                            console.log("switchUserReviewDiv:未找到审核文件",res);
                        },1000);
                        //return;
                    } else {
                        //userreview = res;
                        userReviewJson = res.content;
                        userreview = JSON.stringify(res.content);
                    }
                    //console.log('res',res);
                    //console.log(idUserEmail.style.display);
                    stmp+=`<div id='idUserEmail${iowner}' style='display:block;'><div style='display: flex;'>`;
                    //console.log("userEmailList",userEmailList);
                    //console.log("userreview",userreview);
                    if(userreview.length>0) console.log('userReviewJson',userReviewJson);

                    //如果用户打卡里userreview没有当前用户，但是missionGDoc里的ownerstatus是ture，则补一个打卡
                    //////补打卡的过程，从本地reviewLista及reviewListb里读取用户审核的情况(通过id匹配)
                    //////在userreview里增加一个当前用户的审核，并上传到cloudflare
                    //////通过id判断当前用户是否审过-20251007改
                    //如果云有，本地没有(有时程序问题/或者换浏览器登录)，则在本地补一个记录
                    const matchingMission = missionGDoc.find(mission => mission.portalID === id);
                    //console.log(`matchingMission:${id}`,matchingMission);
                    if (matchingMission) {
                        //补网络打卡
                        let iHaveReview = false;
                        //console.log("matchingMission-ownerstatus",matchingMission.ownerstatus);
                        if(matchingMission.ownerstatus){
                            const userReviewed = userReviewJson.find(item => item.useremail === userEmail);
                            if(!userReviewed){
                                //无用户打卡，但是本地审核中有 => 上传补打卡
                                //业务逻辑 - 补打卡
                                iHaveReview = true;
                                console.log("无用户打卡，但是本地审核中有");
                            } else {
                                console.log("有用户打卡，本地审核也有");
                            }
                        } else {
                            // 1. 先从 userReviewJson 数组中，找到当前用户（userEmail）的审核记录
                            const userReviewed = userReviewJson.find(item => item.useremail === userEmail);
                            // 2. 只有当用户确实有审核记录时，才继续处理本地存储
                            if (userReviewed) {
                                console.log("云有，本地没有",userReviewed);
                                try {
                                    // 3. 从本地存储获取 reviewLista：
                                    // - 若本地没有这个key，默认用 "[]"（空数组的JSON字符串），避免后续解析报错
                                    let reviewListStr = localStorage.getItem('reviewLista') || '[]';
                                    // 4. 把获取到的字符串解析成 JS 数组
                                    let reviewList = JSON.parse(reviewListStr);
                                    // 5. 防错处理：若解析后不是数组（比如存储的数据格式损坏），强制设为空数组
                                    if (!Array.isArray(reviewList)) { reviewList = []; }
                                    // 6. 检查本地存储的数组中，是否已有当前用户的记录
                                    // - 用 some() 遍历数组：只要有一个 item 的 user 等于 userEmail，就返回 true
                                    const iHaveLocal = reviewList.some(item => item?.id === matchingMission.portalID && item?.user === userEmail);
                                    // 7. 若本地没有该用户的记录，就新增一条
                                    if (!iHaveLocal) {
                                        console.log("没找到，本地补一条",iHaveLocal);
                                        // 组装要新增的记录（注意字段名和原数据保持一致）
                                        const reviewStr = {
                                            user: userReviewed.useremail,
                                            datetime: userReviewed.datetime,
                                            id: matchingMission.portalID, // 从匹配的任务中取ID
                                            title: matchingMission.title,
                                            lat: matchingMission.lat, // 任务的纬度
                                            lng: matchingMission.lng, // 任务的经度
                                            score: "云补，未知",
                                            type: matchingMission.types, // 任务的类型
                                            imageUrl: matchingMission.imageUrl
                                        };
                                        // 把新记录加入数组，再存回本地存储
                                        reviewList.push(reviewStr);
                                        localStorage.setItem("reviewLista", JSON.stringify(reviewList));
                                    }
                                } catch (error) {
                                    console.error('处理 reviewLista 时出错:', error);
                                    localStorage.setItem("reviewLista", '[]');
                                }
                            }
                        }
                        if(iHaveReview) {
                            let susermark={useremail : userEmail,
                                           datetime : formatDate(new Date(),"yyyy-MM-dd HH:mm:ss"),
                                           performance:performance,
                                           status:"补打卡"};
                            let reviewData = [];
                            try {
                                const storedData = localStorage.getItem('reviewLista');
                                if (storedData) {
                                    reviewData = JSON.parse(storedData);
                                    if (!Array.isArray(reviewData)) {
                                        console.warn(`reviewLista 数据格式错误`);
                                    } else {
                                        console.log("补打卡中...");
//                                         console.log('userEmail',userEmail);
//                                         console.log('matchingMission.portalID',matchingMission.portalID);
//                                         console.log('reviewData',reviewData);
                                        const haveReview = reviewData.find(it => it.user === userEmail && it.id === matchingMission.portalID);
                                        //console.log("haveReviewa",haveReview);
                                        if(haveReview) {
                                            susermark.datetime = haveReview.datetime || '';
                                        } else {
                                            const storedData1 = localStorage.getItem('reviewListb');
                                            if (storedData1) {
                                                reviewData = JSON.parse(storedData1);
                                                if (!Array.isArray(reviewData)) {
                                                    console.warn(`reviewListb 数据格式错误`);
                                                } else {
                                                    const haveReview = reviewData.find(it => it.user === userEmail && it.id === matchingMission.portalID);
                                                    //console.log("haveReviewb",haveReview);
                                                    if(haveReview) {
                                                        susermark.datetime = haveReview.datetime || '';
                                                    } else {
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error(`数据失败：`, error);
                            }
                            userReviewJson.push(susermark);
                            //console.log("susermark",susermark);
                            userreview = JSON.stringify(userReviewJson);
                            setTimeout(function(){
                                console.log("补用户打卡：portal/portaluseremail/","portal."+id+".useremail.json",susermark);
                                //保存任务id :
                                //uploadFile("PUT","portal/portaluseremail/portal."+portaldata.id+".useremail.json",susermark);
                                uploadDataToR2("portal/portaluseremail/","portal."+id+".useremail.json",userReviewJson);
                            },500);
                        }
                    }

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
                    $(`#idUserEmail${iowner}`).replaceWith(stmp);
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

    // ********** 独立扩展函数：每个新增节点的弹窗逻辑（便于后续扩展）**********
    // 新增节点1的弹窗逻辑
    async function showPopup1() {
      const missionHtmlStr = await getMissionHTML(1);
      createPopup({
            title: '任务',
            content: missionHtmlStr,
            id: 'popup-1'
        });
    }

    // 新增节点2的弹窗逻辑
    function showPopup2() {
        createPopup({
            title: '池中',
            content: '<p>这是第二个新增节点的弹窗内容</p><button onclick="alert(\'扩展按钮示例\')">点击测试</button>',
            id: 'popup-2'
        });
    }

    // 新增节点3的弹窗逻辑
    function showPopup3() {
        createPopup({
            title: '池外',
            content: '<p>这是第三个新增节点的弹窗内容</p><div style="color:#7c3aed">自定义样式示例</div>',
            id: 'popup-3'
        });
    }

    // 通用弹窗创建函数（底层封装，无需修改）
    function createPopup(options) {
        // 先关闭已有弹窗
        closeAllPopups();

        // 创建弹窗外层遮罩（全屏半透明）
        popupContainer = document.createElement('div');
        popupContainer.id = 'custom-popup-mask';
        Object.assign(popupContainer.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: '9999', // 置顶显示
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });

        // 创建弹窗主体
        const popupBox = document.createElement('div');
        popupBox.id = options.id;
        Object.assign(popupBox.style, {
            width: '1200px',
            minHeight: '800px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            position: 'relative'
        });

        // 弹窗标题
        const popupTitle = document.createElement('h3');
        popupTitle.textContent = options.title;
        popupTitle.style.margin = '0 0 16px 0';
        popupTitle.style.color = '#3730a3';

        // 弹窗内容
        const popupContent = document.createElement('div');
        popupContent.innerHTML = options.content;
        popupContent.style.marginBottom = '20px';

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 8px',
            backgroundColor: '#e879f9',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        });
        closeBtn.onclick = closeAllPopups;

        // 组装弹窗
        popupBox.appendChild(popupTitle);
        popupBox.appendChild(closeBtn);
        popupBox.appendChild(popupContent);
        popupContainer.appendChild(popupBox);

        // 遮罩点击也关闭弹窗
        popupContainer.onclick = (e) => {
            if (e.target === popupContainer) closeAllPopups();
        };

        // 插入页面
        document.body.appendChild(popupContainer);
    }

    // 关闭所有弹窗
    function closeAllPopups() {
        if (popupContainer && popupContainer.parentNode) {
            popupContainer.parentNode.removeChild(popupContainer);
        }
        popupContainer = null;
    }

    // 查找原生/profile节点（无自定义标记）
    function findOriginalProfileNode() {
        return document.querySelector('a[href="/new/profile"]:not([data-cloned])');
    }

    // 核心：克隆节点并删除指定子元素（image + 中间path）
    function cloneAndCleanNode(originalNode) {
        const newNode = originalNode.cloneNode(true); // 深度克隆

        // 步骤1：找到svg内的所有path节点，删除中间的那一个
        const svgPathNodes = newNode.querySelectorAll('svg path');
        if (svgPathNodes.length >= 3) {
            const middlePathIndex = 2; // 3个path的索引：0(第一个)、1(中间)、2(第三个)
            svgPathNodes[middlePathIndex].remove(); // 删除中间path
        }
        // 步骤2：删除image节点（xlink:href="/imgpub/wf_yeti.jpg"的那个）
        const imageNode = newNode.querySelector('svg image');
        if (imageNode) {
            imageNode.remove();
        }

        return newNode;
    }

    // 核心初始化逻辑
    function initNodes() {
        console.log('isInited',isInited);
        if (isInited) return;
        const originalNode = findOriginalProfileNode();
        if (!originalNode) return;

        const parentBox = originalNode.parentNode;
        const expectCloned = 3; // 仅新增3个节点
        const currentCloned = parentBox.querySelectorAll('a[href="/new/profile"][data-cloned]').length;

        // 步骤1：清理多余克隆节点
        if (currentCloned > expectCloned) {
            Array.from(parentBox.querySelectorAll('a[href="/new/profile"][data-cloned]'))
                .slice(expectCloned)
                .forEach(node => node.remove());
        }

        // 步骤2：补充缺失的克隆节点（仅3个），并绑定独立弹窗事件
        const needClone = expectCloned - currentCloned;
        const popupFunctions = [showPopup1, showPopup2, showPopup3]; // 对应3个新增节点的弹窗函数
      for (let i = 0; i < needClone; i++) {
        const newNode = cloneAndCleanNode(originalNode); // 克隆并清理子元素
        // 标记为克隆节点，避免误判
        newNode.dataset.cloned = 'true';
        // 阻止默认跳转，绑定弹窗函数
        newNode.onclick = (e) => {
          e.preventDefault(); // 取消链接跳转
          e.stopPropagation();
          popupFunctions[i](); // 执行对应弹窗函数
        };

        // ========== 核心修改：精准查找g节点一级子circle 开始 ==========
        // 1. 先获取newNode下所有的g节点（仅找newNode内的g，不跨层级）
        const gNodes = newNode.querySelectorAll('g');
        // 遍历每个g节点，仅处理其一级直接子元素中的circle
        gNodes.forEach(gNode => {
          // 2. 关键：获取g节点的**一级直接子元素**，筛选出其中的circle节点（不深层查找）
          // children：仅返回元素节点的一级直接子元素，不包含文本/注释节点，不穿透下级
          const circleNodes = Array.from(gNode.children).filter(child => child.tagName === 'circle');

          // 遍历找到的g一级子circle节点（支持单个/多个circle场景）
          circleNodes.forEach(circleNode => {
            // 3. 按i值匹配文字，规则不变
            const textMap = { 0: '任', 1: '池', 2: '外' };
            const textContent = textMap[i] || '';

            // 4. 创建SVG text节点（必须指定命名空间，否则无效）
            const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            // 设置与示例一致的居中属性
            textNode.setAttribute('x', '0');
            textNode.setAttribute('y', '0');
            textNode.setAttribute('text-anchor', 'middle');
            textNode.setAttribute('dominant-baseline', 'middle');
            textNode.textContent = textContent;

            // 5. 并列插入：text放到circle后方，与circle同级（g的一级子，保持层级一致）
            circleNode.parentNode.insertBefore(textNode, circleNode.nextSibling);
          });
        });
        // ========== 核心修改：精准查找g节点一级子circle 结束 ==========

        // 插入到原节点前方
        parentBox.insertBefore(newNode, originalNode);
      }

        // 步骤3：重新获取4个节点（1原+3克隆），配置布局
        const finalProfileNodes = parentBox.querySelectorAll('a[href="/new/profile"]');
        if (finalProfileNodes.length !== 4) return;

        // 父容器布局：左右分栏
        Object.assign(parentBox.style, {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0 !important',
            padding: '2px !important'
        });

        // 步骤4：创建包裹容器，实现4个节点紧密排列
        let profileWrap = parentBox.querySelector('.profile-nodes-wrap');
        if (!profileWrap) {
            profileWrap = document.createElement('div');
            profileWrap.className = 'profile-nodes-wrap';
            Object.assign(profileWrap.style, {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '0 !important',
                margin: '0 !important',
                padding: '0 !important'
            });
        } else {
            profileWrap.innerHTML = ''; // 清空旧节点
        }

        // 单个节点样式归一
        finalProfileNodes.forEach(node => {
            Object.assign(node.style, {
                margin: '0 !important',
                padding: '0 !important',
                flexShrink: '0',
                width: '48px !important',
                height: '48px !important',
                display: 'block',
                cursor: node.dataset.cloned ? 'pointer' : 'default' // 克隆节点鼠标指针为手型
            });
            profileWrap.appendChild(node);
        });

        // 插入包裹容器到父容器最后一位（靠右）
        parentBox.appendChild(profileWrap);

        // 标记初始化完成
        isInited = true;
        parentBox.dataset.inited = 'true';
    }

    // 页面加载后执行（延时确保DOM渲染完成）
    window.addEventListener('load', () => setTimeout(initNodes, 300));

    let clickEventBinded = false; // 防重复绑定点击事件
    let isFirstEnter = true; // 标记是否是首次进入/new/（刷新/直接访问）
    const TARGET_ROUTE = '/new/'; // 目标入口路由
    const HELP_ROUTE = '/new/criteria/eligibility'; // 自动跳转的目标路由
    const MAPVIEW_ROUTE = '/new/mapview'; // 用户可主动点击的路由
    const REVIEW_ROUTE = '/new/review'; // 提交按钮跳转的路由
    // 初始路由处理：适配review路由
    const handleInitRoute = () => {
        if (window.location.pathname === REVIEW_ROUTE) {
            console.log(`用户访问${window.location.pathname}，标记首次进入完成`);
            isFirstEnter = false;
            return;
        }
    };

    // 路由监听：拦截自动跳转+监听review路由
    const interceptRoute = () => {
        // 重写pushState/replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const rewriteHistory = (originalFn) => {
            return function(state, title, url) {
        // 新增：所有路由修改都触发侧边栏修复（覆盖侧边栏点击）
                if (url && url.startsWith('/new/')) {
                    console.log(`检测到侧边栏路由跳转：${url}，执行修复`);
                    isInited = false;
                    setTimeout(initNodes, 200); // 缩短延迟，适配DOM渲染
                    if (url && url.startsWith('/new/review')) {
                        setTimeout(function(){
                            console.log(`修复任务标签`);
                            modifyThirdSidebarLink();
                        },500);
                    }
                    if (url && url.startsWith('/new/criteria/eligibility')) {
                        setTimeout(checkAndReplace,200);
                    }
                }
              /*
                // 监听跳转到review路由，执行侧边栏修复
                if (url && url.includes(REVIEW_ROUTE)) {
                    console.log(`检测到跳转到review路由，准备修复右上角`);
                    isInited = false;
                    setTimeout(initNodes, 2000); // 延迟修复，等DOM渲染完成
                }*/
                originalFn.call(history, state, title, url);
            };
        };

        history.pushState = rewriteHistory(originalPushState);
        history.replaceState = rewriteHistory(originalReplaceState);

        // 处理初始路由
        handleInitRoute();
    };
    // 监听AJAX请求（review接口触发修复）
    const listenReviewAjax = () => {
        ah.hook({
            onRequest: (config, handler) => {
                // 拦截包含review的接口请求
                if (config.url.includes('review')) {
                    console.log('检测到review接口请求，准备修复右上角');
                    setTimeout(initNodes, 1000);
                }
                handler.next(config);
            },
            onResponse: (res, handler) => {
                if (res.config.url.includes('review')) {
                    console.log('review接口响应完成，修复右上角');
                    setTimeout(initNodes, 500);
                }
                handler.next(res);
            }
        });
        console.log('Review接口AJAX监听已启动');
    };
    interceptRoute();
    listenReviewAjax();

  // 监听DOM变化，防止节点被覆盖
    const observer = new MutationObserver((mutations) => {
        const originalNode = findOriginalProfileNode();
        const parentBox = originalNode?.parentNode;
        if (!isInited && originalNode && !parentBox?.dataset.inited) {
            initNodes();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
    });

    // 手动重置函数（控制台执行 window.resetProfileNodes()）
    window.resetProfileNodes = () => {
        isInited = false;
        closeAllPopups();
        document.querySelectorAll('.profile-nodes-wrap').forEach(wrap => wrap.remove());
        document.querySelectorAll('a[href="/new/profile"][data-cloned]').forEach(node => node.remove());
        initNodes();
    };

    // 快捷键关闭弹窗（ESC键）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllPopups();
    });

    initUserEmailList();
    function initUserEmailList(){
        userEmailList1=["snpsl;snp66666@gmail.com;open chrome 1","zhangnan;kobebrynan007@gmail.com;","dongtong;xiaohouzi0503@gmail.com;","bigmiaowa;pokemonmiaowa@gmail.com;","tydtyd;tydtyd@gmail.com;",
                        "kingsnan;zhangnan107107@gmail.com;","18kpt;sunkpty@gmail.com;","zhangnan007;zhangnan_007@outlook.com;","znan008Uni163-11.35;unicode@163.com;","tongliang;tongliang12345@outlook.com,xiuaoao@gmail.com;open chrome 23",
                       "pkpkqq01;pkpkqq01@gmail.com;","pkpkqq02;pkpkqq02@outlook.com,pkpkqq02@gmail.com;","poketydf01;tydingress@outlook.com,poketydf01@gmail.com;","poketydf02;poketydf02@gmail.com;","poketydf03;poketydf03@gmail.com;",
                       "poketyd;poketyd@outlook.com;","pokecntv01;pokecntv01@outlook.com;","pokecntv22;pokecntv22@outlook.com;","pokepokem001;whathowyou@gmail.com;","pokepokem01;pokepokem01@outlook.com;",
                       "pokecntv08;pokecntv08@outlook.com;","pokecntv09;pokecntv09@outlook.com;","pokecntv10;pokecntv10@outlook.com;",";;",";;"
                       ];
        userEmailList2=["shixz1;w4b4uh134@gmail.com;","shixz7;1806424832mjn@gmail.com;","FishDragonKing;269999205@qq.com;","15998804246dyh-shixz3;15998804246dyh@gmail.com;","hch463734529;hch463734529@gmail.com;",
                        "masterxiaoli666;masterxiaoli666@gmail.com;","shizx1twk-wcy;shizx1twk@gmail.com;","470274941;470274941@qq.com;","wczmw;wczmw@sina.com;","jbhluciuscoke;jbhluciuscoke@gmail.com;",
                        "1272970170qq;1272970170qq@gmail.com;","Sjn/3301502859qq;3301502859qq@gmail.com;",";;",";;",";;"
                       ];

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

    // 1. 修改第三个sidebar-link的文本为"任务"（兼容原始文本）
    function modifyThirdSidebarLink() {
        const sidebarLinks = document.querySelectorAll('app-sidebar-link a.sidebar-link');
        if (sidebarLinks.length >= 3) {
            const thirdLink = sidebarLinks[2];
            // 修改span显示文本
            const textSpan = thirdLink.querySelector('span.ng-star-inserted');
            if (textSpan && textSpan.textContent !== '任务') {
                textSpan.textContent = '任务';
            }
            // 修改title属性
            if (thirdLink.getAttribute('title') !== '任务') {
                thirdLink.setAttribute('title', '任务');
            }
            console.log('第三个侧边栏标签已修改为"任务"');
        }
    }

  // 配置项：可根据需求修改
    const TARGET_NODE_ID = 'idmission'; // 目标节点ID

    // 🌟 精准判断节点是否「真实显示」（排除隐藏/不可见状态）
    function isElementVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect(); // 获取节点布局位置
        // 可见性核心条件：宽高>0（未被隐藏）+ 与视口有重叠（在页面可视范围内）
        return rect.width > 0 && rect.height > 0 &&
               rect.top < window.innerHeight && rect.bottom > 0 &&
               rect.left < window.innerWidth && rect.right > 0;
    }

    // 📌 自定义替换逻辑（修改此函数即可实现你的需求）
    async function replaceChildNodes(targetEl) {
        if (!targetEl) return;
        // 示例1：清空所有原有子节点，添加新子节点（最常用）
        const missionHtmlStr = await getMissionHTML(2);
        targetEl.innerHTML = missionHtmlStr;
    }

    // 核心检测逻辑：监听可见性变化，显示时单次替换
    function checkAndReplace() {
        if ( window.location.pathname !== HELP_ROUTE) return;
        //console.log('checkAndReplace');
        //console.log(`checkAndReplace${window.location.pathname}`);
        awaitElement(() => document.getElementById('idmission'))
            .then((ref) => {
          let targetEl = document.getElementById('idmission');
          console.log("checkAndReplace:get idmission!");
          //placestr存在，说明已经替换完成
          let iplace = document.querySelector(".placestr");
          if(iplace) return;
            replaceChildNodes(targetEl);
            console.log(`✅ ${TARGET_NODE_ID} 已显示，子节点替换完成（本次显示仅一次）`);

      });
    }

    listenLinkClick();
    //监听页面点击，获取是否人工点击
    function listenLinkClick(){
        document.body.addEventListener("click",function(event){
            //if(event.srcElement.innerText.indexOf("送出")>=0 || event.srcElement.innerText.indexOf("即可结束")>=0) console.log("listenLinkClick",event);
            console.log("clicked",event.srcElement);
          let t=event.srcElement;
          if( (t.tagName && t.tagName.toLowerCase()=="span" && t.className.indexOf("ng-star-inserted")>-1 && t.innerText.trim()=="任务")
             || t.querySelector("span.ng-star-inserted"))
          {
            checkAndReplace();
          }
        });
    }
    // 启动轮询检测：持续监听节点可见性状态变化
    //setInterval(checkAndReplace, CHECK_INTERVAL);
    setTimeout(checkAndReplace,500);

})();
