var canvas;
var gl;

var numTimesToSubdivide = 3; // Initial subdivision level
var maxSubdivisionLevel = 6;
var minSubdivisionLevel = 0;

var pointsArray = [];
var normalsArray = [];

var va = vec4(0.0, 0.0, 1.0, 1);
var vb = vec4(0.0, 0.942809, -0.333333, 1);
var vc = vec4(-0.816497, -0.471405, -0.333333, 1);
var vd = vec4(0.816497, -0.471405, -0.333333, 1);

var isFlipped = false; // Tracks whether z-coordinates are flipped
var isAnimating = true; // Tracks whether the animation is running

var vBuffer, nBuffer;
var modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;

var lightDirection = vec3(0.0, 0.0, -1.0); // Directional light coming from (0, 0, -1)
var diffuseProduct = vec4(1.0, 0.5, 0.0, 1.0); // Orange color for kd

var theta = 0.0; // Angle for camera orbit

window.onload = init;

function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

    // Normals are the normalized positions (since it's a unit sphere)
    normalsArray.push(vec4(a[0], a[1], a[2], 0.0));
    normalsArray.push(vec4(b[0], b[1], b[2], 0.0));
    normalsArray.push(vec4(c[0], c[1], c[2], 0.0));
}

function divideTriangle(a, b, c, count) {
    if (count > 0) {
        var ab = normalize(mix(a, b, 0.5), true);
        var ac = normalize(mix(a, c, 0.5), true);
        var bc = normalize(mix(b, c, 0.5), true);
        
        divideTriangle(a, ab, ac, count - 1);
        divideTriangle(ab, b, bc, count - 1);
        divideTriangle(bc, c, ac, count - 1);
        divideTriangle(ab, bc, ac, count - 1);
    } else {
        triangle(a, b, c);
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(a, c, d, n);
    divideTriangle(a, d, b, n);
    divideTriangle(b, d, c, n);
}

function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    
    // Enable depth testing and back face culling
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK); // Cull back faces

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create buffers before generating sphere data
    vBuffer = gl.createBuffer();
    nBuffer = gl.createBuffer();

    // Generate the sphere data and load buffers
    updateGeometry();

    // Associate shader variables with data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    // Get uniform locations for matrices
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    // Pass light direction and diffuse product to shaders
    var uLightDirection = gl.getUniformLocation(program, "uLightDirection");
    gl.uniform3fv(uLightDirection, flatten(normalize(lightDirection)));

    var uDiffuseProduct = gl.getUniformLocation(program, "uDiffuseProduct");
    gl.uniform4fv(uDiffuseProduct, flatten(diffuseProduct));

    // Event listeners for buttons
    document.getElementById("IncreaseSubdivision").onclick = function() {
        if (numTimesToSubdivide < maxSubdivisionLevel) {
            numTimesToSubdivide++;
            updateGeometry();
        }
    };
    
    document.getElementById("DecreaseSubdivision").onclick = function() {
        if (numTimesToSubdivide > minSubdivisionLevel) {
            numTimesToSubdivide--;
            updateGeometry();
        }
    };

    document.getElementById("ToggleFlipZ").onclick = function() {
        isFlipped = !isFlipped;
        updateFlipStatus();
        updateGeometry();
    };

    document.getElementById("ToggleAnimation").onclick = function() {
        isAnimating = !isAnimating;
        updateAnimationStatus();
    };
    
    updateSubdivisionDisplay();
    updateFlipStatus();
    updateAnimationStatus();
    render();
}

function updateSubdivisionDisplay() {
    document.getElementById("subdivisionLevelDisplay").textContent = "Current Subdivision Level: " + numTimesToSubdivide;
}

function updateFlipStatus() {
    var status = isFlipped ? "Yes" : "No";
    document.getElementById("flipStatus").textContent = "Z-Coordinates Flipped: " + status;
}

function updateAnimationStatus() {
    var button = document.getElementById("ToggleAnimation");
    button.textContent = isAnimating ? "Pause Animation" : "Resume Animation";
}

function generateSphere() {
    pointsArray = [];
    normalsArray = [];

    // Copy the initial vertices
    var a = vec4(va);
    var b = vec4(vb);
    var c = vec4(vc);
    var d = vec4(vd);

    // Flip z-coordinates if needed
    if (isFlipped) {
        a[2] = -a[2];
        b[2] = -b[2];
        c[2] = -c[2];
        d[2] = -d[2];
    }

    tetrahedron(a, b, c, d, numTimesToSubdivide);
}

function updateGeometry() {
    generateSphere();

    // Update buffer data
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    updateSubdivisionDisplay();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update camera position to orbit around the sphere
    if (isAnimating) {
        theta += 0.01; // Adjust the speed of orbiting
    }
    var radius = 2.0; // Distance from the sphere
    var eye = vec3(radius * Math.sin(theta), 0.0, radius * Math.cos(theta));
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);

    modelViewMatrix = lookAt(eye, at, up);
    var s = scalem(0.4, 0.4, 0.4); // Scale down the sphere
    modelViewMatrix = mult(modelViewMatrix, s);
    projectionMatrix = perspective(45.0, canvas.width / canvas.height, 0.1, 10.0);

    // Compute normal matrix (upper-left 3x3 of modelViewMatrix)
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, pointsArray.length);

    requestAnimFrame(render);
}
