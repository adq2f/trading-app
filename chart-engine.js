// ============================================================
// QUOTEX CLONE — CHART ENGINE v8 (QUOTEX EXACT)
// Custom Canvas 2D Chart — 100% Quotex Replica
// Part 1/5: Foundation + Constructor + Resize + Render Loop
// ============================================================

(function() {
  if (window.QuotexChart) {
    console.log('[ChartEngine] Already loaded');
    return;
  }

  console.log('[ChartEngine] Loading v8 (Quotex Exact)...');

  // ============================================================
  // COLORS (Quotex exact)
  // ============================================================
  var COLORS = {
    background: '#0d1117',
    gridLine: '#1a2332',
    textPrimary: '#d1d4dc',
    textSecondary: '#6b7a90',
    textDim: '#4a5568',
    candleGreen: '#00c076',
    candleGreenBorder: '#00a865',
    candleGreenWick: '#00c076',
    candleRed: '#ff3b30',
    candleRedBorder: '#e63428',
    candleRedWick: '#ff3b30',
    crosshair: '#7b8ba3',
    crosshairLabel: '#2a3546',
    crosshairLabelText: '#ffffff',
    watermark: 'rgba(255, 255, 255, 0.025)',
    priceLine: '#ffb300',
    entryGreen: '#00c076',
    entryRed: '#ff3b30',
    vlineBlue: '#4a9eff',
    resultWin: '#00c076',
    resultLoss: '#ff3b30',
    clockText: '#8b96a5'
  };

  window.CHART_COLORS = COLORS;

  // ============================================================
  // DEFAULT OPTIONS
  // ============================================================
  var DEFAULT_OPTIONS = {
    width: 0,
    height: 0,
    padding: { top: 25, right: 65, bottom: 30, left: 8 },
    candleSpacing: 6,
    candleBodyRatio: 0.75,
    wickWidth: 1,
    showGrid: true,
    showCrosshair: true,
    showWatermark: true,
    watermarkText: 'QUOTEX',
    gridHorizontalLines: 6,
    gridVerticalLines: 6,
    gridDash: [2, 4],
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: 11,
    fontSizePrice: 11,
    fontSizeTime: 11,
    fontSizeClock: 11,
    priceDecimals: 2,
    visibleCandleCount: 60,
    rightOffsetCandles: 8,
    minCandleSpacing: 2,
    maxCandleSpacing: 40,
    timeframe: 60000,
    showClock: true
  };

  // ============================================================
  // HELPER: Merge options
  // ============================================================
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

  // ============================================================
  // HELPER: Format price
  // ============================================================
  function formatPrice(value, decimals) {
    if (typeof value !== 'number' || isNaN(value)) return '0';
    return value.toFixed(decimals);
  }

  // ============================================================
  // HELPER: Format time
  // ============================================================
  function formatTime(timestamp) {
    var t = timestamp;
    if (t < 1e10) t = t * 1000;
    var d = new Date(t);
    if (isNaN(d.getTime())) return '--:--';
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  window.chartFormatPrice = formatPrice;
  window.chartFormatTime = formatTime;

  // ============================================================
  // CONSTRUCTOR
  // ============================================================
  function QuotexChart(container, options) {
    if (!container) {
      console.error('[ChartEngine] Container required');
      return;
    }

    this.container = container;
    this.options = mergeOptions(DEFAULT_OPTIONS, options || {});

    this.candles = [];
    this.candleByTime = {};

    this.viewport = {
      offsetX: 0,
      candleSpacing: this.options.candleSpacing,
      minPrice: 0,
      maxPrice: 0
    };

    this.crosshair = { x: -1, y: -1, active: false };

    this.tradeEntry = null;
    this.tradeVLines = [];
    this.tradeResults = [];

    this.timeframe = this.options.timeframe;

    this._timeRangeSubs = [];

    this._gridCache = null;
    this._gridCacheW = 0;
    this._gridCacheH = 0;
    this._wmCache = null;
    this._wmW = 0;
    this._wmH = 0;
    this._visibleCache = null;
    this._visibleCacheKey = '';

    this._running = true;
    this._rafId = null;
    this._lastStateKey = '';
    this._needsRender = true;

    this.dpr = window.devicePixelRatio || 1;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;';
    container.innerHTML = '';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this._interaction = {
      isPanning: false,
      isPinching: false,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startSpacing: 0,
      startDistance: 0,
      lastTouchX: 0,
      lastTouchY: 0,
      moved: false,
      pinchAnchorX: 0
    };

    this._resize();
    this._bindEvents();
    this._startRenderLoop();

    console.log('[ChartEngine] Chart created:', this.options.width + 'x' + this.options.height);
  }

  // ============================================================
  // RESIZE
  // ============================================================
  QuotexChart.prototype._resize = function() {
    if (!this.container) return;

    var rect = this.container.getBoundingClientRect();
    var w = Math.floor(rect.width);
    var h = Math.floor(rect.height);

    if (w <= 0) w = this.options.width || window.innerWidth || 360;
    if (h <= 0) h = this.options.height || 400;

    if (w < 100 || h < 100) {
      var self = this;
      if (!self.__resizeRetries) self.__resizeRetries = 0;
      self.__resizeRetries++;
      if (self.__resizeRetries < 15) {
        setTimeout(function() { self._resize(); }, 100);
      }
      return;
    }

    this.__resizeRetries = 0;
    this.options.width = w;
    this.options.height = h;

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this._gridCache = null;
    this._wmCache = null;
    this._visibleCache = null;
    this._needsRender = true;
  };

  // ============================================================
  // BIND EVENTS
  // ============================================================
  QuotexChart.prototype._bindEvents = function() {
    var self = this;

    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function() {
        self._resize();
      });
      this._ro.observe(this.container);
    } else {
      window.addEventListener('resize', function() { self._resize(); });
    }

    var canvas = this.canvas;

    canvas.addEventListener('touchstart', function(e) { self._onTouchStart(e); }, { passive: false });
    canvas.addEventListener('touchmove', function(e) { self._onTouchMove(e); }, { passive: false });
    canvas.addEventListener('touchend', function(e) { self._onTouchEnd(e); }, { passive: false });
    canvas.addEventListener('touchcancel', function(e) { self._onTouchEnd(e); }, { passive: false });

    canvas.addEventListener('mousedown', function(e) { self._onMouseDown(e); });
    canvas.addEventListener('mousemove', function(e) { self._onMouseMove(e); });
    canvas.addEventListener('mouseup', function(e) { self._onMouseUp(e); });
    canvas.addEventListener('mouseleave', function(e) { self._onMouseUp(e); });

    canvas.addEventListener('wheel', function(e) { self._onWheel(e); }, { passive: false });
  };

  // ============================================================
  // RENDER LOOP
  // ============================================================
  QuotexChart.prototype._startRenderLoop = function() {
    var self = this;
    var lastRenderTime = 0;
    var FRAME_INTERVAL = 1000 / 60;

    function loop(timestamp) {
      if (!self._running) return;

      if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
        lastRenderTime = timestamp;

        var secNow = Math.floor(Date.now() / 1000);
        var lastCandle = self.candles[self.candles.length - 1];
        var lastTime = lastCandle ? lastCandle.time : 0;

        var stateKey = [
          self.viewport.offsetX.toFixed(2),
          self.viewport.candleSpacing.toFixed(2),
          self.viewport.minPrice.toFixed(2),
          self.viewport.maxPrice.toFixed(2),
          self.candles.length,
          lastTime,
          self.crosshair.active ? 1 : 0,
          self.crosshair.x.toFixed(0),
          self.crosshair.y.toFixed(0),
          self.tradeEntry ? 1 : 0,
          self.tradeVLines.length,
          self.tradeResults.length,
          secNow
        ].join('|');

        if (stateKey !== self._lastStateKey) {
          self._lastStateKey = stateKey;
          try {
            self._render();
          } catch (e) {
            console.error('[ChartEngine] Render error:', e.message);
          }
        }
      }

      self._rafId = requestAnimationFrame(loop);
    }

    this._rafId = requestAnimationFrame(loop);
  };

  QuotexChart.prototype._stopRenderLoop = function() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
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
    try { this._drawVerticalLines(); } catch(e) {}
    try { this._drawTradeEntry(); } catch(e) {}
    try { this._drawResultMarkers(); } catch(e) {}
    try { this._drawTimeScale(); } catch(e) {}
    try { this._drawClock(); } catch(e) {}
    try { if (this.options.showCrosshair) this._drawCrosshair(); } catch(e) {}
  };

  // ============================================================
  // EXPOSE
  // ============================================================
  window.QuotexChart = QuotexChart;

  console.log('[ChartEngine] v8 Part 1/5 loaded');
  // ============================================================
  // PART 2: VISIBLE RANGE (absolute index)
  // ============================================================
  QuotexChart.prototype._getVisibleRange = function() {
    if (!this.candles || this.candles.length === 0) {
      return { start: 0, end: 0 };
    }

    var pad = this.options.padding;
    var W = this.options.width;
    var chartW = W - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;

    if (spacing <= 0) spacing = 6;

    var maxVisible = Math.ceil(chartW / spacing) + 2;

    var offset = this.viewport.offsetX;
    if (isNaN(offset)) offset = 0;

    var start = Math.floor(offset);
    if (start < 0) start = 0;
    if (start >= this.candles.length) start = Math.max(0, this.candles.length - maxVisible);

    var end = Math.min(this.candles.length, start + maxVisible + 1);

    return { start: start, end: end };
  };

  // ============================================================
  // PART 2: VISIBLE CANDLES (with cache)
  // ============================================================
  QuotexChart.prototype._getVisibleCandles = function() {
    if (!this.candles || this.candles.length === 0) return [];

    var key = this.viewport.offsetX.toFixed(2) + '|' +
              this.viewport.candleSpacing.toFixed(2) + '|' +
              this.candles.length;

    if (this._visibleCacheKey === key && this._visibleCache) {
      return this._visibleCache;
    }

    var range = this._getVisibleRange();
    var result = [];
    for (var i = range.start; i < range.end; i++) {
      if (this.candles[i]) result.push(this.candles[i]);
    }

    this._visibleCache = result;
    this._visibleCacheKey = key;
    return result;
  };

  // ============================================================
  // PART 2: AUTO SCALE (20% padding — Quotex exact)
  // ============================================================
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
      if (!c) continue;
      if (typeof c.high === 'number' && c.high > max) max = c.high;
      if (typeof c.low === 'number' && c.low < min) min = c.low;
    }

    if (min === Infinity || max === -Infinity) {
      this.viewport.minPrice = 0;
      this.viewport.maxPrice = 1;
      return;
    }

    if (max === min) {
      max = min + Math.max(Math.abs(min) * 0.001, 1);
    }

    var range = max - min;
    this.viewport.minPrice = min - range * 0.20;
    this.viewport.maxPrice = max + range * 0.20;
  };

  // ============================================================
  // PART 2: DRAW GRID (cached — crisp)
  // ============================================================
  QuotexChart.prototype._drawGrid = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    if (this._gridCache &&
        this._gridCacheW === W &&
        this._gridCacheH === H) {
      ctx.drawImage(this._gridCache, 0, 0, W, H);
      return;
    }

    if (!this._gridCache) this._gridCache = document.createElement('canvas');
    this._gridCache.width = Math.floor(W * this.dpr);
    this._gridCache.height = Math.floor(H * this.dpr);

    var gctx = this._gridCache.getContext('2d');
    gctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    gctx.clearRect(0, 0, W, H);

    var pad = this.options.padding;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    gctx.strokeStyle = COLORS.gridLine;
    gctx.lineWidth = 1;
    gctx.setLineDash(this.options.gridDash);

    // Horizontal lines
    var hLines = this.options.gridHorizontalLines;
    for (var i = 0; i <= hLines; i++) {
      var y = Math.round(pad.top + (chartH / hLines) * i) + 0.5;
      gctx.beginPath();
      gctx.moveTo(pad.left, y);
      gctx.lineTo(pad.left + chartW, y);
      gctx.stroke();
    }

    // Vertical lines
    var vLines = this.options.gridVerticalLines;
    for (var j = 0; j <= vLines; j++) {
      var x = Math.round(pad.left + (chartW / vLines) * j) + 0.5;
      gctx.beginPath();
      gctx.moveTo(x, pad.top);
      gctx.lineTo(x, pad.top + chartH);
      gctx.stroke();
    }

    gctx.setLineDash([]);

    this._gridCacheW = W;
    this._gridCacheH = H;

    ctx.drawImage(this._gridCache, 0, 0, W, H);
  };

  // ============================================================
  // PART 2: DRAW WATERMARK (cached)
  // ============================================================
  QuotexChart.prototype._drawWatermark = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    if (!this._wmCache || this._wmW !== W || this._wmH !== H) {
      if (!this._wmCache) this._wmCache = document.createElement('canvas');
      this._wmCache.width = Math.floor(W * this.dpr);
      this._wmCache.height = Math.floor(H * this.dpr);

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

  // ============================================================
  // PART 2: DRAW CANDLES (Quotex exact — absolute index)
  // ============================================================
  QuotexChart.prototype._drawCandles = function() {
    var ctx = this.ctx;
    var range = this._getVisibleRange();
    if (range.end <= range.start) return;

    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var spacing = this.viewport.candleSpacing;
    if (spacing <= 0) spacing = 6;

    var bodyWidth = spacing * this.options.candleBodyRatio;
    if (bodyWidth < 1) bodyWidth = 1;
    if (bodyWidth > spacing) bodyWidth = spacing;

    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;
    if (priceRange <= 0) return;

    var offsetX = this.viewport.offsetX;

    // ABSOLUTE INDEX FIX — same formula as lines
    for (var i = range.start; i < range.end; i++) {
      var c = this.candles[i];
      if (!c) continue;

      var open = Number(c.open) || 0;
      var close = Number(c.close) || 0;
      var high = Number(c.high) || 0;
      var low = Number(c.low) || 0;

      var relativeIdx = i - offsetX;
      var xCenter = pad.left + (relativeIdx + 0.5) * spacing;

      if (xCenter < pad.left - spacing) continue;
      if (xCenter > pad.left + chartW + spacing) continue;

      var openY = pad.top + chartH - ((open - priceMin) / priceRange) * chartH;
      var closeY = pad.top + chartH - ((close - priceMin) / priceRange) * chartH;
      var highY = pad.top + chartH - ((high - priceMin) / priceRange) * chartH;
      var lowY = pad.top + chartH - ((low - priceMin) / priceRange) * chartH;

      var isGreen = close >= open;
      var bodyColor = isGreen ? COLORS.candleGreen : COLORS.candleRed;
      var bodyBorder = isGreen ? COLORS.candleGreenBorder : COLORS.candleRedBorder;
      var wickColor = isGreen ? COLORS.candleGreenWick : COLORS.candleRedWick;

      // Wick (1px crisp)
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = this.options.wickWidth;
      ctx.beginPath();
      ctx.moveTo(Math.round(xCenter) + 0.5, Math.round(highY));
      ctx.lineTo(Math.round(xCenter) + 0.5, Math.round(lowY));
      ctx.stroke();

      // Body
      var bodyTop = Math.min(openY, closeY);
      var bodyBottom = Math.max(openY, closeY);
      var bodyHeight = bodyBottom - bodyTop;
      if (bodyHeight < 1) bodyHeight = 1;

      var bodyLeft = Math.round(xCenter - bodyWidth / 2);
      var bw = Math.max(1, Math.round(bodyWidth));
      var bh = Math.max(1, Math.round(bodyHeight));

      ctx.fillStyle = bodyColor;
      ctx.fillRect(bodyLeft, Math.round(bodyTop), bw, bh);

      ctx.strokeStyle = bodyBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(bodyLeft + 0.5, Math.round(bodyTop) + 0.5, bw - 1, bh - 1);
    }
  };
  // ============================================================
  // PART 3: COORDINATE — time → X
  // ============================================================
  QuotexChart.prototype._timeToX = function(time) {
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;
    var idx = this._findCandleIndex(time);
    if (idx === -1) return null;
    var relativeIdx = idx - this.viewport.offsetX;
    return pad.left + (relativeIdx + 0.5) * spacing;
  };

  // ============================================================
  // PART 3: COORDINATE — price → Y
  // ============================================================
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

  // ============================================================
  // PART 3: COORDINATE — X → time
  // ============================================================
  QuotexChart.prototype._xToTime = function(x) {
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;
    var relativeIdx = (x - pad.left) / spacing - 0.5;
    var idx = Math.round(this.viewport.offsetX + relativeIdx);
    if (idx < 0 || idx >= this.candles.length) return null;
    return this.candles[idx].time;
  };

  // ============================================================
  // PART 3: COORDINATE — Y → price
  // ============================================================
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

  // ============================================================
  // PART 3: FIND CANDLE INDEX (binary search)
  // ============================================================
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

  QuotexChart.prototype._findCandleByTime = function(time) {
    var idx = this._findCandleIndex(time);
    if (idx === -1) return null;
    return this.candles[idx];
  };

  // ============================================================
  // PART 3: DRAW PRICE SCALE (right side — Quotex exact)
  // ============================================================
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

    // Price labels (matching grid lines)
    var lines = this.options.gridHorizontalLines;
    for (var i = 0; i <= lines; i++) {
      var y = pad.top + (chartH / lines) * i;
      var price = priceMax - (priceRange / lines) * i;

      ctx.fillStyle = COLORS.textPrimary;
      ctx.font = this.options.fontSizePrice + 'px ' + this.options.fontFamily;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        formatPrice(price, this.options.priceDecimals),
        pad.left + chartW + 8,
        y
      );
    }

    // Last price highlighted
    if (this.candles.length > 0) {
      var last = this.candles[this.candles.length - 1];
      if (!last || typeof last.close !== 'number') return;

      var currentPrice = last.close;
      var currentY = pad.top + chartH -
                     ((currentPrice - priceMin) / priceRange) * chartH;

      if (currentY >= pad.top && currentY <= pad.top + chartH) {
        var isGreen = last.close >= last.open;
        var highlightColor = isGreen ? COLORS.candleGreen : COLORS.candleRed;

        // Box
        var boxH = 18;
        ctx.fillStyle = highlightColor;
        ctx.fillRect(
          pad.left + chartW + 4,
          currentY - boxH / 2,
          W - (pad.left + chartW) - 6,
          boxH
        );

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + this.options.fontSizePrice + 'px ' + this.options.fontFamily;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          formatPrice(currentPrice, this.options.priceDecimals),
          pad.left + chartW + 8,
          currentY
        );

        // Dashed line across
        ctx.strokeStyle = isGreen ? 'rgba(0, 192, 118, 0.5)' : 'rgba(255, 59, 48, 0.5)';
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

// ============================================================
  // PART 3: TIME SCALE (QUOTEX EXACT — PERFECT CANDLE LOCK)
  // ============================================================
  QuotexChart.prototype._drawTimeScale = function() {
    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var range = this._getVisibleRange();
    if (range.end <= range.start) return;

    var spacing = this.viewport.candleSpacing;
    var offsetX = this.viewport.offsetX;
    if (spacing <= 0) return;

    // ============================================
    // Bottom border line (Quotex frame)
    // ============================================
    ctx.strokeStyle = '#1a2332';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + chartH + 0.5);
    ctx.lineTo(pad.left + chartW, pad.top + chartH + 0.5);
    ctx.stroke();

    // ============================================
    // Dynamic label interval
    // ============================================
    var minLabelWidth = 50;
    var labelEvery = Math.max(1, Math.ceil(minLabelWidth / spacing));

    // ⭐ CRITICAL: NO Math.floor on offsetX — use EXACT value
    //    এতে scroll এর মধ্যে label candle এর সাথে perfectly lock থাকবে
    var startIdx = Math.ceil(offsetX / labelEvery) * labelEvery;
    if (startIdx < range.start) startIdx = range.start;

    var timeY = pad.top + chartH + 14;

    ctx.font = this.options.fontSizeTime + 'px ' + this.options.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var lastLabelX = -1000;

    // ============================================
    // Time labels — EXACT same formula as candles (fractional offsetX)
    // ============================================
    for (var i = startIdx; i < range.end; i += labelEvery) {
      var c = this.candles[i];
      if (!c || typeof c.time !== 'number') continue;

      // ⭐ Same formula as candle drawing — NO extra snapping
      var relativeIdx = i - offsetX;
      var xCenter = pad.left + (relativeIdx + 0.5) * spacing;

      // Boundary check
      if (xCenter < pad.left - 5) continue;
      if (xCenter > pad.left + chartW + 5) continue;

      // Overlap check
      if (xCenter - lastLabelX < minLabelWidth) continue;

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

    // ============================================
    // Last candle time — EXACT same formula (perfect lock)
    // ============================================
    if (this.candles.length > 0) {
      var lastIdx = this.candles.length - 1;
      var lastCandle = this.candles[lastIdx];
      if (!lastCandle || typeof lastCandle.time !== 'number') return;

      // ⭐ Exact same formula
      var relativeLastIdx = lastIdx - offsetX;
      var lastX = pad.left + (relativeLastIdx + 0.5) * spacing;

      // Screen boundary check
      if (lastX > pad.left - 5 && lastX < pad.left + chartW + 5) {
        var t2 = lastCandle.time;
        if (t2 < 1e10) t2 = t2 * 1000;
        var d2 = new Date(t2);
        if (isNaN(d2.getTime())) return;

        var hh2 = String(d2.getHours()).padStart(2, '0');
        var mm2 = String(d2.getMinutes()).padStart(2, '0');
        var timeStr = hh2 + ':' + mm2;

        var boxW = 48;
        var boxH = 16;

        // Dark box with green border (Quotex exact)
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(lastX - boxW / 2, timeY - boxH / 2, boxW, boxH);

        ctx.strokeStyle = '#00c076';
        ctx.lineWidth = 1;
        ctx.strokeRect(lastX - boxW / 2 + 0.5, timeY - boxH / 2 + 0.5, boxW - 1, boxH - 1);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + this.options.fontSizeTime + 'px ' + this.options.fontFamily;
        ctx.fillText(timeStr, lastX, timeY);
      }
    }
  };
  // ============================================================
  // PART 3: DRAW REAL BD CLOCK (TOP-LEFT — HH:MM:SS)
  // ============================================================
  QuotexChart.prototype._drawClock = function() {
    if (!this.options.showClock) return;

    var ctx = this.ctx;
    var pad = this.options.padding;

    var now = new Date();
    var bdFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    var timeStr = bdFormatter.format(now);

    var x = pad.left + 8;
    var y = pad.top + 8;

    ctx.save();

    // Green dot indicator
    ctx.fillStyle = '#00c076';
    ctx.beginPath();
    ctx.arc(x + 3, y + 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Time text
    ctx.font = 'bold ' + this.options.fontSizeClock + 'px ' + this.options.fontFamily;
    ctx.fillStyle = COLORS.clockText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, x + 12, y + 7);

    ctx.restore();
  };
  // ============================================================
  // PART 4: PAN (clamped)
  // ============================================================
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
    this._visibleCache = null;
    this._notifyTimeRange();
  };

  // ============================================================
  // PART 4: ZOOM (anchor-locked)
  // ============================================================
  QuotexChart.prototype._applyZoom = function(newSpacing, anchorX) {
    var minS = this.options.minCandleSpacing;
    var maxS = this.options.maxCandleSpacing;

    if (newSpacing < minS) newSpacing = minS;
    if (newSpacing > maxS) newSpacing = maxS;

    var oldSpacing = this.viewport.candleSpacing;
    if (Math.abs(newSpacing - oldSpacing) < 0.01) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;

    if (anchorX === undefined || anchorX === null) {
      anchorX = pad.left + chartW * 0.5;
    }

    // Anchor's absolute index
    var relativeIdx = (anchorX - pad.left) / oldSpacing;
    var anchorCandleIdx = this.viewport.offsetX + relativeIdx;

    this.viewport.candleSpacing = newSpacing;

    // Recompute offset so anchor stays fixed
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

    this.viewport.offsetX = newOffset;
    this._visibleCache = null;

    this._autoScale();
    this._notifyTimeRange();
  };

  // ============================================================
  // PART 4: WHEEL ZOOM
  // ============================================================
  QuotexChart.prototype._onWheel = function(e) {
    e.preventDefault();

    var rect = this.canvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;

    var delta = e.deltaY > 0 ? -0.08 : 0.08;
    var currentSpacing = this.viewport.candleSpacing;
    var newSpacing = currentSpacing * (1 + delta);

    this._applyZoom(newSpacing, mouseX);
  };

  // ============================================================
  // PART 4: TOUCH START
  // ============================================================
  QuotexChart.prototype._onTouchStart = function(e) {
    e.preventDefault();
    var t = e.touches;

    if (t.length === 1) {
      this._interaction.isPanning = true;
      this._interaction.moved = false;
      this._interaction.startX = t[0].clientX;
      this._interaction.startY = t[0].clientY;
      this._interaction.startOffsetX = this.viewport.offsetX;
      this._interaction.lastTouchX = t[0].clientX;
      this._interaction.lastTouchY = t[0].clientY;

      var rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = t[0].clientX - rect.left;
      this.crosshair.y = t[0].clientY - rect.top;
      this.crosshair.active = true;

    } else if (t.length === 2) {
      this._interaction.isPinching = true;
      this._interaction.isPanning = false;
      this._interaction.startDistance = this._getTouchDistance(t[0], t[1]);
      this._interaction.startSpacing = this.viewport.candleSpacing;
      this._interaction.startOffsetX = this.viewport.offsetX;

      var rect2 = this.canvas.getBoundingClientRect();
      var midX = ((t[0].clientX + t[1].clientX) / 2) - rect2.left;
      this._interaction.startX = midX;
      this._interaction.pinchAnchorX = midX;
    }
  };

  // ============================================================
  // PART 4: TOUCH MOVE
  // ============================================================
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

      var rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = t[0].clientX - rect.left;
      this.crosshair.y = t[0].clientY - rect.top;
      this.crosshair.active = true;

    } else if (t.length === 2 && this._interaction.isPinching) {
      var distance = this._getTouchDistance(t[0], t[1]);
      var ratio = distance / this._interaction.startDistance;
      var newSpacing = this._interaction.startSpacing * ratio;

      var rect2 = this.canvas.getBoundingClientRect();
      var midX = ((t[0].clientX + t[1].clientX) / 2) - rect2.left;

      this._applyZoom(newSpacing, midX);
    }
  };

  // ============================================================
  // PART 4: TOUCH END
  // ============================================================
  QuotexChart.prototype._onTouchEnd = function(e) {
    e.preventDefault();
    if (e.touches.length === 0) {
      this._interaction.isPanning = false;
      this._interaction.isPinching = false;
      this._interaction.pinchAnchorX = 0;

      var self = this;
      if (!this._interaction.moved) {
        setTimeout(function() {
          if (!self._interaction.isPanning && !self._interaction.isPinching) {
            self.crosshair.active = false;
          }
        }, 1500);
      } else {
        this.crosshair.active = false;
      }
    }
  };

  // ============================================================
  // PART 4: MOUSE DOWN
  // ============================================================
  QuotexChart.prototype._onMouseDown = function(e) {
    this._interaction.isPanning = true;
    this._interaction.moved = false;
    this._interaction.startX = e.clientX;
    this._interaction.startY = e.clientY;
    this._interaction.startOffsetX = this.viewport.offsetX;
    this._interaction.lastTouchX = e.clientX;

    var rect = this.canvas.getBoundingClientRect();
    this.crosshair.x = e.clientX - rect.left;
    this.crosshair.y = e.clientY - rect.top;
    this.crosshair.active = true;
  };

  // ============================================================
  // PART 4: MOUSE MOVE
  // ============================================================
  QuotexChart.prototype._onMouseMove = function(e) {
    var rect = this.canvas.getBoundingClientRect();
    this.crosshair.x = e.clientX - rect.left;
    this.crosshair.y = e.clientY - rect.top;
    this.crosshair.active = true;

    if (this._interaction.isPanning) {
      var dx = e.clientX - this._interaction.lastTouchX;
      if (Math.abs(dx) > 2) this._interaction.moved = true;

      var spacing = this.viewport.candleSpacing;
      var offsetDelta = -dx / spacing;
      this._applyPan(offsetDelta);

      this._interaction.lastTouchX = e.clientX;
    }
  };

  // ============================================================
  // PART 4: MOUSE UP
  // ============================================================
  QuotexChart.prototype._onMouseUp = function(e) {
    if (this._interaction.isPanning) {
      this._interaction.isPanning = false;
    }
  };

  // ============================================================
  // PART 4: TOUCH DISTANCE
  // ============================================================
  QuotexChart.prototype._getTouchDistance = function(t1, t2) {
    var dx = t2.clientX - t1.clientX;
    var dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ============================================================
  // PART 4: VERTICAL LINES (full height, gray)
  // ============================================================
  QuotexChart.prototype._drawVerticalLines = function() {
    if (!this.tradeVLines || this.tradeVLines.length === 0) return;

    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartTop = pad.top;
    var chartBottom = H - pad.bottom;
    var now = Date.now();

    for (var i = 0; i < this.tradeVLines.length; i++) {
      var v = this.tradeVLines[i];
      if (!v || typeof v.time !== 'number') continue;

      if (v.expiresAt && now > v.expiresAt) {
        this.tradeVLines.splice(i, 1);
        i--;
        continue;
      }

      var x = this._timeToX(v.time);
      if (x === null) continue;
      if (x < pad.left - 20 || x > W - pad.right + 20) continue;

      ctx.save();

      ctx.strokeStyle = v.color || COLORS.vlineBlue;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, chartTop);
      ctx.lineTo(Math.round(x) + 0.5, chartBottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      if (v.label) {
        ctx.font = 'bold 9px ' + this.options.fontFamily;
        var lw = ctx.measureText(v.label).width + 10;
        var lh = 14;
        var lx = Math.round(x) - lw / 2;
        var ly = chartTop + 4;

        if (lx < pad.left + 2) lx = pad.left + 2;
        if (lx + lw > W - pad.right - 2) lx = W - pad.right - lw - 2;

        ctx.fillStyle = v.color || COLORS.vlineBlue;
        ctx.fillRect(lx, ly, lw, lh);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(v.label, lx + lw / 2, ly + lh / 2 + 0.5);
      }

      ctx.restore();
    }
  };

// ============================================================
  // PART 4: TRADE ENTRY MARKER (QUOTEX EXACT — FINAL)
  // PART 4: TRADE ENTRY MARKER (QUOTEX EXACT — FINAL)
  // ============================================================
  QuotexChart.prototype._drawTradeEntry = function() {
    if (!this.tradeEntry) return;

    var entry = this.tradeEntry;
    if (!entry.time || typeof entry.price !== 'number') return;

    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;

    var entryX = this._timeToX(entry.time);
    var y = this._priceToY(entry.price);
    if (entryX === null || y === null) return;
    if (y < pad.top || y > H - pad.bottom) return;

    var isCall = entry.type === 'CALL';
    var color = isCall ? COLORS.entryGreen : COLORS.entryRed;

    ctx.save();

    // ============================================
    // 1. SHORT horizontal line — entry circle左右 মোট ~80px
    //    (Quotex exact: 40px left + 40px right)
    // ============================================
    var lineHalf = 40;
    var lineL = Math.max(pad.left + 2, entryX - lineHalf);
    var lineR = Math.min(pad.left + chartW - 2, entryX + lineHalf);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(Math.round(lineL), Math.round(y) + 0.5);
    ctx.lineTo(Math.round(lineR), Math.round(y) + 0.5);
    ctx.stroke();

    // ============================================
    // 2. ENTRY CIRCLE — white ring + colored center
    //    (Quotex exact: big white circle, colored inner dot)
    // ============================================
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(entryX, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(entryX, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // ============================================
    // 3. ↑ / ↓ ICON — dot এর ঠিক ডান পাশে (high quality)
    //    Quotex exact: small circle with arrow inside
    // ============================================
    var iconX = entryX + 14;
    var iconY = y;
    var iconR = 8;

    // Icon background circle (white)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.fill();

    // Icon colored border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.stroke();

    // Arrow inside icon
    var arrowSize = 4;
    ctx.fillStyle = color;
    ctx.beginPath();

    if (isCall) {
      // ↑ UP arrow (CALL)
      ctx.moveTo(iconX, iconY - arrowSize);                    // tip
      ctx.lineTo(iconX - arrowSize * 0.7, iconY + arrowSize * 0.5);
      ctx.lineTo(iconX + arrowSize * 0.7, iconY + arrowSize * 0.5);
    } else {
      // ↓ DOWN arrow (PUT)
      ctx.moveTo(iconX, iconY + arrowSize);                    // tip
      ctx.lineTo(iconX - arrowSize * 0.7, iconY - arrowSize * 0.5);
      ctx.lineTo(iconX + arrowSize * 0.7, iconY - arrowSize * 0.5);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // ============================================================
  // PART 4: RESULT MARKERS (WIN/LOSS)
  // ============================================================
  QuotexChart.prototype._drawResultMarkers = function() {
    if (!this.tradeResults || this.tradeResults.length === 0) return;

    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var now = Date.now();

    for (var i = 0; i < this.tradeResults.length; i++) {
      var r = this.tradeResults[i];
      if (!r || typeof r.time !== 'number') continue;

      var age = now - r.createdAt;
      if (age > 5000) {
        this.tradeResults.splice(i, 1);
        i--;
        continue;
      }

      var alpha = age > 4000 ? 1 - ((age - 4000) / 1000) : 1;
      if (alpha < 0) alpha = 0;

      var x = this._timeToX(r.time);
      var y = this._priceToY(r.price);
      if (x === null || y === null) continue;
      if (x < pad.left - 30 || x > W - pad.right + 30) continue;

      var isWin = r.result === 'WIN';
      var color = isWin ? COLORS.resultWin : COLORS.resultLoss;
      var text = (isWin ? '+' : '-') + '$' + Math.abs(r.amount || 0).toFixed(2);

      var boxY = isWin ? y - 40 : y + 40;

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.font = 'bold 12px ' + this.options.fontFamily;
      var tw = ctx.measureText(text).width + 16;
      var th = 22;
      var tx = x - tw / 2;
      var ty = boxY - th / 2;

      ctx.fillStyle = color;
      ctx.fillRect(tx, ty, tw, th);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, boxY + 1);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      if (isWin) {
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, boxY + th / 2);
      } else {
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x, boxY - th / 2);
      }
      ctx.stroke();

      ctx.restore();
    }
  };

  // ============================================================
  // PART 4: NOTIFY TIME RANGE
  // ============================================================
  QuotexChart.prototype._notifyTimeRange = function() {
    try {
      var vis = this._getVisibleCandles();
      if (!vis || vis.length === 0) return;
      var first = vis[0];
      var last = vis[vis.length - 1];
      if (!first || !last) return;
      var range = { from: first.time, to: last.time };
      for (var i = 0; i < this._timeRangeSubs.length; i++) {
        try { this._timeRangeSubs[i](range); } catch(e) {}
      }
    } catch(e) {}
  };

  QuotexChart.prototype.subscribeVisibleTimeRangeChange = function(cb) {
    if (typeof cb === 'function') this._timeRangeSubs.push(cb);
  };

  // ============================================================
  // PART 4: PUBLIC API — Trade markers
  // ============================================================
  QuotexChart.prototype.setTradeEntry = function(entry) {
    if (!entry || !entry.time || typeof entry.price !== 'number') {
      this.tradeEntry = null;
      return;
    }
    this.tradeEntry = {
      time: entry.time,
      price: entry.price,
      type: entry.type === 'PUT' ? 'PUT' : 'CALL',
      amount: entry.amount || 0
    };
  };

  QuotexChart.prototype.clearTradeEntry = function() {
    this.tradeEntry = null;
  };

  QuotexChart.prototype.addVerticalLine = function(opts) {
    if (!opts || typeof opts.time !== 'number') return null;
    if (!this.tradeVLines) this.tradeVLines = [];
    var vline = {
      time: opts.time,
      label: opts.label || '',
      color: opts.color || COLORS.vlineBlue,
      expiresAt: opts.expiresAt || null
    };
    this.tradeVLines.push(vline);
    return vline;
  };

  QuotexChart.prototype.clearVerticalLines = function() {
    this.tradeVLines = [];
  };

  QuotexChart.prototype.addResultMarker = function(opts) {
    if (!opts || typeof opts.time !== 'number') return null;
    if (!this.tradeResults) this.tradeResults = [];
    var marker = {
      time: opts.time,
      price: typeof opts.price === 'number' ? opts.price : 0,
      result: opts.result === 'LOSS' ? 'LOSS' : 'WIN',
      amount: opts.amount || 0,
      createdAt: Date.now()
    };
    this.tradeResults.push(marker);
    var self = this;
    setTimeout(function() {
      var idx = self.tradeResults.indexOf(marker);
      if (idx > -1) self.tradeResults.splice(idx, 1);
    }, 5100);
    return marker;
  };

  QuotexChart.prototype.clearResultMarkers = function() {
    this.tradeResults = [];
  };

  QuotexChart.prototype.clearAllTradeElements = function() {
    this.tradeEntry = null;
    this.tradeVLines = [];
    this.tradeResults = [];
  };

  QuotexChart.prototype.setTimeframe = function(tfMs) {
    this.timeframe = tfMs || 60000;
  };
  // ============================================================
  // PART 5: SET DATA
  // ============================================================
  QuotexChart.prototype.setData = function(data) {
    if (!Array.isArray(data)) return;

    var wasEmpty = this.candles.length === 0;

    this.candles = data.filter(function(c) {
      return c && typeof c.time === 'number' &&
             typeof c.open === 'number' &&
             typeof c.high === 'number' &&
             typeof c.low === 'number' &&
             typeof c.close === 'number' &&
             c.high >= c.low && c.open > 0 && c.close > 0;
    });

    this.candles.sort(function(a, b) { return a.time - b.time; });

    var seen = {};
    var unique = [];
    for (var i = 0; i < this.candles.length; i++) {
      var c = this.candles[i];
      if (!seen[c.time]) {
        seen[c.time] = true;
        unique.push(c);
      }
    }
    this.candles = unique;

    if (wasEmpty && this.candles.length > 0) {
      this.viewport.candleSpacing = this.options.candleSpacing;
      this.viewport.offsetX = Math.max(0, this.candles.length - this.options.visibleCandleCount);
    }

    if (this.viewport.candleSpacing < this.options.minCandleSpacing) {
      this.viewport.candleSpacing = this.options.minCandleSpacing;
    }
    if (this.viewport.candleSpacing > this.options.maxCandleSpacing) {
      this.viewport.candleSpacing = this.options.maxCandleSpacing;
    }

    this._visibleCache = null;
    this._visibleCacheKey = '';

    this._autoScale();
    this._notifyTimeRange();

    console.log('[ChartEngine] setData:', this.candles.length, 'candles');
  };

  // ============================================================
  // PART 5: UPDATE (live candle)
  // ============================================================
  QuotexChart.prototype.update = function(candle) {
    if (!candle || typeof candle.time !== 'number') return;

    var wasAtRightEdge = this._isAtRightEdge();

    if (this.candles.length === 0) {
      this.candles.push(candle);
    } else {
      var last = this.candles[this.candles.length - 1];
      if (!last) {
        this.candles.push(candle);
      } else if (candle.time === last.time) {
        this.candles[this.candles.length - 1] = candle;
      } else if (candle.time > last.time) {
        this.candles.push(candle);
      } else {
        var idx = this._findCandleIndex(candle.time);
        if (idx !== -1) this.candles[idx] = candle;
        return;
      }
    }

    if (wasAtRightEdge) {
      this.scrollToRealTime();
    }

    this._visibleCache = null;
    this._autoScale();
  };

  // ============================================================
  // PART 5: IS AT RIGHT EDGE
  // ============================================================
  QuotexChart.prototype._isAtRightEdge = function() {
    if (this.candles.length === 0) return true;
    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    var maxVisible = Math.ceil(chartW / spacing);
    var rightEdge = this.candles.length - maxVisible + this.options.rightOffsetCandles;
    return this.viewport.offsetX >= rightEdge - 2;
  };

  // ============================================================
  // PART 5: SCROLL TO REAL TIME
  // ============================================================
  QuotexChart.prototype.scrollToRealTime = function() {
    if (this.candles.length === 0) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    var maxVisible = Math.ceil(chartW / spacing);

    this.viewport.offsetX = Math.max(0, this.candles.length - maxVisible + this.options.rightOffsetCandles);
    this._visibleCache = null;
    this._autoScale();
    this._notifyTimeRange();
  };

  // ============================================================
  // PART 5: FIT CONTENT
  // ============================================================
  QuotexChart.prototype.fitContent = function() {
    if (this.candles.length === 0) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;

    var targetCount = Math.min(this.candles.length, Math.max(20, Math.floor(chartW / 6)));
    var spacing = chartW / targetCount;

    if (spacing < this.options.minCandleSpacing) spacing = this.options.minCandleSpacing;
    if (spacing > this.options.maxCandleSpacing) spacing = this.options.maxCandleSpacing;

    this.viewport.candleSpacing = spacing;
    this.viewport.offsetX = Math.max(0, this.candles.length - targetCount + this.options.rightOffsetCandles);
    this._visibleCache = null;
    this._autoScale();
    this._notifyTimeRange();
  };

  // ============================================================
  // PART 5: DRAW CROSSHAIR (dashed + labels)
  // ============================================================
  QuotexChart.prototype._drawCrosshair = function() {
    if (!this.options.showCrosshair) return;
    if (!this.crosshair || !this.crosshair.active) return;

    var x = this.crosshair.x;
    var y = this.crosshair.y;
    if (x < 0 || y < 0) return;

    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    if (x < pad.left || x > pad.left + chartW) return;
    if (y < pad.top || y > pad.top + chartH) return;

    ctx.save();

    // Vertical dashed line
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, pad.top);
    ctx.lineTo(Math.round(x) + 0.5, pad.top + chartH);
    ctx.stroke();

    // Horizontal dashed line
    ctx.beginPath();
    ctx.moveTo(pad.left, Math.round(y) + 0.5);
    ctx.lineTo(pad.left + chartW, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // PRICE LABEL
    var price = this._yToPrice(y);
    if (price !== null) {
      var priceText = formatPrice(price, this.options.priceDecimals);
      ctx.font = 'bold 11px ' + this.options.fontFamily;
      var pW = ctx.measureText(priceText).width + 12;
      var pH = 18;
      var pX = pad.left + chartW + 4;
      var pY = y - pH / 2;

      if (pY < pad.top) pY = pad.top;
      if (pY + pH > pad.top + chartH) pY = pad.top + chartH - pH;

      ctx.fillStyle = COLORS.crosshairLabel;
      ctx.fillRect(pX, pY, pW, pH);

      ctx.fillStyle = COLORS.crosshairLabelText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, pX + 6, pY + pH / 2 + 0.5);
    }

    // TIME LABEL
    var time = this._xToTime(x);
    if (time !== null) {
      var t = time;
      if (t < 1e10) t = t * 1000;
      var d = new Date(t);
      if (!isNaN(d.getTime())) {
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        var timeText = hh + ':' + mm;

        ctx.font = 'bold 11px ' + this.options.fontFamily;
        var tW = ctx.measureText(timeText).width + 12;
        var tH = 18;
        var tX = x - tW / 2;
        var tY = pad.top + chartH + 3;

        if (tX < pad.left) tX = pad.left;
        if (tX + tW > pad.left + chartW) tX = pad.left + chartW - tW;

        ctx.fillStyle = COLORS.crosshairLabel;
        ctx.fillRect(tX, tY, tW, tH);

        ctx.fillStyle = COLORS.crosshairLabelText;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeText, tX + tW / 2, tY + tH / 2 + 0.5);
      }
    }

    ctx.restore();
  };

  // ============================================================
  // PART 5: ADD CANDLESTICK SERIES (LWC compat)
  // ============================================================
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
          return c && typeof c.time === 'number' &&
                 typeof c.open === 'number' &&
                 typeof c.high === 'number' &&
                 typeof c.low === 'number' &&
                 typeof c.close === 'number';
        });
        self.setData(valid);
      },
      update: function(candle) {
        if (!candle || typeof candle.time !== 'number') return;
        self.update(candle);
      },
      data: function() {
        return self.candles.slice();
      },
      setMarkers: function(markers) {
        self._markers = markers || [];
      },
      createPriceLine: function(options) {
        var line = { options: options || {}, _isPriceLine: true };
        if (!self._priceLines) self._priceLines = [];
        self._priceLines.push(line);
        return line;
      },
      removePriceLine: function(line) {
        if (!self._priceLines) return;
        var idx = self._priceLines.indexOf(line);
        if (idx > -1) self._priceLines.splice(idx, 1);
      },
      priceToCoordinate: function(price) {
        return self._priceToY(price);
      },
      coordinateToPrice: function(y) {
        return self._yToPrice(y);
      },
      _priceLines: []
    };

    this.series = series;
    this.candleSeries = series;
    return series;
  };

  // ============================================================
  // PART 5: TIMESCALE (LWC compat)
  // ============================================================
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
      subscribeVisibleTimeRangeChange: function(cb) {
        self.subscribeVisibleTimeRangeChange(cb);
      },
      subscribeVisibleLogicalRangeChange: function(cb) {
        self.subscribeVisibleTimeRangeChange(cb);
      },
      applyOptions: function(opts) {
        if (!opts) return;
        if (typeof opts.width === 'number') self.options.width = opts.width;
        if (typeof opts.height === 'number') self.options.height = opts.height;
        self._resize();
      }
    };
  };

  // ============================================================
  // PART 5: APPLY OPTIONS (scroll preservation)
  // ============================================================
  QuotexChart.prototype.applyOptions = function(opts) {
    if (!opts) return;

    var savedOffset = this.viewport.offsetX;
    var savedSpacing = this.viewport.candleSpacing;

    if (typeof opts.width === 'number') this.options.width = opts.width;
    if (typeof opts.height === 'number') this.options.height = opts.height;

    if (opts.layout) {
      if (opts.layout.background && opts.layout.background.color) {
        COLORS.background = opts.layout.background.color;
      }
      if (opts.layout.textColor) {
        COLORS.textPrimary = opts.layout.textColor;
      }
    }

    this._resize();

    this.viewport.offsetX = savedOffset;
    this.viewport.candleSpacing = savedSpacing;
    this._visibleCache = null;
  };

  // ============================================================
  // PART 5: GET OPTIONS
  // ============================================================
  QuotexChart.prototype.getOptions = function() {
    return { width: this.options.width, height: this.options.height };
  };

  QuotexChart.prototype.options = function() {
    return { width: this.options.width, height: this.options.height };
  };

  // ============================================================
  // PART 5: GET TIME LABELS
  // ============================================================
  QuotexChart.prototype.getTimeLabels = function() {
    var range = this._getVisibleRange();
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;
    var offsetX = this.viewport.offsetX;
    var labels = [];

    for (var i = range.start; i < range.end; i++) {
      var candle = this.candles[i];
      if (!candle) continue;
      if ((i - range.start) % 3 !== 0) continue;

      var relativeIdx = i - offsetX;
      var x = pad.left + (relativeIdx + 0.5) * spacing;

      labels.push({
        time: candle.time,
        text: formatTime(candle.time),
        x: x
      });
    }

    return labels;
  };

  // ============================================================
  // PART 5: DESTROY
  // ============================================================
  QuotexChart.prototype.destroy = function() {
    this.clearAllTradeElements();
    this._stopRenderLoop();

    if (this._ro) {
      try { this._ro.disconnect(); } catch(e) {}
      this._ro = null;
    }

    if (this.container) this.container.innerHTML = '';
    console.log('[ChartEngine] Chart destroyed');
  };

  QuotexChart.prototype.remove = function() {
    this.destroy();
  };

  // ============================================================
  // PART 5: STUB (removed feature)
  // ============================================================
  QuotexChart.prototype._drawTimeBar = function() {
    // Removed — Quotex chart এ bottom red bar নেই
  };
})();
