module.exports = ({ config }) => {
  const googleMapsKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';

  const plugins = [...(config.plugins || [])];

  const hasMapsPlugin = plugins.some(plugin => {
    if (Array.isArray(plugin)) return plugin[0] === 'react-native-maps';
    return plugin === 'react-native-maps';
  });

  if (googleMapsKey && !hasMapsPlugin) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsKey,
      },
    ]);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...(config.extra || {}),
      mapsConfigured: Boolean(googleMapsKey),
    },
  };
};