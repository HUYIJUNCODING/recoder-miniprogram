// import { Base64 } from 'js-base64';
// const qiniuUploader = require("./qiniuUploader.js");

//获取全局唯一的录音管理器 RecorderManager
var self = '';
var _detailData = {};
var _index = 0;
export function getRecorderManager(that) {
    self = that;
    self.recorderManager = wx.getRecorderManager();
    self.recorderManager.onError(function(){
    });
    self.recorderManager.onStop(function(res){
        let current =  _detailData.interact_content[_index];
        current.duration = fmtRecodeTime( res.duration)
        if(current.duration >= 60) {
            tip('录音时间不能超过60"');
            current.recodeStatus = 2;
        }else if(current.duration <=1) {
            current.duration = 1;
        }
        uploadAudio(res.tempFilePath,(src)=> {
            current.value = src.audio;
            })
    });
    self.innerAudioContext = wx.createInnerAudioContext()
    self.innerAudioContext.onEnded(()=> {
        _detailData.interact_content[_index].play = 0;

    })
    self.innerAudioContext.onError((res) => {

    })
}

/**
 * 录制mp3音频
 */
export function startRecord(detailData,index) {
    _detailData = detailData;
    _index = index;
    self.recorderManager.start({
        format: 'mp3',
        duration: 60000
    });
    detailData.interact_content[index].recodeStatus = 1
}

/**
 * 停止录音
 */
export function stopRecord(detailData,index) {
    _detailData = detailData;
    _index = index;
    detailData.interact_content[index].recodeStatus = 2
    self.recorderManager.stop()
}

/**
 * 播放录音
 */
export function playRecord(detailData,index) {
    if (detailData.interact_content[index].value == '') {
        tip("请先录音！")
        return;
    }
    _detailData = detailData;
    _index = index;
    detailData.interact_content[index].play = 1;
    self.innerAudioContext.src = detailData.interact_content[index].value;
    self.innerAudioContext.play()
   
}

/**
 * 暂停播放录音      
 */
export function StopPlay(callback) {
    self.innerAudioContext.stop();
    typeof callback == 'function' && callback();
}

/**
 * 销毁当前实例
 */
export function destoryInnerAudioContext() {
    self.innerAudioContext.destroy()
    console.log('销毁音频实例')
}

/**
 * 提示
 */
function tip (msg) {
    wx.showModal({
        title: '提示',
        content: msg,
        showCancel: false
    })
}

function fmtRecodeTime(duration) {
    let seconds = (duration/1000).toString().split('.')[0]
     return seconds;    
}

//上传音频
export  function uploadAudio(filePath, success) {
    // 交给七牛上传
    // qiniuUploader.upload(
    //     filePath,
    //     res => {
    //         let audioUrl = res.domain + res.truekey;
    //         return (
    //             typeof success == "function" &&
    //             success({audio: audioUrl})
    //         );
    //     },
    //     error => {
    //         console.log("error: " + error);
    //     },
    //     {
    //         region: "ECN", // 华东区
    //         uptokenURL:
    //             "https://api.dianwo365.com/api/qiniu/uploadToken",
    //         //uptoken: 'xxxx',
    //         shouldUseQiniuFileName: false
    //     },
    //     Base64
    // );
}


