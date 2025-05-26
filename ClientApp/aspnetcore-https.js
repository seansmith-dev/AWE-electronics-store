// This script sets up HTTPS for the application using the ASP.NET Core HTTPS certificate
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

console.log('APPDATA:', process.env.APPDATA);
console.log('HOME:', process.env.HOME);

const baseFolder =
  process.env.APPDATA !== undefined && process.env.APPDATA !== ''
    ? `${process.env.APPDATA}/ASP.NET/https`
    : `${process.env.HOME}/.aspnet/https`;

console.log('Base folder:', baseFolder);


fs.mkdirSync(baseFolder, { recursive: true });
const certificateArg = process.argv.map(arg => arg.match(/--name=(?<value>.+)/i)).filter(Boolean)[0];
const certificateName = certificateArg ? certificateArg.groups.value : process.env.npm_package_name;

if (!certificateName) {
  console.error('Invalid certificate name. Run this script in the context of an npm/yarn script or pass --name=<<app>> explicitly.')
  process.exit(-1);
}

const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

if (!fs.existsSync(certFilePath)) {
  // First ensure the directory exists
  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
  }

  // Export the certificate
  const result = spawnSync('dotnet', [
    'dev-certs',
    'https',
    '--export-path',
    certFilePath,
    '--format',
    'Pem',
    '--no-password'
  ], { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error('Failed to export certificate. Please ensure you have run "dotnet dev-certs https --trust"');
    process.exit(result.status);
  }
}

// If we have a .pem file but no .key file, create the .key file
if (fs.existsSync(certFilePath) && !fs.existsSync(keyFilePath)) {
  fs.copyFileSync(certFilePath, keyFilePath);
}
