<template>
    <div class="recoder-container flex">
        <!-- 未录音状态 -->
        <div class="voice-pre flex" v-if="recodeStatus == 0" @click="startRecorder">
            <img src="../../../static/images/voice-pre.png" alt />
        </div>
        <!-- 录音中状态 -->
        <div class="voice-ing flex" v-if="recodeStatus == 1" @click="stopRecorder">
            <div class="icon"></div>
        </div>
        <!-- 录音完成 -->
        <div class="voice-complete-play flex" v-if="recodeStatus == 2">
            <div class="left flex" @click="playVoice">
                <div class="operate-icon flex">
                    <img v-if="playStatus == 0" src="../../../static/images/stop.png" alt />
                    <img v-else src="../../../static/images/b-ing.png" alt />
                </div>
                <div class="flow flex">
                    <img v-if="playStatus == 0" src="../../../static/images/brd-defalut.png" alt />
                    <img v-else src="../../../static/images/flow.gif" alt />
                </div>
                <div class="voice-total-time">{{duration}}"</div>
            </div>
            <div class="right-label" @click="removeRecoder">删除重新录制</div>
        </div>
    </div>
</template>

<script>
import { Base64 } from 'js-base64'; //安装依赖包
const qiniuUploader = require("../../utils/qiniuUploader");
export default {
    props: {},
    components: {},
    data() {
        return {
            audioValue: "", //录音内容
            duration: 0, //录音时长
            recodeStatus: 0, //录音状态 0:未录音,1:正在录音2:录音完成
            playStatus: 0, //播放状态 0:未播放,1:正在播放
            recoderAuthStatus: false //录音授权状态
        };
    },
    methods: {
        //调用recorderManager.start开始录音
        recorderManagerStart() {
            this.recorderManager.start({
                format: "mp3",
                duration: 60000
            });
            this.recodeStatus = 1;
        },
        //开始录音
        startRecorder(index) {
            let that = this;
            if (this.recoderAuthStatus) {
                this.recorderManagerStart();
            } else {
                wx.openSetting({
                    success(res) {
                        if (res.authSetting["scope.record"]) {
                            that.recoderAuthStatus = true;
                            that.recorderManagerStart();
                        }
                    }
                });
            }
        },

        //结束录音
        stopRecorder(index) {
            this.recodeStatus = 2;
            this.recorderManager.stop();
        },
        //播放录音
        playVoice(index) {
            if (this.playStatus == 0) {
                //未播放状态则点击播放
                if (!this.audioValue) {
                    this.tip("请先录音！");
                    return;
                }
                this.playStatus = 1;
                this.innerAudioContext.src = this.audioValue;
                this.innerAudioContext.play();
            } else {
                //正在播放状态,则点击暂停
                this.playStatus = 0;
                this.innerAudioContext.stop();
            }
        },
        //删除录音
        removeRecoder(index) {
            this.audioValue = "";
            this.recodeStatus = 0;
            this.playStatus = 0;
            this.duration = 0;
        },
        //获取权限设置
        getAuthSetting() {
            let that = this;
            wx.getSetting({
                success(res) {
                    if (!res.authSetting["scope.record"]) {
                        wx.authorize({
                            scope: "scope.record",
                            success() {
                                that.recoderAuthStatus = true;
                            },
                            fail() {
                                that.recoderAuthStatus = false;
                            }
                        });
                    } else {
                        that.recoderAuthStatus = true;
                    }
                }
            });
        },

        //格式化录音时间
        fmtRecoderTime(duration = 0) {
            duration = duration / 1000;
            const seconds = duration.toString().split(".")[0]; //取秒
            return seconds;
        },

        //提示弹窗
        tip(msg) {
            wx.showModal({
                title: "提示",
                content: msg,
                showCancel: false
            });
        },
        //上传音频
        uploadAudio(filePath, success) {
            // 交给七牛上传
            qiniuUploader.upload(
                filePath,
                res => {
                    let audioUrl = res.domain + res.truekey; //上传返回的url链接
                    return (
                        typeof success == "function" &&
                        success({ audio: audioUrl })
                    );
                },
                error => {
                    console.log("error: " + error);
                },
                {
                    region: "ECN", // 华东区
                    uptokenURL: "https://xxx/qiniu/uploadToken", //上传地址,需要后台配置
                    shouldUseQiniuFileName: false
                }
                // Base64 //一般token都是有时效的,Base64可以解析当前token的到期时间,判断是否过期从而更新令牌
            );
        },
        //初始化音频管理器
        initRecorderManager() {
            const recorderManager = wx.getRecorderManager();
            recorderManager.onError(() => {});
            //监听录音结束，在这里获取到录音结果。
            recorderManager.onStop(res => {
                const duration = this.fmtRecoderTime(res.duration); //获取录音时长
                //小程序录音最长1分钟(60秒)
                if (duration > 60) {
                    this.tip('录音时间不能超过60"');
                    this.recodeStatus = 2; //结束
                    return;
                } else if (duration < 1) {
                    this.duration = 1; //不计,未开始
                    return;
                }
                this.duration = duration;

                //上传本地音频
                this.uploadAudio(res.tempFilePath, src => {
                    this.audioValue = src.audio;
                });
            });
            this.recorderManager = recorderManager;

            //创建内部 audio 上下文 InnerAudioContext 对象。
            const innerAudioContext = wx.createInnerAudioContext();
            //监听音频自然播放至结束的事件
            innerAudioContext.onEnded(() => {
                //音频自然播放至结束的事件的回调函数
                this.playStatus = 0; //播放状态重置为未开始
            });
            innerAudioContext.onError(res => {});
            this.innerAudioContext = innerAudioContext;
        },
        //销毁当前组件音频实例
        destoryInnerAudioContext() {
            this.innerAudioContext.destroy();
            console.log("音频实例销毁啦");
        }
    },
    computed: {},
    watch: {},
    onLoad() {
        //判断是否已授权录音权限
        this.getAuthSetting();
        //初始化音频管理器
        this.initRecorderManager();
    },
    onUnload() {
        this.destoryInnerAudioContext();
    }
};
</script>

<style scoped lang="less">
.flex {
    display: flex;
    justify-content: flex-start;
    align-items: center;
}
.recoder-container {
    padding-top: 200rpx;
    justify-content: center;
    .voice-pre,
    .voice-ing {
        flex-direction: column;
        justify-content: center;
        margin-left: 26rpx;
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
        background-color: #fff;
        box-shadow: 0px 4px 14px 0px rgba(2, 193, 96, 0.21);
    }
    .voice-pre {
        > img {
            width: 80rpx;
            height: 80rpx;
        }
    }
    .voice-ing {
        .icon {
            width: 30rpx;
            height: 30rpx;
            background: #fe2b1a;
            border-radius: 7rpx;
        }
        .time {
            padding-top: 6rpx;
            color: #666;
            font-size: 20rpx;
        }
    }
    .voice-complete-play {
        padding-top: 30rpx;
        padding-left: 60rpx;
        .left {
            margin-right: 40rpx;
            padding-left: 16rpx;
            width: 330rpx;
            height: 76rpx;
            line-height: 76rpx;
            background: linear-gradient(
                90deg,
                rgba(10, 205, 139, 1) 0%,
                rgba(2, 193, 96, 1) 100%
            );
            border-radius: 15rpx;
            .operate-icon {
                justify-content: center;
                margin-right: 32rpx;
                width: 60rpx;
                min-width: 60rpx;
                height: 60rpx;
                background-color: #fff;
                border-radius: 50%;
                > img {
                    width: 24rpx;
                    height: 24rpx;
                }
            }
            .flow {
                justify-content: center;
                width: 120rpx;
                min-width: 120rpx;
                margin-right: 40rpx;
                width: 86rpx;
                height: 30rpx;

                > img {
                    width: 100%;
                    height: 100%;
                }
            }
            .voice-total-time {
                color: #fff;
                font-size: 28rpx;
            }
        }
        .right-label {
            color: #6a7fa6;
            font-size: 26rpx;
        }
    }
}
</style>
