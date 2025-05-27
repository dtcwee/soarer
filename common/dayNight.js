/*
USAGE
blackMarble.alpha = getNightLayerAlpha(clock);

REQUIRES
jQuery
var viewer
*/
var debugDayNight=false;
function getNightLayerAlpha(clock) {
var cameraLatitude = viewer.camera.positionCartographic.latitude;
var cameraLongitude = viewer.camera.positionCartographic.longitude;
$("#cameraLatitude").text(debugDayNight ? (cameraLatitude * Cesium.Math.DEGREES_PER_RADIAN).toFixed(2) : '');
$("#cameraLongitude").text(debugDayNight ? (cameraLongitude * Cesium.Math.DEGREES_PER_RADIAN).toFixed(2) : '');
//Calculate Local Time
var secondsOffset = cameraLongitude * 12 * 60 * 60 / Math.PI;
var localJulianDate = new Cesium.JulianDate();
Cesium.JulianDate.addSeconds(clock.currentTime, secondsOffset, localJulianDate);
var localGregorianDate = new Cesium.JulianDate.toGregorianDate(localJulianDate);
$("#localTime").text(debugDayNight ? (localGregorianDate.hour + ":" + localGregorianDate.minute + ":" + localGregorianDate.second) : '');
//Calculate Sun Declination
var sunDeclination = Cesium.Math.clampToLatitudeRange(
    Cesium.Math.PI_OVER_TWO
    - Cesium.Spherical.fromCartesian3(
        Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(localJulianDate)
    ).cone
);
$("#sunDeclination").text(debugDayNight ? Cesium.Math.toDegrees(sunDeclination).toFixed(2) : '');
//Calculate Hour, Solar Angles
var hourAngle = (localJulianDate.secondsOfDay / (12 * 60 * 60) * Math.PI);
$("#hourAngle").text(debugDayNight ? Cesium.Math.toDegrees(hourAngle).toFixed(2) : '');
var cosSolarZenithAngle = Math.sin(cameraLatitude) * Math.sin(sunDeclination)
    + Math.cos(cameraLatitude) * Math.cos(sunDeclination) * Math.cos(hourAngle);
var solarElevation = Math.asin(cosSolarZenithAngle);
$("#solarElevation").text(debugDayNight ? Cesium.Math.toDegrees(solarElevation).toFixed(2) : '');
//var overlayAlpha = 0.5 * Math.cos(hourAngle - Math.PI) + 0.5;
var overlayAlpha = 0.5 * -cosSolarZenithAngle + 0.5;
$("#overlayAlpha").text(debugDayNight ? overlayAlpha.toFixed(2) : '');
return overlayAlpha;
}
