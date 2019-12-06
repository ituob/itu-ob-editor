// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');

module.exports = async function (params) {
  // Only notarize the app on Mac OS only.
  if (process.platform !== 'darwin') {
    return;
  }
  console.log('afterSign hook triggered', params);
  
  if (process.env.NODE_ENV === 'development') {
    return console.warn('skipping notarization, NODE_ENV=development')
  }

  // Same appId in electron-builder.
  let appId = 'org.ituob.editor';

  let appPath = path.join(
    params.appOutDir,
    `${params.packager.appInfo.productFilename}.app`
  );
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`);

  let appleId = process.env.AID
  if (!appleId) throw new Error('no appleid found')

  let appleIdPassword = process.env.AIP
  if (!appleIdPassword) throw new Error('no appleIdPassword found')

  try {
    await electron_notarize.notarize({
      appBundleId: appId,
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
    });
  } catch (error) {
    console.error(
      `failed to notarize: ${err ? err.message : 'NO ERROR MESSAGE FOUND'}`
    );
  }

  console.log(`Done notarizing ${appId}`);
};
