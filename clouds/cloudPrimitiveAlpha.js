(function() {
  // This module manages the static cloud primitive alpha based on camera altitude.
  if (typeof viewer === 'undefined') return;

  function altitudeToAlpha(altitudeMeters) {
    // 0 @ 3km, 1 @ 4km
    var a = (altitudeMeters - 3000) / (4000 - 3000);
    return Math.max(0, Math.min(1, a));
  }

  // expose hook globally and on viewer for other modules
  window.altitudeToAlpha = altitudeToAlpha;
  viewer.altitudeToAlpha = altitudeToAlpha;

  // Keep alpha update separate from other preRender work to avoid coupling.
  viewer.scene.preRender.addEventListener(function(scene, time) {
    try {
      var carto = Cesium.Cartographic.fromCartesian(viewer.camera.position);
      var h = carto.height;
      var alpha = altitudeToAlpha(h);
      if (typeof cloudPrimitive !== 'undefined' && cloudPrimitive && cloudPrimitive._cloudMaterial) {
        cloudPrimitive._cloudMaterial.uniforms.alpha = alpha;
      }
    } catch (e) {
      // ignore errors to avoid interfering with main loop
    }
  });
})();
