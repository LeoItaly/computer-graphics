
/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

// -------- Globals --------
"use strict";

var gl;
var numPoints = 0;
var pointColor = vec4(0.0, 0.0, 0.0, 1.0);
var bgColor = vec4(0.3921, 0.5843, 0.9294, 1.0);
var mode = "POINT";

// -------- Helper functions --------

// returns of an array of 6 vec2 points
function create_point(point, size) {
    const offset = size/2;
    return [ vec2(point[0] - offset, point[1] - offset), vec2(point[0] + offset, point[1] - offset),
             vec2(point[0] - offset, point[1] + offset), vec2(point[0] - offset, point[1] + offset),
             vec2(point[0] + offset, point[1] - offset), vec2(point[0] + offset, point[1] + offset) ];
}

function create_color_for_point(color) {
    var colors = [];
    for (i = 0; i < 6; i++) {
        colors.push(color);
    }
    return colors;
}

function distance(vec1, vec2) {
    const dx = vec2[0] - vec1[0];
    const dy = vec2[1] - vec1[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function generateCircleVertices(center, radius, numPoints) {
    let vertices = [];
    
    var prev_x;
    var prev_y;
    
    // Loop through each point
    for (let i = 0; i <= numPoints; i++) {
        // Calculate the angle for this point
        let angle = (i / numPoints) * 2 * Math.PI;
        
        // Calculate the x and y coordinates based on the angle and radius
        let x = center[0] + radius * Math.cos(angle);
        let y = center[1] + radius * Math.sin(angle);
        
        // Add the point to the vertices array
        if (i > 0) {
            vertices.push(center);
            vertices.push(vec2(prev_x, prev_y));
            vertices.push(vec2(x, y));
        }

        prev_x = x;
        prev_y = y;
    }
    
    return vertices;
  }

  function generateCircleColors(color_arr, numPoints) {
    let colors = [];
    
    // Loop through each point
    for (let i = 0; i < numPoints; i++) {
        colors.push(color_arr[0]); // center color
        colors.push(color_arr[1]);
        colors.push(color_arr[1]);
    }
    
    return colors;
  }

// -------- Main function --------
window.onload = function init() {
    var canvas = document.getElementById("webgl-canvas");

    // -------- Event listeners --------

    canvas.addEventListener("click", function(ev) {
        var bbox = ev.target.getBoundingClientRect();
        var pos =  vec2(2*(ev.clientX - bbox.left)/canvas.width - 1, 2*(canvas.height - ev.clientY + bbox.top - 1)/canvas.height - 1);
        if (index + 6 > max_verts) { index = 0; }
        if (mode == "POINT" ||
            (mode == "TRIANGLE" && prev_points.length < 2) ||
            (mode == "CIRCLE" && prev_points.length < 1)) {
            // vertices 
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            var p = create_point(pos, 0.05);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec2']*index, flatten(p));
            // colors
            var c = create_color_for_point(pointColor);
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec4']*index, flatten(c));
            index += 6;
            numPoints = Math.max(numPoints, index);
            // save if triangle or circle mode
            if (mode == "TRIANGLE" || mode == "CIRCLE") {
                prev_points.push(pos);
                prev_point_colors.push(pointColor);
            }
        }
        else if (mode == "TRIANGLE" && prev_points.length == 2) {
            prev_points.push(pos)
            prev_point_colors.push(pointColor)
            index = Math.max(0, index - 12);
            numPoints = index;
            // vertices 
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec2']*index, flatten(prev_points));
            prev_points = [];
            // colors
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec4']*index, flatten(prev_point_colors));
            prev_point_colors = [];
            index += 3;
            numPoints = Math.max(numPoints, index);
            index %= max_verts;
        }
        else if (mode == "CIRCLE" && prev_points.length == 1) {
            var NUM_POINTS = 50;
            index = Math.max(0, index - 6);
            numPoints = index;
            // vertices
            circle_points = generateCircleVertices(prev_points[0], distance(prev_points[0], pos), NUM_POINTS);
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec2']*index, flatten(circle_points));
            prev_points = [];
            // colors
            prev_point_colors.push(pointColor);
            circle_colors = generateCircleColors(prev_point_colors, NUM_POINTS);
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, sizeof['vec4']*index, flatten(circle_colors));
            prev_point_colors = [];
            index += NUM_POINTS * 3;
            numPoints = Math.max(numPoints, index);
            index %= max_verts;
        }
        
        render();
    });

    var pointButton = document.getElementById("PointMode");
    pointButton.addEventListener("click", function() {
        mode = "POINT";
        pointButton.disabled = true;
        document.getElementById("CircleMode").disabled = false;
        document.getElementById("TriMode").disabled = false;
    });

    var triangleButton = document.getElementById("TriMode");
    triangleButton.addEventListener("click", function() {
        prev_points = [];
        prev_point_colors = [];
        mode = "TRIANGLE";
        triangleButton.disabled = true;
        document.getElementById("PointMode").disabled = false;
        document.getElementById("CircleMode").disabled = false;
    });

    var circleButton = document.getElementById("CircleMode");
    circleButton.addEventListener("click", function() {
        prev_points = [];
        prev_point_colors = [];
        mode = "CIRCLE";
        circleButton.disabled = true;
        document.getElementById("PointMode").disabled = false;
        document.getElementById("TriMode").disabled = false;
        
    });

    var clearButton = document.getElementById("ClearButton");
    clearButton.addEventListener("click", function() {
        index = 0;
        numPoints = 0;
        gl.clearColor(...bgColor);
        render();
    });

    var bgColorMenu = document.getElementById("BGColorMenu");
    bgColorMenu.addEventListener("click", function() {
        switch (bgColorMenu.selectedIndex) {
            case 0: // cornflower
                bgColor = vec4(0.3921, 0.5843, 0.9294, 1.0);
                break;
            case 1: // white
                bgColor = vec4(1.0, 1.0, 1.0, 1.0);
                break;
            case 2: // gray
                bgColor = vec4(0.8, 0.8, 0.8, 1.0);
                break;
        }
    });

    var drawColorMenu = document.getElementById("DrawColorMenu");
    drawColorMenu.addEventListener("click", function() {
        switch (drawColorMenu.selectedIndex) {
            case 0: // black
                pointColor = vec4(0.0, 0.0, 0.0, 1.0);
                break;
            case 1: // red
                pointColor = vec4(1.0, 0.0, 0.0, 1.0);
                break;
            case 2: // green
                pointColor = vec4(0.0, 1.0, 0.0, 1.0);
                break;
            case 3: // blue
                pointColor = vec4(0.0, 0.0, 1.0, 1.0);
                break;
        }
    });

    // -------- WebGL setup --------

    gl = setupWebGL(canvas);
    gl.clearColor(...bgColor);
    gl.clear(gl.COLOR_BUFFER_BIT); 
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var max_verts = 10000;
    var index = 0;
    var prev_points = [];
    var prev_point_colors = [];
    
    // vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_verts*sizeof['vec2'], gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // colors
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_verts*sizeof['vec4'], gl.STATIC_DRAW);
    var colorAttrib = gl.getAttribLocation(program, "a_Color");
    gl.vertexAttribPointer(colorAttrib, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorAttrib);

    render();
}

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, numPoints);
    //window.requestAnimFrame(render, canvas);
}

