var canvas = document.getElementById("gl-canvas");

var groundImage = new Image();
groundImage.onload = function() {
    init(groundImage);
};
groundImage.src = 'xamp23.png';  // Ensure this image is in your project directory
var circulationOn = true;


function init(groundImage) {
    var gl = WebGLUtils.setupWebGL(canvas, { alpha: false });
    if (!gl) {
        alert("WebGL isn't available");
    }

    // Setup the viewport and clear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Shader program
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Define the scene
    // Ground quad
    var rectangleCorners = [
        vec3(-2, -1, -1),  // Bottom-left
        vec3(2, -1, -1),   // Bottom-right
        vec3(2, -1, -5),   // Top-right
        vec3(-2, -1, -5)   // Top-left
    ];

    var rectangleTextureCoords = [
        vec2(0.0, 0.0),    // Corresponds to bottom-left
        vec2(1.0, 0.0),    // Bottom-right
        vec2(1.0, 1.0),    // Top-right
        vec2(0.0, 1.0)     // Top-left
    ];

    var rectangleIndices = [0, 1, 2, 0, 2, 3];

    // First small quad (parallel to ground)
    var smallQuad1Positions = [
        vec3(0.25, -0.5, -1.25),
        vec3(0.75, -0.5, -1.25),
        vec3(0.75, -0.5, -1.75),
        vec3(0.25, -0.5, -1.75)
    ];

    var smallQuad1TextureCoords = [
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0)
    ];

    var smallQuad1Indices = [0, 1, 2, 0, 2, 3];

    // Second small quad (perpendicular to ground)
    var smallQuad2Positions = [
        vec3(-1.0, -1.0, -2.5),
        vec3(-1.0, -1.0, -3.0),
        vec3(-1.0,  0.0, -3.0),
        vec3(-1.0,  0.0, -2.5)
    ];

    var smallQuad2TextureCoords = [
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0),
        vec2(0.0, 1.0)
    ];

    var smallQuad2Indices = [0, 1, 2, 0, 2, 3];

    // Combine all positions and texture coordinates
    var positions = [];
    var textureCoords = [];

    // Ground quad
    var groundPositions = rectangleIndices.map(function(i) { return rectangleCorners[i]; });
    var groundTextureCoords = rectangleIndices.map(function(i) { return rectangleTextureCoords[i]; });
    positions = positions.concat(groundPositions);
    textureCoords = textureCoords.concat(groundTextureCoords);
    var groundVertexCount = groundPositions.length;

    // First small quad
    var smallQuad1PositionsIndexed = smallQuad1Indices.map(function(i) { return smallQuad1Positions[i]; });
    var smallQuad1TextureCoordsIndexed = smallQuad1Indices.map(function(i) { return smallQuad1TextureCoords[i]; });
    positions = positions.concat(smallQuad1PositionsIndexed);
    textureCoords = textureCoords.concat(smallQuad1TextureCoordsIndexed);
    var smallQuad1VertexCount = smallQuad1PositionsIndexed.length;

    // Second small quad
    var smallQuad2PositionsIndexed = smallQuad2Indices.map(function(i) { return smallQuad2Positions[i]; });
    var smallQuad2TextureCoordsIndexed = smallQuad2Indices.map(function(i) { return smallQuad2TextureCoords[i]; });
    positions = positions.concat(smallQuad2PositionsIndexed);
    textureCoords = textureCoords.concat(smallQuad2TextureCoordsIndexed);
    var smallQuad2VertexCount = smallQuad2PositionsIndexed.length;

    // Load data into GPU
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    var textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);

    // Associate shader variables
    var a_position_model = gl.getAttribLocation(program, 'a_position_model');
    gl.enableVertexAttribArray(a_position_model);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(a_position_model, 3, gl.FLOAT, false, 0, 0);

    var a_textureCoords = gl.getAttribLocation(program, 'a_textureCoords');
    gl.enableVertexAttribArray(a_textureCoords);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.vertexAttribPointer(a_textureCoords, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    var u_mvp = gl.getUniformLocation(program, 'u_mvp');
    var u_texture = gl.getUniformLocation(program, 'u_texture');
    var u_textureRed = gl.getUniformLocation(program, 'u_textureRed');
    var u_useRedTexture = gl.getUniformLocation(program, 'u_useRedTexture');
    var u_isShadow = gl.getUniformLocation(program, 'u_isShadow');

    // Set default 
    gl.uniform1i(u_isShadow, 0);

    // Create textures
    // Ground texture (texture unit 0)
    gl.activeTexture(gl.TEXTURE0);
    var groundTexture = create2DTexture(gl, groundImage);
    gl.uniform1i(u_texture, 0);  // Texture unit 0

    // Red texture (texture unit 1)
    gl.activeTexture(gl.TEXTURE1);
    var redTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    var redPixel = new Uint8Array([255, 0, 0, 255]);  // RGBA format
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, redPixel
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.uniform1i(u_textureRed, 1);  // Texture unit 1

    // Setup the model-view-projection matrix
    var eye = vec3(0, 2, 2);
    var at = vec3(0, -1, -10);
    var up = vec3(0, 1, 0);
    var fovy = 90;
    var aspect = canvas.width / canvas.height;
    var near = 0.1;
    var far = 30;

    var viewMatrix = lookAt(eye, at, up);
    var projectionMatrix = perspective(fovy, aspect, near, far);
    var mvpMatrix = mult(projectionMatrix, viewMatrix);

    // Light animation variables
    var lightCenter = vec3(0, 2, -2);
    var lightRadius = 2;
    var theta = 0;

    function shadowMatrix(plane, light) {
        var dot = plane[0]*light[0] + plane[1]*light[1] + plane[2]*light[2] + plane[3]*light[3];

        var shadowMat = mat4(
            dot - light[0]*plane[0],     -light[0]*plane[1],      -light[0]*plane[2],     -light[0]*plane[3],
            -light[1]*plane[0],          dot - light[1]*plane[1], -light[1]*plane[2],     -light[1]*plane[3],
            -light[2]*plane[0],          -light[2]*plane[1],      dot - light[2]*plane[2],-light[2]*plane[3],
            -light[3]*plane[0],          -light[3]*plane[1],      -light[3]*plane[2],     dot - light[3]*plane[3]
        );

        return shadowMat;
    }

    // Start the render loop
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        // Update light position only if circulation is on
        if (circulationOn) {
            theta += 0.02;
        }
        var lightPos = vec4(
            lightCenter[0] + lightRadius * Math.cos(theta),
            lightCenter[1],
            lightCenter[2] + lightRadius * Math.sin(theta),
            1.0
        );

        // Compute mvp matrix
        var mvpMatrix = mult(projectionMatrix, viewMatrix);

        // First, draw the ground quad
        gl.uniformMatrix4fv(u_mvp, false, flatten(mvpMatrix));

        // Bind ground texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, groundTexture);
        gl.uniform1i(u_useRedTexture, 0);  // Use ground texture

        // Draw ground quad
        gl.drawArrays(gl.TRIANGLES, 0, groundVertexCount);

        // Second, draw the shadows

        // Save the current depth function
        var prevDepthFunc = gl.getParameter(gl.DEPTH_FUNC);

        // Set depth function to gl.GREATER
        gl.depthFunc(gl.GREATER);

        // Compute shadow projection matrix with adjusted plane
        var epsilon = 0.001;
        var plane = vec4(0, 1, 0, 1 + epsilon);
        var shadowProjMatrix = shadowMatrix(plane, lightPos);

        // Compute the shadow MVP matrix
        var shadowMVPMatrix = mult(mvpMatrix, shadowProjMatrix);

        // Set u_isShadow to 1 to indicate we are drawing shadows
        gl.uniform1i(u_isShadow, 1);

        // Disable textures
        gl.disableVertexAttribArray(a_textureCoords);

        // Use the shadow MVP matrix
        gl.uniformMatrix4fv(u_mvp, false, flatten(shadowMVPMatrix));

        // Draw the first small quad's shadow
        gl.drawArrays(gl.TRIANGLES, groundVertexCount, smallQuad1VertexCount);

        // Draw the second small quad's shadow
        gl.drawArrays(gl.TRIANGLES, groundVertexCount + smallQuad1VertexCount, smallQuad2VertexCount);

        // Restore previous depth function
        gl.depthFunc(prevDepthFunc);

        // Re-enable textures
        gl.enableVertexAttribArray(a_textureCoords);

        // Reset u_isShadow to 0
        gl.uniform1i(u_isShadow, 0);

        // Third, draw the small quads normally
        gl.uniformMatrix4fv(u_mvp, false, flatten(mvpMatrix));

        // Bind red texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, redTexture);
        gl.uniform1i(u_useRedTexture, 1);  // Use red texture

        // Draw the first small quad
        gl.drawArrays(gl.TRIANGLES, groundVertexCount, smallQuad1VertexCount);

        // Draw the second small quad
        gl.drawArrays(gl.TRIANGLES, groundVertexCount + smallQuad1VertexCount, smallQuad2VertexCount);

        requestAnimationFrame(render);
    }

    render();
}

document.getElementById('toggle-circulation').addEventListener('click', function() {
    circulationOn = !circulationOn;
});

function create2DTexture(gl, image) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Flip the image's Y axis
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Set the parameters so we can render any size image
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // or gl.REPEAT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // or gl.REPEAT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); // or gl.NEAREST
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // or gl.NEAREST

    // Upload the image into the texture.
    gl.texImage2D(
        gl.TEXTURE_2D,    // target
        0,                // level
        gl.RGBA,          // internal format
        gl.RGBA,          // format
        gl.UNSIGNED_BYTE, // type
        image             // image
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}
