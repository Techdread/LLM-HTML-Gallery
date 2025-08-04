const GenerationImporter = require('./scripts/import-generations.js');

async function test() {
    console.log('Starting test...');
    const importer = new GenerationImporter();
    console.log('Importer created');
    
    try {
        await importer.importAll();
        console.log('Import completed');
    } catch (error) {
        console.error('Error:', error);
    }
}

test();