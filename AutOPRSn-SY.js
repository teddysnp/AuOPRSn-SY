// ==UserScript==
// @name         AuOPRSn-SY
// @namespace    http://tampermonkey.net/
// @version      3.2.7
// @description  审po专用
// @author       snpsl
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

//2.4.3  1.本地po，某项随机4或5分从第二个开始；2.Edit时，滚动到地图区域
window.pageData;
window.reviewData;
window.editData;
window.photoData;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var gpausePortal=["金字塔","乒乓球桌","星摩尔广场","小区运动场","同尘桥"];
var gpausePortalString=["测试挪1","重复了!!!","测试挪3","测试挪4","向右"];

var chsaddr=null;
var engaddr=null;
var lastchsaddr=null;
var lastengaddr=null;
var iHaveRate="false";
var iSubmit="false";
var sspos=null;
//池中判断
const prt = 5;
//测试池中用 var private=[[41.7485825,123.4324825,230,380],[41.803847,123.357713,20000,20220],[42.2828685,125.738134,3408,5517],[41.755547, 123.288777,940,1140],[41.81979911, 123.25708028,910,920]];
const private=[[41.7485825,123.4324825,230,380],[41.803847,123.357713,910,920],[42.2828685,125.738134,3408,5517],[41.755547,123.288777,940,1140],[41.81979911, 123.25708028,910,920],[41.810820,123.376373,547,1036]];
var bdisplaychsaddr = 0; //中文地址，0:取;1:不取
var skey="";  //You need input your own key at the showcase page!
var doctitle;
var igetpos=null;
const mywin=window;
var iWarning = 0;
var aaa;
//var gpausePortal=[];
//var gpausePortalString=[];
// xhrPromise1 getAddr1 UserSubmit
//XMLHttpRequest.prototype.open
//document.addEventListener('DOMNodeInserted', function()
//window.onload

const checkImgExists = (imgUrl) => {
  return new Promise(function (resolve, reject){
    const ImgObj = new Image();
    ImgObj.src = imgUrl;
    ImgObj.onload = (res) =>{
      resolve(res);
    }
    ImgObj.onerror = (err)=>{
      reject(err);
    }
  })
}

function ImageExist(url)
{
  let img = new Image();
  img.src = new URL(url);
  console.log(img);
  console.log(img.height);
  return img.height !=0 ;
}

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

  // 显示提示消息
  function notify($title, $options) {
    var notification = new Notification($title, $options);
    console.log(notification);
    notification.onshow = function (event) {
      console.log("show : ", event);
    };
    notification.onclose = function (event) {
      console.log("close : ", event);
    };
    notification.onclick = function (event) {
      console.log("click : ", event);
      console.log("notify:title:"+title);
      notification.close();
      mywin.focus();
      checkImgExists("https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+title+".png").then(res =>{
        mywin.open("https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+title+".png");
      },err=>{console.log("Image not found!");});


//      if (ImageExist("https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/images/"+title+".png")) {
//      }
    };
  }
}

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
      this.timelist.forEach((item,index)=>{
        clearInterval(this.timer);
      })
      this.timer = undefined;
      this.count = 0;
      this.timelist = [];
      document.title = this.title;
    }
  }
}

const messageNotice = new MessageNotice();


autoPR = {
    initSettings: {
        scriptTimeout: 3, //脚本延时（秒）
        endlineTime : 20 ,//审po可用时间：20分钟
        portalTime: 0,
        postPeriod: [28, 35], // 提交周期（秒）
        itimeout:180,  //超时
        autoReview: 'false',     //是否自动审
        saveportalcnt1 :500,        //本地po保存数量
        saveportalcnt2 :200        //外地po保存数量
    },
    useremail: null,
    username:  null,
    userlist: [],
    pagepass: '',
    portalData: {},
    latlon:[],
    settings: null,
    privatePortal: ["占位po"],
    pausePortal: ["数字花朵","丛林里的梅花鹿"],
    pausePortalString: ["↓向下↓","向右→"],  //↑ ↓ ↘︎ ↗︎ ↖︎ ↗︎ ← →
    privatePortalDisplay1: 30,  //首页列表中显示池中已审po数量
    privatePortalDisplay2: 20,  //首页列表中显示非池已审po数量
    autoReviewPRG:"false",

    usrtest:function() {
    },
    scrollBottomTop:function() {
        //mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100
        //mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100
        var conpan = document.querySelector('mat-sidenav-content[class="mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100"]');
        if(conpan)
        {
            conpan.scrollTo({top:conpan.scrollHeight,left:0,behavior:'smooth'});
//            console.log("scroll to bottom");
//            conpan.scrollTo({top:0,left:0,behavior:'smooth'});
//            console.log("scroll to top");
        }
    },

    saveLocalUserReview:function () {
//        localuserreviewdata.push(JSON.parse(localStorage.getItem(useremail)));
        localStorage.setItem(useremail, JSON.stringify(localuserreviewdata));
    },
    saveSettings:function () {
        var inputSettings = $("#autoCloudSettings").val();
        if (inputSettings == "") {
            autoPR.settings = autoPR.initSettings;
            $("#autoCloudSettings").val(JSON.stringify(autoPR.settings));
        } else {
            try {
                var temp = JSON.parse(inputSettings);
            } catch (err) {
                console.error("settings无法识别", err);
                alert("settings无法识别，请检查格式！");
                return;
            }
            autoPR.settings = temp;
        }
        localStorage.setItem(
            "autoCloud-settings",
            JSON.stringify(autoPR.settings)
        );
        console.log("settings设置成功");
        alert("settings设置成功");
    },
    saveStartTime: function () {
        if(typeof(pageData)!="undefined"){
          if (pageData.id== localStorage["portalID"]) return;
          localStorage.setItem("portalID", pageData.id);
          localStorage.setItem("portalTime", new Date().valueOf());
        }
    },
    saveKey:function (){
        var stmp="";
        console.log(document.querySelector("input[id='sskey']"));
        stmp=document.querySelector("input[id='sskey']").value;
        localStorage.setItem("txskey", stmp);
    },
    startstopAuto: function  ()
    {
//      PlaySound();
      if (autoPR.settings.autoReview == 'true') {
          autoPR.settings.autoReview = 'false';
//          autoPR.autoReviewPRG = 'false';
          $("#autoRev").replaceWith('<span style="color:red" id = "autoRev" > 手动 </span>')
       } else {
           autoPR.settings.autoReview = 'true';
           $("#autoRev").replaceWith('<span style="color:red" id = "autoRev" > 自动 </span>')
       }

      localStorage.setItem("autoReview", autoPR.settings.autoReview );
    },
    commitFrm: function ()
    {
        console.log(document.querySelector("input[type='submit']"));
        //
    },
    // 请求
    xhrPromise: function (method, url, data, headers = null) {
        if (headers == null)
            headers = {
                "Content-Type": "application/json",
            };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                data: JSON.stringify(data),
                headers: headers,
                onload: resolve,
                onerror: reject,
            });
        });
    },
    xhrPromise1: function (method, url, data, headers = null) {
        if (headers == null)
            headers = {
                "Content-Type": "application/json",
            };
            GM_xmlhttpRequest({
                method: method,
                url: url,
                data: JSON.stringify(data),
                headers: headers,
                onload: function(res){
                        let a=res.responseText.replace('QQmap&&QQmap(','');
                        a = a.slice(0,a.length-2);
//                        console.log(a);
//                        console.log(JSON.parse(a));
                        chsaddr=JSON.parse(a).result.address;
                        autoPR.addrgoing = 0;
//                        console.log(chsaddr);
                },
                onerror: function(err){
                    console.log('err:'+err);
                    return err;
                },
        });
    },
    // 根据latlng从腾讯API获取地址信息
    getAddr: async function (lat, lng) {
        var resp = autoPR.xhrPromise(
            "GET",
            "https://apis.map.qq.com/ws/geocoder/v1/?location=" +
                lat +
                "," +
                lng +
                "&output=jsonp&poi_options=address_format=short&key="+skey,
            ""
        );
//        console.log(lat+','+lng);
//        console.log('resp:'+resp);
        return resp;
    },
    // 根据latlng从腾讯API获取地址信息
    getAddr1: async function (lat, lng) {
        var resp = autoPR.xhrPromise1(
            "GET",
            "https://apis.map.qq.com/ws/geocoder/v1/?location=" +
                lat +
                "," +
                lng +
                "&output=jsonp&poi_options=address_format=short&key="+skey,
            ""
        );
//        console.log("getAddr1:"+"https://apis.map.qq.com/ws/geocoder/v1/?location=" +lat +"," +lng +"&output=jsonp&poi_options=address_format=short&key="+skey);
//        console.log(resp);
        return resp;
    },
    //经纬度转化为中文地址方法,出错jsonp找不到，需增加引用
    getAreaCode : async function(latitude , longitude) {
          let params = {
              location: latitude + ',' + longitude,
              key: skey,
              output: 'jsonp',
              poi_options : "1"
          }
          this.$jsonp("https://apis.map.qq.com/ws/geocoder/v1/",
                      //https://apis.map.qq.com/tools/locpicker?search=1&type=1&referer=myapp",
                      params).then(res => {
//                        console.log(res);
                        chsaddr = res.result.address;
                    });
    },

    //解析地址
    jiexiaddress:function(lat,lng){
        var url3 = encodeURI("https://apis.map.qq.com/ws/geocoder/v1/?location=" + lat + "," + lng + "&key="+skey+"&output=jsonp&&callback=?");
        $.getJSON(url3, function (result) {
//                    console.log(result);
                if(result.result!=undefined){
//                    console.log(result);
//                    console.log(JSON.stringify(result.result));
                    chsaddr=result.result.address;
                }
        })
    },
    ajaxaddress : function(lat,lng){
        $.ajax({
            type: 'get',
            url: 'https://apis.map.qq.com/ws/geocoder/v1',
            dataType: 'jsonp',
            data: {
                key: skey,//开发密钥
                location: lat + "," + lng,//位置坐标
                get_poi: "0",  //是否返回周边POI列表：1.返回；0不返回(默认)
                poi_options : "1",
//                coord_type: "1",//输入的locations的坐标类型,1 GPS坐标
//                parameter: { "scene_type": "tohome", "poi_num": 20 },//附加控制功能
                output: "jsonp"
            },
            success: function (data, textStatus) {
                if (data.status == 0) {
//                    var address = data.result.formatted_addresses.recommend;
                    //$("#address").html(address);
//                    console.log(data);
//                    console.log(data.result.address + address);
                    chsaddr = data.result.address;
                } else {
                    console.log("位置获取错误，请联系管理员！")
                }
            },
            error: function () {
                console.log("Error! 位置获取错误，请联系管理员！")
            }
        });
    },

    //模拟用户点击打分
    //并不提交，提交在定时器中，到时点击提交按钮实现
    UserSubmit : function(){
//        if(!pageData) return;

        let ibaserate=0;
        let spos="";
        let ibran1 = 0;
        let ibran2 = 0;
        let radscore=0;
        if (autoPR.privatePortal.indexOf(pageData.title)>0){
            ibaserate=4; //池中
            spos="池中:";
        } else if(pageData.type=="NEW"){
//            console.log('streetAddress : '+pageData.streetAddress);
//            console.log("本地判断："+pageData.streetAddress.indexOf("Shen Yang")>0 || pageData.streetAddress.indexOf("Liao Ning")>0
//               || pageData.streetAddress.indexOf("Ji Lin")>0 || pageData.streetAddress.indexOf("Shenyang")>0
//               || pageData.streetAddress.indexOf("通化市")>0 || pageData.streetAddress.indexOf("吉林省")>0
//                       || pageData.streetAddress.indexOf("Liaoning")>0);
            if( pageData.streetAddress.indexOf("Shen Yang")>0 || pageData.streetAddress.indexOf("Liao Ning")>0
               || pageData.streetAddress.indexOf("Ji Lin")>0 || pageData.streetAddress.indexOf("Shenyang")>0
               || pageData.streetAddress.indexOf("通化市")>0 || pageData.streetAddress.indexOf("吉林省")>0
               || pageData.streetAddress.indexOf("Tonghua")>0 || pageData.streetAddress.indexOf("Tong Hua")>0
               || pageData.streetAddress.indexOf("Liaoning")>0 || pageData.streetAddress.indexOf("辽宁省")>0
              ){
            ibaserate=3; //本地
            spos="本地:";
            }

        else
        {
            ibaserate=2; //外地
            spos="外地:";
        }

        }
            var i;
            for (i=0;i<=prt;i++){
                if(pageData.lat>private[i][0]-private[i][2]/100000 & pageData.lat<private[i][0]+private[i][2]/100000 & pageData.lng>private[i][1]-private[i][3]/100000 & pageData.lng<private[i][1]+private[i][3]/100000)
                {ibaserate=4;  spos="池中:";
                 console.log("池中啦" + i);
                }
            }

//        console.log("pageData.streetAddress:"+pageData.streetAddress);
//        console.log("ibaserate:"+ibaserate+" ; spos:"+spos);
        //新
        if(pageData.type=="NEW"){
//            messageNotice.stop();
            // Star rating
            const ratingElementParts = document.getElementsByClassName("wf-review-card");
//            console.log(ratingElementParts);
//            console.log(document.querySelector('#appropriate-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'));
            var iram1,iram2,iram3;
            if (ibaserate==4){iram1=0;iram2=0;}
            if (ibaserate==3){iram2=Math.floor(Math.random()*100);iram1=0;}     //本地，随机数1-100 90% 5/6/7必选一个，选中10%no/90%dont know
            //外地 随机1-100 90% 5/6/7必选一个，选中10%no/90%dont know; 30%选中第二个，选中10%no/90%dont know
            if (ibaserate==2){iram3=Math.floor(Math.random()*100);iram2=Math.floor(Math.random()*100);iram1=Math.floor(Math.random()*100);}
            console.log("ibaserate : "+ibaserate+" iram1 : "+iram1 + " iram2 : "+iram2 + " iram3 : "+iram3);
//            try{
//                console.log("try start");
//            iram1=3;
            //适当1
            if (iram1>0 & iram1<4){
                if(document.querySelector('#appropriate-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                    document.querySelector('#appropriate-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
                if(document.querySelector('#appropriate-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                    document.querySelector('#appropriate-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]').click();
                }
            } else {
                if(document.querySelector('#appropriate-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                { //
                  document.querySelector('#appropriate-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#appropriate-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#appropriate-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            } //适当
            //安全2
            if(iram1>3 & iram1<7){
                if(document.querySelector('#safe-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                    document.querySelector('#safe-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
                if(document.querySelector('#safe-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                    document.querySelector('#safe-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]').click();
                }
            } else {
                if(document.querySelector('#safe-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                { //
                  document.querySelector('#safe-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            }//安全
            //准确3
            if(iram1>6 & iram1<10){
                if(document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                    document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
                if(document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                    document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]').click();
                }
            } else {
                if(document.querySelector('#accurate-and-high-quality-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                { //
                  document.querySelector('#accurate-and-high-quality-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            }//准确
            //永久4
            if(iram1>9 & iram1<13){
                if(document.querySelector('#permanent-location-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                    document.querySelector('#permanent-location-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
                if(document.querySelector('#permanent-location-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                    document.querySelector('#permanent-location-card').querySelector('button[class="wf-button ml-4 dont-know-button wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-key-bracket-3"]').click();
                }
            } else {
                if(document.querySelector('#permanent-location-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                { //
                  document.querySelector('#permanent-location-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#permanent-location-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#permanent-location-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            }//永久
            //社交5  5-no    1-3 34-37  5-不知道  4-33 38-67
            if((iram2>0 & iram2<7) || (iram3>0 & iram3<3)){
                if(document.querySelector('#socialize-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[1])
                {
                  document.querySelector('#socialize-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[1].click();
                }
            } else if ((iram2>18 & iram2<43) || (iram3>3 & iram3<14)) {
                if(document.querySelector('#socialize-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                  document.querySelector('#socialize-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
            } else{
                if(document.querySelector('#socialize-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                {
                  document.querySelector('#socialize-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#socialize-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#socialize-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            }//社交
            //运动6 6-no  34-36 68-70  6-不知道 37-67 71-99
            if( (iram2>6 & iram2<13)  || (iram3>33 & iram3<36)) {
                if(document.querySelector('#exercise-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[1])
                {
                  document.querySelector('#exercise-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[1].click();
                }
            } else if ( (iram2>45 & iram2<69) || (iram3>36 & iram3<48))  {
                if(document.querySelector('#exercise-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                  document.querySelector('#exercise-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
            } else{
                if(document.querySelector('#exercise-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                {
                  document.querySelector('#exercise-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#exercise-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#exercise-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            }
            //探索7 7-no  68-70 1-3    7-不知道 71-99 4-33
            if( (iram2>12 & iram2<19)  || (iram3>67 & iram3<70) ) {
                if(document.querySelector('#explore-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[1])
                {
                  document.querySelector('#explore-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[1].click();
                }
            } else if ( (iram2>72 & iram2<97) || (iram3>70 & iram3<82) ) {
                if(document.querySelector('#explore-card').querySelector('button[class="wf-button ml-4 dont-know-button"]'))
                {
                  document.querySelector('#explore-card').querySelector('button[class="wf-button ml-4 dont-know-button"]').click();
                }
            } else{
                if(document.querySelector('#explore-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0])
                {
                  document.querySelector('#explore-card').querySelectorAll('button[class="wf-button thumbs-button wf-button--icon"]')[0].click();
                }
                if(document.querySelector('#explore-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]'))
                { // 与Warfarer Review脚本冲突，因为此脚本修改了class值
                  document.querySelector('#explore-card').querySelector('button[class="wf-button thumbs-button wf-button--icon wfkr2-touched wfkr2-eds-btn-key wfkr2-eds-btn-key-pad wfkr2-eds-key-bracket-1"]').click();
                }
            }
//            } catch(err) { console.log(err);};

            //分类
            const opts = document.querySelectorAll('mat-button-toggle');
//                console.log(opts);
            for (let i = 0; i < opts.length; i++) {
//                console.log(opts[i]);
            if (!opts[i].classList.contains('mat-button-toggle-checked')) {
                opts[i].querySelector('button').click();
//                break;
               }
            }

          iHaveRate="true";
        }

        //修改
        if(pageData.type=="EDIT"){
            //??? 问题 ， 有时候地图上不选点，奇怪
            //地图存在，则滚动至地图(因为有时候地图不在视野时，内容不加载)
//            if( optp) {optp.scrollTo({top:optp.scrollHeight,left:0,behavior:'smooth'}); }


            //点地图中的第一个点
            const icnt1 = 0;
            const optp = document.querySelector('agm-map');
            if (optp) {
              optp.scrollIntoView(true);
              var opt1 = optp.querySelector('div[role="button"]');
              console.log(opt1);
              while(!opt1) {
                setTimeout(function(){
                  opt1 = optp.querySelector('div[role="button"]');
//                  if (opt1) { break;}
                  console.log(opt1);
                },1000);
                  icnt1++;
                  if (icnt1>10) { break;}
              }
              console.log(opt1);
              if (opt1) {
                opt1.click();
                console.log("map click!");
              }
            }

            //点集合中的第一个选项
            const icnt2 = 0;
            const optp2 = document.querySelector('mat-radio-button');
            if (optp2) {
              optp2.scrollIntoView(true);
              var opt2 = optp2.querySelector("label[class='mat-radio-label']");
              console.log(opt2);
              while(!opt2) {
                  setTimeout(function(){
                  opt2 = optp2.querySelector("label[class='mat-radio-label']");
                  console.log(opt2);
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


            iHaveRate="true";    //已经打分
            //本地，如果是自动，则切换为手动
            if (autoPR.settings.autoReview=='true' & ibaserate==4) {
                 if(autoPR.settings.autoReview=="true"){
                   if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                   autoPR.settings.autoReview="false";
                 }
                $("#autoRev").replaceWith('<span style="color:red" id = "autoRev" > 手动 </span>')
            }
            //滚回顶部
            var conpan = document.querySelector('mat-sidenav-content[class="mat-drawer-content mat-sidenav-content p-4 pb-12 bg-gray-100"]');
            if(conpan)
            {
              conpan.scrollTo({top:0,left:0,behavior:'smooth'});
//              console.log("scroll to top");
            }
//            console.log("opt1:");
//            console.log(opt1);
        }

        //图片
        if(pageData.type=="PHOTO"){
            const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card')[0];
//            console.log(photo);
            if (photo) photo.click();
          iHaveRate="true";
        }

        $("#userscore").replaceWith("<span id='userscore'>"+spos+"</span>");
    },
    UserEditBugTemp : function(){  //未选中提交按钮改为窗口提示，此函数应该不再使用
        //修改
        if(pageData.type=="EDIT"){
            const opt = document.querySelectorAll('mat-radio-button label')[0];
            const opt1 = document.querySelectorAll('agm-map div[role="button"]')[0];
            if (opt1) {
                opt1.click();
//                console.log("map click!");
            }
            if (opt) {opt.click();}
//            console.log("opt1:");
//            console.log(opt1);
        }
    },

};   //calss autoPR

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

//截获发送的请求
const originOpen1 = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (_, url) {
//    console.log(url);
//    alert(url);

  let arg0 = arguments[0];
//    console.log(arguments);


  //登录后，得到登录的邮箱和用户名
  if (url === "/api/v1/vault/properties") {
      console.log("XMLHttpRequest:"+url);
    if (arg0 == 'GET') {     //刷新页面
    const xhr = this;
    const getter = Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      "response"
    ).get;
    Object.defineProperty(xhr, "response", {
      get: () => {
        let result = getter.call(xhr);
        try {
          const res = JSON.parse(result).result;
//          console.log(result);
//          console.log(res);
          if(res){
              autoPR.useremail = res.socialProfile.email;
              autoPR.username = res.socialProfile.name;
//          console.log("username:"+autoPR.username);
              var userlist="";
//              console.log(autoPR.username != null );
//              console.log(autoPR.useremail != null );
              if(autoPR.username != null ){
                  localStorage.setItem("currentUser", autoPR.username);
                  userlist = JSON.parse(localStorage.getItem("userList"));
//              console.log(userlist);
                  if(userlist === null) {userlist = [];};
                  if(userlist.indexOf(autoPR.username)<0){
                  userlist.push(autoPR.username);
//                  console.log(userlist);
                  localStorage.setItem("userList", JSON.stringify(userlist));
                  }
              } else if (autoPR.username == null & autoPR.useremail != null) {
//                  console.log("useremail:"+autoPR.useremail);
                  localStorage.setItem("currentUser", autoPR.useremail);
//                  console.log("local currentUser:"+localStorage["currentUser"]);
                  userlist = JSON.parse(localStorage.getItem("userList"));
//              console.log(userlist);
                  if(userlist === null) {userlist = [];};
                  if(userlist.indexOf(autoPR.useremail)<0){
                  userlist.push(autoPR.useremail);
//                  console.log(userlist);
                  localStorage.setItem("userList", JSON.stringify(userlist));
                  }
              }
          }

          return result;
        } catch (e) {
            console.log(e);
          return result;
        }
      },
    }
   );
  }
 }


  if (url === "/api/v1/vault/review") {
      console.log("XMLHttpRequest:"+url);
    if (arg0 == 'GET') {     //刷新页面
    const xhr = this;
    const getter = Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      "response"
    ).get;
    Object.defineProperty(xhr, "response", {
      get: () => {
        let result = getter.call(xhr);
        try {
            const res = JSON.parse(result).result;
            if(res =="api.review.post.accepted") {
            } else{
              messageNotice.stop();
              igetpos ="get";
//            console.log(result);
//            console.log(res);
              pageData = res ;

              autoPR.portalData = {
                captcha: pageData.captcha,
                type: pageData.type,
                id: pageData.id,
                imageUrl: pageData.imageUrl,
                title: pageData.title,
                description: pageData.description,
                streetAddress: pageData.streetAddress,
                lat: pageData.lat,
                lng: pageData.lng,
                pageData: JSON.stringify(pageData),
                salt: window.localStorage["salt"],
                author: localStorage["username"],
          };
//            console.log(pageData);
            //发送一次请求中文地址
            if((lastengaddr!=null & engaddr!=lastengaddr) || (chsaddr == lastchsaddr) )
            {
                if(autoPR.addrgoing == 0){
                    if(bdisplaychsaddr==0){
                        autoPR.getAddr1(pageData.lat,pageData.lng);
                    }
                    autoPR.addrgoing = 1;
                }
            }
//            console.log(typeof pageData.streetAddress);
            if( typeof pageData.streetAddress == "undefined") {autoPR.portalData.streetAddress=""; engaddr = "";}
            else { engaddr = pageData.streetAddress; }
       // 保存审当前po的起始时间
       autoPR.saveStartTime();
       iSubmit="false";
       iHaveRate="false";

       return result;
            }
        } catch (e) {
          return result;
        }
      },
    }
   );

  }
    //截获提交请求，用于更新本地审po记录
    if (arg0 == 'POST'){    //提交数据
//        console.log(arguments[0]);
      iSubmit ="true";
      igetpos ="post";
      console.log("post:autoReview:"+autoPR.settings.autoReview);
      console.log("post:autoReviewPRG:"+autoPR.autoReviewPRG);
      if(autoPR.autoReviewPRG=="true") {autoPR.settings.autoReview="true";autoPR.autoReviewPRG="false"};
//      autoPR.settings.autoReview=autoPR.autoReviewPRG;
//      messageNotice.stop();
         let send = this.send;
         let _this = this;
         let post_data = [];
         this.send = function (...data) {
         try{
         let userdata = data;
         let userdata1 = JSON.parse(userdata[0]);
//         console.log(data[0]);
//         console.log(data[1]);
//       data = JSON.parse(data);
//         console.log(JSON.parse(data));
//         console.log(JSON.parse(data).type);
//         userdata1.location = 5;
//         userdata[0]=JSON.stringify(userdata1);
//         console.log(userdata);
         data = userdata ;
//       console.log(JSON.stringify(userdata));
//       data.location = 5;
//       console.log(data);
//       data = JSON.stringify(data);
         post_data = data;
           if (pageData.type == "NEW")
           {
           }
           if (pageData.type == "EDIT")
           {
           }
           if (pageData.type == "PHOTO")
           {
           }
         //提交后，保存审po记录到本地缓存
//   {"scriptTimeout":3,"endlineTime":20,"portalTime":0,"postPeriod":[30,40],"autoReview":false}
         var localreview = [];
         var tmpstorage = null ;
         var sdt = formatDate(new Date(),"yyyy-MM-dd HH:mm:ss");
         var i;  var sloc=0;
         for (i=0;i<=prt;i++){
            if(pageData.lat>private[i][0]-private[i][2]/100000 & pageData.lat<private[i][0]+private[i][2]/100000 & pageData.lng>private[i][1]-private[i][3]/100000 & pageData.lng<private[i][1]+private[i][3]/100000)
                {sloc=1;}
         }
//             console.log("Updating local review storage..");
         if (autoPR.privatePortal.indexOf(pageData.title)>=0 || sloc==1 ){
//             console.log("Updating local review storage Reviewed1..");
           localreview = JSON.parse(localStorage.getItem('Reviewed1'));
//           console.log(localreview);
           if(localreview === null) {localreview = [];};
//           console.log(localreview);
           tmpstorage='{\"user\":\"'+localStorage['currentUser']+'\",\"title\":\"'+pageData.title+'\",\"type\":\"'+JSON.parse(data).type+'\",\"lat\":'+pageData.lat+',\"lng\":'+pageData.lng+
               ',\"score\":\"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).location+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety
               +'\",\"dt\":\"'+sdt+'\"}';
//           tmpstorage='{"title":"'+pageData.title+'","type":"'+JSON.parse(data).type+'","lat":'+pageData.lat+',"lng":'+pageData.lng+
//               ',"score":"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety+'/'+JSON.parse(data).location
//               +'","dt":"'+sdt+'"}';
//           var tmpstorage='{"title":"'+JSON.parse(data).title+'","type":"'+JSON.parse(data).type+'","lat":'+JSON.parse(data).lat+',"lng":'+JSON.parse(data).lng+
//               ',"score":"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety+'/'+JSON.parse(data).location+'"}';
           localreview.push(tmpstorage);
//           console.log(localreview);
           localStorage.setItem('Reviewed1', JSON.stringify(localreview.slice(0-autoPR.initSettings.saveportalcnt1)));
         } else {
//             console.log("Updating local review storage Reviewed2..");
           localreview = JSON.parse(localStorage.getItem('Reviewed2'));
//           console.log(localreview);
           if(localreview === null) {localreview = [];};
//           console.log(localreview);
           tmpstorage='{\"user\":\"'+localStorage['currentUser']+'\",\"title\":\"'+pageData.title+'\",\"type\":\"'+JSON.parse(data).type+'\",\"lat\":'+pageData.lat+',\"lng\":'+pageData.lng+
               ',\"score\":\"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).location+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety
               +'\",\"dt\":\"'+sdt+'\"}';
//           var tmpstorage='{"title":"'+JSON.parse(data).title+'","type":"'+JSON.parse(data).type+'","lat":'+JSON.parse(data).lat+',"lng":'+JSON.parse(data).lng+
//               ',"score":"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety+'/'+JSON.parse(data).location+'"}';
           localreview.push(tmpstorage);
//           console.log(localreview.slice(0-autoPR.initSettings.saveportalcnt2));
           localStorage.setItem('Reviewed2', JSON.stringify(localreview.slice(0-autoPR.initSettings.saveportalcnt2)));
         }

//         autoPR.saveLocalUserReview();
         return send.apply(_this, data);
         } catch (e) {
           console.log(e);
           return send.apply(_this, data);
         }
      } //this.send
    }   //if (arg0='POST')

  }


  originOpen1.apply(this, arguments);
};

//节点更新监听：用于页面有刷新时的处理； 但是会处理多次(将来可能用这个取代：MutationObserver)
document.addEventListener('DOMNodeInserted', function() {

  if (document.querySelector("a[class='login-link login-link--niantic']")) {
    if(!messageNotice.alertwindow){
       createNotify("登录", {
         body: "需要登录",
         icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
         requireInteraction: true
       });
      messageNotice.alertShow();
    }
  }

    if (document.URL == "https://wayfarer.nianticlabs.com/new/captcha") {
//        console.log(messageNotice.alertwindow);
        if(!messageNotice.alertwindow){
//          console.log("listener:"+document.URL);
//          setTimeout(function (){
//          setTimeout(function (){
//            messageNotice.alertWindow="Displayed";
//            setTimeout(function(){alert("需要验证!");},0);
//          },0);
//          },0);
        }
    }
    if (document.URL == "https://wayfarer.nianticlabs.com/new/review") {
      try{
          if(skey==""){
//            console.log(localStorage["txskey"]);
            if (typeof localStorage["txskey"] != "undefined")
              skey = JSON.parse(localstorage.getItem("txskey"));
            console.log(skey);} } catch(e){}
    }//判断是否审核页面

    //showcase-gallery
    //判断是否在展示页面(首页)
    if (document.URL == "https://wayfarer.nianticlabs.com/new/showcase") {
//    if (url === "/api/v1/vault/home") {
//       console.log(autoPR.username);
       try{
         var strarr ="";
         var stmparr=[];
         //在首页显示池内已审po的表格
         var prpo = [];
//         skey = localStorage["txskey"];
//         if(typeof(skey)!="undefined"){
//           if(skey.length>0){} else {
//           console.log("getItem sskey : "+skey);}
//         } else {skey="";}
       if(!autoPR.username)
       {
           autoPR.username=localStorage["currentUser"];
       }
//       if(autoPR.username){
         $(".wf-page-header__title.ng-star-inserted").replaceWith("<div class='placestr'><font size=5>"+autoPR.username+"</font></div>"+
            "<div><font size=5>skey:"+
            "<input type='text' id='sskey' name='sskey' required minlength='35' maxlength='35' size='45' value="+skey+"></input>"+
            "<button class='wf-button' onclick=autoPR.saveKey()>保存</button></font></div>"+
            "<a href='https://lbs.qq.com/dev/console/application/mine' target='_blank'>申请key</a>");
       $(".showcase-gallery").replaceWith("<div><font size=5>池中已审</font></div><div id='privatePortal1'></div><br><div><font size=5>池外已审</font></div><div id='privatePortal2'></div>");

       prpo = JSON.parse(localStorage.getItem('Reviewed1'));
//       console.log(prpo);
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
//               console.log(strarr);
               stmparr = eval("(" + strarr + ")");
//               console.log(JSON.parse(prpo[i]));
               stmp+="<tr><td>"+stmparr.user+"</td><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
               } catch(err) {
                   console.log(err);
               }
           }
         stmp+="</tbody></table>";
         $("#privatePortal1").replaceWith(stmp);
       }
//       }
       } catch(e){skey="";console.log(e);}

       //在首页显示池外已审po的表格
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
//               console.log(strarr);
               stmparr = eval("(" + strarr + ")");
//               console.log(JSON.parse(prpo[i]));
               stmp+="<tr><td>"+stmparr.user+"</td><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
               if (prpo.length-1 - i > autoPR.privatePortalDisplay2 ) {
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
    }   //判断是否首页面


//    if($('.wf-page-header__description.ng-star-inserted').length > 0){
//        stmp = document.body.getInnerHTML();
//          autoPR.pagepass = stmp.substring(stmp.indexOf('host-')+5,stmp.indexOf('c121')-1);
//    }

}, false);

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

window.nextRun = function (callback) {
    setTimeout(function () {
        callback;
    }, 0);
};


(function () {
    //
//    window.localStorage.clear()
//    let gpausePortal = [];
//    let gpausePortalString = [];
    if(localStorage["Warning"]) {
      iWarning = localStorage["Warning"];
    }
    if (iWarning == 0) {
      createNotify("欢迎", {
        body: "请自行承担后果(包括被N社踢出)!",
        icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
        requireInteraction: false
      });
      localStorage.setItem("Warning",1);
  }
    // 读取参数
    console.log("init:"+document.URL);
    autoPR.settings = autoPR.initSettings;
    console.log(autoPR.settings);
    messageNotice.stop();
//    localStorage.removeItem("Tong Teddy");
    try{
//    console.log(localStorage["txskey"]);
//              console.log(skey);
      if (typeof localStorage["txskey"] != "undefined")
//              console.log(skey);
//              console.log(localStorage["txskey"]);
          if(skey==null || skey==""){
             skey = localStorage["txskey"];
//              console.log(skey);
          }
      console.log(skey);} catch(e){}

    if (typeof localStorage["autoCloud-settings"] != "undefined")
        autoPR.settings = JSON.parse(localStorage["autoCloud-settings"]);
    else
        localStorage.setItem(
            "autoCloud-settings",
            JSON.stringify(autoPR.settings)
        );
    autoPR.settings.autoReview= localStorage["autoReview"];
    chsaddr = null;
    setTimeout(function () {
    ~(async function () {

    //判断在展示页面
    if (document.URL == "https://wayfarer.nianticlabs.com/new/showcase") {
//    if (url === "/api/v1/vault/home") {
//       console.log(autoPR.username);
//       var sskey="";
//       sskey = JSON.parse(localstorage.getItem("txskey"));
//       $(".wf-page-header__title.ng-star-inserted").replaceWith("<div class='placestr'><font size=5>"+autoPR.username+"</font></div>"+
//          "<div><font size=5>skey:"+
//          "<input type='text' id='sskey' name='sskey' required minlength='35' maxlength='35' size='30' value="+sskey+"></input>"+
//          "<button class='wf-button' onclick=autoPR.saveKey()>保存</button></font></div>");
//       $(".showcase-gallery").replaceWith("<div><font size=5>池中已审</font></div><div id='privatePortal1'></div><br><div><font size=5>池外已审</font></div><div id='privatePortal2'></div>");
    }
    //判断在审核页面
    if(document.URL == "https://wayfarer.nianticlabs.com/new/review"){
       if(document.getElementById("useradd002")){
       }else
       {
           $(".wf-page-header__title.ng-star-inserted").after(
               '<button type="button" id="userbtn" style="background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:40px" onclick = "autoPR.startstopAuto()">' +
                ' 切换 </button><font size = "3"><span style="color:red" id = "autoRev" > </span></font>'+
               '<span id="useradd001"></span><span id="useradd002">  ||    '+localStorage['currentUser']+' </span><span id="userscore"></span><span id="useradd004"></span><div id="useradd003">地址</div>');
       }
       if(autoPR.settings.autoReview=="true"){
           $("#autoRev").replaceWith('<span id="autoRev">自动</span>');
       }else{
           $("#autoRev").replaceWith('<span id="autoRev">手动</span>');
       }
       if (autoPR.privatePortal.indexOf(pageData.title)>0){
           console.log("池中Portal");
           $("#useradd004").replaceWith('<font size=3 style="color:red"><span id="useradd004">  注意：池中Portal！！！</span> </font> ');
       }else {
           console.log("池外Portal");
           $("#useradd004").replaceWith('<font size=3 style="color:red"><span id="useradd004"> </span> </font> ');
       }
//       console.log(chsaddr);
//       var addr = await autoPR.getAddr1(pageData.lat,pageData.lng);  //取qq.com的中文地址

        //先更新一次地址试试，不行就删除此段代码
        if(document.getElementById("useradd003")){
            console.log("Find useradd003");
            if(chsaddr!=null & bdisplaychsaddr==0){
               $("#useradd003").replaceWith('<font size=3 style="color:black"><div id="useradd003">地址：'+chsaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div></font> ');
               console.log("Replace Chinese adderss!");
            }else
            {
               $("#useradd003").replaceWith('<font size=3 style="color:black"><div id="useradd003">地址：'+engaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div></font>');
               console.log("Replace English adderss! 1");
            }
        }else
        {
            console.log("Can not Find useradd003");
        }
               console.log("window.load:");

    }
    // 判断是否在settings页面
    if (document.URL == "https://wayfarer.nianticlabs.com/new/settings") {
        $(".max-w-md.ng-star-inserted").prepend(
            '<div class="settings__item settings-item"><div class="settings-item__header"><div>autoPR设置</div> ' +
            '<div><app-edit-setting-button _nghost-hyr-c179="" onclick="autoPR.saveSettings()"> ' +
            '<button _ngcontent-hyr-c179="" wf-button="" wftype="icon" class="wf-button wf-button--icon"> ' +
            '<mat-icon _ngcontent-hyr-c179="" role="img" class="mat-icon notranslate material-icons mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font">edit</mat-icon></button></app-edit-setting-button> ' +
            '</div></div><div class="settings-item__value" id="autoCloudSettings">'+ JSON.stringify(autoPR.settings) +
            '</div></div>'
        );
        $("#autoCloudSettings").val(autoPR.settings);
        console.log($("#autoCloudSettings"));
        console.log("处于settings页面");
        return;
    }
//       nextRun(replaceSomething);

      //增加标签：id:useradd001
      const vper = (autoPR.initSettings.postPeriod[0] + ((autoPR.initSettings.postPeriod[1] - autoPR.initSettings.postPeriod[0]) * Math.random() ) );


        // 计时器
         var iLatLon=0;
       var reviewTimer = setInterval(function () {
//           console.log("timer");
        //需要验证窗口
        const acap = document.querySelector("iframe[title='reCAPTCHA']");
//      console.log("reCAPTCHA:"+acap);
        if ((document.URL == "https://wayfarer.nianticlabs.com/new/captcha") || (document.URL == "wayfarer.nianticlabs.com/new/captcha") || acap ){
           if(!messageNotice.alertwindow){
             setTimeout(function (){messageNotice.alertShow();},0);
             console.log("load:timer:"+document.URL);
             createNotify("需要验证", {
               body: "需要验证！",
               icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
               requireInteraction: false
             });
           }
        }
       if (document.URL == "https://wayfarer.nianticlabs.com/new/review") {
         // 保存审当前po的起始时间
         autoPR.saveStartTime();
         if(typeof(pageData)!="undefined"){
//           console.log("mainTimer:NEW:alertwindow:"+messageNotice.alertwindow);
//           console.log("mainTimer:NEW:iSubmit:"+iSubmit);
//           console.log("mainTimer:NEW:alertwindow:"+messageNotice.alertwindow);
//           console.log("mainTimer:NEW:igetpos:"+igetpos);
           if (pageData.type == "NEW" & igetpos=="get")  //指定po，不管位置，一律暂停
           {
//             console.log("mainTimer:NEW:pageData.title:"+pageData.title);
               if (autoPR.pausePortal.indexOf(pageData.title)>=0){
                 if(autoPR.settings.autoReview=="true"){
                   if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                   autoPR.settings.autoReview="false";
                 }
                 if(!messageNotice.alertwindow) {
                   createNotify(pageData.title, {
                     body: autoPR.pausePortalString[autoPR.pausePortal.indexOf(pageData.title)],
                     icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                     requireInteraction: true
                   });
                   messageNotice.alertShow();
                 }
               } else if (gpausePortal.indexOf(pageData.title)>=0){
                 if(autoPR.settings.autoReview=="true"){
                   if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                   autoPR.settings.autoReview="false";
                 }
                 if(!messageNotice.alertwindow){
                   createNotify(pageData.title, {
                     body: gpausePortalString[gpausePortal.indexOf(pageData.title)],
                     icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                     requireInteraction: true
                   });
                   messageNotice.alertShow();
                 }
               } else if (autoPR.privatePortal.indexOf(pageData.title)>=0){
                 if(autoPR.settings.autoReview=="true"){
                   if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                   autoPR.settings.autoReview="false";
                 }
                 if(!messageNotice.alertwindow) {
                   createNotify("需要干预", {
                     body: pageData.title,
                     icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                     requireInteraction: true
                   });
                   messageNotice.alertShow();
                 }
               } else {
                 const mapimglist = document.querySelectorAll("img[class='cursor-pointer h-28 w-auto mr-[4px] last:mr-0 ng-star-inserted']");
                 for (let i=0;i<mapimglist.length;i++){
                   if (mapimglist[i].alt==pageData.title){
                     if(autoPR.settings.autoReview=="true"){
                       if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                       autoPR.settings.autoReview="false";
                     }
                     if(!messageNotice.alertwindow) {
                       createNotify("可能有重复po", {
                         body: pageData.title+"/"+mapimglist[i].alt,
                         icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                         requireInteraction: true
                       });
                       messageNotice.alertShow();
                     }
                     break;
                   }
                 }
               }
           } //NEW
           //判断为池中Edit，则暂停
           if (pageData.type == "EDIT")  //池中编辑po,一律暂停
           {
               var i;var iloc=0;
//               console.log("timer:iLatLon:"+iLatLon);
               if(iLatLon==0){
               for (i=0;i<=prt;i++){
//                   console.log(i);
                   if(pageData.lat>private[i][0]-private[i][2]/100000 & pageData.lat<private[i][0]+private[i][2]/100000 & pageData.lng>private[i][1]-private[i][3]/100000 & pageData.lng<private[i][1]+private[i][3]/100000)
                   {
                       iloc=1;
                       console.log("池中");
                   }
                 }
                 iLatLon=1;
               }
//               console.log("timer:iloc:"+iloc);
               if (iloc==1){
                 if(autoPR.settings.autoReview=="true"){
                   if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                   autoPR.settings.autoReview="false";
                 }
                 let almsg1=pageData.title;
                 let almsg2="需要手动干预!";

                 if (autoPR.pausePortal.indexOf(pageData.title)>=0){
                   almsg1=pageData.title;
                   almsg2=autoPR.pausePortalString[autoPR.pausePortal.indexOf(pageData.title)];
                 } else if (gpausePortal.indexOf(pageData.title)>=0){
                   almsg1=pageData.title;
                   almsg2=autoPR.gpausePortalString[autoPR.gpausePortal.indexOf(pageData.title)];
                 }

                 if(!messageNotice.alertwindow){
                   createNotify(almsg1, {
                     body: almsg2,
                     icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                     requireInteraction: true
                   });
                   messageNotice.alertShow();
                 }
               }
           }
         //图片编辑，时间范围减半
         autoPR.initSettings.portalTime = (new Date().valueOf() - parseInt(localStorage["portalTime"])) /500; // 半秒
//             console.log("提交前："+autoPR.initSettings.portalTime +" : "+ vper*2 +" : "+autoPR.settings.autoReview);
//           console.log(autoPR.settings.autoReview);
         if(autoPR.initSettings.portalTime>=2 & iHaveRate=="false"){
            autoPR.UserSubmit();    //自动打分，此处未提交
         }
         let apperr = document.querySelector('app-review-error');
         if(apperr) {window.location.reload();}
         //如果超过5秒，提交按钮未选中，则出现地图点无法选中的bug，闪烁提示
         if(autoPR.initSettings.portalTime>5){
             if (document.querySelector('button[class="wf-button wf-split-button__main wf-button--primary wf-button--disabled"]')){
                 if(autoPR.settings.autoReview=="true"){
                   if (autoPR.autoReviewPRG=="false"){ autoPR.autoReviewPRG = autoPR.settings.autoReview};
                   autoPR.settings.autoReview="false";
                 }
               if(!messageNotice.alertwindow){
                   console.log("not selected:"+document.URL);
                   createNotify("需要干预", {
                     body: "程序有未选中项，需手动选完整!",
                     icon: "https://raw.githubusercontent.com/teddysnp/AuOPRSn-SY/main/source/stop.ico",
                     requireInteraction: true
                   });
                   messageNotice.alertShow();
               }
             }
         }
         if((autoPR.initSettings.portalTime>=autoPR.initSettings.itimeout & autoPR.settings.autoReview=="true" & pageData.captcha=="false"
                   & pageData.code!="EXHAUSTED" )){  //超时了
             window.location.reload();
         }

       //首页显示最近审过的5个池内po
       let retitle = document.getElementById("latestpo");
       if( !retitle){
           $(".wf-page-header__title.ng-star-inserted").replaceWith("<font size=3><div class='wf-page-header__title ng-star-inserted' id='latestpo'>最近审的po</div></font>");
           let prpo1 = JSON.parse(localStorage.getItem('Reviewed1'));
//           console.log(prpo1);
           //       console.log(prpo[0]);
           if (prpo1!=null){
               let stmp =" ";
               //           console.log(prpo.length);
               var icnt=0;
               for(let i=prpo1.length-1;i>=0;i--){
                 let strarr = prpo1[i];
                   try {
                       while(strarr.indexOf("undefined")>0){
                           strarr = strarr.replace("undefined","0");
                       }
                       while(strarr.indexOf('""')>0){
                         strarr = strarr.replace('""','"');
                       }
//                       console.log(strarr);
                       let stmparr = eval("(" + strarr + ")");
//                     console.log("stmparr.user:"+stmparr.user);
//                     console.log("  currentUser:"+lobalStorage["currentUser"]);
//                     console.log(" autoPR.useremail:"+autoPR.useremail);
//                     console.log("stmparr.user:"+stmpar.ruser+"  currentUser:"+lobalStorage["currentUser"]+" autoPR.useremail:"+autoPR.useremail);
                       if((stmparr.user==localStorage["currentUser"] || stmparr.user==autoPR.useremail)){
                         stmp += stmparr.title+"/";
                         icnt++;
                         if (icnt>=5) break;
                       }
                   } catch(e) {
                       console.log(e);
                   }
               }
//               console.log(stmp);
               $("#latestpo").replaceWith("<button class='wf_button' onclick='autoPR.usrtest()'>测试</button><font size=3><div class='wf-page-header__title ng-star-inserted' id='latestpo'>最近审的po："+stmp+"</div></font>");
           }
       }


         if (autoPR.initSettings.portalTime >= vper*2 & autoPR.settings.autoReview == 'true' & iSubmit=="false" )
         {
            let btn = document.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');

            if (btn){
                iSubmit="true";
                btn.click();
                console.log("Submit!");
//             console.log("提交："+autoPR.initSettings.portalTime +" : "+ vper*2 +" : "+autoPR.settings.autoReview);
            }
         }

           if(new Date().getSeconds()==0){
//               console.log("chsaddr:"+chsaddr+"|lastchsaddr:"+lastchsaddr+"|engaddr:"+engaddr+"|lastengaddr:"+lastengaddr);
           }
       if(document.getElementById("useradd001")){
       }else
       {
         $(".wf-page-header__title.ng-star-inserted").after(
               '<button type="button" id="userbtn" style="background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:40px" onclick = "autoPR.startstopAuto()">' +
                ' 切换 </button><font size = "3"> <span style="color:red" id = "autoRev" > </span></font>'+
             '<span id="useradd001"></span><font size=3 style="color:black"><span id="useradd002">   ||    '+localStorage['currentUser']+' </span><span id="userscore">'+sspos+'</span><span id="useradd004"></span></font><font size=3 style="color:black"><div id="useradd003"></div></font>');
       }
       if(autoPR.settings.autoReview==="true"){
           $("#autoRev").replaceWith('<span id="autoRev">自动</span>');
       }else{
           $("#autoRev").replaceWith('<span id="autoRev">手动</span>');
       }
       $("#useradd001").replaceWith(
                '<span style="color:red" id = "useradd001" > <font size = "3">' + "&nbsp;&nbsp;&nbsp;&nbsp;" +
                     (    Array(2).join("0") +  Math.floor(autoPR.initSettings.portalTime / 120) ).slice(-2) + ":" +
                     (    Array(2).join("0") + (Math.floor(autoPR.initSettings.portalTime / 2) % 60) ).slice(-2)  + "</font> </span>");
       };
       if(typeof(autoPR.username)!="undefined" || typeof(autoPR.useremail)!="undefined") {  $("#useradd002").innerText= "   ||   " + localStorage['currentUser'] ;  }

       if(typeof(pageData)!="undefined"){
         if(pageData!=null){
            if(chsaddr == null)
            {
//                console.log("lastchsaddr : "+lastchsaddr);
//                console.log(skey);
                if(skey!="" & skey!=null ){
//                    console.log(skey);
                    autoPR.getAddr1(pageData.lat,pageData.lng);
                }
//                 console.log("chsaddr : "+autoPR.chsaddr);
            }
           if(chsaddr!=null){
//               console.log("chsaddr : "+autoPR.chsaddr);
//               console.log("lastchsaddr : "+autoPR.lastchsaddr);
           if(chsaddr!=lastchsaddr || (typeof lastchsaddr =="undefined" & chsaddr!=null & typeof chsaddr!="undefined"))
           {
               if(  bdisplaychsaddr==0){
//               console.log("需要更新");
//               console.log(chsaddr);
//               console.log(lastchsaddr);
               $("#useradd003").replaceWith('<div id="useradd003">地址：'+chsaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div>');
//               $("#useradd003").innerText ='地址：'+chsaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng;
//               console.log("Timer : update useradd003 Chinese address!");
               lastchsaddr = chsaddr;
               lastengaddr = engaddr;
//               console.log("lastchsaddr:"+lastchsaddr);
            }
           }
           }  //更新中文地址
           else{
               if(engaddr!=null){
               if(engaddr!=lastengaddr)
               {
                   if(bdisplaychsaddr==0 & skey!="" & skey!=null ){
                       autoPR.getAddr1(pageData.lat,pageData.lng);
                   }
//                   console.log(engaddr);
                   $("#useradd003").replaceWith('<div id="useradd003">地址：'+engaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div>');
//                   $("#useradd003").innerText ='地址：'+engaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng;
//                   console.log("Timer : update useradd003 English address!");
                   lastengaddr = engaddr;
                }
                }  //更新英文地址
           }
         }
       }  //如果pageData存在

       } //review
       }, 500);
      })();
    },
    autoPR.initSettings.scriptTimeout * 1000) ;
})();
//window.onload
