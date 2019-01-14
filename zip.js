const fs = require('fs');
const nodeDir = require('node-dir');
const archiver = require('archiver');
const ProgressBar = require('progress');
const program = require('commander');

const configExample = `{
    "directories": ["foo/", "bar/"],
    "files": ["file.txt"]
}`;

program
    .option('-c, --config <path>', 'Path to config json')
    .option('-o, --output <path>', 'Output zip file')
    .on('--help', () => {
        console.log();
        console.log('Config format:');
        console.log(configExample);
    })
    .parse(process.argv);

if (program.config) {
    let configString;
    try {
        configString = fs.readFileSync(program.config, 'utf-8');
    } catch (e) {
        console.error(`File ${program.config} not found`);
        process.exit(1);
    }

    const config = JSON.parse(configString);
    const dirs = config.directories || [];
    const files = config.files || [];

    const outputDir = program.output || 'output.zip';
    try {
        fs.unlinkSync(outputDir);
    } catch (e) { /* Don't care if the file isn't there to be deleted */ }

    const output = fs.createWriteStream(outputDir);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', () => console.log('Done!'));
    output.on('end', () => console.log('archiver finished'));
    archive.on('warning', (err) => console.error(err));
    archive.on('error', (err) => console.error(err));

    archive.pipe(output);

    //  Add the files and directories
    let numFiles = 0;
    dirs.forEach(d => {
        numFiles += nodeDir.files(d, { sync: true }).length;

        const path = d.split('/');
        archive.directory(d, path[path.length - 1]);
    });
    files.forEach(f => {
        numFiles++;

        const path = f.split('/');
        archive.file(f, { name: path[path.length - 1] });
    });

    //  Display progress to user
    const progressBar = new ProgressBar('Archiving :current/:total :bar', {
        complete: '#',
        incomplete: '-',
        width: 40,
        total: numFiles,
        clear: true
    });

    archive.on('entry', () => {
        progressBar.tick();
    });

    archive.finalize();
}
