// part2.js
var canvas;
var gl;

var numVertices = 24;

var pointsArray = [];

var vertices = [
    vec4(-0.3, -0.3,  0.3, 1.0),
    vec4(-0.3,  0.3,  0.3, 1.0),
    vec4( 0.3,  0.3,  0.3, 1.0),
    vec4( 0.3, -0.3,  0.3, 1.0),
    vec4(-0.3, -0.3, -0.3, 1.0),
    vec4(-0.3,  0.3, -0.3, 1.0),
    vec4( 0.3,  0.3, -0.3, 1.0),
    vec4( 0.3, -0.3, -0.3, 1.0)
];

window.onload = function init() {
    canvas = document.getElementById("webgl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    createEdges();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    gl.enable(gl.DEPTH_TEST);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    // Uniform locations
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    var fColorLoc = gl.getUniformLocation( program, "fColor" );

    // Set the projection matrix with a 45 degrees vertical field of view
    projectionMatrix = perspective(45.0, canvas.width/canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    // Set the line width
    gl.lineWidth(2.0);

    render(fColorLoc);
}

function createEdges()
{
    // Define the 12 edges of the cube
    edge(0, 1);
    edge(1, 2);
    edge(2, 3);
    edge(3, 0);

    edge(4, 5);
    edge(5, 6);
    edge(6, 7);
    edge(7, 4);

    edge(0, 4);
    edge(1, 5);
    edge(2, 6);
    edge(3, 7);
}

function edge(a, b)
{
    pointsArray.push(vertices[a]);
    pointsArray.push(vertices[b]);
}

function render(fColorLoc)
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var eye = vec3(0.0, 0.0, 5.0);
    var at = vec3(0.0, 0.0, 0.0);
    var up = vec3(0.0, 1.0, 0.0);

    // Set color to black for all edges
    gl.uniform4fv(fColorLoc, flatten(vec4(0.0, 0.0, 0.0, 1.0)));

    // One-point (front) perspective
    var mv1 = lookAt(eye, at, up);
    mv1 = mult(mv1, translate(-1.0, 0.0, 0.0)); // Move cube to the left
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(mv1) );
    gl.drawArrays( gl.LINES, 0, numVertices );

    // Two-point (X) perspective
    var mv2 = lookAt(eye, at, up);
    mv2 = mult(mv2, rotateY(30)); // Rotate cube around Y-axis
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(mv2) );
    gl.drawArrays( gl.LINES, 0, numVertices );

    // Three-point perspective
    var mv3 = lookAt(eye, at, up);
    mv3 = mult(mv3, translate(1.0, 0.0, 0.0)); // Move cube to the right
    mv3 = mult(mv3, rotateY(30)); // Rotate cube around Y-axis
    mv3 = mult(mv3, rotateX(25)); // Rotate cube around X-axis
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(mv3) );
    gl.drawArrays( gl.LINES, 0, numVertices );
}
