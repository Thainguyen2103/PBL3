/* public/handwriting.js */
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
        this.allowUndo = true;
        var _this = this;
        
        // Chỉ cần bắt sự kiện cơ bản, việc ngắt vẽ khi ra ngoài sẽ do React lo
        cvs.addEventListener("mousedown", function(e) { _this.down(e) });
        cvs.addEventListener("mousemove", function(e) { _this.move(e) });
        cvs.addEventListener("mouseup", function(e) { _this.up(e) });
        cvs.addEventListener("touchstart", function(e) { _this.down(e) });
        cvs.addEventListener("touchmove", function(e) { _this.move(e) });
        cvs.addEventListener("touchend", function(e) { _this.up(e) });
    };

    handwriting.Canvas.prototype.down = function(e) {
        e.preventDefault();
        var rect = this.canvas.getBoundingClientRect();
        var x = (e.clientX || e.touches[0].clientX) - rect.left;
        var y = (e.clientY || e.touches[0].clientY) - rect.top;

        this.drawing = true;
        this.handwritingX = [x];
        this.handwritingY = [y];
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    };

    handwriting.Canvas.prototype.move = function(e) {
        if (!this.drawing) return;
        e.preventDefault();

        var rect = this.canvas.getBoundingClientRect();
        var clientX = e.clientX || (e.touches && e.touches[0].clientX);
        var clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        var x = clientX - rect.left;
        var y = clientY - rect.top;

        // Vẽ
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.handwritingX.push(x);
        this.handwritingY.push(y);
    };

    // Hàm này sẽ được React gọi cưỡng bức khi chuột rời đi
    handwriting.Canvas.prototype.up = function(e) {
        if (!this.drawing) return;
        this.drawing = false; // Ngắt vẽ ngay lập tức
        
        if (this.handwritingX.length === 0) return;
        
        var trace = [];
        for (var i = 0; i < this.handwritingX.length; i++) {
            trace.push([this.handwritingX[i], this.handwritingY[i]]);
        }
        this.trace.push(trace);
        
        if (this.allowUndo) this.step.push(this.canvas.toDataURL());
        if (this.callback) this.callback(this.trace, this.options);
    };

    // ... (Giữ nguyên các hàm delete, undo, recognize) ...
    handwriting.Canvas.prototype.delete = function() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.trace = [];
        this.step = [];
    };
    handwriting.Canvas.prototype.undo = function() {
        if (!this.allowUndo || this.step.length <= 0) return;
        this.step.pop();
        this.trace.pop();
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.step.length > 0) {
            var image = new Image();
            image.src = this.step[this.step.length - 1];
            image.onload = function() { this.ctx.drawImage(image, 0, 0); }.bind(this);
        }
    };
    handwriting.recognize = function(trace, options, callback) {
        if (handwriting.Canvas && this instanceof handwriting.Canvas) {
            trace = this.trace; options = this.options; callback = this.callback;
        }
        var languagesToCheck = ["ja", "zh-Hant", "zh-Hans"];
        var fetchRecognition = function(lang) {
            return new Promise(function(resolve) {
                var data = JSON.stringify({
                    "options": "enable_pre_space",
                    "requests": [{
                        "writing_guide": { "writing_area_width": options.width || 1000, "writing_area_height": options.height || 1000 },
                        "ink": trace, "language": lang 
                    }]
                });
                var xhr = new XMLHttpRequest();
                xhr.addEventListener("readystatechange", function() {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            var response = JSON.parse(this.responseText);
                            var results = (response[1] && response[1][0] && response[1][0][1]) ? response[1][0][1] : [];
                            resolve(results);
                        } catch (e) { resolve([]); }
                    }
                });
                xhr.open("POST", "https://www.google.com.tw/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8");
                xhr.setRequestHeader("content-type", "application/json");
                xhr.send(data);
            });
        };
        Promise.all(languagesToCheck.map(fetchRecognition)).then(function(resultsArray) {
            var combinedResults = [];
            resultsArray.forEach(function(res) { combinedResults = combinedResults.concat(res); });
            var uniqueResults = combinedResults.filter(function(item, pos) { return combinedResults.indexOf(item) == pos; });
            var radicalMap = { '⻌': '辶', '⻏': '阝', '⺾': '艹', '⺡': '氵', '⺅': '亻' };
            uniqueResults = uniqueResults.map(function(char) { return radicalMap[char] || char; });
            if (callback) callback(uniqueResults.filter((v, i, a) => a.indexOf(v) === i), undefined);
        });
    };

    window.handwriting = handwriting;
})(window, document);