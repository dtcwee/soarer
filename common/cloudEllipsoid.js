// create an ellipsoid with cloud texture
// setup: var texturePath
// usage: var cloudEllipsoid = createCloudEllipsoid(viewer);
// usage: cloudEllipsoid.orientation = computeCloudOrientation();

// From https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
var equatorialRadius = 6378137;
var polarRadius = 6356752;
var cloudAltitude = 45000.0;

var position = Cesium.Cartesian3.ZERO;

var texturePath = '../common/cloud_combined_2048.png'

function computeCloudOrientation() {
    var timestamp = Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime();
    var heading = Cesium.Math.toRadians(timestamp / 10000);
    var pitch = Cesium.Math.toRadians(0);
    var roll = 0;
    var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
    //console.log(Cesium.JulianDate.toDate(viewer.clock.currentTime).getTime());
    return orientation;
}

function createCloudEllipsoid(viewer) {
    var cloudEllipsoid = viewer.entities.add({
        name: "World with Clouds",
        position: Cesium.Cartesian3.ZERO,
        //orientation: new Cesium.CallbackProperty(computeCloudOrientation, false),
        orientation: computeCloudOrientation(),
        ellipsoid: {
            radii: new Cesium.Cartesian3(
                (equatorialRadius + cloudAltitude),
                (polarRadius + cloudAltitude),
                (equatorialRadius + cloudAltitude)
            ),
            material: new Cesium.ImageMaterialProperty({
                image: texturePath,
                transparent: true,
                //color: Cesium.Color.WHITE.withAlpha(0.99),
            }),
            slicePartitions: 128,
            stackPartitions: 128,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, equatorialRadius * 1.75),
            // fill: true,
            // outline: true,
            //subdivisions: 1024,
        },
    });
    return cloudEllipsoid;
}

  // function setCloudEllipsoidOrientation() {
  //   cloudEllipsoid.show = false;
  //   cloudEllipsoid.orientation = computeCloudOrientation();
  //   setTimeout(function() {cloudEllipsoid.show = true}, 50);
  // }
  // setInterval(setCloudEllipsoidOrientation, 3000);