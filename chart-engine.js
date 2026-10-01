// ============================================================
// QUOTEX CLONE — CHART ENGINE v2
// Custom Canvas 2D Chart (100% Quotex-exact)
// Part 1: Foundation
// ============================================================

(function() {
  if (window.QuotexChart) {
    console.log('[ChartEngine] Already loaded');
    return;
  }

  console.log('[ChartEngine] Loading v2 Part 1...');

  // ==========================================================
  // COLORS — Quotex exact
  // ==========================================================

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

  // ==========================================================
  // DEFAULT OPTIONS
  // ==========================================================

  var DEFAULT_OPTIONS = {
    width: 0,
    height: 0,
    padding: {
      top: 25,
      right: 65,
      bottom: 30,
      left: 8
    },
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

  // ==========================================================
  // UTILITY
  // ==========================================================

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

  // ==========================================================
  // QUOTEXCHART CLASS
  // ==========================================================

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

    // Canvas
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

  // ==========================================================
  // RESIZE
  // ==========================================================

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

  // ==========================================================
  // BIND EVENTS
  // ==========================================================

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

  // ==========================================================
  // RENDER LOOP
  // ==========================================================

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

  // ==========================================================
  // RENDER
  // ==========================================================

  QuotexChart.prototype._render = function() {
    var ctx = this.ctx;
    var W = this.options.width;
    var H = this.options.height;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    if (this.options.showGrid) this._drawGrid();
    if (this.options.showWatermark) this._drawWatermark();
  };

  // ==========================================================
  // GRID
  // ==========================================================

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

  // ==========================================================
  // WATERMARK
  // ==========================================================

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

  // ==========================================================
  // PUBLIC API — setData
  // ==========================================================

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

  // ==========================================================
  // PUBLIC API — update
  // ==========================================================

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

  // ==========================================================
  // AUTO SCALE
  // ==========================================================

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

  // ==========================================================
  // GET VISIBLE CANDLES
  // ==========================================================

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

  // ==========================================================
  // SUBSCRIBERS
  // ==========================================================

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

  // ==========================================================
  // DESTROY
  // ==========================================================

  QuotexChart.prototype.destroy = function() {
    this._stopRenderLoop();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.container) this.container.innerHTML = '';
    console.log('[ChartEngine] Chart destroyed');
  };

  // ==========================================================
  // EXPOSE
  // ==========================================================

  window.QuotexChart = QuotexChart;

  console.log('[ChartEngine] ✅ Part 1 loaded (Foundation)');
  console.log('[ChartEngine] Next: Part 2 — Candle Rendering');

})();
