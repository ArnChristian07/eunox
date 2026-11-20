// Custom entry: silence the NativeWind-triggered ImageBackground deprecation
// warning before any other module (including the JSX runtime) loads.
import './suppressWarnings';
import 'expo-router/entry';
