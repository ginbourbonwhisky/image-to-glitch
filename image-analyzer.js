class ImageAnalyzer {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // 画像から色データを抽出
    extractColors(imageData, maxColors = 8) {
        const data = imageData.data;
        const colorMap = new Map();
        const hsvData = [];
        
        // ピクセルサンプリング（パフォーマンス向上のため）
        const step = 4;
        for (let i = 0; i < data.length; i += step * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a < 128) continue; // 透明度の低いピクセルをスキップ
            
            // HSV変換
            const hsv = this.rgbToHsv(r, g, b);
            hsvData.push(hsv);
            
            // 色を量子化して類似色をグループ化
            const quantizedR = Math.floor(r / 32) * 32;
            const quantizedG = Math.floor(g / 32) * 32;
            const quantizedB = Math.floor(b / 32) * 32;
            
            const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }

        // 頻度順にソート
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxColors)
            .map(([color, count]) => {
                const [r, g, b] = color.split(',').map(Number);
                return {
                    rgb: [r, g, b],
                    hex: this.rgbToHex(r, g, b),
                    count: count,
                    percentage: (count / (data.length / 4)) * 100
                };
            });

        return {
            dominantColors: sortedColors,
            colorDistribution: this.analyzeColorDistribution(imageData),
            brightness: this.calculateBrightness(imageData),
            contrast: this.calculateContrast(imageData),
            hsvData: hsvData
        };
    }

    // テクスチャ分析
    analyzeTexture(imageData) {
        const grayData = this.toGrayscale(imageData);
        
        return {
            edgeDensity: this.calculateEdgeDensity(grayData),
            roughness: this.calculateRoughness(grayData),
            directionality: this.calculateDirectionality(grayData),
            uniformity: this.calculateUniformity(grayData)
        };
    }

    // パターン分析
    analyzePattern(imageData) {
        const grayData = this.toGrayscale(imageData);
        
        return {
            repetitiveness: this.calculateRepetitiveness(grayData),
            symmetry: this.calculateSymmetry(grayData),
            complexity: this.calculateComplexity(grayData),
            orientation: this.calculateOrientation(grayData)
        };
    }

    // RGB to Hex変換
    rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    }

    // RGB to HSV変換
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        if (diff !== 0) {
            if (max === r) {
                h = ((g - b) / diff) % 6;
            } else if (max === g) {
                h = (b - r) / diff + 2;
            } else {
                h = (r - g) / diff + 4;
            }
        }
        h = (h * 60 + 360) % 360;

        const s = max === 0 ? 0 : diff / max;
        const v = max;

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            v: Math.round(v * 100)
        };
    }

    // HSV to RGB変換
    hsvToRgb(h, s, v) {
        h = h / 360;
        s = s / 100;
        v = v / 100;

        const c = v * s;
        const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
        const m = v - c;

        let r, g, b;
        if (h < 1/6) {
            r = c; g = x; b = 0;
        } else if (h < 2/6) {
            r = x; g = c; b = 0;
        } else if (h < 3/6) {
            r = 0; g = c; b = x;
        } else if (h < 4/6) {
            r = 0; g = x; b = c;
        } else if (h < 5/6) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    // 色分布分析
    analyzeColorDistribution(imageData) {
        const data = imageData.data;
        let totalR = 0, totalG = 0, totalB = 0;
        let pixelCount = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 128) { // アルファ値チェック
                totalR += data[i];
                totalG += data[i + 1];
                totalB += data[i + 2];
                pixelCount++;
            }
        }

        return {
            averageR: Math.round(totalR / pixelCount),
            averageG: Math.round(totalG / pixelCount),
            averageB: Math.round(totalB / pixelCount),
            saturation: this.calculateSaturation(data),
            hueVariation: this.calculateHueVariation(data)
        };
    }

    // 明度計算
    calculateBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let pixelCount = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 128) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                totalBrightness += brightness;
                pixelCount++;
            }
        }

        return Math.round(totalBrightness / pixelCount);
    }

    // コントラスト計算
    calculateContrast(imageData) {
        const data = imageData.data;
        let min = 255, max = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 128) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                min = Math.min(min, brightness);
                max = Math.max(max, brightness);
            }
        }

        return Math.round(((max - min) / 255) * 100);
    }

    // グレースケール変換
    toGrayscale(imageData) {
        const data = imageData.data;
        const grayData = new Uint8ClampedArray(data.length / 4);
        
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            grayData[i / 4] = gray;
        }
        
        return grayData;
    }

    // エッジ密度計算
    calculateEdgeDensity(grayData) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        let edgeCount = 0;
        const threshold = 30;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const gx = grayData[idx - 1] - grayData[idx + 1];
                const gy = grayData[idx - width] - grayData[idx + width];
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                
                if (magnitude > threshold) {
                    edgeCount++;
                }
            }
        }

        return Math.round((edgeCount / (width * height)) * 100);
    }

    // その他の計算メソッド（簡略化版）
    calculateRoughness(grayData) {
        let variance = 0;
        const mean = grayData.reduce((a, b) => a + b, 0) / grayData.length;
        
        for (let i = 0; i < grayData.length; i++) {
            variance += Math.pow(grayData[i] - mean, 2);
        }
        
        return Math.round(Math.sqrt(variance / grayData.length));
    }

    calculateDirectionality(grayData) {
        // 簡略化：水平と垂直のエッジ比率
        const width = this.canvas.width;
        const height = this.canvas.height;
        let horizontalEdges = 0;
        let verticalEdges = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const gx = Math.abs(grayData[idx - 1] - grayData[idx + 1]);
                const gy = Math.abs(grayData[idx - width] - grayData[idx + width]);
                
                if (gx > gy) horizontalEdges++;
                else if (gy > gx) verticalEdges++;
            }
        }

        const total = horizontalEdges + verticalEdges;
        return total > 0 ? Math.round((horizontalEdges / total) * 100) : 50;
    }

    calculateUniformity(grayData) {
        const histogram = new Array(256).fill(0);
        grayData.forEach(value => histogram[value]++);
        
        let uniformity = 0;
        const total = grayData.length;
        
        for (let i = 0; i < 256; i++) {
            const probability = histogram[i] / total;
            uniformity += probability * probability;
        }
        
        return Math.round(uniformity * 100);
    }

    calculateRepetitiveness(grayData) {
        // 簡略化：パターンの自己相関
        return Math.round(Math.random() * 40 + 30); // 仮の実装
    }

    calculateSymmetry(grayData) {
        // 簡略化：左右対称性
        const width = this.canvas.width;
        const height = this.canvas.height;
        let symmetryScore = 0;
        let totalComparisons = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const leftIdx = y * width + x;
                const rightIdx = y * width + (width - 1 - x);
                const diff = Math.abs(grayData[leftIdx] - grayData[rightIdx]);
                symmetryScore += (255 - diff) / 255;
                totalComparisons++;
            }
        }

        return Math.round((symmetryScore / totalComparisons) * 100);
    }

    calculateComplexity(grayData) {
        // 簡略化：エントロピーベース
        const histogram = new Array(256).fill(0);
        grayData.forEach(value => histogram[value]++);
        
        let entropy = 0;
        const total = grayData.length;
        
        for (let i = 0; i < 256; i++) {
            if (histogram[i] > 0) {
                const probability = histogram[i] / total;
                entropy -= probability * Math.log2(probability);
            }
        }
        
        return Math.round((entropy / 8) * 100); // 正規化
    }

    calculateOrientation(grayData) {
        // 簡略化：主方向の角度
        return Math.round(Math.random() * 180); // 仮の実装
    }

    calculateSaturation(data) {
        let totalSaturation = 0;
        let pixelCount = 0;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 128) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const saturation = max === 0 ? 0 : (max - min) / max;
                
                totalSaturation += saturation;
                pixelCount++;
            }
        }

        return Math.round((totalSaturation / pixelCount) * 100);
    }

    calculateHueVariation(data) {
        const hues = [];

        for (let i = 0; i < data.length; i += 16) { // サンプリング
            if (data[i + 3] > 128) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const delta = max - min;
                
                if (delta > 0) {
                    let hue;
                    if (max === r) {
                        hue = ((g - b) / delta) % 6;
                    } else if (max === g) {
                        hue = (b - r) / delta + 2;
                    } else {
                        hue = (r - g) / delta + 4;
                    }
                    hue = (hue * 60 + 360) % 360;
                    hues.push(hue);
                }
            }
        }

        if (hues.length === 0) return 0;

        // 色相の分散を計算
        const meanHue = hues.reduce((a, b) => a + b, 0) / hues.length;
        const variance = hues.reduce((acc, hue) => {
            const diff = Math.min(Math.abs(hue - meanHue), 360 - Math.abs(hue - meanHue));
            return acc + diff * diff;
        }, 0) / hues.length;

        return Math.round(Math.sqrt(variance));
    }
}
