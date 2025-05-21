/**
* @param {Element} canvas. The canvas element to create a context from.
* @return {WebGLRenderingContext} The created context.
*/
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var teapotMovementButton = document.getElementById('toggle-teapot');
var lightButton = document.getElementById('toggle-light');
var canvas = document.getElementById("webgl-canvas");
var groundImage = document.createElement('img');
groundImage.src = 'xamp23.png';

var gl = setupWebGL(canvas);
    
var moveTeapot = true;
var moveLight = true;
var phi = 0;
var theta = 0;

groundImage.onload = async function init() {
    var floor = {
        positions: [
            vec3(-2, -1, -1),
            vec3(2, -1, -1),
            vec3(2, -1, -5),
            vec3(-2, -1, -1),
            vec3(2, -1, -5),
            vec3(-2, -1, -5)
        ],
        textureCoords: [
            vec2(0, 0),
            vec2(1, 0),
            vec2(1, 1),
            vec2(0, 0),
            vec2(1, 1),
            vec2(0, 1)
        ],
        normals: [
            vec3(0, 1, 0),
            vec3(0, 1, 0),
            vec3(0, 1, 0),
            vec3(0, 1, 0),
            vec3(0, 1, 0),
            vec3(0, 1, 0)
        ]
    };
    
    var at = vec3(0, 0, -3);
    var eye = vec3(0, 1, 1);
    var up = vec3(0, 1, 0);

    var viewMatrix = lookAt(eye, at, up);
    
    var light = vec3(0.0, 2.0, -2.0);
    
    var depthViewMatrix = lookAt(light, at, up);

    var fov = 50;
    var aspect = canvas.width / canvas.height;
    var near = 0.1;
    var far = 30;

    var projectionMatrix = perspective(fov, aspect, near, far);

    var shadowProjectionMatrix = mat4();
    shadowProjectionMatrix[3][3] = 0;
    shadowProjectionMatrix[3][1] = -1 / light[1];

    // asynchronous loading of teapot.obj
    var teapotFile = await fetch('teapot.obj');
    var teapotText = await teapotFile.text();
    var teapot = new OBJDoc('teapot.obj');
    var parseResult = await teapot.parse(teapotText, 0.25, false);

    if (!parseResult) {
        console.error("Failed to parse teapot.obj");
        return;
    }

    var positions = [].concat(floor.positions);
    var textureCoords = [].concat(floor.textureCoords);
    var normals = new Array(6).fill(vec3(0, 0, 0));
    
    for (var i = 0; i < teapot.objects[0].faces.length; i++) {
        var face = teapot.objects[0].faces[i];

        for (var j = 0; j < 3; j++) {
            var vertex = teapot.vertices[face.vIndices[j]];
            var normal = teapot.normals[face.nIndices[j]];

            positions.push(vec3(vertex.x, vertex.y, vertex.z));
            normals.push(vec3(normal.x, normal.y, normal.z));
            textureCoords.push(vec3(0, 0, 0));
        }
    }

    gl.clearColor(0.0, 0.5, 0.5, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    var phongProgram = initShaders(gl, 'phong.vert', 'phong.frag');
    var depthProgram = initShaders(gl, 'depth.vert', 'depth.frag');
    var program = initShaders(gl, 'part2.vert', 'part2.frag');
    
    var size = Math.pow(2, 9);

    var colorTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.activeTexture(gl.TEXTURE3);
    
    var depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(program);
    var programInfo = {
        aPosition: {
            location: gl.getAttribLocation(program, 'aPosition'),
            buffer: gl.createBuffer()
        },
        aTextureCoords: {
            location: gl.getAttribLocation(program, 'aTextureCoords'),
            buffer: gl.createBuffer()
        },
        uModelView: gl.getUniformLocation(program, 'uModelView'),
        uProjection: gl.getUniformLocation(program, 'uProjection'),
        uTexture: gl.getUniformLocation(program, 'uTexture'), // now we do use it
        uShadow: gl.getUniformLocation(program, 'uShadow'), // now we do use it
        uDepthMVP: gl.getUniformLocation(program, 'uDepthMVP') // now we do use it
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.aPosition.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.aTextureCoords.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textureCoords), gl.STATIC_DRAW);
    
    gl.useProgram(phongProgram);
    
    var phongInfo = {
        aPositionModel: {
            location: gl.getAttribLocation(phongProgram, 'aPositionModel'),
            buffer: gl.createBuffer()
        },
        aNormalModel: {
            location: gl.getAttribLocation(phongProgram, 'aNormalModel'),
            buffer: gl.createBuffer()
        },
        uModelView: gl.getUniformLocation(phongProgram, 'uModelView'),
        uProjection: gl.getUniformLocation(phongProgram, 'uProjection'),
        uNormal: gl.getUniformLocation(phongProgram, 'uNormal'),
        uLighting: gl.getUniformLocation(phongProgram, 'uLighting')
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, phongInfo.aPositionModel.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, phongInfo.aNormalModel.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    gl.uniformMatrix4fv(phongInfo.uProjection, false, flatten(projectionMatrix));
    
    gl.useProgram(depthProgram);
    
    var depthInfo = {
        aPosition: {
            location: gl.getAttribLocation(depthProgram, 'aPosition'),
            buffer: gl.createBuffer()
        },
        uModelView: gl.getUniformLocation(depthProgram, 'uModelView'),
        uProjection: gl.getUniformLocation(depthProgram, 'uProjection')
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, depthInfo.aPosition.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    createTextures(gl, groundImage);

    gl.useProgram(program);
    gl.uniformMatrix4fv(programInfo.uProjection, false, flatten(projectionMatrix));
    
    var v = normalize(cross(subtract(floor.positions[1], floor.positions[0]), subtract(floor.positions[2], floor.positions[0])));
    var R = generateRMatrix(v, floor.positions[0]);
    
    teapotMovementButton.addEventListener('click', function() {
        teapotMovementButton.textContent = moveTeapot ? 'Stop movement' : 'Start movement';
        moveTeapot = !moveTeapot;
    });
    
    lightButton.addEventListener('click', function() {
        lightButton.textContent = moveLight ? 'Stop light' : 'Start light';
        moveLight = !moveLight;
    });
    
    requestAnimationFrame(function render() {
        // if using arrow function stops working
        phi += moveTeapot ? 0.02 : 0;
        theta += moveLight ? 0.01 : 0;
        
        light[0] = Math.sin(theta) * 2;
        light[2] = Math.cos(theta) * 2 - 2;
        
        depthViewMatrix = lookAt(light, at, up);
        
        var teapotModelMatrix = translate(0, - 0.75 - 0.25 * Math.sin(phi), -3);
        var teapotModelViewMatrix = mult(viewMatrix, teapotModelMatrix);
        
        var shadowMatrix = mult(viewMatrix, translate(light[0], light[1] - 1.001, light[2]));
        shadowMatrix = mult(shadowMatrix, shadowProjectionMatrix);
        shadowMatrix = mult(shadowMatrix, translate(-light[0], -(light[1] - 1.001), -light[2]));
        shadowMatrix = mult(shadowMatrix, teapotModelMatrix);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.viewport(0, 0, size, size);
        gl.colorMask(false, false, false, false);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(depthProgram);
        enableDepthProgram(gl, depthInfo);

        gl.uniformMatrix4fv(depthInfo.uProjection, false, flatten(projectionMatrix));
        gl.uniformMatrix4fv(depthInfo.uModelView, false, flatten(mult(depthViewMatrix, teapotModelMatrix)));
        
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.colorMask(true, true, true, true);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(phongProgram);
        enablePhongProgram(gl, phongInfo);
        gl.uniformMatrix4fv(phongInfo.uNormal, false, flatten(transpose(inverse4(teapotModelViewMatrix))));
        
        gl.uniformMatrix4fv(phongInfo.uModelView, false, flatten(teapotModelViewMatrix));
        gl.uniform3fv(phongInfo.uLighting, flatten(light));
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
        
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc( gl.ALWAYS, 1, 0xFF );
        gl.stencilOp( gl.KEEP, gl.KEEP, gl.REPLACE );
        gl.stencilMask( 0xFF );
        gl.depthMask( false );
        gl.colorMask(false, false, false, false);
        gl.clear( gl.STENCIL_BUFFER_BIT );
        
        gl.useProgram(program);
        enableProgram(gl, programInfo);
        gl.uniformMatrix4fv(programInfo.uModelView, false, flatten(viewMatrix));
        gl.uniform1i(programInfo.uTexture, 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.uniform1i(programInfo.uShadow, 3);
        gl.uniformMatrix4fv(programInfo.uDepthMVP, false, flatten(mult(projectionMatrix, depthViewMatrix)));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        gl.stencilFunc( gl.EQUAL, 1, 0xFF );
        gl.stencilMask( 0x00 );
        gl.depthMask( true );
        gl.colorMask(true, true, true, true);
        
        gl.useProgram(phongProgram);
        enablePhongProgram(gl, phongInfo);
        gl.uniformMatrix4fv(phongInfo.uModelView, false, flatten(mult(mult(viewMatrix, R), teapotModelMatrix)));
        
        var lightAux = multiplyMatrixByVector(R, vec4(light[0], light[1], light[2], 1));
        var lightVector = vec3(lightAux[0], lightAux[1], lightAux[2]);
        
        gl.uniform3fv(phongInfo.uLighting, flatten(lightVector));
        gl.drawArrays(gl.TRIANGLES, 6, positions.length - 6);
        
        gl.disable(gl.STENCIL_TEST);
        
        gl.useProgram(program);
        enableProgram(gl, programInfo);
        gl.uniformMatrix4fv(programInfo.uModelView, false, flatten(viewMatrix));
        gl.uniform1i(programInfo.uTexture, 0);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        
        gl.uniform1i(programInfo.uShadow, 3);
        gl.uniformMatrix4fv(programInfo.uDepthMVP, false, flatten(mult(projectionMatrix, depthViewMatrix)));
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
                
        requestAnimationFrame(render);
    });
}

function multiplyMatrixByVector(matrix, vector) {
    var product = [];

    for (var i = 0; i < vector.length; i++) {
        var sum = 0;

        for (var j = 0; j < vector.length; j++) {
            sum += matrix[j][i] * vector[i];
        }

        product.push(sum);
    }
    
    return product;
}

function generateRMatrix(v, p) {
    return mat4(
        1 - 2 * v[0] * v[0],   -2 * v[0] * v[1],   -2 * v[0] * v[2],   2 * (dot(p, v)) * v[0],
        -2 * v[1] * v[0],    1 - 2 * v[1] * v[1],  -2 * v[1] * v[2],   2 * (dot(p, v)) * v[1],
        -2 * v[2] * v[0],    -2 * v[2] * v[1],   1 - 2 * v[2] * v[2],  2 * (dot(p, v)) * v[2],
        0, 0, 0, 1
    );
}

function createTextures(gl, groundImage) {
    gl.activeTexture(gl.TEXTURE0);

    var groundTexture = gl.createTexture();
    
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, groundImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.activeTexture(gl.TEXTURE1);
    
    var redTexture = gl.createTexture();
    var redImage = new Uint8Array([255, 0, 0]);
    
    gl.bindTexture(gl.TEXTURE_2D, redTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, redImage);

    gl.activeTexture(gl.TEXTURE2);
    
    var blackTexture = gl.createTexture();
    var blackImage = new Uint8Array([0, 0, 0, 200]);
    
    gl.bindTexture(gl.TEXTURE_2D, blackTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackImage);
}

function enablePhongProgram(gl, phongInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, phongInfo.aPositionModel.buffer);
    gl.enableVertexAttribArray(phongInfo.aPositionModel.location);
    gl.vertexAttribPointer(phongInfo.aPositionModel.location, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, phongInfo.aNormalModel.buffer);
    gl.enableVertexAttribArray(phongInfo.aNormalModel.location);
    gl.vertexAttribPointer(phongInfo.aNormalModel.location, 3, gl.FLOAT, false, 0, 0);
}

function enableDepthProgram(gl, depthInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, depthInfo.aPosition.buffer);
    gl.enableVertexAttribArray(depthInfo.aPosition.location);
    gl.vertexAttribPointer(depthInfo.aPosition.location, 3, gl.FLOAT, false, 0, 0);
}

function enableProgram(gl, programInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.aPosition.buffer);
    gl.enableVertexAttribArray(programInfo.aPosition.location);
    gl.vertexAttribPointer(programInfo.aPosition.location, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.aTextureCoords.buffer);
    gl.enableVertexAttribArray(programInfo.aTextureCoords.location);
    gl.vertexAttribPointer(programInfo.aTextureCoords.location, 2, gl.FLOAT, false, 0, 0);
}