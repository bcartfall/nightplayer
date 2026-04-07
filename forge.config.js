module.exports = {
  packagerConfig: {
    asar: true,
    icon: './public/icon', 
    name: 'Night Player',
    executableName: 'nightplayer',
    ignore: [
      /node_modules\/.*\/(test|tests|__tests__|spec|example|examples|doc|docs|README|CHANGELOG|LICENSE|\.md|\.txt)/i,
      /node_modules\/.*\.(test|spec)\.(js|ts|jsx|tsx)$/i,
      /node_modules\/.*\/(coverage|\.nyc_output)/i,
      /node_modules\/.*\/(\.git|\.github|\.circleci|\.travis\.yml)/i,
      /^\/\.git/i,
      /^\/\.github/i,
      /^\/README\.md/i,
      /^\/yarn\.lock/i,
      /^\/package-lock\.json/i,
      /node_modules\/firebase\/.*firestore.*\.js\.map$/i,
      /node_modules\/firebase\/.*analytics.*\.js\.map$/i,
      /node_modules\/@firebase/i,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
    {
      // The DMG maker is the standard for macOS "drag to applications" installers
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './public/icon.icns',
        format: 'ULFO'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
