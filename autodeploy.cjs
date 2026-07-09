const fs = require('fs');
const { exec } = require('child_process');

console.log('🤖 Auto-deploy watcher started...');
console.log('Watching for file changes in ./src and ./supabase...');

let timeout = null;

function triggerDeploy() {
    console.log('🔄 Changes detected! Committing and pushing to GitHub...');
    
    // Add all changes, commit, and push
    const cmd = `git add . && git commit -m "Auto-deploy: System update" && git push`;
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            // It's normal to error if there's nothing to commit
            if (!stdout.includes('nothing to commit')) {
                console.error(`❌ Error pushing to GitHub: ${error.message}`);
            }
            return;
        }
        if (stderr && !stderr.includes('To https://github.com')) {
            console.error(`⚠️ Stderr: ${stderr}`);
        }
        console.log(`✅ Successfully pushed to GitHub! Vercel will now deploy.`);
    });
}

// Watch the src directory
fs.watch('./src', { recursive: true }, (eventType, filename) => {
    if (filename) {
        // Debounce the trigger so it doesn't run 100 times on a single save
        clearTimeout(timeout);
        timeout = setTimeout(triggerDeploy, 3000);
    }
});

// Watch the supabase directory
fs.watch('./supabase', { recursive: true }, (eventType, filename) => {
    if (filename) {
        clearTimeout(timeout);
        timeout = setTimeout(triggerDeploy, 3000);
    }
});

// Watch package files
fs.watch('./package.json', (eventType, filename) => {
    clearTimeout(timeout);
    timeout = setTimeout(triggerDeploy, 3000);
});

// Run it once on startup just in case
triggerDeploy();

// Keep process alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);
