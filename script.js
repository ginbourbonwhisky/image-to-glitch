class ImageToGlitchApp {
    constructor() {
        this.imageAnalyzer = new ImageAnalyzer();
        this.glitchShader = null;
        this.currentImage = null;
        this.currentTexture = null;
        this.analysisData = null;
        this.animationId = null;
        this.startTime = Date.now();
        
        this.initUI();
        this.bindEvents();
    }

    initUI() {
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            workspace: document.getElementById('workspace'),
            analysis: document.getElementById('analysis'),
            originalCanvas: document.getElementById('originalCanvas'),
            glitchCanvas: document.getElementById('glitchCanvas'),
            
            // コントロール
            glitchIntensity: document.getElementById('glitchIntensity'),
            colorWeight: document.getElementById('colorWeight'),
            textureWeight: document.getElementById('textureWeight'),
            patternWeight: document.getElementById('patternWeight'),
            glitchType: document.getElementById('glitchType'),
            
            // 値表示
            glitchIntensityValue: document.getElementById('glitchIntensityValue'),
            colorWeightValue: document.getElementById('colorWeightValue'),
            textureWeightValue: document.getElementById('textureWeightValue'),
            patternWeightValue: document.getElementById('patternWeightValue'),
            
            // ボタン
            regenerateBtn: document.getElementById('regenerateBtn'),
            exportBtn: document.getElementById('exportBtn'),
            resetBtn: document.getElementById('resetBtn'),
            
            // 分析結果
            colorPalette: document.getElementById('colorPalette'),
            colorData: document.getElementById('colorData'),
            textureData: document.getElementById('textureData'),
            patternData: document.getElementById('patternData')
        };
    }

    bindEvents() {
        // ファイルアップロード
        this.elements.uploadArea.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // ドラッグ&ドロップ
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleImageUpload(e.dataTransfer.files[0]);
            }
        });

        // コントロールイベント
        this.elements.glitchIntensity.addEventListener('input', (e) => {
            this.elements.glitchIntensityValue.textContent = e.target.value;
            this.updateGlitch();
        });

        this.elements.colorWeight.addEventListener('input', (e) => {
            this.elements.colorWeightValue.textContent = e.target.value;
            this.updateGlitch();
        });

        this.elements.textureWeight.addEventListener('input', (e) => {
            this.elements.textureWeightValue.textContent = e.target.value;
            this.updateGlitch();
        });

        this.elements.patternWeight.addEventListener('input', (e) => {
            this.elements.patternWeightValue.textContent = e.target.value;
            this.updateGlitch();
        });

        this.elements.glitchType.addEventListener('change', () => {
            this.updateGlitch();
        });

        // ボタンイベント
        this.elements.regenerateBtn.addEventListener('click', () => {
            this.regenerateGlitch();
        });

        this.elements.exportBtn.addEventListener('click', () => {
            this.exportImage();
        });

        this.elements.resetBtn.addEventListener('click', () => {
            this.resetControls();
        });
    }

    async handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してください。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.processImage(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    processImage(image) {
        this.currentImage = image;
        
        // 元画像を表示
        this.displayOriginalImage(image);
        
        // 画像を解析
        this.analyzeImage(image);
        
        // WebGLセットアップ
        this.setupWebGL();
        
        // グリッジ生成開始
        this.startGlitchGeneration();
        
        // UIを表示
        this.elements.workspace.style.display = 'block';
        this.elements.analysis.style.display = 'block';
    }

    displayOriginalImage(image) {
        const canvas = this.elements.originalCanvas;
        const ctx = canvas.getContext('2d');
        
        // キャンバスサイズを調整
        const maxSize = 400;
        let { width, height } = this.calculateDisplaySize(image.width, image.height, maxSize);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(image, 0, 0, width, height);
    }

    analyzeImage(image) {
        // 解析用キャンバスを作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 画像解析を実行
        const colorAnalysis = this.imageAnalyzer.extractColors(imageData);
        const textureAnalysis = this.imageAnalyzer.analyzeTexture(imageData);
        const patternAnalysis = this.imageAnalyzer.analyzePattern(imageData);
        
        this.analysisData = {
            colors: colorAnalysis,
            texture: textureAnalysis,
            pattern: patternAnalysis
        };
        
        // 解析結果を表示
        this.displayAnalysisResults();
    }

    displayAnalysisResults() {
        // カラーパレット表示
        this.elements.colorPalette.innerHTML = '';
        this.analysisData.colors.dominantColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.hex;
            swatch.title = `${color.hex} (${color.percentage.toFixed(1)}%)`;
            this.elements.colorPalette.appendChild(swatch);
        });

        // 色データ表示
        this.elements.colorData.innerHTML = `
            <div class="data-item">
                <span class="data-label">明度</span>
                <span class="data-value">${this.analysisData.colors.brightness}</span>
            </div>
            <div class="data-item">
                <span class="data-label">コントラスト</span>
                <span class="data-value">${this.analysisData.colors.contrast}%</span>
            </div>
            <div class="data-item">
                <span class="data-label">彩度</span>
                <span class="data-value">${this.analysisData.colors.colorDistribution.saturation}%</span>
            </div>
        `;

        // テクスチャデータ表示
        this.elements.textureData.innerHTML = `
            <div class="data-item">
                <span class="data-label">エッジ密度</span>
                <span class="data-value">${this.analysisData.texture.edgeDensity}%</span>
            </div>
            <div class="data-item">
                <span class="data-label">粗さ</span>
                <span class="data-value">${this.analysisData.texture.roughness}</span>
            </div>
            <div class="data-item">
                <span class="data-label">方向性</span>
                <span class="data-value">${this.analysisData.texture.directionality}%</span>
            </div>
            <div class="data-item">
                <span class="data-label">均一性</span>
                <span class="data-value">${this.analysisData.texture.uniformity}%</span>
            </div>
        `;

        // パターンデータ表示
        this.elements.patternData.innerHTML = `
            <div class="data-item">
                <span class="data-label">反復性</span>
                <span class="data-value">${this.analysisData.pattern.repetitiveness}%</span>
            </div>
            <div class="data-item">
                <span class="data-label">対称性</span>
                <span class="data-value">${this.analysisData.pattern.symmetry}%</span>
            </div>
            <div class="data-item">
                <span class="data-label">複雑性</span>
                <span class="data-value">${this.analysisData.pattern.complexity}%</span>
            </div>
            <div class="data-item">
                <span class="data-label">方向</span>
                <span class="data-value">${this.analysisData.pattern.orientation}°</span>
            </div>
        `;
    }

    setupWebGL() {
        const canvas = this.elements.glitchCanvas;
        
        // キャンバスサイズを調整
        const maxSize = 400;
        let { width, height } = this.calculateDisplaySize(
            this.currentImage.width, 
            this.currentImage.height, 
            maxSize
        );
        
        canvas.width = width;
        canvas.height = height;
        
        try {
            this.glitchShader = new GlitchShader(canvas);
            this.currentTexture = this.glitchShader.createTextureFromImage(this.currentImage);
        } catch (error) {
            console.error('WebGL setup failed:', error);
            // WebGLが使えない場合のフォールバック
            this.setupCanvasFallback();
        }
    }

    setupCanvasFallback() {
        // WebGLが使えない場合のCanvas 2D実装
        console.log('Using Canvas 2D fallback');
        // 簡単なフォールバック実装をここに追加
    }

    startGlitchGeneration() {
        const render = () => {
            if (this.glitchShader && this.currentTexture && this.analysisData) {
                const time = (Date.now() - this.startTime) / 1000;
                
                const uniforms = {
                    time: time,
                    glitchIntensity: parseFloat(this.elements.glitchIntensity.value),
                    colorWeight: parseFloat(this.elements.colorWeight.value),
                    textureWeight: parseFloat(this.elements.textureWeight.value),
                    patternWeight: parseFloat(this.elements.patternWeight.value),
                    glitchType: parseInt(this.elements.glitchType.value),
                    dominantColors: this.analysisData.colors.dominantColors.map(c => c.rgb),
                    edgeDensity: this.analysisData.texture.edgeDensity,
                    roughness: this.analysisData.texture.roughness
                };
                
                this.glitchShader.render(this.currentTexture, uniforms);
            }
            
            this.animationId = requestAnimationFrame(render);
        };
        
        render();
    }

    updateGlitch() {
        // リアルタイム更新は既にrenderループで処理されている
    }

    regenerateGlitch() {
        this.startTime = Date.now(); // タイムリセット
    }

    exportImage() {
        const canvas = this.elements.glitchCanvas;
        const link = document.createElement('a');
        link.download = 'glitch-art.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    resetControls() {
        this.elements.glitchIntensity.value = 50;
        this.elements.colorWeight.value = 60;
        this.elements.textureWeight.value = 40;
        this.elements.patternWeight.value = 30;
        this.elements.glitchType.value = 0;
        
        this.elements.glitchIntensityValue.textContent = '50';
        this.elements.colorWeightValue.textContent = '60';
        this.elements.textureWeightValue.textContent = '40';
        this.elements.patternWeightValue.textContent = '30';
        
        this.regenerateGlitch();
    }

    calculateDisplaySize(originalWidth, originalHeight, maxSize) {
        const aspectRatio = originalWidth / originalHeight;
        
        let width, height;
        if (originalWidth > originalHeight) {
            width = Math.min(originalWidth, maxSize);
            height = width / aspectRatio;
        } else {
            height = Math.min(originalHeight, maxSize);
            width = height * aspectRatio;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.glitchShader) {
            this.glitchShader.dispose();
        }
    }
}

// アプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    const app = new ImageToGlitchApp();
    
    // ページを離れる前にクリーンアップ
    window.addEventListener('beforeunload', () => {
        app.dispose();
    });
});
