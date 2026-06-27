// create a rectangle Primitive with cloud texture (GPU-scrolling)
// usage: var cloudPrimitive = createCloudPrimitive(viewer);
// variables: cloudAltitude (meters), cloudSpeed (arbitrary speed multiplier)

// Cloud configuration
var cloudAltitude = 10000; // meters
var cloudSpeed = 5;
var texturePath = '../common/cloud_combined_2048.png';

// internal references for runtime updates
var _cloudPrimitiveInstance = null;
var _cloudViewer = null;

function createCloudPrimitive(viewer) {
    // full-world rectangle
    var rect = Cesium.Rectangle.fromDegrees(-180.0, -89.0, 180.0, 89.0);

    var instance = new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
            rectangle: rect,
            vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
            height: cloudAltitude
        })
    });

    // Material fabric that samples the cloud texture and scrolls horizontally
    var cloudMaterial = new Cesium.Material({
        fabric: {
            type: 'CloudScroll',
            uniforms: {
                image: texturePath,
                offset: 0.0,
                alpha: 1.0
            },
            source: `
                czm_material czm_getMaterial(czm_materialInput materialInput) {
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    vec2 uv = materialInput.st;
                    // scroll horizontally and wrap
                    uv.x = fract(uv.x + offset);
                    vec4 color = texture(image, uv);
                    material.diffuse = color.rgb;
                    material.alpha = color.a * alpha;
                    return material;
                }
            `
        }
    });

    var appearance = new Cesium.MaterialAppearance({
        material: cloudMaterial,
        translucent: true,
        flat: true,
        vertexFormat: Cesium.VertexFormat.POSITION_AND_ST
    });

    var cloudPrimitive = new Cesium.Primitive({
        geometryInstances: instance,
        appearance: appearance,
        releaseGeometryInstances: false,
        asynchronous: false
    });

    viewer.scene.primitives.add(cloudPrimitive);

    // update offset uniform each tick (cheap GPU uniform update)
    var tick = function (clock) {
        var timestamp = Cesium.JulianDate.toDate(clock.currentTime).getTime();
        var divisor = 10 ** 7.5 / cloudSpeed;
        // keep offset in [0,1)
        cloudMaterial.uniforms.offset = ((timestamp / divisor) % 1.0);
    };
    viewer.clock.onTick.addEventListener(tick);

    // keep references so callers can modify or remove later
    cloudPrimitive._cloudMaterial = cloudMaterial;
    cloudPrimitive._cloudTick = tick;

    // store global refs for update helpers
    _cloudPrimitiveInstance = cloudPrimitive;
    _cloudViewer = viewer;

    return cloudPrimitive;
}

// Update functions to be called from host pages (e.g., SoarerPC/index.html)
function updateCloudSpeed(newSpeed) {
    cloudSpeed = Math.max(0.0001, Number(newSpeed));
}

function updateCloudAltitude(newAltitudeMeters) {
    cloudAltitude = Number(newAltitudeMeters);
    if (_cloudPrimitiveInstance && _cloudViewer) {
        try {
            // remove tick listener and primitive
            _cloudViewer.clock.onTick.removeEventListener(_cloudPrimitiveInstance._cloudTick);
        } catch (e) {
            // ignore if remove fails
        }
        _cloudViewer.scene.primitives.remove(_cloudPrimitiveInstance);
        _cloudPrimitiveInstance = null;
        // recreate primitive with new altitude
        _cloudPrimitiveInstance = createCloudPrimitive(_cloudViewer);
        return _cloudPrimitiveInstance;
    }
}
