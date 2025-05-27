/**
* Rotation Matrix functions
* Convert Yaw/alpha/Z, Pitch/beta/X, Roll/gamma/Y to and from rotation matrix, apply transformations
*
* @author Rich Tibbett <https://dev.opera.com/articles/w3c-device-orientation-usage/>, Nghia Ho <http://nghiaho.com/?page_id=846>, Derek Wee
* @copyright 
* @version 0.1
* @license 
*/
var degtorad = Math.PI/180; // Degree-to-Radian conversion
var worldOrientation = 90;
var screenOrientation = 0;

//R.1: Converting deviceorientation angles to a Rotation Matrix representation
function getBaseRotationMatrix( alpha, beta, gamma ) {
	var _x = beta  ? beta  * degtorad : 0; // beta value
	var _y = gamma ? gamma * degtorad : 0; // gamma value
	var _z = alpha ? alpha * degtorad : 0; // alpha value

	var cX = Math.cos( _x );
	var cY = Math.cos( _y );
	var cZ = Math.cos( _z );
	var sX = Math.sin( _x );
	var sY = Math.sin( _y );
	var sZ = Math.sin( _z );

	//
	// ZXY-ordered rotation matrix construction.
	//

	var m11 = cZ * cY - sZ * sX * sY;
	var m12 = - cX * sZ;
	var m13 = cY * sZ * sX + cZ * sY;

	var m21 = cY * sZ + cZ * sX * sY;
	var m22 = cZ * cX;
	var m23 = sZ * sY - cZ * cY * sX;

	var m31 = - cX * sY;
	var m32 = sX;
	var m33 = cX * cY;

	return [
	m11,    m12,    m13,
	m21,    m22,    m23,
	m31,    m32,    m33
	];
};

//R.2: Fixing our rotation matrix frame relative to the current screen orientation
function getScreenTransformationMatrix( screenOrientation ) {
	var orientationAngle = screenOrientation ? screenOrientation * degtorad : 0;

	var cA = Math.cos( orientationAngle );
	var sA = Math.sin( orientationAngle );

	// Construct our screen transformation matrix
	var r_s = [
	cA,    -sA,    0,
	sA,    cA,     0,
	0,     0,      1
	];

	return r_s;
}

//R.3: Fix our rotation matrix frame relative to our application’s world orientation (rotation around x-axis)
function getWorldTransformationMatrix() {
	var x = 90 * degtorad;

	var cA = Math.cos( x );
	var sA = Math.sin( x );

	// Construct our world transformation matrix
	var r_w = [
	1,     0,    0,
	0,     cA,   -sA,
	0,     sA,   cA
	];

	return r_w;
}

//R.4: Computing our final rotation matrix representation
function matrixMultiply( a, b ) {
	var final = [];

	final[0] = a[0] * b[0] + a[1] * b[3] + a[2] * b[6];
	final[1] = a[0] * b[1] + a[1] * b[4] + a[2] * b[7];
	final[2] = a[0] * b[2] + a[1] * b[5] + a[2] * b[8];

	final[3] = a[3] * b[0] + a[4] * b[3] + a[5] * b[6];
	final[4] = a[3] * b[1] + a[4] * b[4] + a[5] * b[7];
	final[5] = a[3] * b[2] + a[4] * b[5] + a[5] * b[8];

	final[6] = a[6] * b[0] + a[7] * b[3] + a[8] * b[6];
	final[7] = a[6] * b[1] + a[7] * b[4] + a[8] * b[7];
	final[8] = a[6] * b[2] + a[7] * b[5] + a[8] * b[8];

	return final;
}

//Returns a 3 x 3 rotation matrix as an array
function computeMatrix(alpha, beta, gamma, currentScreenOrientation) {
	var rotationMatrix = getBaseRotationMatrix(
	alpha,
	beta,
	gamma
	); // R

	var screenTransform = getScreenTransformationMatrix( currentScreenOrientation ); // r_s

	var screenAdjustedMatrix = matrixMultiply( rotationMatrix, screenTransform ); // R_s

	var worldTransform = getWorldTransformationMatrix(); // r_w

	var finalMatrix = matrixMultiply( screenAdjustedMatrix, worldTransform ); // R_w

	return finalMatrix; // [ m11, m12, m13, m21, m22, m23, m31, m32, m33 ]
}

//Decomposes a 3 x 3 rotation matrix into an array containing Yaw/alpha/Z Pitch/beta/X Roll/gamma/Y
function getYawPitchRoll(rotationMatrix) {
	var rm11 = rotationMatrix[0]; var rm12 = rotationMatrix[1]; var rm13 = rotationMatrix[2];
	var rm21 = rotationMatrix[3]; var rm22 = rotationMatrix[4]; var rm23 = rotationMatrix[5];
	var rm31 = rotationMatrix[6]; var rm32 = rotationMatrix[7]; var rm33 = rotationMatrix[8];
	
	var yaw = Math.atan2(rm21, rm11);
	var pitch = Math.atan2(rm32, rm33);
	var roll = Math.atan2(rm31, Math.sqrt(Math.pow(rm32,2) + Math.pow(rm33,2)));
	
	return [yaw, pitch, roll]; //[yaw, pitch, roll]
}
