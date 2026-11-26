// ==UserScript==
// @name         AuOPRSn-SY-CloudFlareSDK
// @namespace    AuOPR
// @version      2.1.0
// @description  AuOPRSn CloudFlare 公共 SDK
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @match        https://wayfarer.scopely.com/*
// @connect      wayfarer.teddysnp.ccwu.cc
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const SDK_NAME = 'AuOPRSnCloudFlareSDK';
    const SDK_VERSION = '2.0.0';

    // 防止重复初始化
    if (unsafeWindow[SDK_NAME]?.version === SDK_VERSION) {
        return;
    }

    // ==================== 配置 ====================

    const SETTINGS_KEY = 'auoprsn_settings';

    const CONFIG = {
        BASE_URL: 'https://wayfarer.teddysnp.ccwu.cc',
    };

    const userSettings = {
        SECRET_KEY: null
    };

    // ==================== 配置管理 ====================

    function loadSettings() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);

            if (saved) {
                Object.assign(userSettings, JSON.parse(saved));
            }
        } catch (e) {
            console.error('[CloudFlareSDK] 配置读取失败', e);
        }
    }

    function saveSettings() {
        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(userSettings)
        );
    }

    loadSettings();

    // ==================== HTTP 请求核心 ====================

    function request(method, url, data) {
        return new Promise((resolve, reject) => {

            const headers = {
                'X-API-Key': userSettings.SECRET_KEY
            };

            const isFormData = data instanceof FormData;

            let body;

            if (data !== undefined && data !== null) {
                if (isFormData) {
                    body = data;
                } else {
                    headers['Content-Type'] = 'application/json';
                    body = JSON.stringify(data);
                }
            }

            GM_xmlhttpRequest({
                method,
                url: `${CONFIG.BASE_URL}${url}`,
                headers,
                data: body,

                onload(response) {
                    let result;

                    try {
                        result = response.responseText
                            ? JSON.parse(response.responseText)
                            : null;
                    } catch (e) {
                        reject(new Error(
                            `响应解析失败：${response.responseText}`
                        ));
                        return;
                    }

                    if (
                        response.status >= 200 &&
                        response.status < 300
                    ) {
                        resolve(result);
                    } else {
                        reject(new Error(
                            result?.error ||
                            `HTTP ${response.status}`
                        ));
                    }
                },

                onerror(error) {
                    reject(new Error(
                        error?.error || '网络请求失败'
                    ));
                },

                ontimeout() {
                    reject(new Error('请求超时'));
                }
            });
        });
    }

    // ==================== 回调兼容层 ====================

    function withCallbacks(promise, success, error, mapper) {
        if (typeof success === 'function' ||
            typeof error === 'function') {

            promise.then(result => {
                if (typeof success === 'function') {
                    success(mapper ? mapper(result) : result);
                }
            }).catch(err => {
                if (typeof error === 'function') {
                    error(err.message);
                } else {
                    console.error('[CloudFlareSDK]', err);
                }
            });
        }

        return promise;
    }

    // ==================== CloudFlare 数据操作 ====================

    const cfClass = {

        // 1. 按 ID 查询单条数据
        getDataById(id, success, error) {
            const promise = request(
                'GET',
                `/data/${encodeURIComponent(id)}`
            );

            return withCallbacks(promise, success, error);
        },

        // 2. 按 status 批量查询
        getDatasByStatus(statusList, success, error) {
            const params = new URLSearchParams();

            statusList.forEach(status => {
                params.append('status', status);
            });

            const promise = request(
                'GET',
                `/mission/data?${params.toString()}`
            );

            return withCallbacks(promise, success, error);
        },

        // 3. 新增数据 / 有 ID 时更新数据
        addData(data, success, error) {
            const isFormData = data instanceof FormData;

            const hasId = isFormData
                ? data.has('id') && data.get('id') !== ''
                : data?.id !== undefined &&
                  data?.id !== null &&
                  data?.id !== '';

            let method = 'POST';
            let url = '/data';

            if (hasId) {
                const id = isFormData
                    ? data.get('id')
                    : data.id;

                method = 'PUT';
                url = `/data/${encodeURIComponent(id)}`;
            }

            const promise = request(method, url, data);

            return withCallbacks(promise, success, error);
        },

        // 4. 按 ID 更新数据
        updateData(id, updateFields, success, error) {
            const promise = request(
                'PUT',
                `/data/${encodeURIComponent(id)}`,
                updateFields
            );

            return withCallbacks(promise, success, error);
        },

        // 5. 按 ID 删除数据
        deleteData(id, success, error) {
            const promise = request(
                'DELETE',
                `/data/${encodeURIComponent(id)}`
            );

            // 保留旧版本的 success(message) 行为
            return withCallbacks(
                promise,
                success,
                error,
                result => result?.message
            );
        }
    };

    // ==================== Mission 业务方法 ====================

    async function getMissionFromCloudFlare(statusList = []) {

        console.log('SDK：读取mission');

        const response = await cfClass.getDatasByStatus(statusList);

        if (!Array.isArray(response)) {
            throw new Error('任务数据格式错误：返回结果不是数组');
        }

        const missionGDoc = response
        .filter(item => statusList.length === 0 || statusList.includes(item.status))
        .map(item => ({
            ...item,
            ownerstatus: ''
        }));
        console.log('SDK：读取mission:',missionGDoc);

        localStorage.setItem(
            'missionGDoc',
            JSON.stringify(missionGDoc)
        );

        return missionGDoc;
    }


    // ==================== cloudflare ====================
    // 上传数据到R2   uploadDataToR2(folderPath:路径 , fileName:文件名 , data:json数据)
    //WORKER_URL为通用型，参数有文件、数据
    //本脚本暂未用到上传函数uploadDataToR2
    function uploadDataToR2(folderPath,fileName,data) {
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
        let DISLOG = false;
        return new Promise((res, err) => {

            if(DISLOG) console.log(`正在读取文件: ${fileName}`);

            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.BASE_URL}/json/read?file=${encodeURIComponent(fileName)}`,
                headers: {
                    'X-Secret-Key': userSettings.SECRET_KEY
                },
                // 新增：打印发送的请求信息
                onsend: function() {
                    if(DISLOG) console.log('发送请求:', {
                        url: this.url,
                        headers: this.headers
                    });
                },
                onload: function(response) {

                    if(DISLOG) console.log('收到响应:', {
                        status: response.status,
                        responseText: response.responseText.substring(0, 200) // 只显示前200字符
                    });
                    try {
                        const result = JSON.parse(response.responseText);
                        if(DISLOG) console.log('result',result);
                        if (result.success) {
                            if(DISLOG) console.log(`成功读取文件: ${result.fileName.split('/').pop()}`);
                            res(result);
                        } else {
                            if(DISLOG) console.log('result',result);
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
    // 更新打卡
    function updateReviewMark(portalId, newUserMark){
        return new Promise((res, err) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${CONFIG.BASE_URL}//portal/updateportaluseremail/portal.${portalId}.usermail.json`,
                headers: {
                    'X-Secret-Key': userSettings.SECRET_KEY
                },
                keepalive: true, // 关键：允许请求在页面卸载后继续执行
                body: JSON.stringify({
                    portalId: portalId,
                    newUserMark: newUserMark
                }),
                // 新增：打印发送的请求信息
                onsend: function() {
                    /*
                    console.log('发送请求:', {
                        url: this.url,
                        headers: this.headers
                    }); */
                },
                onload: function(response) {
                    /*
                    console.log('收到响应:', {
                        status: response.status,
                        responseText: response.responseText.substring(0, 200) // 只显示前200字符
                    }); */
                    try {
                        const result = JSON.parse(response.responseText);
                        if (result.success) {
                            console.log(`成功更新打卡: ${result}`);
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
    // ==================== Mission 公共数据 ====================

    let missionGDoc = [];
    let missionVersion = 0;
    let missionUpdatedAt = 0;

    // 初始化任务数据
    async function initMission() {
        try {
            const data = await getMissionFromCloudFlare();
            SDK.setMission(data);
            return SDK.missionGDoc;
        } catch (error) {
            console.error(
                '[CloudFlareSDK] Mission 初始化失败',
                error
            );

            throw error;
        }
    }

    // ==================== SDK 公共接口 ====================

    const SDK = {

        version: SDK_VERSION,

        // 初始化任务数据
        ready: null,

        // 公共任务数据
        get missionGDoc() {
            return missionGDoc;
        },

        get missionVersion() {
            return missionVersion;
        },

        get missionUpdatedAt() {
            return missionUpdatedAt;
        },

        // 更新共享任务数据
        setMission(data) {
            missionGDoc = data;
            missionVersion++;
            missionUpdatedAt = Date.now();

            return missionGDoc;
        },

        // 手动刷新任务数据
        refreshMission: async function () {
            const data = await getMissionFromCloudFlare();
            return this.setMission(data);
        },

        // 原有 CloudFlare 方法
        cfClass,
        getMissionFromCloudFlare,
        uploadDataToR2,
        readR2File,
        updateReviewMark,
        request,
        reloadSettings: loadSettings
    };


    // ==================== SDK 暴露 ====================

    // 允许重新赋值，方便后续 SDK 更新
    Object.defineProperty(unsafeWindow, SDK_NAME, {
        value: SDK,
        writable: true,
        configurable: true,
        enumerable: true
    });

    // 自动初始化
    SDK.ready = initMission();
    // 兼容旧接口
    unsafeWindow.cfClass = cfClass;
    unsafeWindow.getMissionFromCloudFlare = getMissionFromCloudFlare;
    unsafeWindow.uploadDataToR2 = uploadDataToR2;
    unsafeWindow.readR2File = readR2File;
    unsafeWindow.updateReviewMark = updateReviewMark;

    // 通知其他脚本
    unsafeWindow.dispatchEvent(
        new unsafeWindow.CustomEvent(
            'AuOPRSnCloudFlareSDKReady'
        )
    );

    //console.log(`[${SDK_NAME}] v${SDK_VERSION} 初始化完成`, SDK);

    //console.log('[CloudFlareSDK] 已成功暴露', unsafeWindow[SDK_NAME]);

    //console.log(`[${SDK_NAME}] v${SDK_VERSION} 初始化完成`);

})();
