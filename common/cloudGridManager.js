(function(root) {
  function seededRandom(seedX, seedY, sequenceIndex) {
    var seed = (seedX * 73856093) ^ (seedY * 19349663) ^ (sequenceIndex * 83492791);
    seed = (seed ^ (seed >>> 16)) * 0x7feb352d;
    seed = (seed ^ (seed >>> 15)) ^ 0x846ca68b;
    var result = (seed >>> 0) / 0xffffffff;
    return result;
  }

  function seededRandomBetween(seedX, seedY, sequenceIndex, a, b) {
    return a + seededRandom(seedX, seedY, sequenceIndex) * (b - a);
  }

  function CloudGridManager(viewer, options) {
    options = options || {};
    this.viewer = viewer;

    this.CHUNK_SIZE_METERS = typeof options.chunkSize === 'number' ? options.chunkSize : 20000;
    this.cloudDensity = typeof options.cloudDensity === 'number' ? options.cloudDensity : 0.2;
    this.minAltitude = typeof options.minAltitude === 'number' ? options.minAltitude : 1000;
    this.maxAltitude = typeof options.maxAltitude === 'number' ? options.maxAltitude : 2000;
    this.drawAltitude = typeof options.drawAltitude === 'number' ? options.drawAltitude : 25000;
    this.scaleRange = options.scaleRange || { x: [1200, 1800], y: [200, 400] };
    this.sizeRange = options.sizeRange || { x: [40, 60], y: [8, 16], z: [10, 20] };

    this.mercatorProj = new Cesium.WebMercatorProjection();
    this.chunks = new Map();
    this.inactivePool = [];
    this.maxPoolSize = typeof options.maxPoolSize === 'number' ? options.maxPoolSize : 9;

    this.currentChunkX = null;
    this.currentChunkY = null;

    this.viewer.camera.percentageChanged = 0.01;
    this.viewer.camera.changed.addEventListener(this._onCameraChanged.bind(this));

    this._onCameraChanged();
  }

  CloudGridManager.prototype.getChunkCoords = function(cartesian3Position) {
    var carto = Cesium.Cartographic.fromCartesian(cartesian3Position);
    var mercCoords = this.mercatorProj.project(carto);
    var chunkX = Math.floor(mercCoords.x / this.CHUNK_SIZE_METERS);
    var chunkY = Math.floor(mercCoords.y / this.CHUNK_SIZE_METERS);

    return { x: chunkX, y: chunkY };
  };

  CloudGridManager.prototype.chunkKeyString = function(x, y) {
    return x + ',' + y;
  };

  CloudGridManager.prototype._getRandomInRange = function(range, seedX, seedY, sequenceIndex) {
    var min = Array.isArray(range) ? range[0] : (range && range.min != null ? range.min : 0);
    var max = Array.isArray(range) ? range[1] : (range && range.max != null ? range.max : 0);
    return seededRandomBetween(seedX, seedY, sequenceIndex, min, max);
  };

  CloudGridManager.prototype._recycleAllChunks = function() {
    var self = this;
    Array.from(this.chunks.keys()).forEach(function(key) {
      var collection = self.chunks.get(key);
      if (collection) {
        try {
          if (typeof collection.removeAll === 'function') {
            collection.removeAll();
          }
        } catch (e) {
          // ignore recycle errors
        }
        if (self.inactivePool.length < self.maxPoolSize) {
          self.inactivePool.push(collection);
        }
      }
      self.chunks.delete(key);
    });
    this.chunks.clear();
  };

  CloudGridManager.prototype._recycleChunk = function(chunkKeyStr) {
    var collection = this.chunks.get(chunkKeyStr);
    if (collection) {
      try {
        if (typeof collection.removeAll === 'function') {
          collection.removeAll();
        }
      } catch (e) {
        // ignore recycle errors
      }
      this.chunks.delete(chunkKeyStr);
      if (this.inactivePool.length < this.maxPoolSize) {
        this.inactivePool.push(collection);
      }
    }
  };

  CloudGridManager.prototype._refreshChunks = function(force) {
    var cameraHeight = this.viewer.camera.positionCartographic && this.viewer.camera.positionCartographic.height != null
      ? this.viewer.camera.positionCartographic.height
      : Cesium.Cartographic.fromCartesian(this.viewer.camera.position).height;

    if (cameraHeight > this.drawAltitude) {
      if (this.chunks.size > 0) {
        this._recycleAllChunks();
      }
      this.currentChunkX = null;
      this.currentChunkY = null;
      return;
    }

    var camChunk = this.getChunkCoords(this.viewer.camera.position);
    if (!force && camChunk.x === this.currentChunkX && camChunk.y === this.currentChunkY && this.chunks.size > 0) {
      return;
    }

    this.currentChunkX = camChunk.x;
    this.currentChunkY = camChunk.y;

    var newChunkSet = new Set();
    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        var nx = camChunk.x + dx;
        var ny = camChunk.y + dy;
        newChunkSet.add(this.chunkKeyString(nx, ny));
      }
    }

    var self = this;
    this.chunks.forEach(function(collection, key) {
      if (!newChunkSet.has(key)) {
        self._recycleChunk(key);
      }
    });

    newChunkSet.forEach(function(key) {
      if (!self.chunks.has(key)) {
        self._createChunk(key);
      }
    });
  };

  CloudGridManager.prototype._onCameraChanged = function() {
    this._refreshChunks(false);
  };

  CloudGridManager.prototype.rebuild = function() {
    this._refreshChunks(true);
  };

  CloudGridManager.prototype._createChunk = function(chunkKeyStr) {
    var coords = chunkKeyStr.split(',');
    var chunkX = parseInt(coords[0], 10);
    var chunkY = parseInt(coords[1], 10);

    var cloudCollection = this.inactivePool.pop();
    if (!cloudCollection) {
      cloudCollection = new Cesium.CloudCollection();
      this.viewer.scene.primitives.add(cloudCollection);
    }
    this.chunks.set(chunkKeyStr, cloudCollection);

    this._populateChunk(chunkX, chunkY, cloudCollection);
  };

  CloudGridManager.prototype._populateChunk = function(chunkX, chunkY, cloudCollection) {
    var mercatorProj = this.mercatorProj;

    var minX = chunkX * this.CHUNK_SIZE_METERS;
    var minY = chunkY * this.CHUNK_SIZE_METERS;
    var maxX = minX + this.CHUNK_SIZE_METERS;
    var maxY = minY + this.CHUNK_SIZE_METERS;

    var minCarto = mercatorProj.unproject(new Cesium.Cartesian3(minX, minY, 0));
    var maxCarto = mercatorProj.unproject(new Cesium.Cartesian3(maxX, maxY, 0));

    var latDiff = Cesium.Math.toDegrees(maxCarto.latitude - minCarto.latitude);
    var lonDiff = Cesium.Math.toDegrees(maxCarto.longitude - minCarto.longitude);
    var metersPerDegLat = 111319.9;
    var metersPerDegLon = metersPerDegLat * Math.cos(minCarto.latitude);
    var widthKm = (lonDiff * metersPerDegLon) / 1000.0;
    var heightKm = (latDiff * metersPerDegLat) / 1000.0;
    var areaKm2 = widthKm * heightKm;

    var cloudCount = Math.max(0, Math.round(areaKm2 * this.cloudDensity));

    for (var i = 0; i < cloudCount; i++) {
      var fracX = seededRandom(chunkX, chunkY, i * 3);
      var fracY = seededRandom(chunkX, chunkY, i * 3 + 1);
      var altitude = seededRandomBetween(chunkX, chunkY, i * 3 + 2, this.minAltitude, this.maxAltitude);

      var chunkLon = Cesium.Math.lerp(minCarto.longitude, maxCarto.longitude, fracX);
      var chunkLat = Cesium.Math.lerp(minCarto.latitude, maxCarto.latitude, fracY);

      var scaleX = this._getRandomInRange(this.scaleRange.x, chunkX, chunkY, i * 3 + 100);
      var scaleY = this._getRandomInRange(this.scaleRange.y, chunkX, chunkY, i * 3 + 101);
      var maxXSize = this._getRandomInRange(this.sizeRange.x, chunkX, chunkY, i * 3 + 102);
      var maxYSize = this._getRandomInRange(this.sizeRange.y, chunkX, chunkY, i * 3 + 103);
      var maxZSize = this._getRandomInRange(this.sizeRange.z, chunkX, chunkY, i * 3 + 104);

      try {
        cloudCollection.add({
          show: true,
          position: Cesium.Cartesian3.fromRadians(chunkLon, chunkLat, altitude),
          scale: new Cesium.Cartesian2(scaleX, scaleY),
          maximumSize: new Cesium.Cartesian3(maxXSize, maxYSize, maxZSize),
          slice: -1.0,
          cloudType: Cesium.CloudType.CUMULUS,
          brightness: 1.0
        });
      } catch (e) {
        // ignore individual cloud creation errors
      }
    }
  };

  CloudGridManager.prototype.getReport = function() {
    var totalClouds = 0;
    this.chunks.forEach(function(collection) {
      totalClouds += collection.length;
    });

    return {
      currentChunkX: this.currentChunkX,
      currentChunkY: this.currentChunkY,
      totalClouds: totalClouds,
      activeChunks: this.chunks.size
    };
  };

  root.CloudGridManager = CloudGridManager;
})(window);
