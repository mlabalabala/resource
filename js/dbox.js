// ==UserScript==
// @name         debugBox
// @author       SHJ
// @version      1.0
// ==/UserScript==

// 创建调试窗口
const debugBox = document.createElement('div');
debugBox.id = 'debug-window';
debugBox.style.position = 'fixed';
debugBox.style.top = '10px';
debugBox.style.right = '10px';
debugBox.style.zIndex = '99999';
debugBox.style.width = '400px';
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
window.debugLog = function(...args) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ` + args.join(' ');
    debugBox.appendChild(line);
    debugBox.scrollTop = debugBox.scrollHeight; // 滚到底部
};

