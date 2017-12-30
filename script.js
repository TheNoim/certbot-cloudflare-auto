const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function genCommand({email, domain, credentials}) {
    let command = `certbot certonly --non-interactive --dns-cloudflare --dns-cloudflare-credentials ${credentials} --agree-tos -m ${email} -d ${domain} `;
    command += `--cert-path /opt/certs/${domain}/cert.pem `;
    command += `--key-path /opt/certs/${domain}/privkey.pem `;
    command += `--fullchain-path /opt/certs/${domain}/fullchain.pem `;
    command += `--chain-path /opt/certs/${domain}/chain.pem `;
    return command;
}

const configPath = process.env.LECONFIG || '/opt/config/config.json';
let config;
try {
    config = require(configPath);
} catch (e) {
    console.error(`Failed to load config. Current config path: ${configPath}`);
    if (process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_KEY && process.env.LEEMAIL && process.env.LEDOMAINS) {
        let domains = [];
        for (let domain of process.env.LEDOMAINS.split(',')) {
            domains.push(domain.trim());
        }
        if (domains.length > 0) {
            console.log("Use env instead of config.");
            config = {
                cloudflare: {
                    email: process.env.CLOUDFLARE_EMAIL,
                    key: process.env.CLOUDFLARE_KEY
                },
                email: process.env.LEEMAIL,
                domains
            };
        } else {
            process.exit(2);
        }
    } else {
        process.exit(2);
    }
}

console.log(`Config: ${JSON.stringify(config)}`);

if (!config.cloudflare) throw new Error("You need to provide cloudflare credentials.");
if (!config.cloudflare.email) throw new Error("You need to provide your cloudflare email.");
if (!config.cloudflare.key) throw new Error("You need to provide your cloudflare api key.");
if (!config.email) throw new Error("You need to provide an email to use with lets encrypt.");

const credentials = path.join(os.tmpdir(), 'cloudflare.ini');
let credentialsString = '';
credentialsString += 'dns_cloudflare_email = ';
credentialsString += config.cloudflare.email;
credentialsString += '\n';
credentialsString += 'dns_cloudflare_api_key = ';
credentialsString += config.cloudflare.key;

console.log(`Cloudflare credentials path: ${credentials}`);
console.log(`Cloudflare credentials file: `);
console.log(credentialsString);

console.log("Write credentials to file.");
try {
    fs.writeFileSync(credentials, credentialsString);
} catch (e) {
    console.error(`Failed to write cloudflare credentials to ${credentials}`);
    console.error(e);
    process.exit(3);
}
console.log("Successfully!");

console.log(`Start generating certificates. Selected domains: ${(config.domains || []).join(', ')}`);

generateCertificates().catch(e => {
    console.error('An error occurred while generating the certificates.');
    console.error(e);
    process.exit(4);
});

async function generateCertificates() {
    const failed = [];
    for (const domain of config.domains || []) {
        console.log(`Domain: ${domain}`);
        const command = genCommand({email: config.email, domain, credentials});
        console.log(`Run: ${command}`);
        const args = command.split(' ');
        args.shift();
        try {
            await new Promise((resolve, reject) => {
                const certbot = spawn('certbot', args);
        
                certbot.stdout.pipe(process.stdout);
                certbot.stderr.pipe(process.stderr);
        
                certbot.on('close', code => {
                    console.log(`Command exited with code ${code}.`);
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(code);
                    }
                });
            });
        } catch (e) {
            console.error(e);
            failed.push(domain);
        }
    }
    if (failed.length > 0) {
        console.error(`The following domains failed to generate: ${failed.join(', ')}`);
        process.exit(1);
    } else {
        console.log('Successfully.');
        process.exit(0);
    }
}