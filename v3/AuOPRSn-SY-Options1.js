// ==UserScript==
// @name         AuOPRSn-SY-Options1
// @namespace    AuOPR
// @version      2.0.2
// @description  任务管理面板（双标签页+会话级折叠状态保持+SPA适配）
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      https://ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.1.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @connect      work-wayfarer.tydtyd.workers.dev
// @connect      kvworker-warfarer-mission.tydtyd.workers.dev
// @grant        GM_xmlhttpRequest
// @run-at       document-body
// ==/UserScript==

(function() {

    // ====================== 【核心配置：状态存储Key】 ======================
    // 用于sessionStorage存储折叠状态的唯一标识（可自定义）
    const STORAGE_KEY = 'missionManagerPanelCollapsed';

    // 标记样式是否已注入（样式仅需注入一次）
    let stylesInjected = false;

    // 注入样式到页面
    function injectStyles() {
        // ====================== 【用户可自定义区域1：样式】 ======================
            const panelStyles = `
        /* app-mapview 作为父容器，设置flex列布局 */
        app-mapview {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%; /* 需确保app-mapview有固定高度，否则布局失效 */
            overflow: hidden;
        }
        /* 任务管理面板：默认自适应高度 */
        .mission-manager-panel {
            flex-shrink: 0;
            width: 100%;
            height: auto; /* 核心：默认自适应内容高度 */
            min-height: 35px; /* 折叠状态最小高度 */
            max-height:250px;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scrollbar-width: thin;
            background: #fff;
            border-bottom: 1px solid #e6e6e6;
            transition: height 0.2s; /* 高度变化过渡 */
        }
        /* 折叠状态：强制固定高度 */
        .mission-manager-panel.collapsed {
            height: 35px !important; /* 覆盖auto，确保折叠高度固定 */
        }        /* 折叠按钮容器（文字+箭头） */
        .collapse-arrow-wrapper {
            position: absolute;
            top: 8px;
            right: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            color: #666;
            font-size: 12px;
        }
        .collapse-arrow {
            width: 16px;
            height: 16px;
            transition: transform 0.3s ease;
        }
        .mission-manager-panel.collapsed .collapse-arrow {
            transform: rotate(180deg);
        }
        .collapse-arrow::after {
            content: "▲";
            font-size: 12px;
            color: #666;
        }
        .arrow-text {
            user-select: none;
        }
        /* 可拖动分割条（同级） */
        .panel-resizer {
            flex-shrink: 0;
            height: 6px;
            width: 100%;
            background-color: #409eff;
            cursor: ns-resize;
            user-select: none;
            transition: background-color 0.2s;
        }

        .panel-resizer:hover {
            background-color: #66b1ff;
        }
        /* 标签页导航栏 */
        .tabs-nav {
            display: flex;
            border-bottom: 1px solid #e0e0e0;
            margin-top: 24px; /* 给折叠按钮留空间 */
            margin-bottom: 8px;
        }
        .tab-item {
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            color: #666;
            border-bottom: 2px solid transparent;
            user-select: none;
            transition: all 0.2s ease;
        }
        .tab-item:hover {
            color: #333;
        }
        .tab-item.active {
            color: #1976d2;
            border-bottom-color: #1976d2;
            font-weight: 500;
        }

        /* 标签页内容区域 */
        .tabs-content {
            height: calc(100% - 60px); /* 适配面板高度，扣除导航栏和边距 */
            overflow-y: auto; /* 内容超出时滚动 */
            padding: 4px 0;
        }
        .tab-content {
            display: none; /* 默认隐藏所有标签内容 */
            font-size: 12px;
            color: #333;
        }
        .tab-content.active {
            display: block; /* 激活的标签内容显示 */
        }
    `;
        // ====================== 【用户可自定义区域1 结束】 ======================
        if (!stylesInjected) {
            const styleNode = document.createElement('style');
            styleNode.textContent = panelStyles;
            document.head.appendChild(styleNode);
            stylesInjected = true;
        }
    }

    // ====================== 【状态管理工具函数】 ======================
    // 从sessionStorage读取折叠状态
    function getCollapseState() {
        // 读取存储的值，默认是未折叠（false）
        const stored = sessionStorage.getItem(STORAGE_KEY);
        return stored === 'true'; // 转为布尔值，确保类型正确
    }

    // 保存折叠状态到sessionStorage
    function saveCollapseState(isCollapsed) {
        sessionStorage.setItem(STORAGE_KEY, isCollapsed.toString());
    }
    // ====================== 【用户可自定义区域2：标签配置】 ======================
    const tabConfig = [
        {
            tabName: "任务列表",
            tabId: "tab-1",
            content: `
                <div id='idmission2'>
                    <h4 style="margin: 0 0 8px 0; font-size: 13px;">我的任务</h4>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>任务1：审核POI提交</li>
                        <li>任务2：验证地图节点</li>
                        <li>任务3：提交新POI</li>
                    </ul>
                    <button style="margin-top: 8px; padding: 4px 8px; font-size: 12px;">新增任务</button>
                </div>
            `
        },
        {
            tabName: "近期通过",
            tabId: "tab-2",
            content: `
                <div id='idportal2'>
                    <h4 style="margin: 0 0 8px 0; font-size: 13px;">本周统计</h4>
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr style="border-bottom: 1px solid #e0e0e0;">
                            <th style="text-align: left; padding: 4px 0;">类型</th>
                            <th style="text-align: right; padding: 4px 0;">完成数</th>
                        </tr>
                        <tr>
                            <td>审核任务</td>
                            <td style="text-align: right;">28</td>
                        </tr>
                        <tr>
                            <td>提交任务</td>
                            <td style="text-align: right;">12</td>
                        </tr>
                    </table>
                </div>
            `
        }
    ];
    // ====================== 【用户可自定义区域2 结束】 ======================

    // 创建标签页导航栏
    function createTabsNav() {
        const nav = document.createElement('div');
        nav.className = 'tabs-nav';

        tabConfig.forEach((tab, index) => {
            const tabItem = document.createElement('div');
            tabItem.className = `tab-item ${index === 0 ? 'active' : ''}`;
            tabItem.dataset.tabId = tab.tabId;
            tabItem.textContent = tab.tabName;
            nav.appendChild(tabItem);
        });

        return nav;
    }

    // 创建标签页内容区域
    function createTabsContent() {
        console.log('createTabsContent');
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tabs-content';

        tabConfig.forEach((tab, index) => {
            const tabContent = document.createElement('div');
            tabContent.id = tab.tabId;
            tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;
            tabContent.innerHTML = tab.content;
            contentWrapper.appendChild(tabContent);
        });

        return contentWrapper;
    }

    // 绑定标签切换事件
    function bindTabSwitchEvent(panel) {
        const tabItems = panel.querySelectorAll('.tab-item');
        const tabContents = panel.querySelectorAll('.tab-content');

        tabItems.forEach(item => {
            item.addEventListener('click', () => {
                tabItems.forEach(ti => ti.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                const targetTabId = item.dataset.tabId;
                item.classList.add('active');
                document.getElementById(targetTabId).classList.add('active');
                // 切换标签后恢复自适应高度（如果未手动拖动）
                if (panel.style.height !== 'auto' && !panel.classList.contains('collapsed')) {
                    panel.style.height = 'auto';
                }
            });
        });
    }

    // 分割条拖动事件（适配自适应高度：拖动时设固定高度，未拖动则auto）
    function bindResizerEvents(resizer, missionPanel) {
        let isResizing = false;
        let startY, startPanelHeight;
        // 记录初始状态：是否为自适应高度
        let isAutoHeight = true;

        resizer.addEventListener('mousedown', (e) => {
            if (missionPanel.classList.contains('collapsed')) return;

            isResizing = true;
            startY = e.clientY;

            // 获取当前面板高度：如果是auto，取实际渲染高度
            startPanelHeight = missionPanel.getBoundingClientRect().height;
            isAutoHeight = missionPanel.style.height === '' || missionPanel.style.height === 'auto';

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            e.preventDefault();
            e.stopPropagation();
        });

        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const deltaY = e.clientY - startY;
            const parentHeight = missionPanel.parentElement.getBoundingClientRect().height;
            // 新高度：基于当前渲染高度调整，限制最小/最大值
            const newHeight = Math.max(90, Math.min(startPanelHeight + deltaY, parentHeight * 0.8));

            // 拖动时强制设置固定高度（覆盖auto）
            missionPanel.style.height = `${newHeight}px`;
            isAutoHeight = false;
        };

        const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            // 可选：如果拖动距离极小（<5px），恢复自适应高度
            const dragDistance = Math.abs(e.clientY - startY);
            if (dragDistance < 5) {
                missionPanel.style.height = 'auto';
                isAutoHeight = true;
            }
        };

        // 监听内容变化，自动恢复自适应（可选：当tabs-content内容变化时）
        const observer = new MutationObserver(() => {
            if (isAutoHeight && !missionPanel.classList.contains('collapsed')) {
                missionPanel.style.height = 'auto';
            }
        });
        // 监听tabs-content的内容变化
        const tabsContent = missionPanel.querySelector('.tabs-content');
        if (tabsContent) {
            observer.observe(tabsContent, { childList: true, subtree: true });
        }
    }

    // 创建任务面板（内部结构不变，仅移除分割条子元素）
    function createMissionPanel() {
        console.log('createMissionPanel');
        const panel = document.createElement('div');
        const isCollapsed = getCollapseState();
        panel.className = `mission-manager-panel${isCollapsed ? 'collapsed' : ''}`;

        // 折叠按钮容器（原有逻辑）
        const arrowWrapper = document.createElement('div');
        arrowWrapper.className = 'collapse-arrow-wrapper';
        arrowWrapper.title = '点击折叠/展开';

        const userEmailLabel = document.createElement('span');
        userEmailLabel.className = 'arrow-text';
        userEmailLabel.textContent = '用户：';
        const userEmailText = document.createElement('span');
        userEmailText.className = 'arrow-text';
        userEmailText.id = 'id-useremail';
        userEmailText.textContent = userEmail || '未登录';
        userEmailText.style.marginRight = "30px";

        const arrowText = document.createElement('span');
        arrowText.className = 'arrow-text';
        arrowText.textContent = '任务管理';

        const arrow = document.createElement('div');
        arrow.className = 'collapse-arrow';

        arrowWrapper.appendChild(userEmailLabel);
        arrowWrapper.appendChild(userEmailText);
        arrowWrapper.appendChild(arrowText);
        arrowWrapper.appendChild(arrow);

        // 标签导航和内容（原有逻辑）
        const tabsNav = createTabsNav();
        const tabsContent = createTabsContent();

        // 组装面板（内部无分割条）
        panel.appendChild(arrowWrapper);
        panel.appendChild(tabsNav);
        panel.appendChild(tabsContent);

        // 折叠事件（原有逻辑）
        arrowWrapper.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            saveCollapseState(panel.classList.contains('collapsed'));
            // 折叠后重置面板高度
            if (panel.classList.contains('collapsed')) {
                panel.style.height = '35x';
            } else {
                panel.style.height = 'auto'; // 恢复初始高度
            }
        });

        // 标签切换事件（原有逻辑）
        bindTabSwitchEvent(panel);

        return panel;
    }

    //addPanelToMapView 函数（插入同级分割条）
    async function addPanelToMapView() {
        const mapView = document.querySelector('app-mapview');
        if (mapView) {
            const existingPanel = mapView.querySelector('.mission-manager-panel');
            // 同时检查是否已有分割条
            const existingResizer = mapView.querySelector('.panel-resizer');

            if (!existingPanel && !existingResizer) {
                injectStyles();
                const missionPanel = createMissionPanel();
                // 创建同级分割条
                const resizer = document.createElement('div');
                resizer.className = 'panel-resizer';

                // 插入顺序：先面板 → 再分割条 → 最后原mapView的子元素
                mapView.insertBefore(missionPanel, mapView.firstChild);
                mapView.insertBefore(resizer, missionPanel.nextSibling); // 分割条紧跟面板

                // 绑定分割条拖动事件（关联面板和分割条）
                bindResizerEvents(resizer, missionPanel);

                // 原有逻辑：加载任务HTML
                awaitElement(() => mapView.querySelector('#idmission2')).then(async (idmission2) => {
                    if (idmission2) {
                        let sHtml = await getMissionHTML(2);
                        idmission2.innerHTML = sHtml;
                        idmission2.innerHTML = idmission2.innerHTML.replace(/"{2}/g, '');
                    }
                });
                awaitElement(() => mapView.querySelector('#idportal2')).then(async (idportal2) => {
                    if (idportal2) {
                        awaitElement(() => {
                            const dataLength = Object.keys(missionGDocAll || {}).length;
                            return dataLength > 0 ? missionGDocAll : null;
                        }).then((validData) => {
                            getMissionHTMLAccepted(3).then((sHtml) => {
                                //console.log('sHtml',sHtml);
                                //console.log('idportal2',sHtml);
                                idportal2.innerHTML = sHtml;
                                idportal2.innerHTML = idportal2.innerHTML.replace(/"{2}/g, '');
                            }).catch((err) => {
                            });
                        }).catch((e) => {
                            // 超时/未满足条件：10次×100ms=1秒后触发
                            console.error("超时：1秒内未检测到有效数据",e);
                            return "";
                        });
                    }
                });
                console.log('任务管理面板和同级分割条已成功注入');
            }
        }
    }


    // 持续监听DOM变化
    function observeMapViewLoading() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const callback = function(mutationsList) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    addPanelToMapView();
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);

        // 兜底轮询
        setInterval(() => {
            initNodes();
            addPanelToMapView();
        }, 2000);

        // 监听路由变化
        window.addEventListener('popstate', addPanelToMapView);
        window.addEventListener('hashchange', addPanelToMapView);
    }

    // 全局锁：防止重复执行
    let isInited = false;
    let popupContainer = null;
    let userEmail = null;
    let performance = null;
    let missionGDoc = [];
    let missionGDocAll = [];
    let userEmailList1 = [];//审核员列表，用于显示
    let userEmailList2 = [];//审核员列表，用于显示
    let privatePortalDisplay1 = 50; //首页列表中显示池中已审po数量
    let privatePortalDisplay2 = 50; //首页列表中显示非池已审po数量

    // ================== 配置 - CloudFlare =======================//
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
    // ================== 配置 - CloudFlare 结束 ===================//

    // 节点等待轮询函数
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
        //console.log('awaitElement 错误：', e.message);
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
            const statusList = []; //["提交", "审核"]; // 状态列表数组（与方法定义匹配）
            cfClass.getDatasByStatus(
                statusList, // 第一个参数：状态数组（与方法定义一致）
                (res) => { // 成功回调：使用res参数（不是success变量）
                    try {
                        // 直接使用res，因为res已经是解析后的JSON对象
                        let markercollection = res;
                        // 筛选状态为'提交'或'审核'的元素
                        let filteredMarkers = markercollection.filter(item => item.status === '提交' || item.status === '审核' );
                        missionGDoc = filteredMarkers;
                        console.log('Options1-missionGDoc', missionGDoc);

                        let filteredMarkersAll = markercollection.filter(item => item.status !== '定位' );
                        //按日期submitteddate排序
                        const sortedEntries = Object.entries(filteredMarkersAll).sort(([keyA, valA], [keyB, valB]) => {
                            const dateA = new Date(valA.submitteddate || '');
                            const dateB = new Date(valB.submitteddate || '');
                            const timeA = dateA.getTime();
                            const timeB = dateB.getTime();
                            const isValidA = !isNaN(timeA);
                            const isValidB = !isNaN(timeB);
                            if (!isValidA && !isValidB) return 0;
                            if (!isValidA) return 1;
                            if (!isValidB) return -1;
                            return timeB - timeA;
                        });
                        sortedEntries.forEach(([originalKey, item], index) => {
                            missionGDocAll[index] = item;
                        });
                        console.log('Options1-missionGDocAll',missionGDocAll);

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
            //console.log("getUser 解析结果：", restext);

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

    let marker = null;
    openPortalOnMap = function(lat,lng,portalid) {
        console.log('marker',marker);
        if (marker) {marker.setMap(null);marker = null; console.log("set marker null");};
        console.log('openPortalOnMap',{lat,lng,portalid});
        awaitElement(() => document.querySelector('a[href="/new/mapview"]')).then((ref) => {
            jumpToLocation(lat, lng, 18);
            putMarkerOnMap(lat, lng, "");
        });
        // 【核心方法1：判断/提取Google Maps实例】
        function looksLikeGoogleMap(obj) {
            return !!(obj &&
                      typeof obj.getCenter === "function" &&
                      typeof obj.addListener === "function" &&
                      typeof obj.getDiv === "function");
        }
        function extractMapFromCtxEntry(entry) {
            if (!entry) return null;
            if (looksLikeGoogleMap(entry)) return entry; // mapview
            const m = entry?.componentRef?.map;          // submit
            return looksLikeGoogleMap(m) ? m : null;
        }
        function getWfMap() {
            return new Promise((resolve) => {
                let attempts = 80;

                function tryFindMap() {
                    const candidates = document.querySelectorAll("app-submit-wayspot-map nia-map, app-wf-base-map");

                    for (const el of candidates) {
                        const ctx = el && el.__ngContext__;
                        if (!ctx) continue;

                        for (const entry of ctx) {
                            try {
                                const map = extractMapFromCtxEntry(entry);
                                if (map) return resolve(map);
                            } catch {  }
                        }
                    }

                    if (attempts-- <= 0) return resolve(null);
                    setTimeout(tryFindMap, 250);
                }

                tryFindMap();
            });
        }
        const jumpToLocation = (lat, lng, zoom) => {
            getWfMap().then((map) => {
                console.log("jump to :",map);
                if (!map) return;
                map.setCenter(new google.maps.LatLng(lat, lng));
                map.setZoom(zoom);
            });
        };
        function putMarkerOnMap(lat, lng, title){
            getWfMap().then((map) => {
                const color = "#a855f7";
                let icon = {
                    // 自定义SVG路径：靶心十字（中心圆 + 横竖十字线）
                    path: 'M 0,0 m -4,0 a 4,4 0 1,1 8,0 a 4,4 0 1,1 -8,0 M -8,0 H 8 M 0,-8 V 8',
                    scale: 4, // 由于path中已定义尺寸，scale设为1即可（如需整体缩放可调整此值）
                    fillColor: 'RED',       // 填充色（中心圆）
                    fillOpacity: 0.9,         // 填充透明度
                    strokeColor: 'Golden',    // 描边色（十字线+圆边框）
                    strokeWeight: 2           // 描边宽度
                };
                const titleText = `A`;

                // Titles only shown at/above zoom threshold
                const zoom = map.getZoom ? map.getZoom() : null;
                if (!marker) {
                    marker = new google.maps.Marker({
                        map: null,
                        position: { lat, lng },
                        title: title,
                        icon,
                        draggable: false,
                        optimized: false
                    });
                }
                // 保存marker的原始样式（用于闪烁结束后恢复）
                const originalFillOpacity = icon.fillOpacity;
                // 声明定时器变量（便于后续清理）
                let blinkTimer = null;
                // 添加marker到地图并触发闪烁
                if (!marker.getMap()) {
                    marker.setMap(map);
                    // 启动2秒闪烁效果
                    startBlinking(marker);
                }
                //让marker闪烁2秒的函数 * @param {google.maps.Marker} marker - 要闪烁的marker
                function startBlinking(marker) {
                    // 先清除可能存在的旧定时器（避免重复闪烁）
                    if (blinkTimer) clearInterval(blinkTimer);

                    let isVisible = true; // 标记当前是否显示
                    const blinkInterval = 300; // 闪烁间隔（ms），值越小闪烁越快

                    // 启动闪烁定时器
                    blinkTimer = setInterval(() => {
                        // 切换透明度：显示时设为0.9，隐藏时设为0（也可改用visible属性）
                        const newOpacity = isVisible ? 0 : originalFillOpacity;
                        // 更新marker的icon样式
                        marker.setIcon({
                            ...marker.getIcon(), // 继承原有样式
                            fillOpacity: newOpacity
                        });
                        isVisible = !isVisible; // 切换状态
                    }, blinkInterval);

                    // 2秒后停止闪烁，并恢复原始样式
                    setTimeout(() => {
                        clearInterval(blinkTimer);
                        blinkTimer = null;
                        // 恢复marker的原始透明度
                        marker.setIcon({
                            ...marker.getIcon(),
                            fillOpacity: originalFillOpacity
                        });
                    }, 2000); // 2000ms = 2秒
                }
            });
        };
    }

    // 全局变量：缓存弹窗和遮罩元素，避免重复创建
    let reviewPopup = null;
    let reviewMask = null;
    // 全局变量：缓存触发弹窗的元素，用于关闭时重置文本
    let triggerElement = null;

    // ============弹窗显示已审用户==============//
    function initReviewPopup() {
        // 1. 创建遮罩层（点击遮罩关闭弹窗）
        reviewMask = document.createElement('div');
        reviewMask.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        display: none;
    `;
        document.body.appendChild(reviewMask);

        // 2. 创建弹窗容器（居中显示）
        reviewPopup = document.createElement('div');
        reviewPopup.id = 'reviewUserEmailPopup';
        reviewPopup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        max-width: 80vw;
        max-height: 80vh;
        overflow-y: auto;
        display: none;
    `;
        document.body.appendChild(reviewPopup);

        // 3. 点击遮罩关闭弹窗
        reviewMask.addEventListener('click', closeReviewPopup);
        // 4. 阻止弹窗内点击事件冒泡到遮罩（避免点击弹窗内容也关闭）
        reviewPopup.addEventListener('click', (e) => e.stopPropagation());
    }

    //打开弹窗 @param {string} content - 弹窗要显示的HTML内容
    function openReviewPopup(content) {
        if (!reviewPopup || !reviewMask) initReviewPopup();
        // 设置弹窗内容
        reviewPopup.innerHTML = content;
        // 显示遮罩和弹窗
        reviewMask.style.display = 'block';
        reviewPopup.style.display = 'block';
        // 监听全局点击：点击空白区（非弹窗/触发元素）关闭
        document.addEventListener('click', handleDocumentClick);
    }

    //关闭弹窗
    function closeReviewPopup() {
    if (reviewPopup && reviewMask) {
        reviewPopup.style.display = 'none';
        reviewMask.style.display = 'none';
        // 重置触发元素的文本（去掉↓）
        if (triggerElement && triggerElement.textContent.includes('↓')) {
            triggerElement.textContent = triggerElement.textContent.replace(/↓/g, '');
        }
        // 移除全局点击监听
        document.removeEventListener('click', handleDocumentClick);
        triggerElement = null;
    }
}

    //处理全局点击：仅点击空白区（非弹窗/触发元素）时关闭
    function handleDocumentClick(e) {
        const isClickOnPopup = reviewPopup.contains(e.target);
        const isClickOnTrigger = triggerElement && triggerElement.contains(e.target);
        if (!isClickOnPopup && !isClickOnTrigger) {
            closeReviewPopup();
        }
    }

    //核心函数：切换用户审核弹窗（重写版） @param {number} iowner - 传入的owner标识
    switchUserReviewDiv = function(iowner) {
        console.log("switchUserReviewDiv", iowner);
        try {
            // 兼容event.srcElement（改为标准的event.target）
            const targetElement = event.target;
            triggerElement = targetElement; // 缓存触发元素

            // 提取元素属性（原生DOM操作）
            const id = targetElement.getAttribute('tagname');
            const us = targetElement.getAttribute('us');
            const owner = targetElement.getAttribute('owner');
            const powner = targetElement.getAttribute('powner');
            let userEmailList = [];
            let stmp = "";

            // 1. 点击时先重置所有带↓的元素文本
            const resetDownArrow = (selector) => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(item => {
                    if (item.textContent.includes("↓")) {
                        item.textContent = item.textContent.replace("↓", "");
                    }
                });
            };

            // 2. 切换箭头显示/隐藏逻辑
            if (targetElement.textContent.includes("↓")) {
                // 关闭弹窗 + 移除箭头
                targetElement.textContent = targetElement.textContent.replace(/↓/g, "");
                closeReviewPopup();
            } else {
                // 重置其他元素的箭头
                resetDownArrow('[us="us1"]');
                resetDownArrow('[us="us2"]');
                // 当前元素添加箭头
                targetElement.textContent = targetElement.textContent + "↓";

                // 3. 初始化用户邮箱列表
                if (us === "us1") {
                    userEmailList = JSON.parse(JSON.stringify(userEmailList1));
                } else if (us === "us2") {
                    userEmailList = JSON.parse(JSON.stringify(userEmailList2));
                }

                // 4. 读取R2文件并处理业务逻辑
                readR2File("portal/portaluseremail/portal." + id + ".useremail.json")
                    .then(res => {
                    let userreview = [];
                    let userReviewJson = [];
                    if (!res) {
                        setTimeout(() => {
                            console.log("switchUserReviewDiv:未找到审核文件", res);
                        }, 1000);
                    } else {
                        userReviewJson = res.content;
                        userreview = JSON.stringify(res.content);
                    }

                    // 5. 补打卡核心业务逻辑（保留原有逻辑）
                    const matchingMission = missionGDoc.find(mission => mission.portalID === id);
                    if (matchingMission) {
                        let iHaveReview = false;
                        if (matchingMission.ownerstatus) {
                            const userReviewed = userReviewJson.find(item => item.useremail === userEmail);
                            if (!userReviewed) {
                                iHaveReview = true;
                                console.log("无用户打卡，但是本地审核中有");
                            } else {
                                console.log("有用户打卡，本地审核也有");
                            }
                        } else {
                            const userReviewed = userReviewJson.find(item => item.useremail === userEmail);
                            if (userReviewed) {
                                console.log("云有，本地没有", userReviewed);
                                try {
                                    let reviewListStr = localStorage.getItem('reviewLista') || '[]';
                                    let reviewList = JSON.parse(reviewListStr);
                                    if (!Array.isArray(reviewList)) reviewList = [];

                                    const iHaveLocal = reviewList.some(item =>
                                                                       item?.id === matchingMission.portalID && item?.user === userEmail
                                                                      );
                                    if (!iHaveLocal) {
                                        console.log("没找到，本地补一条", iHaveLocal);
                                        const reviewStr = {
                                            user: userReviewed.useremail,
                                            datetime: userReviewed.datetime,
                                            id: matchingMission.portalID,
                                            title: matchingMission.title,
                                            lat: matchingMission.lat,
                                            lng: matchingMission.lng,
                                            score: "云补，未知",
                                            type: matchingMission.types,
                                            imageUrl: matchingMission.imageUrl
                                        };
                                        reviewList.push(reviewStr);
                                        localStorage.setItem("reviewLista", JSON.stringify(reviewList));
                                    }
                                } catch (error) {
                                    console.error('处理 reviewLista 时出错:', error);
                                    localStorage.setItem("reviewLista", '[]');
                                }
                            }
                        }

                        // 补打卡逻辑
                        if (iHaveReview) {
                            let susermark = {
                                useremail: userEmail,
                                datetime: formatDate(new Date(), "yyyy-MM-dd HH:mm:ss"),
                                performance: performance,
                                status: "补打卡"
                            };
                            let reviewData = [];
                            try {
                                const storedData = localStorage.getItem('reviewLista');
                                if (storedData) {
                                    reviewData = JSON.parse(storedData);
                                    if (!Array.isArray(reviewData)) {
                                        console.warn(`reviewLista 数据格式错误`);
                                    } else {
                                        const haveReview = reviewData.find(it =>
                                                                           it.user === userEmail && it.id === matchingMission.portalID
                                                                          );
                                        if (haveReview) {
                                            susermark.datetime = haveReview.datetime || '';
                                        } else {
                                            const storedData1 = localStorage.getItem('reviewListb');
                                            if (storedData1) {
                                                reviewData = JSON.parse(storedData1);
                                                if (Array.isArray(reviewData)) {
                                                    const haveReviewB = reviewData.find(it =>
                                                                                        it.user === userEmail && it.id === matchingMission.portalID
                                                                                       );
                                                    if (haveReviewB) {
                                                        susermark.datetime = haveReviewB.datetime || '';
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
                            setTimeout(() => {
                                console.log("补用户打卡：portal/portaluseremail/", "portal." + id + ".useremail.json", susermark);
                                uploadDataToR2("portal/portaluseremail/", "portal." + id + ".useremail.json", userReviewJson);
                            }, 500);
                        }
                    }

                    // 6. 构建弹窗内容HTML（保留原有渲染逻辑）
                    stmp += `<div style='display: flex;'>`;
                    if (userreview.length > 0) console.log('userReviewJson', userReviewJson);

                    for (let i = 0; i < userEmailList.length; i++) {
                        let sname = null;
                        let semail = null;
                        let slink = null;
                        let po = "";
                        sname = userEmailList[i].substring(0, userEmailList[i].indexOf(';'));
                        semail = userEmailList[i].substring(
                            userEmailList[i].indexOf(';') + 1,
                            userEmailList[i].indexOf(';', userEmailList[i].indexOf(';') + 1)
                        );
                        slink = userEmailList[i].substring(userEmailList[i].lastIndexOf(';') + 1);

                        if (powner) {
                            po = semail.includes(powner) ? "<span style='color:red'>O:</span>" : "<span></span>";
                        } else {
                            po = "<span></span>";
                        }

                        // 审核状态判断
                        if (findUserEmail(userreview, semail) > 0) {
                            if (userEmailList[i].includes(userEmail)) {
                                stmp += `<div class='sqselfok'>${po}${sname}</div>`;
                            } else {
                                stmp += `<div class='sqok'>${po}${sname}</div>`;
                            }
                        } else {
                            if (semail.includes(userEmail)) {
                                if (owner === "true") {
                                    stmp += `<div class='sqselfowner'>${po}${sname}</div>`;
                                } else {
                                    stmp += `<div class='sqselfno'>${po}${sname}</div>`;
                                }
                            } else {
                                stmp += `<div class='sqno'>${po}${sname}</div>`;
                            }
                        }

                        // 每5个元素换行
                        if ((i + 1) % 5 === 0) {
                            stmp += `</div><p></p><div style='padding-top:1em;display: flex;'>`;
                        }
                    }
                    stmp += `</div>`;

                    // 7. 打开弹窗并渲染内容（替代原replaceWith）
                    openReviewPopup(stmp);
                })
                    .catch(err => {
                    console.log("err, not found", err);
                });
            }
        } catch (e) {
            console.log("switchUserReviewDiv 异常：", e);
        }
    };

    // 补充：确保弹窗样式类生效（可根据需要调整）
    const style = document.createElement('style');
    style.textContent = `
    .sqselfok { color: #008000; padding: 4px 8px; min-width: 80px; }
    .sqok { color: #0066cc; padding: 4px 8px; min-width: 80px; }
    .sqselfowner { color: #ff8c00; padding: 4px 8px; min-width: 80px; }
    .sqselfno { color: #ff4444; padding: 4px 8px; min-width: 80px; }
    .sqno { color: #666; padding: 4px 8px; min-width: 80px; }
`;
    document.head.appendChild(style);
//原switchUserReviewDiv函数
/*
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
                //stmp+=`<div id='idUserEmail${iowner}' style='display: none;'></div>`;
                idUserEmail.style.display = "none";
                //$(`#idUserEmail${iowner}`).replaceWith(stmp);
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
                    idUserEmail.style.display = "block";

                    stmp+=`<div style='display: flex;'>`;
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
                    //$(`#idUserEmail${iowner}`).replaceWith(stmp);
                    idUserEmail.innerHTML = stmp;
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
*/
//================弹窗代码结束===============

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
    async function getMissionHTMLAccepted(iowner) {
        function getHTML() {
            // 更新页面DOM
            let sHtml = `<div class='placestr1'></div><br>` ;
            const iduseremail = document.createElement('div');
            let divuseremail = document.getElementById('id-useremail');
            if(divuseremail) divuseremail.textContent = userEmail;
            //iduseremail.className = 'au-location-modal';
            iduseremail.id = `idUserEmail${iowner}`;
            iduseremail.style.display = `none`;
            iduseremail.style.position = 'absolute';
            iduseremail.innerHTML = `<table><thead><tr><th>标题1</th><th>标题2</th><tr></thead><tbody><tr><td>数据1</td><td>数据2</td></tr></tbody></table></div>`;
            document.body.appendChild(iduseremail);
            //以下，生成任务列表显示：smis：表头；smistmp：最终表格；sultmp：用户邮箱排列块
            //放在最后，因为需要generateReviewTable里读取本地来判断是否审过=>更新missionGDoc中的ownerstatus
            //下一步，是否加入读取网络文件来判断是否审过？
            //smistmp(字符串)/missionPortal(DOM元素)  ; sultmp(字符串，用户邮箱)/missionuser(显示用户邮箱排列块)
            //0:title;1:位置;2:开审;3:type;4:显示已审;5:日期;6:审结;7:lat;8:lng;9:userEmail;10:id;11:挪的方向
            let smistmp="<table style='width:100%'><thead><tr>"
            +"<th style='width:15%'>名称</th><th style='width:5%'>通过</th><th style='width:15%'>位置</th>"
            +"<th style='width:10%'>类型</th><th style='width:5%'>开审</th><th style='width:5%'>已审</th>"
            +"<th style='width:20%'>时间</th><th style='width:8%'>纬度</th><th style='width:8%'>经度</th>"
            +"<th style='width:14%'>挪po</th>"
            +"</tr></thead><tbody>";
            //console.log('smistmp',smistmp);
            let MISSION_ACCEPT_DISPLAY = 30;
            let icnt = 1;
            missionGDocAll.forEach(item => {
                if(icnt > MISSION_ACCEPT_DISPLAY) return;
                let stitle = item.portalID ? `<td><a href='${item.imageUrl}' target='_blank'>${item.title}</a></td>` : `"<td>${item.title}</td>"`;
                let sstatus = "<td>"+(item.status === "通过" ? "✓" : "" )+"</td>";
                let ssubmitter = '<td><a href="javascript:void(0);" us="us2" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter;
                let slatlng = '" tagName="' + item.portalID + `" onclick="switchUserReviewDiv(${iowner})";>`+item.lat+','+item.lng+"</a></td>";
                let stypes = '<td><a href="javascript:void(0);" us="us1" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter
                + '" tagName="' + item.portalID + `" onclick="switchUserReviewDiv(${iowner})";>`+item.types+"</a></td>";
                let sbegin = "<td>"+ (item.status === "审核" || item.status === "通过" ? "✓" : "" ) +"</td>";
                let sownerstatus = "<td>" + (item.ownerstatus === true ? '✓' : '') +"</td>";
                let ssubmitteddate = item.portalID ? `<td><a href='${durl}/portal/portaluseremail/portal.${item.portalID}.useremail.json' target='_blank'>${item.submitteddate}</a></td>` : `<td>${item.submitteddate}</td>` ;
                let slat = `<td><a href="javascript:void(0);" onclick="openPortalOnMap(${item.lat},${item.lng},'${item.portalID}')";>` + item.lat+"</a></td>";
                let slng = "<td>"+item.lng;
                let smove = "</td><td>"+(item.moveoptions === "右" ? "最右" :( item.moveoptions === "下" ? "最下" : (item.moveoptions+item.moveplace)))+"</td>";
                smistmp += "<tr>" + stitle + sstatus + ssubmitter + slatlng + stypes + sbegin + sownerstatus + ssubmitteddate + slat + slng + smove + "</tr>";
                icnt += 1;
            });
            //console.log('homepage',missionGDoc);
            //console.log("missionPortal1",$("#missionPortal1"));
            smistmp+="</tbody></table>";
            //console.log(`smistmp`,smistmp);
            // 使用const声明变量，避免意外修改
            sHtml += `<div>${smistmp}</div>` ;
            return sHtml;
        }
        if(userEmail === null) {
            console.log('userEmail.null',userEmail);
            let restext = await getUser();
            userEmail = restext.result.socialProfile.email;
            performance = restext.result.performance;
            document.title = userEmail;
            if (userEmail != null) {
                localStorage.setItem("currentUser", userEmail);
            } else return "";
            console.log("最终获取到的用户邮箱：", userEmail);
            let sHtml = getHTML();
            //console.log('sHtml',sHtml);
            return sHtml;
        } else
        {
            console.log('userEmail.exists',userEmail);
            return getHTML();
        }
    }
    //首页home显示用户审过的po
    async function getMissionHTML(iowner) {
      // 等待获取任务数据（现在处于async函数中，可安全使用await）
      //console.log(`getMissionHTML:${iowner}`);
      await getMissionFromCloudFlare();
      if(userEmail === null) {
        // 先获取用户信息并等待完成
        const restext = await getUser();
        // 处理用户信息
        userEmail = restext.result.socialProfile.email;
        performance = restext.result.performance;
        document.title = userEmail;

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
          let sHtml = `<div class='placestr'></div><br>` ;
          //let sHtml = `<div class='placestr'><font size=3>${userEmail}</font></div><br>` ;
          //let iduseremail = `<div id='idUserEmail${iowner}' style='display:none'><div></div>`;
          const iduseremail = document.createElement('div');
          let divuseremail = document.getElementById('id-useremail');
          if(divuseremail) divuseremail.textContent = userEmail;
          //iduseremail.className = 'au-location-modal';
          iduseremail.id = `idUserEmail${iowner}`;
          iduseremail.style.display = `none`;
          iduseremail.style.position = 'absolute';
          iduseremail.innerHTML = `<table><thead><tr><th>标题1</th><th>标题2</th><tr></thead><tbody><tr><td>数据1</td><td>数据2</td></tr></tbody></table></div>`;
          document.body.appendChild(iduseremail);
          //console.log('sHtml',sHtml);
          // 处理任务数据
          try{

            //以下，生成任务列表显示：smis：表头；smistmp：最终表格；sultmp：用户邮箱排列块
            //放在最后，因为需要generateReviewTable里读取本地来判断是否审过=>更新missionGDoc中的ownerstatus
            //下一步，是否加入读取网络文件来判断是否审过？
            {
              //smistmp(字符串)/missionPortal(DOM元素)  ; sultmp(字符串，用户邮箱)/missionuser(显示用户邮箱排列块)
              //0:title;1:位置;2:开审;3:type;4:显示已审;5:日期;6:审结;7:lat;8:lng;9:userEmail;10:id;11:挪的方向
              let smistmp="<table style='width:100%'><thead><tr>"
              +"<th style='width:15%'>名称</th><th style='width:5%'>通过</th><th style='width:15%'>位置</th>"
              +"<th style='width:10%'>类型</th><th style='width:5%'>开审</th><th style='width:5%'>已审</th>"
              +"<th style='width:20%'>时间</th><th style='width:8%'>纬度</th><th style='width:8%'>经度</th>"
              +"<th style='width:14%'>挪po</th>"
              +"</tr></thead><tbody>";
              //console.log('smistmp',smistmp);
              missionGDoc.forEach(item => {
                  let stitle = item.portalID ? `<td><a href='${item.imageUrl}' target='_blank'>${item.title}</a></td>` : `"<td>${item.title}</td>"`;
                  let sstatus = "<td>"+(item.status === "通过" ? "✓" : "" )+"</td>";
                  let ssubmitter = '<td><a href="javascript:void(0);" us="us2" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter;
                  let slatlng = '" tagName="' + item.portalID + `" onclick="switchUserReviewDiv(${iowner})";>`+item.lat+','+item.lng+"</a></td>";
                  let stypes = '<td><a href="javascript:void(0);" us="us1" owner="' + (item.submitter === userEmail ? true : false) + '" powner="' + item.submitter
                    + '" tagName="' + item.portalID + `" onclick="switchUserReviewDiv(${iowner})";>`+item.types+"</a></td>";
                  let sbegin = "<td>"+ (item.status === "审核" || item.status === "通过" ? "✓" : "" ) +"</td>";
                  let sownerstatus = "<td>" + (item.ownerstatus === true ? '✓' : '') +"</td>";
                  let ssubmitteddate = item.portalID ? `<td><a href='${durl}/portal/portaluseremail/portal.${item.portalID}.useremail.json' target='_blank'>${item.submitteddate}</a></td>` : `<td>${item.submitteddate}</td>` ;
                  let slat = `<td><a href="javascript:void(0);" onclick="openPortalOnMap(${item.lat},${item.lng},'${item.portalID}')";>` + item.lat+"</a></td>";
                  let slng = "<td>"+item.lng;
                  let smove = "</td><td>"+(item.moveoptions === "右" ? "最右" :( item.moveoptions === "下" ? "最下" : (item.moveoptions+item.moveplace)))+"</td>";
                  smistmp += "<tr>" + stitle + sstatus + ssubmitter + slatlng + stypes + sbegin + sownerstatus + ssubmitteddate + slat + slng + smove + "</tr>";
              });
              //console.log('homepage',missionGDoc);
              //console.log("missionPortal1",$("#missionPortal1"));
              smistmp+="</tbody></table>";
              //console.log(`smistmp`,smistmp);
              // 使用const声明变量，避免意外修改
              sHtml += `<div>${smistmp}</div>` ;
            }
            //console.log('sHtml',sHtml);
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
        //console.log('isInited',isInited);
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
    //window.addEventListener('load', () => setTimeout(initNodes, 300));
/*
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
                    //console.log(`检测到侧边栏路由跳转：${url}，执行修复`);
                    isInited = false;
                    setTimeout(initNodes, 200); // 缩短延迟，适配DOM渲染
                    //if (url && url.startsWith('/new/review')) {
                        setTimeout(function(){
                            //console.log(`修复任务标签`);
                            modifyThirdSidebarLink();
                        },500);
                    //}
                    if (url && url.startsWith('/new/criteria/eligibility')) {
                        //setTimeout(checkAndReplace,200);
                    }
                }
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
    //interceptRoute();
    //listenReviewAjax();

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
*/
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

    // 初始化
    // 页面加载后执行（延时确保DOM渲染完成）
    window.addEventListener('load', () => setTimeout( function() {
        addPanelToMapView();
        observeMapViewLoading();
        initNodes();
    }, 300));

})();
