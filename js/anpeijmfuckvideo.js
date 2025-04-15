// ==UserScript==
// @name         Auto Play Video
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically resume video playback when it is paused, using MutationObserver to monitor DOM changes
// @author       Your Name
// @match        https://study.jamg.cn/courseStudyAction/toCourseStudyNew.action
// @require      https://study.jamg.cn/js/study.js?v=11
// @require      https://study.jamg.cn/js/dateUtil.js
// @require      https://study.jamg.cn/js/layer/layer.js
// @require      https://study.jamg.cn/js/aes.js?v=11
// @downloadURL  https://raw.bunnyxyz.eu.org/https://github.com/mlabalabala/resource/blob/main/js/anpeijmfuckvideo.js
// @updateURL    https://raw.bunnyxyz.eu.org/https://github.com/mlabalabala/resource/blob/main/js/anpeijmfuckvideo.js
// ==/UserScript==

(function () {
    "use strict";
    console.log("Auto Play Video ...");

    // 创建调试窗口
    const debugBox = document.createElement('div');
    debugBox.id = 'debug-window';
    debugBox.style.position = 'fixed';
    debugBox.style.top = '10px';
    debugBox.style.right = '10px';
    debugBox.style.zIndex = '99999';
    debugBox.style.width = '300px';
    debugBox.style.height = '200px';
    debugBox.style.overflowY = 'auto';
    debugBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugBox.style.color = 'lime';
    debugBox.style.fontSize = '12px';
    debugBox.style.padding = '10px';
    debugBox.style.border = '1px solid #444';
    debugBox.style.borderRadius = '8px';
    debugBox.style.boxShadow = '0 0 10px #000';
    debugBox.style.cursor = 'move';

    // 可拖动实现
    let isDragging = false;
    let offsetX, offsetY;

    debugBox.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - debugBox.offsetLeft;
        offsetY = e.clientY - debugBox.offsetTop;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            debugBox.style.left = (e.clientX - offsetX) + 'px';
            debugBox.style.top = (e.clientY - offsetY) + 'px';
            debugBox.style.right = 'auto'; // 防止冲突
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
    document.body.appendChild(debugBox);
    window.debugLog = function(msg) {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        debugBox.appendChild(line);
        debugBox.scrollTop = debugBox.scrollHeight; // 滚到底部
    };

    let currentTime = 0;

    const init = setInterval(() => {
        if (player) {
            currentTime += 60 * 2;
            if (player.getDuration() < currentTime) {
                clearInterval(init);
                currentTime = player.getDuration();
                debugLog("最后一轮！");
            }
            submitLearnTime();
        }

    }, 1000);

    function formatSecondsToHHMMSS(seconds) {
        seconds = parseInt(seconds, 10);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }



    function submitLearnTime() {

        var wareRecordId = null;//课件学习记录id
        var courseRecordId = null;//课程学习记录id
        //查询出该课件的学习记录
        $.ajax({
            type: 'POST',
            async: false,//此处为同步
            data: {
                "sectionId": sectionId, "courseWareId": courseWareId, "userId": userId,
                "source": source, "relationId": relationId, "courseId": courseId
            },
            url: '/courseStudyAction/getCourseWareByConditions.action',
            success: function (data) {
                if (data != null && data != '') {
                    wareRecordId = data.id;
                    courseRecordId = data.recordId;
                }
            }
        });
        if (courseWareType == 3) {
            //视频课件
            var vedioParam = {};
            vedioParam.wareRecordId = wareRecordId;
            vedioParam.courseRecordId = courseRecordId;
            vedioParam.courseId = courseId;
            vedioParam.userId = userId;
            vedioParam.totalTime = player.getDuration();
            vedioParam.currentTime = currentTime;
            vedioParam.source = source;
            vedioParam.relationId = relationId;
            vedioParam.courseWareId = courseWareId;
            $.ajax({
                type: 'POST',
                async: false,//此处为同步
                data: {param:study(JSON.stringify(vedioParam))},
                url: '/courseStudyAction/recordVedioWareAfterLeavePageEncipher.action',
                success: function (data) {
                    if (data.rtnResult == 'FAIL') {
                        debugLog("保存swf课件进度错误");return;
                    }
                    if (data.rtnResult == 'RESTRICTED') {
                        debugLog("该视频已被挤掉，未完成的视频不能同时观看，学习进度未保存");return;
                    }
                    if (data.rtnResult == 'ILLEGALITY') {
                        debugLog("请勿非法提交学习进度");return;
                    }
                    debugLog("总时长: " + formatSecondsToHHMMSS(player.getDuration()) + ", 已完成: " + formatSecondsToHHMMSS(currentTime));
                }
            });
        }
    }
})();
