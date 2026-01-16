/* handwriting.js - Copy đoạn này dán vào file */
(function(window, document) {
    var handwriting = {};
    handwriting.Canvas = function(cvs, lineWidth) {
        this.canvas = cvs;
        this.ctx = cvs.getContext("2d");
        this.lineWidth = lineWidth || 3;
        this.width = cvs.width;
        this.height = cvs.height;
        this.drawing = false;
        this.handwritingX = [];
        this.handwritingY = [];
        this.trace = [];
        this.options = {};
        this.step = [];
        this.redo_step = [];
        this.redo_trace = [];
        this.allowUndo = true;
        this.allowRedo = true;
        var _this = this;
        cvs.addEventListener("mousedown", function(e) { _this.down(e) });
        cvs.addEventListener("mousemove", function(e) { _this.move(e) });
        cvs.addEventListener("mouseup", function(e) { _this.up(e) });
        cvs.addEventListener("touchstart", function(e) { _this.down(e) });
        cvs.addEventListener("touchmove", function(e) { _this.move(e) });
        cvs.addEventListener("touchend", function(e) { _this.up(e) });
    };
    handwriting.Canvas.prototype.setLineWidth = function(lineWidth) { this.lineWidth = lineWidth; };
    handwriting.Canvas.prototype.setCallBack = function(callback) { this.callback = callback; };
    handwriting.Canvas.prototype.setOptions = function(options) { this.options = options; };
    handwriting.Canvas.prototype.down = function(e) {
        e.preventDefault();
        this.drawing = true;
        this.handwritingX = [];
        this.handwritingY = [];
        var obj = this.canvas.getBoundingClientRect();
        var x = e.clientX || e.touches[0].clientX;
        var y = e.clientY || e.touches[0].clientY;
        x -= obj.left; y -= obj.top;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.handwritingX.push(x);
        this.handwritingY.push(y);
    };
    handwriting.Canvas.prototype.move = function(e) {
        if (!this.drawing) return;
        e.preventDefault();
        var obj = this.canvas.getBoundingClientRect();
        var x = e.clientX || e.touches[0].clientX;
        var y = e.clientY || e.touches[0].clientY;
        x -= obj.left; y -= obj.top;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.handwritingX.push(x);
        this.handwritingY.push(y);
    };
    handwriting.Canvas.prototype.up = function(e) {
        if (!this.drawing) return;
        var obj = this.canvas.getBoundingClientRect();
        var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        var y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        x -= obj.left; y -= obj.top; // Fix tọa độ khi nhấc chuột
        this.drawing = false;
        if (this.handwritingX.length === 0) return; // Không lưu nét rỗng
        var trace = [];
        for (var i = 0; i < this.handwritingX.length; i++) {
            trace.push([this.handwritingX[i], this.handwritingY[i]]);
        }
        this.trace.push(trace);
        if (this.allowUndo) this.step.push(this.canvas.toDataURL());
        if (this.callback) this.callback(this.trace, this.options);
    };
    handwriting.Canvas.prototype.delete = function() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.trace = [];
        this.step = [];
        this.redo_step = [];
        this.redo_trace = [];
    };
    handwriting.Canvas.prototype.undo = function() {
        if (!this.allowUndo || this.step.length <= 0) return;
        this.redo_step.push(this.step.pop());
        this.redo_trace.push(this.trace.pop());
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.step.length > 0) {
            var image = new Image();
            image.src = this.step[this.step.length - 1];
            image.onload = function() { this.ctx.drawImage(image, 0, 0); }.bind(this);
        }
    };
    handwriting.recognize = function(trace, options, callback) {
        if (handwriting.Canvas && this instanceof handwriting.Canvas) {
            trace = this.trace;
            options = this.options;
            callback = this.callback;
        } else if (!options) { options = {}; }
        var data = JSON.stringify({
            "options": "enable_pre_space",
            "requests": [{
                "writing_guide": { "writing_area_width": options.width || 1000, "writing_area_height": options.height || 1000 },
                "ink": trace,
                "language": options.language || "ja"
            }]
        });
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    var response = JSON.parse(this.responseText);
                    var results = response[1][0][1];
                    if (callback) callback(results, undefined);
                } else {
                    if (callback) callback(undefined, new Error(this.responseText));
                }
            }
        });
        xhr.open("POST", "https://www.google.com.tw/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8");
        xhr.setRequestHeader("content-type", "application/json");
        xhr.send(data);
    };
    window.handwriting = handwriting;
})(window, document);