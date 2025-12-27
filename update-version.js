const fs = require('fs');
const { execSync } = require('child_process');

try {
    console.log('Generating version information...');
    const commit = execSync('git rev-parse --short HEAD').toString().trim();
    const date = execSync('git log -1 --format=%cd --date=relative').toString().trim();
    
    const versionInfo = {
        commit: commit,
        date: date
    };
    
    fs.writeFileSync('version.json', JSON.stringify(versionInfo, null, 2));
    console.log('version.json updated:', versionInfo);
} catch (error) {
    console.error('Failed to update version info:', error);
    // Fallback if git fails (e.g. not a repo)
    const versionInfo = {
        commit: 'unknown',
        date: 'unknown'
    };
    try {
        fs.writeFileSync('version.json', JSON.stringify(versionInfo, null, 2));
    } catch (e) {
        console.error('Failed to write fallback version.json', e);
    }
}
