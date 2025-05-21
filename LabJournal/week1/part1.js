/**
 * @param {Element} canvas. The canvas element to create a
 *     context from
 * @returns {WebGLRenderingContext} The created context
 */

function setupWebGL(canvas){
    return WebGLUtils.setupWebGL(canvas);
}

window.onload = function init(){
    var canvas = document.getElementById("webgl-canvas");  
    var gl = setupWebGL(canvas);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}