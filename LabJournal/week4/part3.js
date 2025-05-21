// part3.js

window.onload = function() {
    var contentDiv = document.getElementById('content');

    // Part 1: Isometric View with Orthographic Projection
    var part1Content = `
    <h2>Part 1: Isometric View with Orthographic Projection</h2>
    <p>
        In Part 1, we drew a wireframe unit cube in isometric view using orthographic projection.
    </p>
    <h3>Transformation Matrices Used:</h3>
    <ol>
        <li><strong>Model-View Matrix (MV):</strong>
            <ul>
                <li>Initialized as identity matrix:
                    \\[
                    MV = I
                    \\]
                </li>
                <li>Applied rotation around Y-axis by \\( 45&deg \\):
                    \\[
                    MV = MV \\cdot R_{y}(45&deg;)
                    \\]
                </li>
                <li>Applied rotation around X-axis by \\( 35.264&deg \\):
                    \\[
                    MV = MV \\cdot R_{x}(35.264&deg)
                    \\]
                </li>
            </ul>
        </li>
        <li><strong>Projection Matrix (P):</strong> Orthographic projection matrix:
            \\[
            P = \\text{ortho}(l, r, b, t, n, f)
            \\]
            Where:
            <ul>
                <li>\( l = -1 \), \( r = 1 \) (left and right)</li>
                <li>\( b = -1 \), \( t = 1 \) (bottom and top)</li>
                <li>\( n = -1 \), \( f = 1 \) (near and far)</li>
            </ul>
        </li>
    </ol>
    <h3>Current Transformation Matrix (CTM):</h3>
    <p>
        The CTM used to transform the vertices is computed as:
        \\[
        CTM = P \\cdot MV
        \\]
    </p>
    `;

    // Part 2: Classical Perspective Views with Perspective Projection
    var part2Content = `
    <h2>Part 2: Classical Perspective Views with Perspective Projection</h2>
    <p>
        In Part 2, we drew the unit cube three times using a perspective projection to show one-point, two-point, and three-point perspectives.
    </p>
    <h3>Transformation Matrices Used:</h3>
    <ol>
        <li><strong>Model-View Matrix (MV):</strong>
            <ul>
                <li>View Matrix (V) set up using the lookAt function:
                    \\[
                    V = \\text{lookAt}(\\vec{eye}, \\vec{at}, \\vec{up})
                    \\]
                    Where those 3 vectors are:
                    <ul>
                        <li>\( eye = (0, 0, 5) \)</li>
                        <li>\( at = (0, 0, 0) \)</li>
                        <li>\( up = (0, 1, 0) \)</li>
                    </ul>
                </li>
                <li>Model Matrix (M) specific to each cube.</li>
                <li>The combined Model-View Matrix:
                    \\[
                    MV = V \\cdot M
                    \\]
                </li>
            </ul>
        </li>
        <li><strong>Projection Matrix (P):</strong> Perspective projection matrix:
            \\[
            P = \\text{perspective}(45&deg, \\text{aspect}, 0.1, 100.0)
            \\]
        </li>
    </ol>
    <h3>Current Transformation Matrices (CTM) for Each Cube:</h3>
    <h4>1. One-Point Perspective Cube:</h4>
    <p>
        Transformation:
        \\[
        CTM_{1} = P \\cdot V \\cdot T(-1.5, 0, 0)
        \\]
        Where:
        <ul>
            <li>\( T(-1.5, 0, 0) \) translates the cube to the left.</li>
        </ul>
    </p>
    <h4>2. Two-Point Perspective Cube:</h4>
    <p>
        Transformation:
        \\[
        CTM_{2} = P \\cdot V \\cdot R_{y}(45&deg)
        \\]
        Where:
        <ul>
            <li>\( Ry(45&deg) \) rotates the cube around the Y-axis.</li>
        </ul>
    </p>
    <h4>3. Three-Point Perspective Cube:</h4>
    <p>
        Transformation:
        \\[
        CTM_{3} = P \\cdot V \\cdot T(1.5, 0, 0) \\cdot R_{x}(30&deg) \\cdot R_{y}(45&deg)
        \\]
        Where:
        <ul>
            <li>\( T(1.5, 0, 0) \) translates the cube to the right.</li>
            <li>\( Ry(45&deg) \) rotates around the Y-axis.</li>
            <li>\( Rx(30&deg) \) rotates around the X-axis.</li>
        </ul>
    </p>
    `;

    // Combine all content
    var fullContent = part1Content + part2Content;

    // Insert content into the page
    contentDiv.innerHTML = fullContent;

    // Trigger MathJax typesetting
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise();
    }
};
