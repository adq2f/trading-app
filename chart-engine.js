// ============================================================
// QUOTEX CLONE - CHART ENGINE v2
// Custom Canvas 2D Chart (Quotex-exact)
// Part 1: Foundation
// ============================================================

(function() {
  if (window.QuotexChart) {
    console.log('[ChartEngine] Already loaded');
    return;
  }

  console.log('[ChartEngine] Loading v2 Part 1...');

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
    resultLoss: '#ff3b30'
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
    priceDecimals: 2,
    visibleCandleCount: 60,
    rightOffsetCandles: 8
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

  function formatTime(timestamp) {
    var d = new Date(timestamp * 1000);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  window.chartFormatPrice = formatPrice;
  window.chartFormatTime = formatTime;

  function QuotexChart(container, options) {
    if (!container) {
      console.error('[ChartEngine] Container required');
      return;
    }

    this.container = container;
    this.options = mergeOptions(DEFAULT_OPTIONS, options || {});

    this.candles = [];
    this.crosshair = { x: -1, y: -1, active: false };
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
    var w = this.container.clientWidth;
    var h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
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
      this._resizeObserver = new ResizeObserver(function() {
        self._resize();
      });
      this._resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', function() {
        self._resize();
      });
    }
  };

  QuotexChart.prototype._startRenderLoop = function() {
    var self = this;
    function loop() {
      if (!self._running) return;
      self._render();
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

  QuotexChart.prototype._render = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    if (this.options.showGrid) this._drawGrid();
    if (this.options.showWatermark) this._drawWatermark();
  };

  QuotexChart.prototype._drawGrid = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;
    var pad = this.options.padding;

    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.setLineDash(this.options.gridDash);

    var hLines = this.options.gridHorizontalLines;
    for (var i = 0; i <= hLines; i++) {
      var y = Math.round(pad.top + (chartH / hLines) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();
    }

    var vLines = this.options.gridVerticalLines;
    for (var j = 0; j <= vLines; j++) {
      var x = Math.round(pad.left + (chartW / vLines) * j) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + chartH);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  QuotexChart.prototype._drawWatermark = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    ctx.save();
    ctx.fillStyle = COLORS.watermark;
    ctx.font = 'bold ' + Math.round(H * 0.2) + 'px ' + this.options.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.options.watermarkText, W / 2, H / 2);
    ctx.restore();
  };

  QuotexChart.prototype.setData = function(data) {
    if (!Array.isArray(data)) return;
    this.candles = data.slice();

    if (this.candles.length > this.options.visibleCandleCount) {
      this.viewport.offsetX = this.candles.length - this.options.visibleCandleCount;
    } else {
      this.viewport.offsetX = 0;
    }

    this._autoScale();
    this._notifyTimeRange();
  };

  QuotexChart.prototype.update = function(candle) {
    if (!candle || typeof candle.time !== 'number') return;

    if (this.candles.length === 0) {
      this.candles.push(candle);
    } else {
      var last = this.candles[this.candles.length - 1];
      if (candle.time === last.time) {
        this.candles[this.candles.length - 1] = candle;
      } else if (candle.time > last.time) {
        this.candles.push(candle);
      } else {
        return;
      }
    }

    this._autoScale();
  };

  QuotexChart.prototype._autoScale = function() {
    if (this.candles.length === 0) {
      this.viewport.minPrice = 0;
      this.viewport.maxPrice = 1;
      return;
    }

    var vis = this._getVisibleCandles();
    if (vis.length === 0) return;

    var min = Infinity, max = -Infinity;
    for (var i = 0; i < vis.length; i++) {
      if (vis[i].high > max) max = vis[i].high;
      if (vis[i].low < min) min = vis[i].low;
    }

    if (max === min) max = min + 1;

    var range = max - min;
    this.viewport.minPrice = min - range * 0.08;
    this.viewport.maxPrice = max + range * 0.08;
  };

  QuotexChart.prototype._getVisibleCandles = function() {
    var pad = this.options.padding;
    var W = this.options.width;
    var chartW = W - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;

    var maxVisible = Math.ceil(chartW / spacing);
    var start = Math.max(0, this.viewport.offsetX);
    var end = Math.min(this.candles.length, start + maxVisible + 1);

    return this.candles.slice(start, end);
  };

  QuotexChart.prototype.subscribeVisibleTimeRangeChange = function(cb) {
    if (typeof cb === 'function') {
      this._timeRangeSubs.push(cb);
    }
  };

  QuotexChart.prototype._notifyTimeRange = function() {
    var vis = this._getVisibleCandles();
    if (vis.length === 0) return;
    var range = { from: vis[0].time, to: vis[vis.length - 1].time };
    for (var i = 0; i < this._timeRangeSubs.length; i++) {
      try { this._timeRangeSubs[i](range); } catch (e) {}
    }
  };

  QuotexChart.prototype.destroy = function() {
    this._stopRenderLoop();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.container) this.container.innerHTML = '';
    console.log('[ChartEngine] Chart destroyed');
  };

  window.QuotexChart = QuotexChart;

  console.log('[ChartEngine] Part 1 loaded (Foundation)');
  console.log('[ChartEngine] Next: Part 2 - Candle Rendering');
  // ==========================================================
  // PART 2: CANDLE RENDERING + PRICE SCALE + TIME SCALE
  // ==========================================================

  // ----- DRAW CANDLES -----

  QuotexChart.prototype._drawCandles = function() {
    var ctx = this.ctx;
    var vis = this._getVisibleCandles();
    if (vis.length === 0) return;

    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var spacing = this.viewport.candleSpacing;
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
      var xCenter = pad.left + (i + 0.5) * spacing;

      var openY = priceToY(c.open);
      var closeY = priceToY(c.close);
      var highY = priceToY(c.high);
      var lowY = priceToY(c.low);

      var isGreen = c.close >= c.open;
      var bodyColor = isGreen ? COLORS.candleGreen : COLORS.candleRed;
      var bodyBorder = isGreen ? COLORS.candleGreenBorder : COLORS.candleRedBorder;
      var wickColor = isGreen ? COLORS.candleGreenWick : COLORS.candleRedWick;

      // Wick
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

      var bodyLeft = xCenter - candleW / 2;
      var bodyWidth = candleW;

      // Fill
      ctx.fillStyle = bodyColor;
      ctx.fillRect(
        Math.round(bodyLeft),
        Math.round(bodyTop),
        Math.round(bodyWidth),
        Math.round(bodyHeight)
      );

      // Border (thin outline for sharp look)
      ctx.strokeStyle = bodyBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(bodyLeft) + 0.5,
        Math.round(bodyTop) + 0.5,
        Math.round(bodyWidth) - 1,
        Math.round(bodyHeight) - 1
      );
    }
  };

  // ----- DRAW PRICE SCALE -----

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

    // Price labels
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

    // Current price highlight
    if (this.candles.length > 0) {
      var last = this.candles[this.candles.length - 1];
      var currentPrice = last.close;
      var currentY = pad.top + chartH - ((currentPrice - priceMin) / priceRange) * chartH;

      if (currentY >= pad.top && currentY <= pad.top + chartH) {
        var isGreen = last.close >= last.open;
        var highlightColor = isGreen ? COLORS.candleGreen : COLORS.candleRed;

        // Background box
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

        // Dashed horizontal line at current price
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

  // ----- DRAW TIME SCALE -----

  QuotexChart.prototype._drawTimeScale = function() {
    var ctx = this.ctx;
    var pad = this.options.padding;
    var W = this.options.width;
    var H = this.options.height;
    var chartW = W - pad.left - pad.right;
    var chartH = H - pad.top - pad.bottom;

    var vis = this._getVisibleCandles();
    if (vis.length === 0) return;

    var spacing = this.viewport.candleSpacing;

    // Show time label every N candles
    var labelEvery = 3;
    if (spacing < 5) labelEvery = 5;
    if (spacing < 3) labelEvery = 8;
    if (spacing > 12) labelEvery = 1;
    if (spacing > 20) labelEvery = 1;

    var timeY = pad.top + chartH + 16;

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = this.options.fontSizeTime + 'px ' + this.options.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var start = Math.max(0, this.viewport.offsetX);
    var maxVisible = Math.ceil(chartW / spacing);

    for (var i = 0; i < maxVisible; i++) {
      var idx = start + i;
      if (idx >= this.candles.length) break;

      if (i % labelEvery !== 0) continue;

      var c = this.candles[idx];
      var xCenter = pad.left + (i + 0.5) * spacing;

      if (xCenter > pad.left + chartW - 15) continue;

      ctx.fillStyle = COLORS.textSecondary;
      ctx.fillText(formatTime(c.time), xCenter, timeY);
    }

    // Current time highlight
    if (vis.length > 0) {
      var lastIdx = start + vis.length - 1;
      var lastCandle = this.candles[lastIdx];
      var lastX = pad.left + (vis.length - 0.5) * spacing;

      if (lastX < pad.left + chartW - 15) {
        var bgW = 40;
        var bgH = 18;
        ctx.fillStyle = 'rgba(0, 192, 118, 0.15)';
        ctx.fillRect(lastX - bgW / 2, timeY - bgH / 2, bgW, bgH);

        ctx.fillStyle = COLORS.candleGreen;
        ctx.font = 'bold ' + this.options.fontSizeTime + 'px ' + this.options.fontFamily;
        ctx.fillText(formatTime(lastCandle.time), lastX, timeY);
      }
    }
  };

  // ----- OVERRIDE RENDER (add candles + scales) -----

  QuotexChart.prototype._render = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    // Clear background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    // Draw order (bottom to top):
    if (this.options.showGrid) this._drawGrid();
    this._drawCandles();
    if (this.options.showWatermark) this._drawWatermark();
    this._drawPriceScale();
    this._drawTimeScale();
  };

  console.log('[ChartEngine] Part 2 loaded (Candles + Price + Time)');
  // ==========================================================
  // PART 3A: COORDINATE SYSTEM (Critical for Stability)
  // ==========================================================
  // Data (time, price) <-> Screen (x, y) conversions
  // Used by ALL drawing methods for stable rendering

  // ----- TIME TO X (screen coordinate) -----

  QuotexChart.prototype._timeToX = function(time) {
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;

    // Find candle index by time
    var idx = this._findCandleIndex(time);
    if (idx === -1) return null;

    // Calculate X position
    var relativeIdx = idx - this.viewport.offsetX;
    var x = pad.left + (relativeIdx + 0.5) * spacing;

    return x;
  };

  // ----- PRICE TO Y (screen coordinate) -----

  QuotexChart.prototype._priceToY = function(price) {
    var pad = this.options.padding;
    var H = this.options.height;
    var chartH = H - pad.top - pad.bottom;

    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;

    if (priceRange <= 0) return null;

    var y = pad.top + chartH - ((price - priceMin) / priceRange) * chartH;
    return y;
  };

  // ----- X TO TIME (reverse conversion) -----

  QuotexChart.prototype._xToTime = function(x) {
    var pad = this.options.padding;
    var spacing = this.viewport.candleSpacing;

    var relativeIdx = (x - pad.left) / spacing - 0.5;
    var idx = Math.round(this.viewport.offsetX + relativeIdx);

    if (idx < 0 || idx >= this.candles.length) return null;
    return this.candles[idx].time;
  };

  // ----- Y TO PRICE (reverse conversion) -----

  QuotexChart.prototype._yToPrice = function(y) {
    var pad = this.options.padding;
    var H = this.options.height;
    var chartH = H - pad.top - pad.bottom;

    var priceMin = this.viewport.minPrice;
    var priceMax = this.viewport.maxPrice;
    var priceRange = priceMax - priceMin;

    if (priceRange <= 0) return null;

    var price = priceMax - ((y - pad.top) / chartH) * priceRange;
    return price;
  };

  // ----- FIND CANDLE INDEX BY TIME -----

  QuotexChart.prototype._findCandleIndex = function(time) {
    if (this.candles.length === 0) return -1;

    // Binary search for O(log n)
    var low = 0;
    var high = this.candles.length - 1;

    while (low <= high) {
      var mid = Math.floor((low + high) / 2);
      if (this.candles[mid].time === time) return mid;
      if (this.candles[mid].time < time) low = mid + 1;
      else high = mid - 1;
    }

    // Not exact — return closest
    if (high < 0) return 0;
    if (low >= this.candles.length) return this.candles.length - 1;

    var dLow = Math.abs(this.candles[low].time - time);
    var dHigh = Math.abs(this.candles[high].time - time);

    return dLow < dHigh ? low : high;
  };

  // ----- FIND CANDLE BY TIME (returns candle object) -----

  QuotexChart.prototype._findCandleByTime = function(time) {
    var idx = this._findCandleIndex(time);
    if (idx === -1) return null;
    return this.candles[idx];
  };

  console.log('[ChartEngine] Part 3A loaded (Coordinate System)');
  // ==========================================================
  // PART 3B: PAN + ZOOM + INTERACTION
  // ==========================================================

  // ----- OVERRIDE BIND EVENTS (add interaction) -----

  QuotexChart.prototype._bindEvents = function() {
    var self = this;

    // Resize observer
    if (window.ResizeObserver) {
      this._resizeObserver = new ResizeObserver(function() {
        self._resize();
      });
      this._resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', function() {
        self._resize();
      });
    }

    // ===== INTERACTION STATE =====
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
      moved: false
    };

    var canvas = this.canvas;

    // ===== TOUCH EVENTS =====
    canvas.addEventListener('touchstart', function(e) {
      self._onTouchStart(e);
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      self._onTouchMove(e);
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      self._onTouchEnd(e);
    }, { passive: false });

    // ===== MOUSE EVENTS =====
    canvas.addEventListener('mousedown', function(e) {
      self._onMouseDown(e);
    });

    canvas.addEventListener('mousemove', function(e) {
      self._onMouseMove(e);
    });

    canvas.addEventListener('mouseup', function(e) {
      self._onMouseUp(e);
    });

    canvas.addEventListener('mouseleave', function(e) {
      self._onMouseUp(e);
    });

    // ===== WHEEL (ZOOM) =====
    canvas.addEventListener('wheel', function(e) {
      self._onWheel(e);
    }, { passive: false });
  };

  // ==========================================================
  // TOUCH HANDLERS
  // ==========================================================

  QuotexChart.prototype._onTouchStart = function(e) {
    e.preventDefault();

    var t = e.touches;

    if (t.length === 1) {
      // Single touch → pan start
      this._interaction.isPanning = true;
      this._interaction.moved = false;
      this._interaction.startX = t[0].clientX;
      this._interaction.startY = t[0].clientY;
      this._interaction.startOffsetX = this.viewport.offsetX;
      this._interaction.lastTouchX = t[0].clientX;
      this._interaction.lastTouchY = t[0].clientY;

      // Crosshair active
      var rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = t[0].clientX - rect.left;
      this.crosshair.y = t[0].clientY - rect.top;
      this.crosshair.active = true;

    } else if (t.length === 2) {
      // Two fingers → pinch start
      this._interaction.isPinching = true;
      this._interaction.isPanning = false;
      this._interaction.startDistance = this._getTouchDistance(t[0], t[1]);
      this._interaction.startSpacing = this.viewport.candleSpacing;
      this._interaction.startOffsetX = this.viewport.offsetX;

      // Midpoint for zoom center
      var midX = (t[0].clientX + t[1].clientX) / 2;
      this._interaction.startX = midX;
    }
  };

  QuotexChart.prototype._onTouchMove = function(e) {
    e.preventDefault();

    var t = e.touches;

    if (t.length === 1 && this._interaction.isPanning) {
      // Pan
      var dx = t[0].clientX - this._interaction.lastTouchX;

      if (Math.abs(dx) > 2) {
        this._interaction.moved = true;
      }

      var spacing = this.viewport.candleSpacing;
      var offsetDelta = -dx / spacing;

      this._applyPan(offsetDelta);

      this._interaction.lastTouchX = t[0].clientX;

      // Crosshair update
      var rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = t[0].clientX - rect.left;
      this.crosshair.y = t[0].clientY - rect.top;
      this.crosshair.active = true;

    } else if (t.length === 2 && this._interaction.isPinching) {
      // Pinch zoom
      var distance = this._getTouchDistance(t[0], t[1]);
      var ratio = distance / this._interaction.startDistance;

      var newSpacing = this._interaction.startSpacing * ratio;
      this._applyZoom(newSpacing, this._interaction.startX);
    }
  };

  QuotexChart.prototype._onTouchEnd = function(e) {
    e.preventDefault();

    if (e.touches.length === 0) {
      // All touches ended
      this._interaction.isPanning = false;
      this._interaction.isPinching = false;

      // Deactivate crosshair after short delay
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

  // ==========================================================
  // MOUSE HANDLERS
  // ==========================================================

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

  QuotexChart.prototype._onMouseMove = function(e) {
    // Update crosshair always
    var rect = this.canvas.getBoundingClientRect();
    this.crosshair.x = e.clientX - rect.left;
    this.crosshair.y = e.clientY - rect.top;
    this.crosshair.active = true;

    if (this._interaction.isPanning) {
      var dx = e.clientX - this._interaction.lastTouchX;

      if (Math.abs(dx) > 2) {
        this._interaction.moved = true;
      }

      var spacing = this.viewport.candleSpacing;
      var offsetDelta = -dx / spacing;
      this._applyPan(offsetDelta);

      this._interaction.lastTouchX = e.clientX;
    }
  };

  QuotexChart.prototype._onMouseUp = function(e) {
    if (this._interaction.isPanning) {
      this._interaction.isPanning = false;
    }
  };

  // ==========================================================
  // WHEEL (ZOOM)
  // ==========================================================

  QuotexChart.prototype._onWheel = function(e) {
    e.preventDefault();

    var delta = e.deltaY > 0 ? -0.1 : 0.1;
    var currentSpacing = this.viewport.candleSpacing;
    var newSpacing = currentSpacing * (1 + delta);

    var rect = this.canvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;

    this._applyZoom(newSpacing, mouseX);
  };

  // ==========================================================
  // PAN / ZOOM LOGIC
  // ==========================================================

  QuotexChart.prototype._applyPan = function(offsetDelta) {
    var newOffset = this.viewport.offsetX + offsetDelta;

    // Clamp to valid range
    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    var maxVisible = Math.ceil(chartW / spacing);
    var minOffset = -maxVisible / 2;
    var maxOffset = Math.max(0, this.candles.length - maxVisible / 2);

    if (newOffset < minOffset) newOffset = minOffset;
    if (newOffset > maxOffset) newOffset = maxOffset;

    this.viewport.offsetX = newOffset;

    this._autoScale();
    this._notifyTimeRange();
  };

  QuotexChart.prototype._applyZoom = function(newSpacing, anchorX) {
    // Clamp spacing
    if (newSpacing < this.options.minCandleSpacing) newSpacing = this.options.minCandleSpacing;
    if (newSpacing > this.options.maxCandleSpacing) newSpacing = this.options.maxCandleSpacing;

    var oldSpacing = this.viewport.candleSpacing;

    // Adjust offset so zoom feels natural around anchor
    var pad = this.options.padding;

    if (anchorX !== undefined && oldSpacing > 0) {
      // Calculate which candle is at anchorX
      var relativeIdx = (anchorX - pad.left) / oldSpacing;
      var anchorCandleIdx = this.viewport.offsetX + relativeIdx;

      // Set new spacing
      this.viewport.candleSpacing = newSpacing;

      // Recompute offset to keep anchor candle at same x
      var newRelativeIdx = (anchorX - pad.left) / newSpacing;
      this.viewport.offsetX = anchorCandleIdx - newRelativeIdx;
    } else {
      this.viewport.candleSpacing = newSpacing;
    }

    // Clamp offset
    var chartW = this.options.width - pad.left - pad.right;
    var maxVisible = Math.ceil(chartW / newSpacing);

    if (this.viewport.offsetX < -maxVisible / 2) {
      this.viewport.offsetX = -maxVisible / 2;
    }
    if (this.viewport.offsetX > this.candles.length) {
      this.viewport.offsetX = Math.max(0, this.candles.length - maxVisible / 2);
    }

    this._autoScale();
    this._notifyTimeRange();
  };

  // ==========================================================
  // UTILITY: TOUCH DISTANCE
  // ==========================================================

  QuotexChart.prototype._getTouchDistance = function(t1, t2) {
    var dx = t2.clientX - t1.clientX;
    var dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ==========================================================
  // PUBLIC: FIT CONTENT (auto-fit all candles)
  // ==========================================================

  QuotexChart.prototype.fitContent = function() {
    if (this.candles.length === 0) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;

    // Fit all candles but cap at 100
    var count = Math.min(this.candles.length, 100);
    var spacing = chartW / count;

    if (spacing < this.options.minCandleSpacing) spacing = this.options.minCandleSpacing;
    if (spacing > this.options.maxCandleSpacing) spacing = this.options.maxCandleSpacing;

    this.viewport.candleSpacing = spacing;
    this.viewport.offsetX = Math.max(0, this.candles.length - count);

    this._autoScale();
    this._notifyTimeRange();
  };

  // ==========================================================
  // PUBLIC: SCROLL TO END (right side)
  // ==========================================================

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

  // Update options (add min/max spacing)
  var _origMergeOptions = mergeOptions;
  // Add defaults to DEFAULT_OPTIONS if not present
  if (typeof DEFAULT_OPTIONS.minCandleSpacing === 'undefined') {
    DEFAULT_OPTIONS.minCandleSpacing = 2;
  }
  if (typeof DEFAULT_OPTIONS.maxCandleSpacing === 'undefined') {
    DEFAULT_OPTIONS.maxCandleSpacing = 30;
  }

  console.log('[ChartEngine] Part 3B loaded (Pan + Zoom + Interaction)');
  // ==========================================================
  // PART 3C: PERFORMANCE FIX + ZOOM BUG FIX
  // ==========================================================

  // ----- FIX 1: Better zoom with clamping + smooth -----

  QuotexChart.prototype._applyZoom = function(newSpacing, anchorX) {
    // Clamp spacing (2px min, 30px max)
    if (newSpacing < 2) newSpacing = 2;
    if (newSpacing > 30) newSpacing = 30;

    var oldSpacing = this.viewport.candleSpacing;

    // No change? skip
    if (Math.abs(newSpacing - oldSpacing) < 0.1) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;

    // Default anchor: right side (real-time area)
    if (anchorX === undefined || anchorX === null) {
      anchorX = pad.left + chartW * 0.8;
    }

    // Which candle is under anchor?
    var relativeIdx = (anchorX - pad.left) / oldSpacing;
    var anchorCandleIdx = this.viewport.offsetX + relativeIdx;

    // Apply new spacing
    this.viewport.candleSpacing = newSpacing;

    // Recompute offset to keep anchor candle at same X
    var newRelativeIdx = (anchorX - pad.left) / newSpacing;
    var newOffset = anchorCandleIdx - newRelativeIdx;

    // ==== CLAMP OFFSET (FIX "back করে দেয়") ====
    var maxVisible = Math.ceil(chartW / newSpacing);

    // Minimum: allow scroll back so last candle can be at right edge
    var minOffset = -maxVisible * 0.5;

    // Maximum: allow scroll forward to show latest candle + right offset
    var maxOffset = Math.max(0, this.candles.length - maxVisible + this.options.rightOffsetCandles);

    // When fully zoomed out, keep at least a few candles visible
    if (this.candles.length <= maxVisible) {
      // All candles visible — pin to left
      newOffset = -Math.floor((maxVisible - this.candles.length) / 2);
    } else {
      // Clamp
      if (newOffset < minOffset) newOffset = minOffset;
      if (newOffset > maxOffset) newOffset = maxOffset;
    }

    // If offset barely changed, skip work
    if (Math.abs(newOffset - this.viewport.offsetX) < 0.01 &&
        Math.abs(newSpacing - oldSpacing) < 0.01) {
      return;
    }

    this.viewport.offsetX = newOffset;

    // Throttle: only autoScale if spacing changed significantly
    if (Math.abs(newSpacing - oldSpacing) > 0.3) {
      this._autoScale();
      this._notifyTimeRange();
    }
  };

  // ----- FIX 2: Better pan clamping -----

  QuotexChart.prototype._applyPan = function(offsetDelta) {
    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;
    var maxVisible = Math.ceil(chartW / spacing);

    var newOffset = this.viewport.offsetX + offsetDelta;

    // Clamp
    var minOffset = -maxVisible * 0.5;
    var maxOffset = Math.max(0, this.candles.length - maxVisible + this.options.rightOffsetCandles);

    if (this.candles.length <= maxVisible) {
      // All visible — pin to center
      newOffset = -Math.floor((maxVisible - this.candles.length) / 2);
    } else {
      if (newOffset < minOffset) newOffset = minOffset;
      if (newOffset > maxOffset) newOffset = maxOffset;
    }

    if (Math.abs(newOffset - this.viewport.offsetX) < 0.001) return;

    this.viewport.offsetX = newOffset;

    // Note: do NOT autoScale on pan (only zoom should)
    this._notifyTimeRange();
  };

  // ----- FIX 3: Throttled render loop (performance) -----

  QuotexChart.prototype._startRenderLoop = function() {
    var self = this;
    var lastRenderTime = 0;
    var FRAME_INTERVAL = 1000 / 60;  // 60 FPS

    function loop(timestamp) {
      if (!self._running) return;

      // Only render if enough time passed
      if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
        lastRenderTime = timestamp;
        try {
          self._render();
        } catch (e) {
          console.error('[ChartEngine] Render error:', e.message);
        }
      }

      self._rafId = requestAnimationFrame(loop);
    }

    this._rafId = requestAnimationFrame(loop);
  };

  // ----- FIX 4: Cache visible candles per frame -----

  QuotexChart.prototype._getVisibleCandles = function() {
    // Use cached value if same frame
    var now = performance.now();
    if (this._lastVisCache &&
        this._lastVisCacheTime &&
        now - this._lastVisCacheTime < 16 &&
        this._lastVisCacheOffset === this.viewport.offsetX &&
        this._lastVisCacheSpacing === this.viewport.candleSpacing) {
      return this._lastVisCache;
    }

    var pad = this.options.padding;
    var W = this.options.width;
    var chartW = W - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;

    var maxVisible = Math.ceil(chartW / spacing) + 2;
    var start = Math.max(0, Math.floor(this.viewport.offsetX));
    var end = Math.min(this.candles.length, start + maxVisible + 1);

    var result = this.candles.slice(start, end);

    // Cache
    this._lastVisCache = result;
    this._lastVisCacheTime = now;
    this._lastVisCacheOffset = this.viewport.offsetX;
    this._lastVisCacheSpacing = this.viewport.candleSpacing;

    return result;
  };

  // ----- FIX 5: Faster wheel zoom (smooth, not jumpy) -----

  QuotexChart.prototype._onWheel = function(e) {
    e.preventDefault();

    // Smaller step for smooth zoom
    var step = e.deltaMode === 1 ? 0.05 : 0.02;
    var delta = e.deltaY > 0 ? -step : step;

    var currentSpacing = this.viewport.candleSpacing;
    var newSpacing = currentSpacing * (1 + delta);

    // Clamp immediate
    if (newSpacing < 2) newSpacing = 2;
    if (newSpacing > 30) newSpacing = 30;

    var rect = this.canvas.getBoundingClientRect();
    var mouseX = e.clientX - rect.left;

    this._applyZoom(newSpacing, mouseX);
  };

  // ----- FIX 6: Fit content (smooth) -----

  QuotexChart.prototype.fitContent = function() {
    if (this.candles.length === 0) return;

    var pad = this.options.padding;
    var chartW = this.options.width - pad.left - pad.right;

    // Fit visible candles but keep min 20 visible
    var targetCount = Math.min(this.candles.length, Math.max(20, Math.floor(chartW / 6)));
    var spacing = chartW / targetCount;

    if (spacing < 2) spacing = 2;
    if (spacing > 30) spacing = 30;

    this.viewport.candleSpacing = spacing;
    this.viewport.offsetX = Math.max(0, this.candles.length - targetCount + this.options.rightOffsetCandles);

    this._autoScale();
    this._notifyTimeRange();
  };

  // ----- FIX 7: Real-time scroll (right edge) -----

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

  console.log('[ChartEngine] Part 3C loaded (Performance + Zoom Fix)');
  // ==========================================================
  // PART 3D: BUG FIX (Line 538 Error)
  // Fix: "Cannot read properties of undefined (reading 'time')"
  // ==========================================================

  // ----- FIXED _autoScale (guards against empty/undefined) -----

  QuotexChart.prototype._autoScale = function() {
    if (!this.candles || this.candles.length === 0) {
      this.viewport.minPrice = 0;
      this.viewport.maxPrice = 1;
      return;
    }

    var vis = this._getVisibleCandles();
    if (!vis || vis.length === 0) {
      // Fallback: use last 20 candles
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

    if (max === min) max = min + 1;

    var range = max - min;
    this.viewport.minPrice = min - range * 0.08;
    this.viewport.maxPrice = max + range * 0.08;
  };

  // ----- FIXED _notifyTimeRange (guards) -----

  QuotexChart.prototype._notifyTimeRange = function() {
    try {
      var vis = this._getVisibleCandles();
      if (!vis || vis.length === 0) return;

      var firstCandle = vis[0];
      var lastCandle = vis[vis.length - 1];
      if (!firstCandle || !lastCandle) return;

      var range = { from: firstCandle.time, to: lastCandle.time };
      for (var i = 0; i < this._timeRangeSubs.length; i++) {
        try { this._timeRangeSubs[i](range); } catch (e) {}
      }
    } catch (e) {
      console.warn('[ChartEngine] _notifyTimeRange error:', e.message);
    }
  };

  // ----- FIXED _getVisibleCandles (no undefined) -----

  QuotexChart.prototype._getVisibleCandles = function() {
    // Cache
    var now = performance.now();
    if (this._lastVisCache &&
        this._lastVisCacheTime &&
        now - this._lastVisCacheTime < 16 &&
        this._lastVisCacheOffset === this.viewport.offsetX &&
        this._lastVisCacheSpacing === this.viewport.candleSpacing) {
      return this._lastVisCache;
    }

    if (!this.candles || this.candles.length === 0) {
      return [];
    }

    var pad = this.options.padding;
    var W = this.options.width;
    var chartW = W - pad.left - pad.right;
    var spacing = this.viewport.candleSpacing;

    if (spacing <= 0) spacing = 6;

    var maxVisible = Math.ceil(chartW / spacing) + 2;

    // Safe offset
    var offset = this.viewport.offsetX;
    if (isNaN(offset)) offset = 0;
    if (offset < 0) offset = 0;

    var start = Math.floor(offset);
    if (start < 0) start = 0;
    if (start >= this.candles.length) start = Math.max(0, this.candles.length - maxVisible);

    var end = Math.min(this.candles.length, start + maxVisible + 1);

    // Safe slice
    var result = [];
    for (var i = start; i < end; i++) {
      if (this.candles[i]) {
        result.push(this.candles[i]);
      }
    }

    // Cache
    this._lastVisCache = result;
    this._lastVisCacheTime = now;
    this._lastVisCacheOffset = this.viewport.offsetX;
    this._lastVisCacheSpacing = this.viewport.candleSpacing;

    return result;
  };

  // ----- FIXED _drawCandles (guards) -----

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

      // Wick
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

      var bodyLeft = xCenter - candleW / 2;
      var bodyWidth = candleW;

      // Fill
      ctx.fillStyle = bodyColor;
      ctx.fillRect(
        Math.round(bodyLeft),
        Math.round(bodyTop),
        Math.round(bodyWidth),
        Math.round(bodyHeight)
      );

      // Border
      ctx.strokeStyle = bodyBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(bodyLeft) + 0.5,
        Math.round(bodyTop) + 0.5,
        Math.round(bodyWidth) - 1,
        Math.round(bodyHeight) - 1
      );
    }
  };

  // ----- FIXED _drawTimeScale (guards) -----

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

    var labelEvery = 3;
    if (spacing < 5) labelEvery = 5;
    if (spacing < 3) labelEvery = 8;
    if (spacing > 12) labelEvery = 1;
    if (spacing > 20) labelEvery = 1;

    var timeY = pad.top + chartH + 16;

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = this.options.fontSizeTime + 'px ' + this.options.fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var start = Math.max(0, Math.floor(this.viewport.offsetX));
    var maxVisible = Math.ceil(chartW / spacing);

    for (var i = 0; i < maxVisible; i++) {
      var idx = start + i;
      if (idx >= this.candles.length) break;

      if (i % labelEvery !== 0) continue;

      var c = this.candles[idx];
      if (!c || typeof c.time !== 'number') continue;

      var xCenter = pad.left + (i + 0.5) * spacing;

      if (xCenter > pad.left + chartW - 15) continue;

      ctx.fillStyle = COLORS.textSecondary;
      ctx.fillText(formatTime(c.time), xCenter, timeY);
    }

    // Current time highlight
    if (vis.length > 0) {
      var lastCandle = vis[vis.length - 1];
      if (!lastCandle) return;

      var lastX = pad.left + (vis.length - 0.5) * spacing;

      if (lastX < pad.left + chartW - 15) {
        var bgW = 40;
        var bgH = 18;
        ctx.fillStyle = 'rgba(0, 192, 118, 0.15)';
        ctx.fillRect(lastX - bgW / 2, timeY - bgH / 2, bgW, bgH);

        ctx.fillStyle = COLORS.candleGreen;
        ctx.font = 'bold ' + this.options.fontSizeTime + 'px ' + this.options.fontFamily;
        ctx.fillText(formatTime(lastCandle.time), lastX, timeY);
      }
    }
  };

  // ----- FIXED _drawPriceScale (guards) -----

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
        ctx.fillRect(
          pad.left + chartW + 4,
          currentY - boxH / 2,
          W - (pad.left + chartW) - 6,
          boxH
        );

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + this.options.fontSizePrice + 'px ' + this.options.fontFamily;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          formatPrice(currentPrice, this.options.priceDecimals),
          pad.left + chartW + 8,
          currentY
        );

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

  // ----- IMPROVED RENDER (with error guards) -----

  QuotexChart.prototype._render = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    if (W <= 0 || H <= 0) return;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    // Draw sequence
    try {
      if (this.options.showGrid) this._drawGrid();
    } catch (e) { console.warn('[Chart] Grid:', e.message); }

    try {
      this._drawCandles();
    } catch (e) { console.warn('[Chart] Candles:', e.message); }

    try {
      if (this.options.showWatermark) this._drawWatermark();
    } catch (e) { console.warn('[Chart] Watermark:', e.message); }

    try {
      this._drawPriceScale();
    } catch (e) { console.warn('[Chart] PriceScale:', e.message); }

    try {
      this._drawTimeScale();
    } catch (e) { console.warn('[Chart] TimeScale:', e.message); }
  };

  // ----- BETTER setData (guards) -----

  QuotexChart.prototype.setData = function(data) {
    if (!Array.isArray(data)) {
      console.warn('[ChartEngine] setData: not array');
      return;
    }

    // Filter valid candles
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

  // ----- BETTER update (guards) -----

  QuotexChart.prototype.update = function(candle) {
    if (!candle || typeof candle.time !== 'number') return;

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
        return;
      }
    }

    this._autoScale();
  };

  console.log('[ChartEngine] Part 3D loaded (Bug Fix)');
})();
