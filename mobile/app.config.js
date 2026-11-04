const base = require('./app.json');

module.exports = () => {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const expo = { ...base.expo, plugins: [...(base.expo.plugins || [])] };

  // react-native-maps usa Apple Maps por defecto en iOS. En Android, Google Maps
  // requiere una API key nativa; el plugin la inserta durante el prebuild/EAS Build.
  if (googleMapsKey) {
    expo.plugins.push([
      'react-native-maps',
      { androidGoogleMapsApiKey: googleMapsKey },
    ]);
  }

  return { expo };
};
