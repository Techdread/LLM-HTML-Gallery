#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class GenerationImporter {
    constructor() {
        this.onePageDir = path.resolve(__dirname, '..', 'one-page');
        this.outputDir = path.resolve(__dirname, '..', 'src', 'data', 'html-files');
        this.processedCount = 0;
        this.skippedCount = 0;
    }

    async importAll() {
        console.log('🚀 Starting generation import process...');
        console.log(`📁 Source: ${this.onePageDir}`);
        console.log(`📁 Output: ${this.outputDir}`);
        
        console.log(`🔍 Checking if source directory exists: ${fs.existsSync(this.onePageDir)}`);
        
        if (!fs.existsSync(this.onePageDir)) {
            throw new Error(`Source directory not found: ${this.onePageDir}`);
        }

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        await this.processDirectory(this.onePageDir);
        
        console.log(`\n✅ Import complete!`);
        console.log(`📊 Processed: ${this.processedCount} files`);
        console.log(`⏭️  Skipped: ${this.skippedCount} files`);
    }

    async processDirectory(dirPath, modelName = '') {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                // Directory name is likely a model name
                const currentModel = modelName || entry.name;
                await this.processDirectory(fullPath, currentModel);
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                await this.processHtmlFile(fullPath, modelName, entry.name);
            }
        }
    }

    async processHtmlFile(filePath, modelName, fileName) {
        try {
            // Check if this is part of a multi-file project
            const dir = path.dirname(filePath);
            const dirName = path.basename(dir);
            const isMultiFile = this.isMultiFileProject(dir);
            
            // Skip non-index files in multi-file projects
            if (isMultiFile && fileName !== 'index.html') {
                return;
            }
            
            const htmlContent = fs.readFileSync(filePath, 'utf8');
            const projectName = isMultiFile ? dirName : path.parse(fileName).name;
            
            // Generate metadata
            const metadata = this.generateMetadata(htmlContent, modelName, projectName, filePath);
            const id = this.generateId(projectName, modelName);
            
            // Check if JSON already exists
            const outputPath = path.join(this.outputDir, `${id}.json`);
            if (fs.existsSync(outputPath)) {
                console.log(`⏭️  Skipping existing: ${id}`);
                this.skippedCount++;
                return;
            }
            
            // Handle multi-file projects by embedding assets
            let finalHtmlContent = htmlContent;
            if (isMultiFile) {
                finalHtmlContent = await this.embedAssets(htmlContent, dir);
            }
            
            const jsonData = {
                id,
                title: metadata.title,
                htmlContent: finalHtmlContent,
                metadata: {
                    model: modelName,
                    prompt: "Imported from one-page directory", // You might want to extract this from comments
                    timestamp: new Date().toISOString(),
                    tags: metadata.tags,
                    description: metadata.description
                }
            };
            
            fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
            console.log(`✅ Generated: ${id}.json`);
            this.processedCount++;
            
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
            this.skippedCount++;
        }
    }

    isMultiFileProject(dir) {
        const files = fs.readdirSync(dir);
        return files.includes('index.html') && files.length > 1;
    }

    async embedAssets(htmlContent, projectDir) {
        let modifiedHtml = htmlContent;
        
        // Embed CSS files
        const cssRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/g;
        let match;
        while ((match = cssRegex.exec(htmlContent)) !== null) {
            const cssPath = path.join(projectDir, match[1]);
            if (fs.existsSync(cssPath)) {
                const cssContent = fs.readFileSync(cssPath, 'utf8');
                const styleTag = `<style>\n${cssContent}\n</style>`;
                modifiedHtml = modifiedHtml.replace(match[0], styleTag);
            }
        }
        
        // Embed JS files
        const jsRegex = /<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/g;
        while ((match = jsRegex.exec(htmlContent)) !== null) {
            const jsPath = path.join(projectDir, match[1]);
            if (fs.existsSync(jsPath)) {
                const jsContent = fs.readFileSync(jsPath, 'utf8');
                const scriptTag = `<script>\n${jsContent}\n</script>`;
                modifiedHtml = modifiedHtml.replace(match[0], scriptTag);
            }
        }
        
        return modifiedHtml;
    }

    generateMetadata(htmlContent, modelName, projectName, filePath) {
        const title = this.generateTitle(projectName, htmlContent);
        const tags = this.extractTags(htmlContent);
        const description = this.generateDescription(htmlContent, tags);
        
        return { title, tags, description };
    }

    generateTitle(projectName, htmlContent) {
        // First try to extract title from HTML
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1].trim() && titleMatch[1].trim() !== 'Document') {
            return titleMatch[1].trim();
        }
        
        // Convert filename to readable title
        return projectName
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();
    }

    extractTags(htmlContent) {
        const tags = [];
        
        // Detect common libraries and frameworks
        if (htmlContent.includes('three.js') || htmlContent.includes('THREE.')) {
            tags.push('Three.js', '3D Graphics');
        }
        if (htmlContent.includes('<canvas')) {
            tags.push('Canvas');
        }
        if (htmlContent.includes('requestAnimationFrame') || htmlContent.includes('animate')) {
            tags.push('Animation');
        }
        if (htmlContent.includes('particle') || htmlContent.includes('Particle')) {
            tags.push('Particles');
        }
        if (htmlContent.includes('WebGL') || htmlContent.includes('gl_')) {
            tags.push('WebGL', 'Shaders');
        }
        if (htmlContent.includes('noise') || htmlContent.includes('Noise')) {
            tags.push('Procedural Generation');
        }
        if (htmlContent.includes('sphere') || htmlContent.includes('planet')) {
            tags.push('Astronomy');
        }
        if (htmlContent.includes('simulation') || htmlContent.includes('physics')) {
            tags.push('Simulation');
        }
        if (htmlContent.includes('game') || htmlContent.includes('Game')) {
            tags.push('Game');
        }
        if (htmlContent.includes('city') || htmlContent.includes('building')) {
            tags.push('Architecture');
        }
        
        // Default tags if none found
        if (tags.length === 0) {
            tags.push('Interactive', 'Visualization');
        }
        
        return [...new Set(tags)]; // Remove duplicates
    }

    generateDescription(htmlContent, tags) {
        const tagStr = tags.join(', ').toLowerCase();
        
        // Try to extract description from comments
        const commentMatch = htmlContent.match(/<!--\s*(.{20,200}?)\s*-->/);
        if (commentMatch) {
            return commentMatch[1].trim();
        }
        
        // Generate based on detected features
        if (tags.includes('Three.js')) {
            return `An interactive 3D visualization built with Three.js featuring ${tagStr}.`;
        } else if (tags.includes('Canvas')) {
            return `A dynamic canvas-based visualization with ${tagStr}.`;
        } else {
            return `An interactive web application featuring ${tagStr}.`;
        }
    }

    generateId(projectName, modelName) {
        const cleanProject = projectName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        const cleanModel = modelName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        return `${cleanProject}-${cleanModel}`;
    }
}

// CLI interface
async function main() {
    const importer = new GenerationImporter();
    
    try {
        await importer.importAll();
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = GenerationImporter;