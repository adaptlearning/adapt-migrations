import fs from 'fs/promises';
import path from 'path';

const destinationPath = path.resolve('./../../grunt/tasks/migration.js');
const sourcePath = path.resolve('./examples/migrations.js');

async function checkFileExists () {
  try {
    await fs.access(destinationPath);
    return true;
  } catch (error) {
    return false;
  }
}

async function copyMigrationFile () {
  try {
    const destinationDir = path.dirname(destinationPath);
    await fs.mkdir(destinationDir, { recursive: true });

    // Copy the file
    await fs.copyFile(sourcePath, destinationPath);
    console.log(`File copied successfully to: ${destinationPath}`);
  } catch (error) {
    console.error('Error copying file:', error.message);
  }
}

if (!await checkFileExists()) {
  await copyMigrationFile();
};
