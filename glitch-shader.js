class GlitchShader {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.program = null;
        this.textureLocation = null;
        this.uniformLocations = {};
        this.init();
    }

    init() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            
            uniform sampler2D u_texture;
            uniform float u_time;
            uniform float u_glitchIntensity;
            uniform float u_colorWeight;
            uniform float u_textureWeight;
            uniform float u_patternWeight;
            uniform int u_glitchType;
            uniform vec3 u_dominantColors[8];
            uniform float u_edgeDensity;
            uniform float u_roughness;
            uniform vec2 u_resolution;
            
            varying vec2 v_texCoord;
            
            // ノイズ関数
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            // 2Dノイズ
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);
                
                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));
                
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            // カラーシフト
            vec3 colorShift(vec3 color, vec3 dominantColor, float intensity) {
                return mix(color, dominantColor, intensity * 0.3);
            }
            
            // データ破損エフェクト
            vec3 dataCorruption(vec2 uv, vec3 color) {
                // ブロック化（モザイク）
                float blockSize = mix(0.01, 0.1, u_glitchIntensity / 100.0);
                vec2 blockUV = floor(uv / blockSize) * blockSize;
                
                // ブロックごとにランダムな破綻
                float corruption = random(blockUV + u_time * 0.1);
                
                if (corruption > 0.7) {
                    // 完全なデータ破損 - 単色ブロック
                    float colorIndex = mod(corruption * 8.0, 8.0);
                    vec3 selectedColor = u_dominantColors[0];
                    
                    if (colorIndex < 1.0) selectedColor = u_dominantColors[0];
                    else if (colorIndex < 2.0) selectedColor = u_dominantColors[1];
                    else if (colorIndex < 3.0) selectedColor = u_dominantColors[2];
                    else if (colorIndex < 4.0) selectedColor = u_dominantColors[3];
                    else if (colorIndex < 5.0) selectedColor = u_dominantColors[4];
                    else if (colorIndex < 6.0) selectedColor = u_dominantColors[5];
                    else if (colorIndex < 7.0) selectedColor = u_dominantColors[6];
                    else selectedColor = u_dominantColors[7];
                    
                    return selectedColor;
                } else if (corruption > 0.4) {
                    // 部分的な破綻 - 色の置換
                    float colorIndex = mod(corruption * 4.0, 4.0);
                    vec3 selectedColor = u_dominantColors[0];
                    
                    if (colorIndex < 1.0) selectedColor = u_dominantColors[0];
                    else if (colorIndex < 2.0) selectedColor = u_dominantColors[1];
                    else if (colorIndex < 3.0) selectedColor = u_dominantColors[2];
                    else selectedColor = u_dominantColors[3];
                    
                    return mix(color, selectedColor, 0.6);
                }
                
                return color;
            }
            
            // 信号乱れエフェクト
            vec3 signalDistortion(vec2 uv, vec3 color) {
                // 水平方向の信号乱れ
                float distortion = sin(uv.y * 50.0 + u_time * 3.0) * 0.02;
                vec2 distortedUV = uv + vec2(distortion, 0.0);
                
                // 縦方向のずれ
                float verticalShift = sin(uv.x * 30.0 + u_time * 2.0) * 0.01;
                distortedUV.y += verticalShift;
                
                // 元の色を取得
                vec3 originalColor = texture2D(u_texture, distortedUV).rgb;
                
                // ランダムな色の挿入
                float noiseValue = noise(uv * 20.0 + u_time);
                if (noiseValue > 0.8) {
                    float colorIndex = mod(noiseValue * 6.0, 6.0);
                    vec3 selectedColor = u_dominantColors[0];
                    
                    if (colorIndex < 1.0) selectedColor = u_dominantColors[0];
                    else if (colorIndex < 2.0) selectedColor = u_dominantColors[1];
                    else if (colorIndex < 3.0) selectedColor = u_dominantColors[2];
                    else if (colorIndex < 4.0) selectedColor = u_dominantColors[3];
                    else if (colorIndex < 5.0) selectedColor = u_dominantColors[4];
                    else selectedColor = u_dominantColors[5];
                    
                    return mix(originalColor, selectedColor, 0.7);
                }
                
                return originalColor;
            }
            
            // デジタル破綻エフェクト
            vec3 digitalGlitch(vec2 uv, vec3 color) {
                // ピクセル化
                float pixelSize = mix(0.001, 0.02, u_glitchIntensity / 100.0);
                vec2 pixelUV = floor(uv / pixelSize) * pixelSize;
                
                // ランダムな破綻
                float glitch = random(pixelUV + u_time * 0.05);
                
                if (glitch > 0.9) {
                    // 完全な破綻 - 単色ブロック
                    float colorIndex = mod(glitch * 8.0, 8.0);
                    vec3 selectedColor = u_dominantColors[0];
                    
                    if (colorIndex < 1.0) selectedColor = u_dominantColors[0];
                    else if (colorIndex < 2.0) selectedColor = u_dominantColors[1];
                    else if (colorIndex < 3.0) selectedColor = u_dominantColors[2];
                    else if (colorIndex < 4.0) selectedColor = u_dominantColors[3];
                    else if (colorIndex < 5.0) selectedColor = u_dominantColors[4];
                    else if (colorIndex < 6.0) selectedColor = u_dominantColors[5];
                    else if (colorIndex < 7.0) selectedColor = u_dominantColors[6];
                    else selectedColor = u_dominantColors[7];
                    
                    return selectedColor;
                } else if (glitch > 0.7) {
                    // 部分的な破綻 - 色の置換
                    float colorIndex = mod(glitch * 4.0, 4.0);
                    vec3 selectedColor = u_dominantColors[0];
                    
                    if (colorIndex < 1.0) selectedColor = u_dominantColors[0];
                    else if (colorIndex < 2.0) selectedColor = u_dominantColors[1];
                    else if (colorIndex < 3.0) selectedColor = u_dominantColors[2];
                    else selectedColor = u_dominantColors[3];
                    
                    return mix(color, selectedColor, 0.5);
                }
                
                return color;
            }
            
            // ピクセル間引きエフェクト
            vec3 pixelThinning(vec2 uv, vec3 color) {
                // 間引きパターン
                float thinFactor = mix(1.0, 8.0, u_glitchIntensity / 100.0);
                vec2 thinUV = floor(uv * thinFactor) / thinFactor;
                
                // 間引きマスク
                float mask = random(thinUV + u_time * 0.1);
                
                if (mask > 0.6) {
                    // 色を単純化（量子化）
                    vec3 quantized = floor(color * 4.0) / 4.0;
                    
                    // 主要色に置換
                    float colorIndex = mod(mask * 6.0, 6.0);
                    vec3 selectedColor = u_dominantColors[0];
                    
                    if (colorIndex < 1.0) selectedColor = u_dominantColors[0];
                    else if (colorIndex < 2.0) selectedColor = u_dominantColors[1];
                    else if (colorIndex < 3.0) selectedColor = u_dominantColors[2];
                    else if (colorIndex < 4.0) selectedColor = u_dominantColors[3];
                    else if (colorIndex < 5.0) selectedColor = u_dominantColors[4];
                    else selectedColor = u_dominantColors[5];
                    
                    return mix(quantized, selectedColor, 0.3);
                }
                
                return color;
            }
            
            // RGB分離
            vec3 rgbSplit(vec2 uv, float intensity) {
                float offset = intensity * 0.01;
                
                float r = texture2D(u_texture, uv + vec2(offset, 0.0)).r;
                float g = texture2D(u_texture, uv).g;
                float b = texture2D(u_texture, uv - vec2(offset, 0.0)).b;
                
                return vec3(r, g, b);
            }
            
            void main() {
                vec2 uv = v_texCoord;
                
                // ベース色を取得
                vec3 color = rgbSplit(uv, u_glitchIntensity / 100.0);
                
                // グリッジタイプによる処理分岐
                if (u_glitchType == 0) { // データ破損
                    color = dataCorruption(uv, color);
                } else if (u_glitchType == 1) { // 信号乱れ
                    color = signalDistortion(uv, color);
                } else if (u_glitchType == 2) { // デジタル破綻
                    color = digitalGlitch(uv, color);
                } else if (u_glitchType == 3) { // ピクセル間引き
                    color = pixelThinning(uv, color);
                } else if (u_glitchType == 4) { // ミックス
                    color = dataCorruption(uv, color);
                    color = signalDistortion(uv, color);
                    color = digitalGlitch(uv, color);
                    color = pixelThinning(uv, color);
                }
                
                // パターンに基づく追加エフェクト
                float patternInfluence = u_patternWeight / 100.0;
                if (patternInfluence > 0.5) {
                    float wave = sin(uv.x * 50.0 + u_time) * patternInfluence * 0.1;
                    uv.y += wave;
                    color = mix(color, texture2D(u_texture, uv).rgb, 0.3);
                }
                
                // 最終的な色調整
                color = clamp(color, 0.0, 1.0);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // シェーダーをコンパイル
        const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
        
        // プログラムを作成
        this.program = this.createProgram(vertexShader, fragmentShader);
        
        // アトリビュートとユニフォームの位置を取得
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        
        this.uniformLocations = {
            texture: this.gl.getUniformLocation(this.program, 'u_texture'),
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            glitchIntensity: this.gl.getUniformLocation(this.program, 'u_glitchIntensity'),
            colorWeight: this.gl.getUniformLocation(this.program, 'u_colorWeight'),
            textureWeight: this.gl.getUniformLocation(this.program, 'u_textureWeight'),
            patternWeight: this.gl.getUniformLocation(this.program, 'u_patternWeight'),
            glitchType: this.gl.getUniformLocation(this.program, 'u_glitchType'),
            dominantColors: this.gl.getUniformLocation(this.program, 'u_dominantColors'),
            edgeDensity: this.gl.getUniformLocation(this.program, 'u_edgeDensity'),
            roughness: this.gl.getUniformLocation(this.program, 'u_roughness'),
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution')
        };
        
        // バッファを設定
        this.setupBuffers();
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }

    setupBuffers() {
        // 頂点バッファ
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        
        // テクスチャ座標バッファ
        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);
        
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    }

    render(texture, uniforms) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        this.gl.useProgram(this.program);
        
        // テクスチャをバインド
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.uniformLocations.texture, 0);
        
        // ユニフォームを設定
        this.gl.uniform1f(this.uniformLocations.time, uniforms.time);
        this.gl.uniform1f(this.uniformLocations.glitchIntensity, uniforms.glitchIntensity);
        this.gl.uniform1f(this.uniformLocations.colorWeight, uniforms.colorWeight);
        this.gl.uniform1f(this.uniformLocations.textureWeight, uniforms.textureWeight);
        this.gl.uniform1f(this.uniformLocations.patternWeight, uniforms.patternWeight);
        this.gl.uniform1i(this.uniformLocations.glitchType, uniforms.glitchType);
        this.gl.uniform1f(this.uniformLocations.edgeDensity, uniforms.edgeDensity);
        this.gl.uniform1f(this.uniformLocations.roughness, uniforms.roughness);
        this.gl.uniform2f(this.uniformLocations.resolution, this.canvas.width, this.canvas.height);
        
        // 主要色を設定
        if (uniforms.dominantColors && uniforms.dominantColors.length > 0) {
            const colorArray = new Float32Array(24); // 8色 × 3成分
            for (let i = 0; i < Math.min(8, uniforms.dominantColors.length); i++) {
                const color = uniforms.dominantColors[i];
                colorArray[i * 3] = color[0] / 255;
                colorArray[i * 3 + 1] = color[1] / 255;
                colorArray[i * 3 + 2] = color[2] / 255;
            }
            this.gl.uniform3fv(this.uniformLocations.dominantColors, colorArray);
        }
        
        // 頂点データを設定
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
        
        // 描画
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    createTextureFromImage(image) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        
        return texture;
    }

    dispose() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
        if (this.positionBuffer) {
            this.gl.deleteBuffer(this.positionBuffer);
        }
        if (this.texCoordBuffer) {
            this.gl.deleteBuffer(this.texCoordBuffer);
        }
    }
}
