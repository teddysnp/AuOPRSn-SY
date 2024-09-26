// ==UserScript==
// @name         AuOPR-Map-autoclick
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  try to take over the world!
// @author       You
// @match        https://wayfarer.nianticlabs.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==
//挪po指南：
// 1-9:左至右排列第几个  11:18:上至下排列第几个  10:最右一个  20:最下一个
(function() {
    let ioutput = "true";
    let editGYMPosition = [["丛林里的梅花鹿","false","10"],["职工文体广场","false","2"],["万达贾飞碟","false","11"]];
    let portalData = null;
    let portalTitle = null;

    (function (open) {
        XMLHttpRequest.prototype.open = function (method, url) {
//            console.log(url);
//            console.log(method);
            if (url == '/api/v1/vault/review' && method == 'GET') {
                this.addEventListener('load', injectTimer, false);
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
        ioutput= "true";
        awaitElement(() => document.querySelector('wf-logo'))
            .then((ref) => {
            try {
                const response = this.response;
                const json = JSON.parse(response);
                if (!json) return;
                portalData = json.result;
                portalTitle = portalData.title;
                //console.log(json);
            } catch (e) {
                console.log(e);
            }
        });
    }

    setInterval(() => {
//                console.log("timer");
        //   if ioutput
        //      监听是否有挪po操作
        //      if portaldata
        //        if portaldata edit
        //        发现挪po
        //      if document.query

        if(ioutput!="false"){
            console.log("监听是否有挪po操作");
            if(portalData){
                if(portalData.type=="EDIT"){
                    console.log("发现挪po申请");
                    console.log("查找地图上的点");
                    if(document.querySelector('agm-map div[role="button"]')){
                        let ptbutton = document.querySelectorAll('agm-map div[role="button"]');
                        let ptstruct = getbtnStruct(ptbutton);
                        let ititle = findArrayTwo(editGYMPosition,portalData.title);
                        //                        console.log("ititle",ititle);
                        if(ititle>=0){
                            //                            console.log(editGYMPosition[ititle]);
                            //                            console.log(editGYMPosition[ititle][2]);
                            let editgym = editGYMPosition[ititle];
                            let resortdata = getclickedbtn(ptstruct,editgym);
                            let movepos = parseInt(editgym[2]);
                            if( movepos >10) movepos = movepos-10;
                            console.log("GYMData",ptstruct);
                            console.log("resortGYM",resortdata);
                            let resdata=null;
                            console.log(movepos);
                            if(movepos==10) {resdata=resortdata[resortdata.length - 1];}
                            if(movepos<=resortdata.length){
                                resdata=resortdata[movepos-1];
                            }
                            console.log("resdata",resdata);
                            ptbutton.forEach((ptbtn)=>{
                                //left: 65px; top: -135px;
                                if(ptbtn.getAttribute('style').indexOf("left: "+resdata.left +"px; top: "+resdata.top)>=0){
                                    console.log("选中",ptbtn);
                                    ptbtn.click();
                                    ioutput="false";
                                    return;
                                }
                            })
                        } else {
                            //没找到，xjb选一个
                            ptbutton[0].click();
                            console.log("xjb选一个");
                            ioutput="false";
                        }
                    }
                }
                else {
                    ioutput="false";
                }
            }
        }

    },1000);


    function findArrayTwo(arr,title){
        for(let i=0;i<arr.length;i++){
//            console.log("arr["+i+"]",arr[i]);
            if(arr[i].indexOf(title)>=0){
                return i;
            }
        }
        return -1;
    }

    function getclickedbtn(ptstruct,editgym){
        let ilen=ptstruct.length;
        let iplan =editgym[2];
        if (ilen<=0) return null;
        if (ilen==1) return ptstruct[0].aria-describedby;
        return resort(ptstruct,iplan);
    }

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