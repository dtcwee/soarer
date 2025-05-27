// create an ellipsoid with cloud texture
// setup: var texturePath
// usage: var cloudRectangle = createCloudRectangle(viewer);
// variables: cloudAltitude, cloudSpeed

// From https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
var equatorialRadius = 6378137;
var polarRadius = 6356752;
//cloud altitude varies between 1000m to 7000m
var cloudAltitude = 3000;
var cloudSpeed = 5;

var texturePath = '../common/cloud_combined_2048.png'

//callback to generate rectangle coordinates
function getCloudRectangleCoordinates() {
    var timestamp = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime();
    var divisor = 10000000 / cloudSpeed;
    return Cesium.Rectangle.fromDegrees(
        Cesium.Math.toDegrees(Cesium.Math.convertLongitudeRange(timestamp / divisor)), //W
        -89.0, //S
        Cesium.Math.toDegrees(Cesium.Math.convertLongitudeRange((timestamp / divisor) - 1 / divisor)), //E
        89.0  //N
    )
}

//callback to generate altitude
function getCloudAltitude() {
    return cloudAltitude;
}

function createCloudRectangle(viewer) {
    var cloudRectangle = viewer.entities.add({
        name: "Cloud Rectangle",
        rectangle: {
            coordinates: new Cesium.CallbackProperty(getCloudRectangleCoordinates, false),
            //extrudedHeight: cloudAltitude,
            height: new Cesium.CallbackProperty(getCloudAltitude, false),
            material: new Cesium.ImageMaterialProperty({
                image: texturePath,
                transparent: true,
            }),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, equatorialRadius * 1.75),
        }
    })
    return cloudRectangle;
}