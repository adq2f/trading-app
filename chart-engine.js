// ============================================================
// QUOTEX CLONE - CHART ENGINE v4 (CLEAN FINAL)
// ============================================================

(function() {
  if (window.QuotexChart) {
    console.log('[ChartEngine] Already loaded');
    return;
  }

  console.log('[ChartEngine] Loading v4...');

  var COLORS = {
    background: '#0d1117',
    gridLine: '#1a2332',
    textPrimary: '#d1d4dc',
    textSecondary: '#6b7a90',
    candleGreen: '#00c076',
    candleGreenBorder: '#00a865',
    candleGreenWick: '#00c076',
    candleRed: '#ff3b30',
    candleRedBorder: '#e63428',
    candleRedWick: '#ff3b30',
    watermark: 'rgba(255, 255, 255, 0.025)'
  };

  window.CHART_COLORS = COLORS;

  var DEFAULT_OPTIONS = {
    width: 0,
    height: 0,
    padding: { top: 25, right: 65, bottom: 30, left: 8 },
    candleSpacing: 6,
    candleBodyRatio: 0.75,
    wickWidth: 1,
    showGrid: true,
    showWatermark: true,
    watermarkText: 'QUOTEX',
    gridHorizontalLines: 6,
    gridVerticalLines: 6,
    gridDash: [2, 4],
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSizePrice: 11,
    fontSizeTime: 11,
    priceDecimals: 2,
    visibleCandleCount: 60,
    rightOffsetCandles: 8,
    minCandleSpacing: 3,
    maxCandleSpacing: 60
  };

  function mergeOptions(target, source) {
    var result = {};
    var k;
    for (k in target) if (target.hasOwnProperty(k)) result[k] = target[k];
    for (k in source) if (source.hasOwnProperty(k)) {
      if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
        result[k] = mergeOptions(target[k] || {}, source[k]);
      } else {
        result[k] = source[k];
      }
    }
    return result;
  }

  function formatPrice(value, decimals) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toFixed(decimals);
  }

  function QuotexChart(container, options) {
    if (!container) {
      console.error('[ChartEngine] Container required');
      return;
    }

    this.container = container;
    this.options = mergeOptions(DEFAULT_OPTIONS, options || {});

    this.candles = [];
    this.viewport = {
      offsetX: 0,
      candleSpacing: this.options.candleSpacing,
      minPrice: 0,
      maxPrice: 0
    };

    this._timeRangeSubs = [];

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    this._resize();
    this._bindEvents();

    this._running = true;
    this._rafId = null;
    this._startRenderLoop();

    console.log('[ChartEngine] Chart created:', this.options.width + 'x' + this.options.height);
  }

  QuotexChart.prototype._resize = function() {
    if (!this.container) return;
    var w = this.container.clientWidth;
    var h = this.container.clientHeight;
    if (w <= 0) w = this.options.width || window.innerWidth || 360;
    if (h <= 0) h = this.options.height || 400;
    if (w < 100 || h < 100) {
      var self = this;
      if (!self.__resizeRetries) self.__resizeRetries = 0;
      self.__resizeRetries++;
      if (self.__resizeRetries < 10) {
        setTimeout(function() { self._resize(); }, 100);
      }
      return;
    }
    this.__resizeRetries = 0;
    this.options.width = w;
    this.options.height = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  QuotexChart.prototype._bindEvents = function() {
    var self = this;

    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(function() { self._resize(); });
      this._resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', function() { self._resize(); });
    }

    this._interaction = {
      isPanning: false, isPinching: false,
      startX: 0, startY: 0, startOffsetX: 0, startSpacing: 0,
      startDistance: 0, lastTouchX: 0, moved: false
    };

    var canvas = this.canvas;
    canvas.addEventListener('touchstart', function(e) { self._onTouchStart(e); }, { passive: false });
    canvas.addEventListener('touchmove', function(e) { self._onTouchMove(e); }, { passive: false });
    canvas.addEventListener('touchend', function(e) { self._onTouchEnd(e); }, { passive: false });
    canvas.addEventListener('mousedown', function(e) { self._onMouseDown(e); });
    canvas.addEventListener('mousemove', function(e) { self._onMouseMove(e); });
    canvas.addEventListener('mouseup', function(e) { self._onMouseUp(e); });
    canvas.addEventListener('mouseleave', function(e) { self._onMouseUp(e); });
    canvas.addEventListener('wheel', function(e) { self._onWheel(e); }, { passive: false });
  };

  QuotexChart.prototype._startRenderLoop = function() {
    var self = this;
    var lastRenderTime = 0;
    var FRAME_INTERVAL = 1000 / 60;

    function loop(timestamp) {
      if (!self._running) return;
      if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
        lastRenderTime = timestamp;
        try { self._render(); } catch(e) { console.error('[ChartEngine] Render error:', e.message); }
      }
      self._rafId = requestAnimationFrame(loop);
    }
    this._rafId = requestAnimationFrame(loop);
  };

  QuotexChart.prototype._stopRenderLoop = function() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  };

  QuotexChart.prototype._render = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;
    if (W <= 0 || H <= 0) return;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    try { if (this.options.showGrid) this._drawGrid(); } catch(e) {}
    try { this._drawCandles(); } catch(e) {}
    try { if (this.options.showWatermark) this._drawWatermark(); } catch(e) {}
    try { this._drawPriceScale(); } catch(e) {}
    try { this._drawTimeScale(); } catch(e) {}
  };

  QuotexChart.prototype._drawGrid = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;
    var cacheValid = this._gridCache &&
      this._gridCacheW === W &&
      this._gridCacheH === H &&
      this._gridCacheMinPrice === this.viewport.minPrice &&
      this._gridCacheMaxPrice === this.viewport.maxPrice;

    if (cacheValid) {
      ctx.drawImage(this._gridCache, 0, 0, W, H);
      return;
    }

    if (!this._gridCache) this._gridCache = document.createElement('canvas');
    this._gridCache.width = W * this.dpr;
    this._gridCache.height = H * this.dpr;
    var gctx = this._gridCache.getContext('2d');
    gctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    gctx.clearRect(0, 0, W, H);

    var pad = this.options.padding;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    gctx.strokeStyle = COLORS.gridLine;
    gctx.lineWidth = 1;
    gctx.setLineDash(this.options.gridDash);

    for (var i = 0; i <= this.options.gridHorizontalLines; i++) {
      var y = Math.round(pad.top + (chartH / this.options.gridHorizontalLines) * i) + 0.5;
      gctx.beginPath();
      gctx.moveTo(pad.left, y);
      gctx.lineTo(pad.left + chartW, y);
      gctx.stroke();
    }

    for (var j = 0; j <= this.options.gridVerticalLines; j++) {
      var x = Math.round(pad.left + (chartW / this.options.gridVerticalLines) * j) + 0.5;
      gctx.beginPath();
      gctx.moveTo(x, pad.top);
      gctx.lineTo(x, pad.top + chartH);
      gctx.stroke();
    }

    gctx.setLineDash([]);
    this._gridCacheW = W;
    this._gridCacheH = H;
    this._gridCacheMinPrice = this.viewport.minPrice;
    this._gridCacheMaxPrice = this.viewport.maxPrice;
    ctx.drawImage(this._gridCache, 0, 0, W, H);
  };

  QuotexChart.prototype._drawWatermark = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;
    if (!this._wmCache || this._wmW !== W || this._wmH !== H) {
      if (!this._wmCache) this._wmCache = document.createElement('canvas');
      this._wmCache.width = W * this.dpr;
      this._wmCache.height = H * this.dpr;
      var wctx = this._wmCache.getContext('2d');
      wctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      wctx.clearRect(0, 0, W, H);
      wctx.fillStyle = COLORS.watermark;
      wctx.font = 'bold ' + Math.round(H * 0.2) + 'px ' + this.options.fontFamily;
      wctx.textAlign = 'center';
      wctx.textBaseline = 'middle';
      wctx.fillText(this.options.watermarkText, W / 2, H / 2);
      this._wmW = W;
      this._wmH = H;
    }
    ctx.drawImage(this._wmCache, 0, 0, W, H);
  };

  QuotexChart.prototype._autoScale = function() {
    if (!this.candles || this.candles.length === 0) {
      this.viewport.minPrice = 0;
      this.viewport.maxPrice = 1;
      return;
    }

    var vis = this._getVisibleCandles();
    if (!vis || vis.length === 0) {
      var start = Math.max(0, this.candles.length - 20);
      vis = this.candles.slice(start);
    }
    if (!vis || vis.length === 0) return;

    var min = Infinity, max = -Infinity;
    for (var i = 0; i < vis.length; i++) {
      var c = vis[i];
      if (!c || typeof c.high !== 'number' || typeof c.low !== 'number') continue;
      if (c.high > max) max = c.high;
      if (c.low < min) min = c.low;
    }

    if (min === Infinity || max === -Infinity) {
      this.viewport.minPrice = 0;
      this.viewport.maxPrice = 1;
      return;
    }

    if (max === min) max = min + Math.max(Math.abs(min) * 0.001, 1);

    var range = max - min;
    this.viewport.minPrice = min - range * 0.20;
    this.viewport.maxPrice = max + range * 0.20;

    // Invalidate grid cache
    if (this._gridCacheMinPrice !== null && this._gridCacheMinPrice !== undefined) {
      if (Math.abs(this._gridCacheMinPrice - this.viewport.minPrice) > 0.01 ||
          Math.abs(this._gridCacheMaxPrice - this.viewport.maxPrice) > 0.01) {
        this._gridCache = null;
        this._gridCacheMinPrice = null;
        this._gridCacheMaxPrice = null;
      }
    }
  };

  QuotexChart.prototype._getVisibleCandles = function() {
    var now = performance.now();
    if (this._lastVisCache &&
        this._lastVisCacheTime &&
        now - this._lastVisCacheTime < 16 &&
        this._lastVisCacheOffset === this.viewport.offsetX &&
        this._lastVisCacheSpacing === this.viewport.candleSpacing) {
      return this._lastVisCache;
    }

    if (!this.candles || this.candles.length === 0) return [];

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    if (spacing <= 0) spacing = 6;

    var maxVisible = Math.ceil(chartW / spacing) + 2;
    var offset = this.viewport.offsetX;
    if (isNaN(offset)) offset = 0;
    if (offset < 0) offset = 0;

    var start = Math.floor(offset);
    if (start >= this.candles.length) start = Math.max(0, this.candles.length - maxVisible);
    var end = Math.min(this.candles.length, start + maxVisible + 1);

    var result = [];
    for (var i = start; i < end; i++) {
      if (this.candles[i]) result.push(this.candles[i]);
    }

    this._lastVisCache = result;
    this._lastVisCacheTime = now;
    this._lastVisCacheOffset = this.viewport.offsetX;
    this._lastVisCacheSpacing = this.viewport.candleSpacing;

    return result;
  };

  QuotexChart.prototype._drawCandles = function() {
    var ctx = this.ctx;
    var vis = this._getVisibleCandles();
    if (!vis || vis.length === 0) return;

    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var spacing = this.viewport.candleSpacing;
    if (spacing <= 0) spacing = 6;

    var candleW = spacing * this.options.candleBodyRatio;
    if (candleW < 1.5) candleW = 1.5;
    if (candleW > 20) candleW = 20;

    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;
    if (priceRange <= 0) return;

    var priceToY = function(price) {
      return pad.top + chartH - ((price - priceMin) / priceRange) * chartH;
    };

    for (var i = 0; i < vis.length; i++) {
      var c = vis[i];
      if (!c) continue;

      var open = Number(c.open) || 0;
      var close = Number(c.close) || 0;
      var high = Number(c.high) || 0;
      var low = Number(c.low) || 0;
      var xCenter = pad.left + (i + 0.5) * spacing;

      var openY = priceToY(open);
      var closeY = priceToY(close);
      var highY = priceToY(high);
      var lowY = priceToY(low);

      var isGreen = close >= open;
      var bodyColor = isGreen ? COLORS.candleGreen : COLORS.candleRed;
      var bodyBorder = isGreen ? COLORS.candleGreenBorder : COLORS.candleRedBorder;
      var wickColor = isGreen ? COLORS.candleGreenWick : COLORS.candleRedWick;

      ctx.strokeStyle = wickColor;
      ctx.lineWidth = this.options.wickWidth;
      ctx.beginPath();
      ctx.moveTo(Math.round(xCenter) + 0.5, Math.round(highY));
      ctx.lineTo(Math.round(xCenter) + 0.5, Math.round(lowY));
      ctx.stroke();

      var bodyTop = Math.min(openY, closeY);
      var bodyBottom = Math.max(openY, closeY);
      var bodyHeight = bodyBottom - bodyTop;
      if (bodyHeight < 1) bodyHeight = 1;

      var bodyLeft = xCenter - candleW / 2;

      ctx.fillStyle = bodyColor;
      ctx.fillRect(Math.round(bodyLeft), Math.round(bodyTop), Math.round(candleW), Math.round(bodyHeight));

      ctx.strokeStyle = bodyBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(bodyLeft) + 0.5, Math.round(bodyTop) + 0.5, Math.round(candleW) - 1, Math.round(bodyHeight) - 1);
    }
  };

  QuotexChart.prototype._drawPriceScale = function() {
    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartH = H - pad.top - pad.bottom;
    var chartW = W - pad.left - pad.right;

    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;
    if (priceRange <= 0) return;

    ctx.setLineDash([]);
    for (var i = 0; i <= this.options.gridHorizontalLines; i++) {
      var y = pad.top + (chartH / this.options.gridHorizontalLines) * i;
      var price = priceMax - (priceRange / this.options.gridHorizontalLines) * i;
      ctx.fillStyle = COLORS.textPrimary;
      ctx.font = this.options.fontSizePrice + 'px ' + this.options.fontFamily;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPrice(price, this.options.priceDecimals), pad.left + chartW + 8, y);
    }

    if (this.candles.length > 0) {
      var last = this.candles[this.candles.length - 1];
      if (!last || typeof last.close !== 'number') return;
      var currentPrice = last.close;
      var currentY = pad.top + chartH - ((currentPrice - priceMin) / priceRange) * chartH;
      if (currentY >= pad.top && currentY <= pad.top + chartH) {
        var isGreen = last.close >= last.open;
        var highlightColor = isGreen ? COLORS.candleGreen : COLORS.candleRed;
        var boxH = 18;
        ctx.fillStyle = highlightColor;
        ctx.fillRect(pad.left + chartW + 4, currentY - boxH / 2, W - (pad.left + chartW) - 6, boxH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + this.options.fontSizePrice + 'px ' + this.options.fontFamily;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatPrice(currentPrice, this.options.priceDecimals), pad.left + chartW + 8, currentY);

        ctx.strokeStyle = 'rgba(255, 179, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, Math.round(currentY) + 0.5);
        ctx.lineTo(pad.left + chartW, Math.round(currentY) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  QuotexChart.prototype._drawTimeScale = function() {
    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var vis = this._getVisibleCandles();
    if (!vis || vis.length === 0) return;

    var spacing = this.viewport.candleSpacing;
    if (spacing <= 0) return;

    var labelEvery = 5;
    if (spacing < 5) labelEvery = 8;
    if (spacing < 3) labelEvery = 12;
    if (spacing > 12) labelEvery = 3;
    if (spacing > 20) labelEvery = 2;

    var timeY = pad.top + chartH + 12;
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = this.options.fontSizeTime + 'px ' + this.options.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var start = Math.max(0, Math.floor(this.viewport.offsetX));
    var maxVisible = Math.ceil(chartW / spacing);
    var lastLabelX = -100;

    for (var i = 0; i < maxVisible; i++) {
      var idx = start + i;
      if (idx >= this.candles.length) break;
      if (i % labelEvery !== 0) continue;

      var c = this.candles[idx];
      if (!c || typeof c.time !== 'number') continue;

      var xCenter = pad.left + (i + 0.5) * spacing;
      if (xCenter > pad.left + chartW - 20) continue;
      if (xCenter - lastLabelX < 40) continue;

      var t = c.time;
      if (t < 1e10) t = t * 1000;
      var d = new Date(t);
      if (isNaN(d.getTime())) continue;

      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');

      ctx.fillStyle = COLORS.textSecondary;
      ctx.fillText(hh + ':' + mm, xCenter, timeY);
      lastLabelX = xCenter;
    }
  };

  QuotexChart.prototype.setData = function(data) {
    if (!Array.isArray(data)) return;

    this.candles = data.filter(function(c) {
      return c && typeof c.time === 'number' &&
             typeof c.open === 'number' &&
             typeof c.high === 'number' &&
             typeof c.low === 'number' &&
             typeof c.close === 'number';
    });

    if (this.candles.length > this.options.visibleCandleCount) {
      this.viewport.offsetX = this.candles.length - this.options.visibleCandleCount;
    } else {
      this.viewport.offsetX = 0;
    }

    this._autoScale();
    this._notifyTimeRange();
    console.log('[ChartEngine] setData:', this.candles.length, 'candles');
  };

  QuotexChart.prototype.update = function(candle) {
    if (!candle || typeof candle.time !== 'number') return;
    if (this.candles.length === 0) {
      this.candles.push(candle);
    } else {
      var last = this.candles[this.candles.length - 1];
      if (!last) this.candles.push(candle);
      else if (candle.time === last.time) this.candles[this.candles.length - 1] = candle;
      else if (candle.time > last.time) this.candles.push(candle);
      else return;
    }
    this._autoScale();
  };

  QuotexChart.prototype.subscribeVisibleTimeRangeChange = function(cb) {
    if (typeof cb === 'function') this._timeRangeSubs.push(cb);
  };

  QuotexChart.prototype._notifyTimeRange = function() {
    try {
      var vis = this._getVisibleCandles();
      if (!vis || vis.length === 0) return;
      var range = { from: vis[0].time, to: vis[vis.length - 1].time };
      for (var i = 0; i < this._timeRangeSubs.length; i++) {
        try { this._timeRangeSubs[i](range); } catch(e) {}
      }
    } catch(e) {}
  };

  QuotexChart.prototype._timeToX = function(time) {
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;
    var idx = this._findCandleIndex(time);
    if (idx === -1) return null;
    var relativeIdx = idx - this.viewport.offsetX;
    return pad.left + (relativeIdx + 0.5) * spacing;
  };

  QuotexChart.prototype._priceToY = function(price) {
    var pad = this.options.padding;
    var H = this.options.height;
    var chartH = H - pad.top - pad.bottom;
    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;
    if (priceRange <= 0) return null;
    return pad.top + chartH - ((price - priceMin) / priceRange) * chartH;
  };

  QuotexChart.prototype._xToTime = function(x) {
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;
    var relativeIdx = (x - pad.left) / spacing - 0.5;
    var idx = Math.round(this.viewport.offsetX + relativeIdx);
    if (idx < 0 || idx >= this.candles.length) return null;
    return this.candles[idx].time;
  };

  QuotexChart.prototype._yToPrice = function(y) {
    var pad = this.options.padding;
    var H = this.options.height;
    var chartH = H - pad.top - pad.bottom;
    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;
    if (priceRange <= 0) return null;
    return priceMax - ((y - pad.top) / chartH) * priceRange;
  };

  QuotexChart.prototype._findCandleIndex = function(time) {
    if (this.candles.length === 0) return -1;
    var low = 0, high = this.candles.length - 1;
    while (low <= high) {
      var mid = Math.floor((low + high) / 2);
      if (this.candles[mid].time === time) return mid;
      if (this.candles[mid].time < time) low = mid + 1;
      else high = mid - 1;
    }
    if (high < 0) return 0;
    if (low >= this.candles.length) return this.candles.length - 1;
    var dLow = Math.abs(this.candles[low].time - time);
    var dHigh = Math.abs(this.candles[high].time - time);
    return dLow < dHigh ? low : high;
  };

  QuotexChart.prototype._onTouchStart = function(e) {
    e.preventDefault();
    var t = e.touches;
    if (t.length === 1) {
      this._interaction.isPanning = true;
      this._interaction.moved = false;
      this._interaction.lastTouchX = t[0].clientX;
      this._interaction.startOffsetX = this.viewport.offsetX;
    } else if (t.length === 2) {
      this._interaction.isPinching = true;
      this._interaction.isPanning = false;
      this._interaction.startDistance = this._getTouchDistance(t[0], t[1]);
      this._interaction.startSpacing = this.viewport.candleSpacing;
      var midX = (t[0].clientX + t[1].clientX) / 2;
      this._interaction.startX = midX;
    }
  };

  QuotexChart.prototype._onTouchMove = function(e) {
    e.preventDefault();
    var t = e.touches;
    if (t.length === 1 && this._interaction.isPanning) {
      var dx = t[0].clientX - this._interaction.lastTouchX;
      if (Math.abs(dx) > 2) this._interaction.moved = true;
      var spacing = this.viewport.candleSpacing;
      var offsetDelta = -dx / spacing;
      this._applyPan(offsetDelta);
      this._interaction.lastTouchX = t[0].clientX;
    } else if (t.length === 2 && this._interaction.isPinching) {
      var distance = this._getTouchDistance(t[0], t[1]);
      var ratio = distance / this._interaction.startDistance;
      var newSpacing = this._interaction.startSpacing * ratio;
      this._applyZoom(newSpacing, this._interaction.startX);
    }
  };

  QuotexChart.prototype._onTouchEnd = function(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
      this._interaction.isPanning = false;
      this._interaction.isPinching = false;
    }
  };

  QuotexChart.prototype._onMouseDown = function(e) {
    this._interaction.isPanning = true;
    this._interaction.moved = false;
    this._interaction.lastTouchX = e.clientX;
  };

  QuotexChart.prototype._onMouseMove = function(e) {
    if (this._interaction.isPanning) {
      var dx = e.clientX - this._interaction.lastTouchX;
      if (Math.abs(dx) > 2) this._interaction.moved = true;
      var spacing = this.viewport.candleSpacing;
      var offsetDelta = -dx / spacing;
      this._applyPan(offsetDelta);
      this._interaction.lastTouchX = e.clientX;
    }
  };

  QuotexChart.prototype._onMouseUp = function(e) {
    this._interaction.isPanning = false;
  };

  QuotexChart.prototype._onWheel = function(e) {
    e.preventDefault();
    var step = e.deltaMode === 1 ? 0.05 : 0.02;
    var delta = e.deltaY > 0 ? -step : step;
    var currentSpacing = this.viewport.candleSpacing;
    var newSpacing = currentSpacing * (1 + delta);
    if (newSpacing < 3) newSpacing = 3;
    if (newSpacing > 60) newSpacing = 60;
    var rect = this.canvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;
    this._applyZoom(newSpacing, mouseX);
  };

  QuotexChart.prototype._applyPan = function(offsetDelta) {
    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    var maxVisible = Math.ceil(chartW / spacing);

    var newOffset = this.viewport.offsetX + offsetDelta;
    var minOffset = -maxVisible * 0.5;
    var maxOffset = Math.max(0, this.candles.length - maxVisible + this.options.rightOffsetCandles);

    if (this.candles.length <= maxVisible) {
      newOffset = -Math.floor((maxVisible - this.candles.length) / 2);
    } else {
      if (newOffset < minOffset) newOffset = minOffset;
      if (newOffset > maxOffset) newOffset = maxOffset;
    }

    if (Math.abs(newOffset - this.viewport.offsetX) < 0.001) return;
    this.viewport.offsetX = newOffset;
    this._notifyTimeRange();
  };

  QuotexChart.prototype._applyZoom = function(newSpacing, anchorX) {
    if (newSpacing < 3) newSpacing = 3;
    if (newSpacing > 60) newSpacing = 60;
    var oldSpacing = this.viewport.candleSpacing;
    if (Math.abs(newSpacing - oldSpacing) < 0.1) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    if (anchorX === undefined || anchorX === null) {
      anchorX = pad.left + chartW * 0.8;
    }

    var relativeIdx = (anchorX - pad.left) / oldSpacing;
    var anchorCandleIdx = this.viewport.offsetX + relativeIdx;
    this.viewport.candleSpacing = newSpacing;
    var newRelativeIdx = (anchorX - pad.left) / newSpacing;
    var newOffset = anchorCandleIdx - newRelativeIdx;

    var maxVisible = Math.ceil(chartW / newSpacing);
    var minOffset = -maxVisible * 0.5;
    var maxOffset = Math.max(0, this.candles.length - maxVisible + this.options.rightOffsetCandles);

    if (this.candles.length <= maxVisible) {
      newOffset = -Math.floor((maxVisible - this.candles.length) / 2);
    } else {
      if (newOffset < minOffset) newOffset = minOffset;
      if (newOffset > maxOffset) newOffset = maxOffset;
    }

    if (Math.abs(newOffset - this.viewport.offsetX) < 0.01 &&
        Math.abs(newSpacing - oldSpacing) < 0.01) return;

    this.viewport.offsetX = newOffset;
    if (Math.abs(newSpacing - oldSpacing) > 0.3) {
      this._autoScale();
      this._notifyTimeRange();
    }
  };

  QuotexChart.prototype._getTouchDistance = function(t1, t2) {
    var dx = t2.clientX - t1.clientX;
    var dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  QuotexChart.prototype.fitContent = function() {
    if (this.candles.length === 0) return;
    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var targetCount = Math.min(this.candles.length, Math.max(20, Math.floor(chartW / 6)));
    var spacing = chartW / targetCount;
    if (spacing < 3) spacing = 3;
    if (spacing > 60) spacing = 60;
    this.viewport.candleSpacing = spacing;
    this.viewport.offsetX = Math.max(0, this.candles.length - targetCount + this.options.rightOffsetCandles);
    this._autoScale();
    this._notifyTimeRange();
  };

  QuotexChart.prototype.scrollToRealTime = function() {
    if (this.candles.length === 0) return;
    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    var maxVisible = Math.ceil(chartW / spacing);
    this.viewport.offsetX = Math.max(0, this.candles.length - maxVisible + this.options.rightOffsetCandles);
    this._autoScale();
    this._notifyTimeRange();
  };

  QuotexChart.prototype.destroy = function() {
    this._stopRenderLoop();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.container) this.container.innerHTML = '';
  };

  QuotexChart.prototype.addCandlestickSeries = function(options) {
    var self = this;
    if (options) {
      if (options.upColor) COLORS.candleGreen = options.upColor;
      if (options.downColor) COLORS.candleRed = options.downColor;
      if (options.borderUpColor) COLORS.candleGreenBorder = options.borderUpColor;
      if (options.borderDownColor) COLORS.candleRedBorder = options.borderDownColor;
      if (options.wickUpColor) COLORS.candleGreenWick = options.wickUpColor;
      if (options.wickDownColor) COLORS.candleRedWick = options.wickDownColor;
    }
    var series = {
      setData: function(data) {
        if (!Array.isArray(data)) return;
        var valid = data.filter(function(c) {
          return c && typeof c.time === 'number' && typeof c.open === 'number' &&
                 typeof c.high === 'number' && typeof c.low === 'number' &&
                 typeof c.close === 'number';
        });
        self.setData(valid);
      },
      update: function(candle) { if (candle && typeof candle.time === 'number') self.update(candle); },
      data: function() { return self.candles.slice(); },
      setMarkers: function(markers) { self._markers = markers || []; },
      createPriceLine: function(options) {
        var line = { options: options || {} };
        if (!self._priceLines) self._priceLines = [];
        self._priceLines.push(line);
        return line;
      },
      removePriceLine: function(line) {
        if (!self._priceLines) return;
        var idx = self._priceLines.indexOf(line);
        if (idx > -1) self._priceLines.splice(idx, 1);
      },
      priceToCoordinate: function(price) { return self._priceToY(price); },
      coordinateToPrice: function(y) { return self._yToPrice(y); },
      _priceLines: []
    };
    this.series = series;
    this.candleSeries = series;
    return series;
  };

  QuotexChart.prototype.timeScale = function() {
    var self = this;
    return {
      fitContent: function() { self.fitContent(); },
      scrollToRealTime: function() { self.scrollToRealTime(); },
      setVisibleRange: function(range) {},
      getVisibleRange: function() {
        var vis = self._getVisibleCandles();
        if (vis.length === 0) return null;
        return { from: vis[0].time, to: vis[vis.length - 1].time };
      },
      timeToCoordinate: function(time) { return self._timeToX(time); },
      coordinateToTime: function(x) { return self._xToTime(x); },
      subscribeVisibleTimeRangeChange: function(cb) { self.subscribeVisibleTimeRangeChange(cb); },
      subscribeVisibleLogicalRangeChange: function(cb) { self.subscribeVisibleTimeRangeChange(cb); },
      applyOptions: function(opts) {
        if (!opts) return;
        if (typeof opts.width === 'number') self.options.width = opts.width;
        if (typeof opts.height === 'number') self.options.height = opts.height;
        self._resize();
      }
    };
  };

  QuotexChart.prototype.applyOptions = function(opts) {
    if (!opts) return;
    if (typeof opts.width === 'number') this.options.width = opts.width;
    if (typeof opts.height === 'number') this.options.height = opts.height;
    if (opts.layout) {
      if (opts.layout.background && opts.layout.background.color) COLORS.background = opts.layout.background.color;
      if (opts.layout.textColor) COLORS.textPrimary = opts.layout.textColor;
    }
    this._resize();
  };

  QuotexChart.prototype.remove = function() { this.destroy(); };

  QuotexChart.prototype.getTimeLabels = function() {
    var vis = this._getVisibleCandles();
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;
    var labels = [];
    for (var i = 0; i < vis.length; i++) {
      var candle = vis[i];
      if (!candle) continue;
      if (i % 3 !== 0) continue;
      labels.push({ time: candle.time, x: pad.left + (i + 0.5) * spacing });
    }
    return labels;
  };

  window.QuotexChart = QuotexChart;
  console.log('[ChartEngine] v4 loaded successfully');
})();
