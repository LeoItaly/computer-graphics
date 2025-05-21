/**
 * @param {Element} canvas. The canvas element to create a
 *     context from
 * @returns {WebGLRenderingContext} The created context
 */

function setupWebGL(canvas){
    return WebGLUtils.setupWebGL(canvas);
}
var gl;
var points = [
  vec2(0, 0),
  vec2(1, 1),
  vec2(1, 0)
];
window.onload = function init(){
    
    var canvas = document.getElementById("webgl-canvas");  
    var gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //We start by creating a vertex buffer object (VBO) on the GPU in init and later place our data in that object. 
    var buffer = gl.createBuffer(); // creates the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // gl.ARRAY_BUFFER parameter indicates that the data in the buffer will be vertex attribute data rather than indices to the data.
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW); //put data into the VBO
    /**
     * gl.bufferData accepts only arrays of native data type values (e.g.,an array of floating-point values in memory) and not JavaScript objects.
     * 
     */

    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vPosition = gl.getAttribLocation(program, "vPosition"); //enable the vertex attributes that are in the shaders
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0); // the form of the data in the vertex array
    gl.enableVertexAttribArray(vPosition);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, points.length);
}
