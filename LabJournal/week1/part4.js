/**
 * @param {Element} canvas. The canvas element to create a
 *     context from
 * @returns {WebGLRenderingContext} The created context
 */

function setupWebGL(canvas){
    return WebGLUtils.setupWebGL(canvas);
}
var gl;
var theta = 0.0;

var points = [
    vec3( 0,    0.5, 0),
    vec3( 0.5,  0,   0),
    vec3(-0.5,  0,   0),
    vec3( 0,   -0.5, 0)
];

var colors = [
    vec3(1.0, 0.0, 0.0),
    vec3(0.0, 1.0, 0.0),
    vec3(0.0, 0.0, 1.0),
    vec3(0.0, 1.0, 1.0)
];
window.onload = function init(){
    
    var canvas = document.getElementById("webgl-canvas");  
    var gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //  Load shaders and initialize attribute buffers
    

    //We start by creating a vertex buffer object (VBO) on the GPU in init and later place our data in that object. 
    var vertexBuffer = gl.createBuffer(); // creates the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // gl.ARRAY_BUFFER parameter indicates that the data in the buffer will be vertex attribute data rather than indices to the data.
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW); //put data into the VBO
    /**
     * gl.bufferData accepts only arrays of native data type values (e.g.,an array of floating-point values in memory) and not JavaScript objects.
     * 
     */
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vPosition = gl.getAttribLocation(program, "vPosition"); //enable the vertex attributes that are in the shaders
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0); // the form of the data in the vertex array
    gl.enableVertexAttribArray(vPosition);

    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var thetaLocation = gl.getUniformLocation(program, "theta");
    gl.uniform1f(thetaLocation, theta); //1f indicates that we are sending the value of a floating-point variable

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        theta += 0.1;
        gl.uniform1f(thetaLocation, theta);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, points.length);
        //The function requestAnimFrame requests the browser to display the rendering the
        // next time it wants to refresh the display and then call the render function recursively
        requestAnimFrame(render);
    }
    
    render();
}

init();