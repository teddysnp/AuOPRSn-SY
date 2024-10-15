// ==UserScript==
// @name         AuOPRSn-SY-ErrCheck
// @namespace    AuOPR
// @version      1.2-b
// @description  try to take over the world!
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nianticlabs.com
// @grant        none
// ==/UserScript==

(function() {
    let errNumber = 10;  //问题po，自动重试次数
    let mywin = window;

    setInterval(() => {
//      console.log(document.querySelector("div[class='rc-doscaptcha-body']"));
        if(document.querySelector("div[class='rc-doscaptcha-body']")){
                createNotify("傻逼了", {
                    body: "被当成机器人了，歇菜了",
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: true
                });
           }
        if(document.querySelector("app-review-error")) {
            console.log("检测到错误");
            let errbtn = document.querySelector('button[class="wf-button wf-button--primary"]');
            console.log("errbtn",errbtn);
            console.log("errNumber",errNumber);
            if(!errbtn){
                createNotify("错误", {
                    body: "重新加载",
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: false
                });
                mywin.location.reload();
                return;
            }
            if(errbtn)
            {
                if(errNumber>0){
                  /*
                    createNotify("错误", {
                        body: "需要重试！",
                        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                        requireInteraction: false
                    });
                    */
                    errNumber--;
                    console.log("error clicked!");
                    errbtn.click();
                }
            }
            if(errNumber==0) {
                createNotify("错误", {
                    body: "重试："+errNumber+"次无法成功，需要人工干预",
                    icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                    requireInteraction: true
                });
                //      mywin.location.reload();
                clearInterval(this);
            }
        }
    },10000);

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
    }
    //显示消息
    function notify($title, $options) {
        var notification = new Notification($title, $options);
        //    console.log(notification);
        notification.onshow = function (event) {
            //      console.log("show : ", event);
        };
        notification.onclose = function (event) {
            //      console.log("close : ", event);
        };
        notification.onclick = function (event) {
            //      console.log("click : ", event);
            //      console.log("notify:title:"+title);
            notification.close();
            mywin.focus();
            //      console.log("https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+title+".png");
            //      checkImgExists("https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+title+".png").then(res =>{
            //        mywin.open("https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+title+".png");
            //      },err=>{console.log("Image not found!");});
        };
    }

})();

